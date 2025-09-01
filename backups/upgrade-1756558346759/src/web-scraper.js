import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import { writeFile } from 'fs/promises';
import path from 'path';
import createCsvWriter from 'csv-writer';

export class WebScraper {
  constructor(options = {}) {
    this.options = {
      timeout: options.timeout || 10000,
      userAgent: options.userAgent || 'AI-Coding-Agent/1.0.0',
      respectRobots: options.respectRobots !== false,
      maxRetries: options.maxRetries || 3,
      delay: options.delay || 1000,
      ...options
    };
    
    this.axiosInstance = axios.create({
      timeout: this.options.timeout,
      headers: {
        'User-Agent': this.options.userAgent
      }
    });
  }

  async fetchUrl(url, options = {}) {
    const mergedOptions = { ...this.options, ...options };
    
    for (let attempt = 1; attempt <= mergedOptions.maxRetries; attempt++) {
      try {
        console.log(`Fetching: ${url} (attempt ${attempt})`);
        
        const response = await this.axiosInstance.get(url, {
          headers: mergedOptions.headers || {},
          timeout: mergedOptions.timeout
        });

        return {
          url,
          status: response.status,
          headers: response.headers,
          html: response.data,
          size: Buffer.byteLength(response.data, 'utf8')
        };
      } catch (error) {
        console.warn(`Attempt ${attempt} failed for ${url}: ${error.message}`);
        
        if (attempt === mergedOptions.maxRetries) {
          throw new Error(`Failed to fetch ${url} after ${mergedOptions.maxRetries} attempts: ${error.message}`);
        }
        
        await this.delay(mergedOptions.delay * attempt);
      }
    }
  }

  async fetchWithBrowser(url, options = {}) {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: options.headless !== false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      
      // Set viewport and user agent
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent(this.options.userAgent);
      
      // Navigate to page
      console.log(`Loading page with browser: ${url}`);
      await page.goto(url, { 
        waitUntil: options.waitUntil || 'networkidle2',
        timeout: this.options.timeout 
      });
      
      // Wait for additional selectors if specified
      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, { timeout: 5000 });
      }
      
      // Execute custom JavaScript if provided
      if (options.executeScript) {
        await page.evaluate(options.executeScript);
      }
      
      const html = await page.content();
      
      return {
        url,
        html,
        size: Buffer.byteLength(html, 'utf8')
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  parseHtml(html, url = '') {
    const $ = cheerio.load(html);
    
    return {
      $, // Cheerio instance for custom parsing
      title: $('title').text().trim(),
      description: $('meta[name="description"]').attr('content') || '',
      keywords: $('meta[name="keywords"]').attr('content') || '',
      headings: this.extractHeadings($),
      links: this.extractLinks($, url),
      images: this.extractImages($, url),
      text: this.extractCleanText($),
      forms: this.extractForms($),
      tables: this.extractTables($),
      scripts: this.extractScripts($),
      styles: this.extractStyles($)
    };
  }

  extractHeadings($) {
    const headings = [];
    $('h1, h2, h3, h4, h5, h6').each((i, elem) => {
      const $elem = $(elem);
      headings.push({
        level: parseInt(elem.tagName.substring(1)),
        text: $elem.text().trim(),
        id: $elem.attr('id') || null
      });
    });
    return headings;
  }

  extractLinks($, baseUrl = '') {
    const links = [];
    $('a[href]').each((i, elem) => {
      const $elem = $(elem);
      const href = $elem.attr('href');
      
      links.push({
        text: $elem.text().trim(),
        href: this.resolveUrl(href, baseUrl),
        title: $elem.attr('title') || null,
        target: $elem.attr('target') || null
      });
    });
    return links;
  }

  extractImages($, baseUrl = '') {
    const images = [];
    $('img').each((i, elem) => {
      const $elem = $(elem);
      const src = $elem.attr('src');
      
      if (src) {
        images.push({
          src: this.resolveUrl(src, baseUrl),
          alt: $elem.attr('alt') || '',
          title: $elem.attr('title') || null,
          width: $elem.attr('width') || null,
          height: $elem.attr('height') || null
        });
      }
    });
    return images;
  }

  extractCleanText($) {
    // Create a clone to avoid modifying the original DOM
    const $clone = cheerio.load($.html());
    
    // Remove script and style elements from the clone
    $clone('script, style, nav, header, footer, aside').remove();
    
    return $clone('body').text()
      .replace(/\s+/g, ' ')
      .trim();
  }

  extractForms($) {
    const forms = [];
    $('form').each((i, elem) => {
      const $form = $(elem);
      const fields = [];
      
      $form.find('input, textarea, select').each((j, field) => {
        const $field = $(field);
        fields.push({
          type: $field.attr('type') || field.tagName.toLowerCase(),
          name: $field.attr('name') || null,
          id: $field.attr('id') || null,
          placeholder: $field.attr('placeholder') || null,
          required: $field.attr('required') !== undefined
        });
      });
      
      forms.push({
        method: $form.attr('method') || 'GET',
        action: $form.attr('action') || '',
        fields
      });
    });
    return forms;
  }

  extractTables($) {
    const tables = [];
    $('table').each((i, elem) => {
      const $table = $(elem);
      const rows = [];
      
      $table.find('tr').each((j, row) => {
        const $row = $(row);
        const cells = [];
        
        $row.find('td, th').each((k, cell) => {
          cells.push($(cell).text().trim());
        });
        
        if (cells.length > 0) {
          rows.push(cells);
        }
      });
      
      tables.push({
        caption: $table.find('caption').text().trim() || null,
        headers: rows[0] || [],
        rows: rows.slice(1)
      });
    });
    return tables;
  }

  extractScripts($) {
    const scripts = [];
    $('script').each((i, elem) => {
      const $elem = $(elem);
      const src = $elem.attr('src');
      
      scripts.push({
        src: src || null,
        inline: !src ? $elem.html() : null,
        type: $elem.attr('type') || 'text/javascript'
      });
    });
    return scripts;
  }

  extractStyles($) {
    const styles = [];
    $('link[rel="stylesheet"], style').each((i, elem) => {
      const $elem = $(elem);
      
      if (elem.tagName === 'link') {
        styles.push({
          type: 'external',
          href: $elem.attr('href'),
          media: $elem.attr('media') || 'all'
        });
      } else {
        styles.push({
          type: 'inline',
          css: $elem.html(),
          media: $elem.attr('media') || 'all'
        });
      }
    });
    return styles;
  }

  extractBySelector(html, selector) {
    const $ = cheerio.load(html);
    const results = [];
    
    $(selector).each((i, elem) => {
      const $elem = $(elem);
      results.push({
        text: $elem.text().trim(),
        html: $elem.html(),
        attributes: elem.attribs || {}
      });
    });
    
    return results;
  }

  async crawlSite(startUrl, options = {}) {
    const {
      maxPages = 10,
      maxDepth = 2,
      sameDomain = true,
      includePatterns = [],
      excludePatterns = ['/cdn-cgi/', '/.well-known/', '/admin/', '/wp-admin/']
    } = options;

    const visited = new Set();
    const toVisit = [{ url: startUrl, depth: 0 }];
    const results = [];
    const startDomain = new URL(startUrl).hostname;

    while (toVisit.length > 0 && results.length < maxPages) {
      const { url, depth } = toVisit.shift();
      
      if (visited.has(url) || depth > maxDepth) {
        continue;
      }

      try {
        console.log(`Crawling: ${url} (depth: ${depth})`);
        
        const fetchResult = await this.fetchUrl(url);
        const parsed = this.parseHtml(fetchResult.html, url);
        
        visited.add(url);
        results.push({
          url,
          depth,
          title: parsed.title,
          description: parsed.description,
          headings: parsed.headings,
          wordCount: parsed.text.split(/\s+/).length,
          linkCount: parsed.links.length,
          imageCount: parsed.images.length
        });

        // Add new URLs to crawl
        if (depth < maxDepth) {
          for (const link of parsed.links) {
            const linkUrl = link.href;
            
            if (!linkUrl || visited.has(linkUrl) || linkUrl.startsWith('mailto:') || linkUrl.startsWith('tel:')) {
              continue;
            }

            // Check domain restriction
            if (sameDomain) {
              try {
                const linkDomain = new URL(linkUrl).hostname;
                if (linkDomain !== startDomain) {
                  continue;
                }
              } catch (e) {
                continue;
              }
            }

            // Check include/exclude patterns
            if (includePatterns.length > 0 && !includePatterns.some(pattern => linkUrl.includes(pattern))) {
              continue;
            }
            
            if (excludePatterns.some(pattern => linkUrl.includes(pattern))) {
              continue;
            }

            toVisit.push({ url: linkUrl, depth: depth + 1 });
          }
        }

        // Add delay between requests
        await this.delay(this.options.delay);
        
      } catch (error) {
        console.warn(`Failed to crawl ${url}: ${error.message}`);
      }
    }

    return results;
  }

  async saveToFile(data, filename, format = 'json') {
    const outputPath = path.resolve(filename);
    
    switch (format.toLowerCase()) {
      case 'json':
        await writeFile(outputPath, JSON.stringify(data, null, 2), 'utf-8');
        break;
        
      case 'csv':
        {
          if (Array.isArray(data) && data.length > 0) {
            const csvWriter = createCsvWriter.createObjectCsvWriter({
              path: outputPath,
              header: Object.keys(data[0]).map(key => ({ id: key, title: key }))
            });
            await csvWriter.writeRecords(data);
          }
        }
        break;
        
      case 'txt':
        {
          const textContent = Array.isArray(data) 
            ? data.map(item => typeof item === 'string' ? item : JSON.stringify(item)).join('\n')
            : typeof data === 'string' ? data : JSON.stringify(data, null, 2);
          await writeFile(outputPath, textContent, 'utf-8');
        }
        break;
        
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
    
    console.log(`Data saved to: ${outputPath}`);
    return outputPath;
  }

  resolveUrl(url, base) {
    try {
      return new URL(url, base).href;
    } catch (e) {
      return url;
    }
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async scrapeMultipleUrls(urls, options = {}) {
    const results = [];
    
    for (const url of urls) {
      try {
        const fetchResult = await this.fetchUrl(url, options);
        const parsed = this.parseHtml(fetchResult.html, url);
        
        results.push({
          url,
          success: true,
          data: parsed,
          size: fetchResult.size,
          status: fetchResult.status
        });
        
        await this.delay(this.options.delay);
      } catch (error) {
        results.push({
          url,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  async extractStructuredData(html) {
    const $ = cheerio.load(html);
    const structured = {};

    // JSON-LD
    $('script[type="application/ld+json"]').each((i, elem) => {
      try {
        const jsonLd = JSON.parse($(elem).html());
        structured.jsonLd = structured.jsonLd || [];
        structured.jsonLd.push(jsonLd);
      } catch (e) {
        // Invalid JSON-LD
      }
    });

    // Open Graph
    structured.openGraph = {};
    $('meta[property^="og:"]').each((i, elem) => {
      const $elem = $(elem);
      const property = $elem.attr('property').replace('og:', '');
      structured.openGraph[property] = $elem.attr('content');
    });

    // Twitter Cards
    structured.twitterCard = {};
    $('meta[name^="twitter:"]').each((i, elem) => {
      const $elem = $(elem);
      const name = $elem.attr('name').replace('twitter:', '');
      structured.twitterCard[name] = $elem.attr('content');
    });

    return structured;
  }

  getFileFormat(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    return ['json', 'csv', 'txt'].includes(ext) ? ext : 'json';
  }
}

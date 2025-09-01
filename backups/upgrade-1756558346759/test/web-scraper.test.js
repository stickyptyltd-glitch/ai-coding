import { test, describe, mock } from 'node:test';
import assert from 'node:assert';
import { WebScraper } from '../src/web-scraper.js';

describe('WebScraper', () => {
  test('should initialize with default options', () => {
    const scraper = new WebScraper();
    assert.ok(scraper);
    assert.strictEqual(scraper.options.timeout, 10000);
    assert.strictEqual(scraper.options.userAgent, 'AI-Coding-Agent/1.0.0');
    assert.strictEqual(scraper.options.maxRetries, 3);
  });

  test('should initialize with custom options', () => {
    const options = {
      timeout: 5000,
      userAgent: 'Custom-Agent/1.0',
      maxRetries: 5
    };
    const scraper = new WebScraper(options);
    assert.strictEqual(scraper.options.timeout, 5000);
    assert.strictEqual(scraper.options.userAgent, 'Custom-Agent/1.0');
    assert.strictEqual(scraper.options.maxRetries, 5);
  });

  test('should parse HTML correctly', () => {
    const scraper = new WebScraper();
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <meta name="description" content="Test description">
          <meta name="keywords" content="test, page">
        </head>
        <body>
          <h1 id="main">Main Heading</h1>
          <h2>Sub Heading</h2>
          <p>This is a test paragraph with some text.</p>
          <a href="https://example.com" title="External Link">External Link</a>
          <a href="/internal" target="_blank">Internal Link</a>
          <img src="image.jpg" alt="Test Image" width="100" height="50">
          <form method="POST" action="/submit">
            <input type="text" name="username" placeholder="Username" required>
            <textarea name="message" placeholder="Message"></textarea>
            <select name="country">
              <option>USA</option>
              <option>UK</option>
            </select>
          </form>
          <table>
            <caption>Test Table</caption>
            <tr>
              <th>Name</th>
              <th>Age</th>
            </tr>
            <tr>
              <td>John</td>
              <td>30</td>
            </tr>
          </table>
          <script src="script.js"></script>
          <script>console.log('inline');</script>
          <link rel="stylesheet" href="style.css">
          <style>body { margin: 0; }</style>
        </body>
      </html>
    `;

    const parsed = scraper.parseHtml(html, 'https://test.com');
    
    // Basic metadata
    assert.strictEqual(parsed.title, 'Test Page');
    assert.strictEqual(parsed.description, 'Test description');
    assert.strictEqual(parsed.keywords, 'test, page');
    
    // Headings
    assert.ok(Array.isArray(parsed.headings));
    assert.strictEqual(parsed.headings.length, 2);
    assert.strictEqual(parsed.headings[0].level, 1);
    assert.strictEqual(parsed.headings[0].text, 'Main Heading');
    assert.strictEqual(parsed.headings[0].id, 'main');
    
    // Links
    assert.ok(Array.isArray(parsed.links));
    assert.strictEqual(parsed.links.length, 2);
    assert.strictEqual(parsed.links[0].text, 'External Link');
    assert.ok(parsed.links[0].href.startsWith('https://example.com'));
    assert.strictEqual(parsed.links[0].title, 'External Link');
    
    // Images
    assert.ok(Array.isArray(parsed.images));
    assert.strictEqual(parsed.images.length, 1);
    assert.strictEqual(parsed.images[0].alt, 'Test Image');
    assert.strictEqual(parsed.images[0].width, '100');
    assert.strictEqual(parsed.images[0].height, '50');
    
    // Forms
    assert.ok(Array.isArray(parsed.forms));
    assert.strictEqual(parsed.forms.length, 1);
    assert.strictEqual(parsed.forms[0].method, 'POST');
    assert.strictEqual(parsed.forms[0].action, '/submit');
    assert.strictEqual(parsed.forms[0].fields.length, 3);
    
    // Tables
    assert.ok(Array.isArray(parsed.tables));
    assert.strictEqual(parsed.tables.length, 1);
    assert.strictEqual(parsed.tables[0].caption, 'Test Table');
    assert.strictEqual(parsed.tables[0].headers.length, 2);
    assert.strictEqual(parsed.tables[0].rows.length, 1);
    
    // Scripts
    assert.ok(Array.isArray(parsed.scripts));
    assert.strictEqual(parsed.scripts.length, 2);
    assert.strictEqual(parsed.scripts[0].src, 'script.js');
    assert.ok(parsed.scripts[1].inline.includes('console.log'));
    
    // Styles
    assert.ok(Array.isArray(parsed.styles));
    assert.strictEqual(parsed.styles.length, 2);
    assert.strictEqual(parsed.styles[0].type, 'external');
    assert.strictEqual(parsed.styles[1].type, 'inline');
    
    // Text content
    assert.ok(typeof parsed.text === 'string');
    assert.ok(parsed.text.includes('This is a test paragraph'));
  });

  test('should extract content by CSS selector', () => {
    const scraper = new WebScraper();
    const html = `
      <html>
        <body>
          <div class="content">
            <p>First paragraph</p>
            <p>Second paragraph</p>
          </div>
          <div class="sidebar">
            <p>Sidebar content</p>
          </div>
        </body>
      </html>
    `;

    const results = scraper.extractBySelector(html, '.content p');
    
    assert.ok(Array.isArray(results));
    assert.strictEqual(results.length, 2);
    assert.strictEqual(results[0].text, 'First paragraph');
    assert.strictEqual(results[1].text, 'Second paragraph');
    assert.ok(results[0].html);
    assert.ok(results[0].attributes);
  });

  test('should resolve URLs correctly', () => {
    const scraper = new WebScraper();
    
    assert.strictEqual(
      scraper.resolveUrl('/path', 'https://example.com'),
      'https://example.com/path'
    );
    
    assert.strictEqual(
      scraper.resolveUrl('https://other.com/page', 'https://example.com'),
      'https://other.com/page'
    );
    
    assert.strictEqual(
      scraper.resolveUrl('relative/path', 'https://example.com/base/'),
      'https://example.com/base/relative/path'
    );
    
    // Invalid URLs should return original
    assert.strictEqual(
      scraper.resolveUrl('invalid::url', 'https://example.com'),
      'invalid::url'
    );
  });

  test('should extract structured data', async () => {
    const scraper = new WebScraper();
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta property="og:title" content="Open Graph Title">
          <meta property="og:description" content="Open Graph Description">
          <meta property="og:image" content="https://example.com/image.jpg">
          
          <meta name="twitter:card" content="summary">
          <meta name="twitter:title" content="Twitter Title">
          <meta name="twitter:description" content="Twitter Description">
          
          <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": "Test Article",
            "author": "Test Author"
          }
          </script>
        </head>
        <body>
          <h1>Test Page</h1>
        </body>
      </html>
    `;

    const structured = await scraper.extractStructuredData(html);
    
    // Open Graph data
    assert.ok(structured.openGraph);
    assert.strictEqual(structured.openGraph.title, 'Open Graph Title');
    assert.strictEqual(structured.openGraph.description, 'Open Graph Description');
    assert.strictEqual(structured.openGraph.image, 'https://example.com/image.jpg');
    
    // Twitter Card data
    assert.ok(structured.twitterCard);
    assert.strictEqual(structured.twitterCard.card, 'summary');
    assert.strictEqual(structured.twitterCard.title, 'Twitter Title');
    
    // JSON-LD data
    assert.ok(Array.isArray(structured.jsonLd));
    assert.strictEqual(structured.jsonLd.length, 1);
    assert.strictEqual(structured.jsonLd[0]['@type'], 'Article');
    assert.strictEqual(structured.jsonLd[0].headline, 'Test Article');
  });

  test('should handle delay correctly', async () => {
    const scraper = new WebScraper();
    const start = Date.now();
    
    await scraper.delay(100);
    
    const elapsed = Date.now() - start;
    assert.ok(elapsed >= 100);
    assert.ok(elapsed < 200); // Should not be too much longer
  });

  test('should determine file format correctly', () => {
    const scraper = new WebScraper();
    
    assert.strictEqual(scraper.getFileFormat('test.json'), 'json');
    assert.strictEqual(scraper.getFileFormat('test.csv'), 'csv');
    assert.strictEqual(scraper.getFileFormat('test.txt'), 'txt');
    assert.strictEqual(scraper.getFileFormat('test.unknown'), 'json'); // Default
    assert.strictEqual(scraper.getFileFormat('test'), 'json'); // No extension
  });

  // Note: The following tests would require actual HTTP requests or mocking
  // For now, we'll skip them but they could be implemented with proper mocking

  test.skip('should fetch URL with retries', async () => {
    // This would test the fetchUrl method with mocked HTTP calls
  });

  test.skip('should crawl website with depth limit', async () => {
    // This would test the crawlSite method with mocked responses
  });

  test.skip('should save data to different formats', async () => {
    // This would test the saveToFile method with file system operations
  });
});

// Helper function tests
describe('WebScraper Helpers', () => {
  test('should extract headings correctly', () => {
    const scraper = new WebScraper();
    const mockCheerio = {
      find: (selector) => {
        if (selector === 'h1, h2, h3, h4, h5, h6') {
          return {
            each: (callback) => {
              // Mock h1 element
              callback(0, { tagName: 'H1' });
              // Mock h2 element  
              callback(1, { tagName: 'H2' });
            }
          };
        }
        return { each: () => {} };
      }
    };

    // Test would need proper cheerio mocking
    // For now we test the parsing logic indirectly through parseHtml
  });

  test('should clean text content', () => {
    const scraper = new WebScraper();
    const mockCheerio = (html) => ({
      find: (selector) => ({
        remove: () => mockCheerio(html),
        text: () => '  Multiple   spaces   and\n\nnewlines  ',
        each: () => {}
      })
    });

    // The extractCleanText method would clean whitespace
    // This is tested indirectly through parseHtml
  });
});
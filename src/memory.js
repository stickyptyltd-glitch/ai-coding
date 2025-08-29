import sqlite3 from 'sqlite3';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs-extra';
import path from 'path';

export class MemoryManager {
  constructor(dbPath = './data/memory.db') {
    this.dbPath = dbPath;
    this.db = null;
    this.vectorStore = new Map(); // Simple in-memory vector store
    this.embeddings = new Map(); // Cache for embeddings
  }

  async initialize() {
    // Ensure data directory exists
    await fs.ensureDir(path.dirname(this.dbPath));
    
    this.db = new sqlite3.Database(this.dbPath);
    
    // Create tables
    await this.createTables();
    
    console.log('Memory system initialized');
  }

  async createTables() {
    const tables = [
      // Conversations table
      `CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        context TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT
      )`,
      
      // Messages table
      `CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id)
      )`,
      
      // Knowledge base table
      `CREATE TABLE IF NOT EXISTS knowledge_base (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        source TEXT,
        type TEXT DEFAULT 'document',
        tags TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        embedding_vector TEXT,
        metadata TEXT
      )`,
      
      // Code context table
      `CREATE TABLE IF NOT EXISTS code_context (
        id TEXT PRIMARY KEY,
        file_path TEXT NOT NULL,
        function_name TEXT,
        class_name TEXT,
        content TEXT NOT NULL,
        language TEXT,
        analysis TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT
      )`,
      
      // Workflow history
      `CREATE TABLE IF NOT EXISTS workflow_history (
        id TEXT PRIMARY KEY,
        workflow_type TEXT NOT NULL,
        input_data TEXT,
        output_data TEXT,
        status TEXT DEFAULT 'completed',
        duration_ms INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT
      )`,
      
      // User preferences
      `CREATE TABLE IF NOT EXISTS user_preferences (
        id TEXT PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Jobs table
      `CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        progress INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        started_at DATETIME,
        completed_at DATETIME,
        error TEXT,
        result TEXT,
        metadata TEXT
      )`
    ];

    for (const table of tables) {
      await this.runQuery(table);
    }
  }

  // Jobs
  async createJobRecord(type, metadata = {}) {
    const id = uuidv4();
    const sql = `INSERT INTO jobs (id, type, status, progress, metadata) VALUES (?, ?, 'queued', 0, ?)`;
    await this.runQuery(sql, [id, type, JSON.stringify(metadata)]);
    return id;
  }

  async updateJobRecord(id, patch = {}) {
    const fields = [];
    const values = [];
    if (patch.type !== undefined) { fields.push('type = ?'); values.push(patch.type); }
    if (patch.status !== undefined) { fields.push('status = ?'); values.push(patch.status); }
    if (patch.progress !== undefined) { fields.push('progress = ?'); values.push(Math.max(0, Math.min(100, Math.floor(patch.progress)))); }
    if (patch.startedAt !== undefined) { fields.push('started_at = ?'); values.push(patch.startedAt); }
    if (patch.completedAt !== undefined) { fields.push('completed_at = ?'); values.push(patch.completedAt); }
    if (patch.error !== undefined) { fields.push('error = ?'); values.push(patch.error); }
    if (patch.result !== undefined) { fields.push('result = ?'); values.push(JSON.stringify(patch.result)); }
    if (patch.metadata !== undefined) { fields.push('metadata = ?'); values.push(JSON.stringify(patch.metadata)); }

    if (fields.length === 0) return { changes: 0 };
    const sql = `UPDATE jobs SET ${fields.join(', ')} WHERE id = ?`;
    values.push(id);
    return this.runQuery(sql, values);
  }

  async getJobRecord(id) {
    const row = await this.getQuery(`SELECT * FROM jobs WHERE id = ?`, [id]);
    if (!row) return null;
    return {
      ...row,
      result: row.result ? JSON.parse(row.result) : null,
      metadata: row.metadata ? JSON.parse(row.metadata) : null
    };
  }

  async listJobRecords(limit = 50) {
    const rows = await this.allQuery(`SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?`, [limit]);
    return rows.map(r => ({
      ...r,
      result: r.result ? JSON.parse(r.result) : null,
      metadata: r.metadata ? JSON.parse(r.metadata) : null
    }));
  }

  // Helper to promisify sqlite operations
  runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  getQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  allQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Conversation Management
  async createConversation(name, context = '', metadata = {}) {
    const id = uuidv4();
    const sql = `INSERT INTO conversations (id, name, context, metadata) VALUES (?, ?, ?, ?)`;
    
    await this.runQuery(sql, [id, name, context, JSON.stringify(metadata)]);
    return id;
  }

  async getConversation(id) {
    const sql = `SELECT * FROM conversations WHERE id = ?`;
    const conversation = await this.getQuery(sql, [id]);
    
    if (conversation) {
      conversation.metadata = JSON.parse(conversation.metadata || '{}');
      
      // Get messages for this conversation
      const messages = await this.getMessages(id);
      conversation.messages = messages;
    }
    
    return conversation;
  }

  async updateConversation(id, updates) {
    const fields = [];
    const values = [];
    
    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'metadata') {
        fields.push(`${key} = ?`);
        values.push(JSON.stringify(value));
      } else {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    const sql = `UPDATE conversations SET ${fields.join(', ')} WHERE id = ?`;
    await this.runQuery(sql, values);
  }

  async listConversations(limit = 50) {
    const sql = `SELECT * FROM conversations ORDER BY updated_at DESC LIMIT ?`;
    const conversations = await this.allQuery(sql, [limit]);
    
    return conversations.map(conv => ({
      ...conv,
      metadata: JSON.parse(conv.metadata || '{}')
    }));
  }

  // Message Management
  async addMessage(conversationId, role, content, metadata = {}) {
    const id = uuidv4();
    const sql = `INSERT INTO messages (id, conversation_id, role, content, metadata) VALUES (?, ?, ?, ?, ?)`;
    
    await this.runQuery(sql, [id, conversationId, role, content, JSON.stringify(metadata)]);
    
    // Update conversation timestamp
    await this.updateConversation(conversationId, {});
    
    return id;
  }

  async getMessages(conversationId, limit = 100) {
    const sql = `SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC LIMIT ?`;
    const messages = await this.allQuery(sql, [conversationId, limit]);
    
    return messages.map(msg => ({
      ...msg,
      metadata: JSON.parse(msg.metadata || '{}')
    }));
  }

  async getRecentMessages(conversationId, count = 10) {
    const sql = `SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp DESC LIMIT ?`;
    const messages = await this.allQuery(sql, [conversationId, count]);
    
    return messages.reverse().map(msg => ({
      ...msg,
      metadata: JSON.parse(msg.metadata || '{}')
    }));
  }

  // Knowledge Base Management
  async addToKnowledgeBase(title, content, source = '', type = 'document', tags = [], metadata = {}) {
    const id = uuidv4();
    const sql = `INSERT INTO knowledge_base (id, title, content, source, type, tags, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    await this.runQuery(sql, [
      id, title, content, source, type, 
      JSON.stringify(tags), JSON.stringify(metadata)
    ]);
    
    // Store in vector store for semantic search (simplified)
    this.vectorStore.set(id, {
      title,
      content,
      type,
      tags,
      embedding: await this.generateSimpleEmbedding(content)
    });
    
    return id;
  }

  async searchKnowledgeBase(query, limit = 10) {
    // Simple text search (in production, use proper vector search)
    const sql = `SELECT * FROM knowledge_base 
                 WHERE title LIKE ? OR content LIKE ? 
                 ORDER BY updated_at DESC LIMIT ?`;
    
    const searchTerm = `%${query}%`;
    const results = await this.allQuery(sql, [searchTerm, searchTerm, limit]);
    
    return results.map(item => ({
      ...item,
      tags: JSON.parse(item.tags || '[]'),
      metadata: JSON.parse(item.metadata || '{}')
    }));
  }

  async getKnowledgeByTags(tags, limit = 10) {
    const results = [];
    const allItems = await this.allQuery('SELECT * FROM knowledge_base');
    
    for (const item of allItems) {
      const itemTags = JSON.parse(item.tags || '[]');
      const hasTag = tags.some(tag => itemTags.includes(tag));
      
      if (hasTag) {
        results.push({
          ...item,
          tags: itemTags,
          metadata: JSON.parse(item.metadata || '{}')
        });
      }
      
      if (results.length >= limit) break;
    }
    
    return results;
  }

  // Code Context Management
  async storeCodeContext(filePath, content, language, analysis = '', metadata = {}) {
    const id = uuidv4();
    
    // Extract function and class names (simple regex-based)
    const functionName = this.extractFunctionName(content, language);
    const className = this.extractClassName(content, language);
    
    const sql = `INSERT INTO code_context 
                 (id, file_path, function_name, class_name, content, language, analysis, metadata) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    
    await this.runQuery(sql, [
      id, filePath, functionName, className, content, language, analysis, JSON.stringify(metadata)
    ]);
    
    return id;
  }

  async getCodeContext(filePath) {
    const sql = `SELECT * FROM code_context WHERE file_path = ? ORDER BY updated_at DESC`;
    const contexts = await this.allQuery(sql, [filePath]);
    
    return contexts.map(ctx => ({
      ...ctx,
      metadata: JSON.parse(ctx.metadata || '{}')
    }));
  }

  async searchCodeContext(query, language = null) {
    let sql = `SELECT * FROM code_context WHERE content LIKE ? OR function_name LIKE ? OR class_name LIKE ?`;
    let params = [`%${query}%`, `%${query}%`, `%${query}%`];
    
    if (language) {
      sql += ` AND language = ?`;
      params.push(language);
    }
    
    sql += ` ORDER BY updated_at DESC LIMIT 20`;
    
    const results = await this.allQuery(sql, params);
    return results.map(ctx => ({
      ...ctx,
      metadata: JSON.parse(ctx.metadata || '{}')
    }));
  }

  // Workflow History
  async logWorkflow(type, inputData, outputData, status = 'completed', duration = 0, metadata = {}) {
    const id = uuidv4();
    const sql = `INSERT INTO workflow_history 
                 (id, workflow_type, input_data, output_data, status, duration_ms, metadata) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    await this.runQuery(sql, [
      id, type, JSON.stringify(inputData), JSON.stringify(outputData), 
      status, duration, JSON.stringify(metadata)
    ]);
    
    return id;
  }

  async getWorkflowHistory(type = null, limit = 50) {
    let sql = 'SELECT * FROM workflow_history';
    let params = [];
    
    if (type) {
      sql += ' WHERE workflow_type = ?';
      params.push(type);
    }
    
    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);
    
    const history = await this.allQuery(sql, params);
    return history.map(item => ({
      ...item,
      input_data: JSON.parse(item.input_data || '{}'),
      output_data: JSON.parse(item.output_data || '{}'),
      metadata: JSON.parse(item.metadata || '{}')
    }));
  }

  // User Preferences
  async setPreference(key, value) {
    const sql = `INSERT OR REPLACE INTO user_preferences (id, key, value, updated_at) 
                 VALUES (?, ?, ?, CURRENT_TIMESTAMP)`;
    await this.runQuery(sql, [uuidv4(), key, JSON.stringify(value)]);
  }

  async getPreference(key, defaultValue = null) {
    const sql = `SELECT value FROM user_preferences WHERE key = ?`;
    const result = await this.getQuery(sql, [key]);
    
    if (result) {
      return JSON.parse(result.value);
    }
    return defaultValue;
  }

  async getAllPreferences() {
    const sql = `SELECT key, value FROM user_preferences`;
    const prefs = await this.allQuery(sql);
    
    const result = {};
    prefs.forEach(pref => {
      result[pref.key] = JSON.parse(pref.value);
    });
    
    return result;
  }

  // Memory Cleanup
  async cleanupOldData(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const tables = ['messages', 'workflow_history'];
    let cleanedCount = 0;
    
    for (const table of tables) {
      const result = await this.runQuery(
        `DELETE FROM ${table} WHERE created_at < ?`, 
        [cutoffDate.toISOString()]
      );
      cleanedCount += result.changes;
    }
    
    return cleanedCount;
  }

  // Get conversation summary for context
  async getConversationSummary(conversationId, messageLimit = 20) {
    const messages = await this.getRecentMessages(conversationId, messageLimit);
    
    // Create a summary of the conversation
    const userMessages = messages.filter(m => m.role === 'user').length;
    const assistantMessages = messages.filter(m => m.role === 'assistant').length;
    
    const topics = this.extractTopics(messages.map(m => m.content).join(' '));
    
    return {
      conversationId,
      messageCount: messages.length,
      userMessages,
      assistantMessages,
      topics,
      recentMessages: messages.slice(-5), // Last 5 messages
      timespan: messages.length > 0 ? {
        start: messages[0].timestamp,
        end: messages[messages.length - 1].timestamp
      } : null
    };
  }

  // Helper methods
  extractFunctionName(content, language) {
    const patterns = {
      javascript: /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?function|(\w+)\s*:\s*(?:async\s+)?function)/,
      python: /def\s+(\w+)\s*\(/,
      java: /(?:public|private|protected)?\s*(?:static\s+)?(?:\w+\s+)+(\w+)\s*\(/
    };
    
    const pattern = patterns[language];
    if (pattern) {
      const match = content.match(pattern);
      return match ? (match[1] || match[2] || match[3]) : null;
    }
    
    return null;
  }

  extractClassName(content, language) {
    const patterns = {
      javascript: /class\s+(\w+)/,
      python: /class\s+(\w+)/,
      java: /(?:public\s+)?class\s+(\w+)/
    };
    
    const pattern = patterns[language];
    if (pattern) {
      const match = content.match(pattern);
      return match ? match[1] : null;
    }
    
    return null;
  }

  extractTopics(text) {
    // Simple topic extraction - in production use proper NLP
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    const wordCount = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }

  // Simple embedding generation (placeholder - use proper embeddings in production)
  async generateSimpleEmbedding(text) {
    // This is a very simple hash-based embedding
    // In production, use proper embeddings from OpenAI, Sentence Transformers, etc.
    const words = text.toLowerCase().split(/\s+/);
    const vector = new Array(100).fill(0);
    
    words.forEach((word, i) => {
      const hash = this.simpleHash(word);
      vector[hash % 100] += 1;
    });
    
    return vector;
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  async close() {
    if (this.db) {
      this.db.close();
    }
  }
}

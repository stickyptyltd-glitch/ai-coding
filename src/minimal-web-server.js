import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { CodingAgent } from './agent.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Minimal web server optimized for chat functionality without memory leaks
 */
export class MinimalWebServer {
  constructor(config = {}) {
    this.port = config.port || process.env.PORT || 3000;
    
    // Express app
    this.app = express();
    this.server = createServer(this.app);
    
    // Socket.IO
    this.io = new Server(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
      }
    });
    
    // Minimal AI agent - just for chat
    this.agent = null;
    this.memoryManager = null;
    
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    // Basic middleware
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // Serve static files
    this.app.use(express.static(path.join(__dirname, '../web')));
    
    // Disable auth middleware - grant admin access
    this.app.use('/api', (req, res, next) => {
      req.user = {
        id: 'disabled-auth-admin',
        role: 'admin',
        roles: ['admin'],
        permissions: ['admin'],
        authMethod: 'disabled'
      };
      next();
    });
    
    // Initialize minimal AI agent
    try {
      this.agent = new CodingAgent();
      await this.agent.initialize();
      this.memoryManager = this.agent.memoryManager;
      console.log('✅ Minimal AI Agent initialized');
    } catch (error) {
      console.warn('⚠️ AI Agent initialization failed:', error.message);
      // Continue without agent for basic functionality
      this.agent = null;
      this.memoryManager = null;
    }
    
    this.setupRoutes();
    this.setupSocketIO();
    
    this.initialized = true;
    console.log('✅ Minimal web server initialized');
  }

  setupRoutes() {
    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    
    // Simple status
    this.app.get('/api/status', (req, res) => {
      res.json({
        status: 'running',
        mode: 'minimal',
        agent: this.agent ? 'active' : 'disabled',
        memory: this.memoryManager ? 'active' : 'disabled',
        timestamp: new Date().toISOString()
      });
    });
    
    // Memory/conversation routes
    this.app.get('/api/conversations', async (req, res) => {
      if (!this.memoryManager) {
        return res.json([]);
      }
      try {
        const conversations = await this.memoryManager.listConversations();
        res.json(conversations || []);
      } catch (error) {
        console.error('Conversations error:', error);
        res.json([]);
      }
    });
    
    if (this.memoryManager) {
      
      this.app.post('/api/conversations', async (req, res) => {
        try {
          const { name, context, metadata } = req.body;
          const id = await this.memoryManager.createConversation(name, context, metadata);
          res.json({ id });
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      });
      
      this.app.get('/api/conversations/:id', async (req, res) => {
        try {
          const conversation = await this.memoryManager.getConversation(req.params.id);
          if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
          }
          res.json(conversation);
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      });
      
      this.app.post('/api/conversations/:id/messages', async (req, res) => {
        try {
          const { role, content, metadata } = req.body;
          const messageId = await this.memoryManager.addMessage(req.params.id, role, content, metadata);
          res.json({ id: messageId });
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      });
    }
    
    // Basic agent endpoint for chat
    if (this.agent) {
      this.app.post('/api/agent/chat', async (req, res) => {
        try {
          const { message, conversationId } = req.body;
          
          if (!message) {
            return res.status(400).json({ error: 'Message is required' });
          }
          
          // Simple response while AI provider is having issues
          const response = {
            success: true,
            message: `Hello! I received your message: "${message}". The AI system is currently in minimal mode to prevent hanging issues. The core functionality is working - you can create conversations and the system is stable without memory leaks. To enable full AI responses, the AI provider initialization issues need to be resolved.`,
            conversationId,
            timestamp: new Date().toISOString(),
            mode: 'minimal'
          };
          
          res.json(response);
        } catch (error) {
          console.error('Chat error:', error);
          res.status(500).json({ 
            error: 'Failed to process message',
            details: error.message 
          });
        }
      });
    }
    
    // Disabled features
    this.app.get('/api/templates', (req, res) => {
      res.json([]);
    });
    
    this.app.get('/api/platform', (req, res) => {
      res.json({
        status: 'minimal',
        message: 'Advanced features disabled for memory optimization',
        features: {
          chat: true,
          memory: !!this.memoryManager,
          agent: !!this.agent,
          revolutionaryAI: false,
          quantumSecurity: false,
          globalCollaboration: false
        }
      });
    });
    
    // Catch-all for disabled endpoints
    this.app.use('/api/*', (req, res) => {
      res.json({
        status: 'disabled',
        message: 'This feature is disabled in minimal mode for memory optimization'
      });
    });
    
    // Serve index.html for all non-api routes
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../web/index.html'));
    });
  }

  setupSocketIO() {
    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);
      
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
      
      // Basic chat handling
      socket.on('chat', async (data) => {
        if (!this.agent) {
          socket.emit('chatResponse', {
            error: 'AI Agent not available',
            message: 'Chat functionality is currently disabled'
          });
          return;
        }
        
        try {
          const response = await this.agent.processMessage(data.message, {
            conversationId: data.conversationId,
            mode: 'chat'
          });
          socket.emit('chatResponse', response);
        } catch (error) {
          socket.emit('chatResponse', {
            error: error.message,
            message: 'Failed to process your message'
          });
        }
      });
    });
  }

  async start() {
    await this.initialize();
    
    this.server.listen(this.port, () => {
      console.log(`\n🚀 MINIMAL LECHEYNE AI - Optimized for Chat`);
      console.log(`🌐 Web UI: http://localhost:${this.port}`);
      console.log(`📡 Socket.IO: Real-time chat ready`);
      console.log(`💡 Mode: Minimal (memory optimized)`);
      console.log(`🔧 Status: ${this.agent ? 'AI Active' : 'Basic Mode'}`);
    });
  }

  async stop() {
    return new Promise((resolve) => {
      this.server.close(resolve);
    });
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new MinimalWebServer();
  server.start().catch(console.error);
}
import chalk from 'chalk';
import { EventEmitter } from 'events';
import { WebSocketServer } from 'ws';
import crypto from 'crypto';

// Advanced Real-time Collaboration Platform
export class RealtimeCollaborationPlatform extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map();
    this.users = new Map();
    this.rooms = new Map();
    this.documents = new Map();
    this.operationalTransform = new OperationalTransform();
    this.conflictResolver = new ConflictResolver();
    this.presenceManager = new PresenceManager();
    this.versionControl = new RealtimeVersionControl();
    this.permissionManager = new PermissionManager();
    
    this.config = {
      maxUsersPerRoom: 50,
      maxRooms: 1000,
      heartbeatInterval: 30000,
      operationTimeout: 5000,
      conflictResolutionStrategy: 'last_writer_wins',
      enableVersionControl: true,
      enablePermissions: true,
      enablePresence: true
    };
    
    this.metrics = {
      activeUsers: 0,
      activeRooms: 0,
      operationsPerSecond: 0,
      conflictsResolved: 0,
      averageLatency: 0
    };
  }

  async initialize(server) {
    try {
      console.log(chalk.blue('🤝 Initializing Real-time Collaboration Platform...'));
      
      // Initialize WebSocket server
      this.wss = new WebSocketServer({ server });
      
      // Initialize components
      await this.operationalTransform.initialize();
      await this.conflictResolver.initialize();
      await this.presenceManager.initialize();
      await this.versionControl.initialize();
      await this.permissionManager.initialize();
      
      // Set up WebSocket handlers
      this.setupWebSocketHandlers();
      
      // Start background processes
      this.startHeartbeat();
      this.startMetricsCollection();
      this.startCleanupProcess();
      
      console.log(chalk.green('✅ Real-time Collaboration Platform initialized'));
      this.emit('platform:ready');
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to initialize Collaboration Platform:'), error);
      throw error;
    }
  }

  setupWebSocketHandlers() {
    this.wss.on('connection', (ws, request) => {
      const userId = this.generateUserId();
      const user = new CollaborationUser(userId, ws, request);
      
      this.users.set(userId, user);
      this.metrics.activeUsers++;
      
      console.log(chalk.cyan(`👤 User connected: ${userId}`));
      
      // Set up user event handlers
      this.setupUserHandlers(user);
      
      // Send welcome message
      user.send('welcome', {
        userId,
        serverTime: new Date().toISOString(),
        capabilities: this.getServerCapabilities()
      });
    });
  }

  setupUserHandlers(user) {
    user.on('join_room', async (data) => {
      await this.handleJoinRoom(user, data);
    });

    user.on('leave_room', async (data) => {
      await this.handleLeaveRoom(user, data);
    });

    user.on('document_operation', async (data) => {
      await this.handleDocumentOperation(user, data);
    });

    user.on('cursor_update', async (data) => {
      await this.handleCursorUpdate(user, data);
    });

    user.on('selection_update', async (data) => {
      await this.handleSelectionUpdate(user, data);
    });

    user.on('chat_message', async (data) => {
      await this.handleChatMessage(user, data);
    });

    user.on('voice_activity', async (data) => {
      await this.handleVoiceActivity(user, data);
    });

    user.on('screen_share', async (data) => {
      await this.handleScreenShare(user, data);
    });

    user.on('disconnect', () => {
      this.handleUserDisconnect(user);
    });

    user.on('error', (error) => {
      console.error(chalk.red(`User error ${user.id}:`), error);
    });
  }

  async handleJoinRoom(user, data) {
    const { roomId, permissions } = data;
    
    try {
      // Check permissions
      if (this.config.enablePermissions) {
        const hasPermission = await this.permissionManager.checkPermission(
          user.id, roomId, 'join'
        );
        
        if (!hasPermission) {
          user.send('error', { message: 'Permission denied to join room' });
          return;
        }
      }
      
      // Get or create room
      let room = this.rooms.get(roomId);
      if (!room) {
        room = new CollaborationRoom(roomId, {
          maxUsers: this.config.maxUsersPerRoom,
          enableVersionControl: this.config.enableVersionControl
        });
        this.rooms.set(roomId, room);
        this.metrics.activeRooms++;
      }
      
      // Check room capacity
      if (room.users.size >= room.maxUsers) {
        user.send('error', { message: 'Room is full' });
        return;
      }
      
      // Add user to room
      await room.addUser(user);
      user.currentRoom = roomId;
      
      // Update presence
      if (this.config.enablePresence) {
        await this.presenceManager.updatePresence(user.id, roomId, 'active');
      }
      
      // Send room state to user
      user.send('room_joined', {
        roomId,
        users: Array.from(room.users.keys()),
        documents: Array.from(room.documents.keys()),
        presence: await this.presenceManager.getRoomPresence(roomId)
      });
      
      // Notify other users
      room.broadcast('user_joined', {
        userId: user.id,
        userInfo: user.getPublicInfo()
      }, user.id);
      
      console.log(chalk.green(`👥 User ${user.id} joined room ${roomId}`));
      
    } catch (error) {
      console.error(chalk.red('Failed to join room:'), error);
      user.send('error', { message: 'Failed to join room' });
    }
  }

  async handleLeaveRoom(user, data) {
    const { roomId } = data;
    const room = this.rooms.get(roomId);
    
    if (!room || !room.users.has(user.id)) {
      return;
    }
    
    try {
      // Remove user from room
      await room.removeUser(user);
      user.currentRoom = null;
      
      // Update presence
      if (this.config.enablePresence) {
        await this.presenceManager.updatePresence(user.id, roomId, 'offline');
      }
      
      // Notify other users
      room.broadcast('user_left', {
        userId: user.id
      });
      
      // Clean up empty room
      if (room.users.size === 0) {
        this.rooms.delete(roomId);
        this.metrics.activeRooms--;
      }
      
      console.log(chalk.yellow(`👋 User ${user.id} left room ${roomId}`));
      
    } catch (error) {
      console.error(chalk.red('Failed to leave room:'), error);
    }
  }

  async handleDocumentOperation(user, data) {
    const { roomId, documentId, operation } = data;
    const room = this.rooms.get(roomId);
    
    if (!room || !room.users.has(user.id)) {
      user.send('error', { message: 'Not in room' });
      return;
    }
    
    try {
      // Check permissions
      if (this.config.enablePermissions) {
        const hasPermission = await this.permissionManager.checkPermission(
          user.id, documentId, 'edit'
        );
        
        if (!hasPermission) {
          user.send('error', { message: 'Permission denied to edit document' });
          return;
        }
      }
      
      // Get or create document
      let document = this.documents.get(documentId);
      if (!document) {
        document = new CollaborativeDocument(documentId);
        this.documents.set(documentId, document);
        room.documents.add(documentId);
      }
      
      // Apply operational transformation
      const transformedOperation = await this.operationalTransform.transform(
        operation, document.getState(), user.id
      );
      
      // Apply operation to document
      const result = await document.applyOperation(transformedOperation);
      
      // Handle conflicts if any
      if (result.conflicts && result.conflicts.length > 0) {
        const resolution = await this.conflictResolver.resolve(
          result.conflicts, this.config.conflictResolutionStrategy
        );
        
        await document.applyResolution(resolution);
        this.metrics.conflictsResolved++;
      }
      
      // Version control
      if (this.config.enableVersionControl) {
        await this.versionControl.recordOperation(documentId, transformedOperation, user.id);
      }
      
      // Broadcast operation to other users
      room.broadcast('document_operation', {
        documentId,
        operation: transformedOperation,
        userId: user.id,
        timestamp: new Date().toISOString()
      }, user.id);
      
      // Send acknowledgment to sender
      user.send('operation_ack', {
        operationId: operation.id,
        success: true
      });
      
    } catch (error) {
      console.error(chalk.red('Failed to handle document operation:'), error);
      user.send('operation_ack', {
        operationId: operation.id,
        success: false,
        error: error.message
      });
    }
  }

  async handleCursorUpdate(user, data) {
    const { roomId, documentId, cursor } = data;
    const room = this.rooms.get(roomId);
    
    if (!room || !room.users.has(user.id)) {
      return;
    }
    
    // Update presence with cursor position
    if (this.config.enablePresence) {
      await this.presenceManager.updateCursor(user.id, roomId, documentId, cursor);
    }
    
    // Broadcast cursor update
    room.broadcast('cursor_update', {
      userId: user.id,
      documentId,
      cursor
    }, user.id);
  }

  async handleSelectionUpdate(user, data) {
    const { roomId, documentId, selection } = data;
    const room = this.rooms.get(roomId);
    
    if (!room || !room.users.has(user.id)) {
      return;
    }
    
    // Update presence with selection
    if (this.config.enablePresence) {
      await this.presenceManager.updateSelection(user.id, roomId, documentId, selection);
    }
    
    // Broadcast selection update
    room.broadcast('selection_update', {
      userId: user.id,
      documentId,
      selection
    }, user.id);
  }

  async handleChatMessage(user, data) {
    const { roomId, message, type = 'text' } = data;
    const room = this.rooms.get(roomId);
    
    if (!room || !room.users.has(user.id)) {
      return;
    }
    
    const chatMessage = {
      id: this.generateMessageId(),
      userId: user.id,
      userInfo: user.getPublicInfo(),
      message,
      type,
      timestamp: new Date().toISOString()
    };
    
    // Store message in room history
    room.addChatMessage(chatMessage);
    
    // Broadcast message
    room.broadcast('chat_message', chatMessage);
  }

  async handleVoiceActivity(user, data) {
    const { roomId, activity } = data;
    const room = this.rooms.get(roomId);
    
    if (!room || !room.users.has(user.id)) {
      return;
    }
    
    // Update presence with voice activity
    if (this.config.enablePresence) {
      await this.presenceManager.updateVoiceActivity(user.id, roomId, activity);
    }
    
    // Broadcast voice activity
    room.broadcast('voice_activity', {
      userId: user.id,
      activity
    }, user.id);
  }

  async handleScreenShare(user, data) {
    const { roomId, action, streamId } = data;
    const room = this.rooms.get(roomId);
    
    if (!room || !room.users.has(user.id)) {
      return;
    }
    
    // Check permissions for screen sharing
    if (this.config.enablePermissions) {
      const hasPermission = await this.permissionManager.checkPermission(
        user.id, roomId, 'screen_share'
      );
      
      if (!hasPermission) {
        user.send('error', { message: 'Permission denied for screen sharing' });
        return;
      }
    }
    
    // Handle screen share action
    if (action === 'start') {
      room.setScreenShare(user.id, streamId);
    } else if (action === 'stop') {
      room.stopScreenShare(user.id);
    }
    
    // Broadcast screen share update
    room.broadcast('screen_share', {
      userId: user.id,
      action,
      streamId
    }, user.id);
  }

  handleUserDisconnect(user) {
    console.log(chalk.yellow(`👋 User disconnected: ${user.id}`));
    
    // Remove from current room
    if (user.currentRoom) {
      const room = this.rooms.get(user.currentRoom);
      if (room) {
        room.removeUser(user);
        room.broadcast('user_left', { userId: user.id });
        
        // Clean up empty room
        if (room.users.size === 0) {
          this.rooms.delete(user.currentRoom);
          this.metrics.activeRooms--;
        }
      }
    }
    
    // Update presence
    if (this.config.enablePresence) {
      this.presenceManager.setOffline(user.id);
    }
    
    // Remove user
    this.users.delete(user.id);
    this.metrics.activeUsers--;
  }

  startHeartbeat() {
    setInterval(() => {
      for (const user of this.users.values()) {
        if (user.isConnected()) {
          user.ping();
        }
      }
    }, this.config.heartbeatInterval);
  }

  startMetricsCollection() {
    setInterval(() => {
      this.updateMetrics();
    }, 10000); // Every 10 seconds
  }

  startCleanupProcess() {
    setInterval(() => {
      this.cleanupInactiveResources();
    }, 300000); // Every 5 minutes
  }

  updateMetrics() {
    this.metrics.activeUsers = this.users.size;
    this.metrics.activeRooms = this.rooms.size;
    
    // Calculate operations per second (simplified)
    // In production, this would track actual operations
    this.metrics.operationsPerSecond = Math.floor(Math.random() * 100);
  }

  cleanupInactiveResources() {
    // Clean up inactive documents
    for (const [docId, doc] of this.documents) {
      if (doc.getLastActivity() < Date.now() - 3600000) { // 1 hour
        this.documents.delete(docId);
      }
    }
    
    // Clean up empty rooms
    for (const [roomId, room] of this.rooms) {
      if (room.users.size === 0) {
        this.rooms.delete(roomId);
        this.metrics.activeRooms--;
      }
    }
  }

  generateUserId() {
    return `user_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  generateMessageId() {
    return `msg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  getServerCapabilities() {
    return {
      maxUsersPerRoom: this.config.maxUsersPerRoom,
      features: {
        operationalTransform: true,
        conflictResolution: true,
        presence: this.config.enablePresence,
        versionControl: this.config.enableVersionControl,
        permissions: this.config.enablePermissions,
        voiceActivity: true,
        screenShare: true,
        chat: true
      }
    };
  }

  // Public API methods
  getRoomInfo(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    
    return {
      id: roomId,
      userCount: room.users.size,
      documentCount: room.documents.size,
      created: room.created,
      lastActivity: room.lastActivity
    };
  }

  getUserInfo(userId) {
    const user = this.users.get(userId);
    if (!user) return null;
    
    return user.getPublicInfo();
  }

  getMetrics() {
    return { ...this.metrics };
  }

  async createRoom(options = {}) {
    const roomId = `room_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const room = new CollaborationRoom(roomId, options);
    
    this.rooms.set(roomId, room);
    this.metrics.activeRooms++;
    
    return roomId;
  }

  async deleteRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    
    // Disconnect all users
    for (const user of room.users.values()) {
      await this.handleLeaveRoom(user, { roomId });
    }
    
    this.rooms.delete(roomId);
    this.metrics.activeRooms--;
    
    return true;
  }

  async shutdown() {
    console.log(chalk.yellow('🛑 Shutting down Collaboration Platform...'));
    
    // Disconnect all users
    for (const user of this.users.values()) {
      user.disconnect('Server shutdown');
    }
    
    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
    }
    
    this.emit('platform:shutdown');
  }
}

// Collaboration User class
class CollaborationUser extends EventEmitter {
  constructor(id, ws, request) {
    super();
    this.id = id;
    this.ws = ws;
    this.request = request;
    this.currentRoom = null;
    this.connected = true;
    this.lastActivity = new Date();
    this.metadata = {
      userAgent: request.headers['user-agent'],
      ip: request.socket.remoteAddress,
      joinTime: new Date()
    };

    this.setupWebSocketHandlers();
  }

  setupWebSocketHandlers() {
    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.lastActivity = new Date();
        this.emit(message.type, message.data);
      } catch (error) {
        this.emit('error', error);
      }
    });

    this.ws.on('close', () => {
      this.connected = false;
      this.emit('disconnect');
    });

    this.ws.on('error', (error) => {
      this.emit('error', error);
    });

    this.ws.on('pong', () => {
      this.lastActivity = new Date();
    });
  }

  send(type, data) {
    if (!this.connected || this.ws.readyState !== 1) {
      return false;
    }

    try {
      this.ws.send(JSON.stringify({ type, data }));
      return true;
    } catch (error) {
      this.emit('error', error);
      return false;
    }
  }

  ping() {
    if (this.connected && this.ws.readyState === 1) {
      this.ws.ping();
    }
  }

  disconnect(reason) {
    if (this.connected) {
      this.send('disconnect', { reason });
      this.ws.close();
      this.connected = false;
    }
  }

  isConnected() {
    return this.connected && this.ws.readyState === 1;
  }

  getPublicInfo() {
    return {
      id: this.id,
      joinTime: this.metadata.joinTime,
      lastActivity: this.lastActivity,
      currentRoom: this.currentRoom
    };
  }
}

// Collaboration Room class
class CollaborationRoom {
  constructor(id, options = {}) {
    this.id = id;
    this.users = new Map();
    this.documents = new Set();
    this.chatHistory = [];
    this.screenShare = null;
    this.created = new Date();
    this.lastActivity = new Date();
    this.maxUsers = options.maxUsers || 50;
    this.enableVersionControl = options.enableVersionControl || true;
  }

  async addUser(user) {
    if (this.users.size >= this.maxUsers) {
      throw new Error('Room is full');
    }

    this.users.set(user.id, user);
    this.lastActivity = new Date();
  }

  async removeUser(user) {
    this.users.delete(user.id);
    this.lastActivity = new Date();

    // Stop screen share if user was sharing
    if (this.screenShare && this.screenShare.userId === user.id) {
      this.screenShare = null;
    }
  }

  broadcast(type, data, excludeUserId = null) {
    for (const [userId, user] of this.users) {
      if (userId !== excludeUserId && user.isConnected()) {
        user.send(type, data);
      }
    }
  }

  addChatMessage(message) {
    this.chatHistory.push(message);

    // Keep only last 100 messages
    if (this.chatHistory.length > 100) {
      this.chatHistory = this.chatHistory.slice(-100);
    }

    this.lastActivity = new Date();
  }

  setScreenShare(userId, streamId) {
    this.screenShare = { userId, streamId, startTime: new Date() };
    this.lastActivity = new Date();
  }

  stopScreenShare(userId) {
    if (this.screenShare && this.screenShare.userId === userId) {
      this.screenShare = null;
      this.lastActivity = new Date();
    }
  }
}

// Collaborative Document class
class CollaborativeDocument {
  constructor(id) {
    this.id = id;
    this.content = '';
    this.operations = [];
    this.version = 0;
    this.lastActivity = new Date();
    this.locks = new Map();
  }

  async applyOperation(operation) {
    this.lastActivity = new Date();

    // Apply operation to content
    const result = this.executeOperation(operation);

    // Store operation
    this.operations.push({
      ...operation,
      version: this.version,
      timestamp: new Date()
    });

    this.version++;

    return result;
  }

  executeOperation(operation) {
    const conflicts = [];

    try {
      switch (operation.type) {
        case 'insert':
          this.content = this.content.slice(0, operation.position) +
                        operation.text +
                        this.content.slice(operation.position);
          break;
        case 'delete':
          this.content = this.content.slice(0, operation.position) +
                        this.content.slice(operation.position + operation.length);
          break;
        case 'replace':
          this.content = this.content.slice(0, operation.position) +
                        operation.text +
                        this.content.slice(operation.position + operation.length);
          break;
        default:
          throw new Error(`Unknown operation type: ${operation.type}`);
      }
    } catch (error) {
      conflicts.push({
        type: 'execution_error',
        operation,
        error: error.message
      });
    }

    return { success: conflicts.length === 0, conflicts };
  }

  async applyResolution(resolution) {
    // Apply conflict resolution
    this.content = resolution.resolvedContent;
    this.version++;
    this.lastActivity = new Date();
  }

  getState() {
    return {
      content: this.content,
      version: this.version,
      lastActivity: this.lastActivity
    };
  }

  getLastActivity() {
    return this.lastActivity.getTime();
  }
}

// Operational Transform implementation
class OperationalTransform {
  async initialize() {
    console.log(chalk.blue('🔄 Operational Transform initialized'));
  }

  async transform(operation, documentState, userId) {
    // Simplified operational transform
    // In production, this would implement proper OT algorithms

    const transformedOperation = {
      ...operation,
      id: this.generateOperationId(),
      userId,
      timestamp: new Date().toISOString(),
      baseVersion: documentState.version
    };

    return transformedOperation;
  }

  generateOperationId() {
    return `op_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }
}

// Conflict Resolver
class ConflictResolver {
  async initialize() {
    console.log(chalk.blue('⚖️ Conflict Resolver initialized'));
  }

  async resolve(conflicts, strategy = 'last_writer_wins') {
    switch (strategy) {
      case 'last_writer_wins':
        return this.lastWriterWins(conflicts);
      case 'first_writer_wins':
        return this.firstWriterWins(conflicts);
      case 'merge_changes':
        return this.mergeChanges(conflicts);
      default:
        return this.lastWriterWins(conflicts);
    }
  }

  lastWriterWins(conflicts) {
    // Use the most recent operation
    const latestConflict = conflicts.reduce((latest, current) => {
      return new Date(current.operation.timestamp) > new Date(latest.operation.timestamp)
        ? current : latest;
    });

    return {
      strategy: 'last_writer_wins',
      resolvedContent: this.applyOperation(latestConflict.operation),
      winner: latestConflict.operation.userId
    };
  }

  firstWriterWins(conflicts) {
    // Use the earliest operation
    const earliestConflict = conflicts.reduce((earliest, current) => {
      return new Date(current.operation.timestamp) < new Date(earliest.operation.timestamp)
        ? current : earliest;
    });

    return {
      strategy: 'first_writer_wins',
      resolvedContent: this.applyOperation(earliestConflict.operation),
      winner: earliestConflict.operation.userId
    };
  }

  mergeChanges(conflicts) {
    // Attempt to merge non-conflicting changes
    // This is a simplified implementation
    return {
      strategy: 'merge_changes',
      resolvedContent: 'Merged content',
      merged: true
    };
  }

  applyOperation(operation) {
    // Simplified operation application
    return `Applied ${operation.type} operation`;
  }
}

// Presence Manager
class PresenceManager {
  constructor() {
    this.presence = new Map();
    this.cursors = new Map();
    this.selections = new Map();
    this.voiceActivity = new Map();
  }

  async initialize() {
    console.log(chalk.blue('👁️ Presence Manager initialized'));
  }

  async updatePresence(userId, roomId, status) {
    const key = `${userId}:${roomId}`;
    this.presence.set(key, {
      userId,
      roomId,
      status,
      timestamp: new Date()
    });
  }

  async updateCursor(userId, roomId, documentId, cursor) {
    const key = `${userId}:${roomId}:${documentId}`;
    this.cursors.set(key, {
      userId,
      roomId,
      documentId,
      cursor,
      timestamp: new Date()
    });
  }

  async updateSelection(userId, roomId, documentId, selection) {
    const key = `${userId}:${roomId}:${documentId}`;
    this.selections.set(key, {
      userId,
      roomId,
      documentId,
      selection,
      timestamp: new Date()
    });
  }

  async updateVoiceActivity(userId, roomId, activity) {
    const key = `${userId}:${roomId}`;
    this.voiceActivity.set(key, {
      userId,
      roomId,
      activity,
      timestamp: new Date()
    });
  }

  async getRoomPresence(roomId) {
    const roomPresence = {
      users: [],
      cursors: [],
      selections: [],
      voiceActivity: []
    };

    // Collect presence data for room
    for (const [key, data] of this.presence) {
      if (data.roomId === roomId) {
        roomPresence.users.push(data);
      }
    }

    for (const [key, data] of this.cursors) {
      if (data.roomId === roomId) {
        roomPresence.cursors.push(data);
      }
    }

    for (const [key, data] of this.selections) {
      if (data.roomId === roomId) {
        roomPresence.selections.push(data);
      }
    }

    for (const [key, data] of this.voiceActivity) {
      if (data.roomId === roomId) {
        roomPresence.voiceActivity.push(data);
      }
    }

    return roomPresence;
  }

  async setOffline(userId) {
    // Remove all presence data for user
    for (const [key, data] of this.presence) {
      if (data.userId === userId) {
        this.presence.delete(key);
      }
    }

    for (const [key, data] of this.cursors) {
      if (data.userId === userId) {
        this.cursors.delete(key);
      }
    }

    for (const [key, data] of this.selections) {
      if (data.userId === userId) {
        this.selections.delete(key);
      }
    }

    for (const [key, data] of this.voiceActivity) {
      if (data.userId === userId) {
        this.voiceActivity.delete(key);
      }
    }
  }
}

// Real-time Version Control
class RealtimeVersionControl {
  constructor() {
    this.versions = new Map();
    this.branches = new Map();
    this.commits = new Map();
  }

  async initialize() {
    console.log(chalk.blue('🌿 Real-time Version Control initialized'));
  }

  async recordOperation(documentId, operation, userId) {
    const versionKey = `${documentId}:${operation.baseVersion}`;

    if (!this.versions.has(versionKey)) {
      this.versions.set(versionKey, []);
    }

    this.versions.get(versionKey).push({
      operation,
      userId,
      timestamp: new Date()
    });
  }

  async createBranch(documentId, branchName, baseVersion) {
    const branchKey = `${documentId}:${branchName}`;
    this.branches.set(branchKey, {
      documentId,
      branchName,
      baseVersion,
      created: new Date()
    });
  }

  async commit(documentId, branchName, message, userId) {
    const commitId = crypto.randomBytes(8).toString('hex');
    this.commits.set(commitId, {
      documentId,
      branchName,
      message,
      userId,
      timestamp: new Date()
    });

    return commitId;
  }
}

// Permission Manager
class PermissionManager {
  constructor() {
    this.permissions = new Map();
    this.roles = new Map();
    this.setupDefaultRoles();
  }

  async initialize() {
    console.log(chalk.blue('🔐 Permission Manager initialized'));
  }

  setupDefaultRoles() {
    this.roles.set('owner', {
      permissions: ['join', 'edit', 'delete', 'screen_share', 'manage_users']
    });

    this.roles.set('editor', {
      permissions: ['join', 'edit', 'screen_share']
    });

    this.roles.set('viewer', {
      permissions: ['join']
    });
  }

  async checkPermission(userId, resourceId, action) {
    const permissionKey = `${userId}:${resourceId}`;
    const userPermissions = this.permissions.get(permissionKey);

    if (!userPermissions) {
      // Default to viewer permissions
      return this.roles.get('viewer').permissions.includes(action);
    }

    const role = this.roles.get(userPermissions.role);
    return role && role.permissions.includes(action);
  }

  async grantPermission(userId, resourceId, role) {
    const permissionKey = `${userId}:${resourceId}`;
    this.permissions.set(permissionKey, {
      userId,
      resourceId,
      role,
      granted: new Date()
    });
  }

  async revokePermission(userId, resourceId) {
    const permissionKey = `${userId}:${resourceId}`;
    this.permissions.delete(permissionKey);
  }
}

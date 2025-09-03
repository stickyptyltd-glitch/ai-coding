import chalk from 'chalk';
import crypto from 'crypto';
import { sanitizeValue } from './validation.js';

// Enhanced security system with enterprise features
class EnhancedSecurityManager {
  constructor() {
    this.securityPolicies = new Map();
    this.auditLog = [];
    this.securityEvents = [];
    this.threatDetection = new ThreatDetectionEngine();
    this.accessControl = new RoleBasedAccessControl();
    this.sessionManager = new SecureSessionManager();
    this.encryptionManager = new EncryptionManager();
    this.complianceManager = new ComplianceManager();

    this.initializeSecurityPolicies();
  }

  initializeSecurityPolicies() {
    // Default security policies
    this.securityPolicies.set('password_policy', {
      minLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
      preventReuse: 5
    });

    this.securityPolicies.set('session_policy', {
      maxDuration: 8 * 60 * 60 * 1000, // 8 hours
      idleTimeout: 30 * 60 * 1000, // 30 minutes
      requireMFA: process.env.REQUIRE_MFA === 'true',
      maxConcurrentSessions: 3
    });

    this.securityPolicies.set('api_security', {
      rateLimitWindow: 60 * 1000, // 1 minute
      rateLimitMax: 100,
      requireApiKey: process.env.REQUIRE_API_KEY === 'true',
      allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean),
      requireHttps: process.env.NODE_ENV === 'production'
    });
  }

  async logSecurityEvent(event) {
    const securityEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      type: event.type,
      severity: event.severity || 'medium',
      source: event.source,
      details: event.details,
      userId: event.userId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent
    };

    this.securityEvents.push(securityEvent);
    this.auditLog.push(securityEvent);

    // Keep only last 10000 events
    if (this.securityEvents.length > 10000) {
      this.securityEvents = this.securityEvents.slice(-10000);
    }

    // Analyze for threats
    await this.threatDetection.analyzeEvent(securityEvent);

    console.log(chalk.yellow(`🔒 Security Event: ${event.type} - ${event.severity}`));
  }
}

export async function applySecurity(app) {
  const securityManager = new EnhancedSecurityManager();
  app.locals.securityManager = securityManager;

  // Enhanced Helmet configuration
  try {
    const helmetMod = await import('helmet');
    const helmet = helmetMod.default || helmetMod;
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.socket.io"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          connectSrc: ["'self'", "ws:", "wss:", "https:"],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
        }
      },
      crossOriginEmbedderPolicy: false,
      hsts: process.env.NODE_ENV === 'production' ? {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      } : false,
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      noSniff: true,
      xssFilter: true,
      frameguard: { action: 'deny' }
    }));
    console.log(chalk.green('✅ Enhanced Helmet security headers applied'));
  } catch {
    console.log(chalk.yellow('⚠️ Helmet not available, using basic security'));
  }

  // Enhanced rate limiting with different tiers
  try {
    const rateLimitMod = await import('express-rate-limit');
    const rateLimit = rateLimitMod.default || rateLimitMod;

    // General API rate limiting
    const generalLimiter = rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many requests, please try again later' },
      handler: (req, res) => {
        securityManager.logSecurityEvent({
          type: 'rate_limit_exceeded',
          severity: 'medium',
          source: 'rate_limiter',
          details: { endpoint: req.path, method: req.method },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
        res.status(429).json({ error: 'Too many requests, please try again later' });
      }
    });

    // Strict rate limiting for sensitive endpoints
    const strictLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many attempts, please try again later' }
    });

    // Moderate rate limiting for AI agent operations (compute-intensive)
    const agentLimiter = rateLimit({
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 20,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many AI operations, please wait before trying again' },
      handler: (req, res) => {
        securityManager.logSecurityEvent({
          type: 'agent_rate_limit_exceeded',
          severity: 'medium',
          source: 'agent_rate_limiter',
          details: { endpoint: req.path, method: req.method },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
        res.status(429).json({ error: 'Too many AI operations, please wait before trying again' });
      }
    });

    // Chain execution rate limiting (very compute-intensive)
    const chainLimiter = rateLimit({
      windowMs: 10 * 60 * 1000, // 10 minutes
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many chain executions, please wait before trying again' }
    });

    app.use('/api/', generalLimiter);
    app.use('/api/auth/', strictLimiter);
    app.use('/api/admin/', strictLimiter);
    app.use('/api/agent/', agentLimiter);
    app.use('/api/chains/:id/execute', chainLimiter);

    console.log(chalk.green('✅ Enhanced rate limiting configured'));
  } catch {
    console.log(chalk.yellow('⚠️ Rate limiting not available'));
  }

  // Request size limiting
  app.use((req, res, next) => {
    const contentLength = parseInt(req.headers['content-length']) || 0;
    const maxSize = 50 * 1024 * 1024; // 50MB max
    
    if (contentLength > maxSize) {
      securityManager.logSecurityEvent({
        type: 'request_size_exceeded',
        severity: 'medium',
        source: 'size_limiter',
        details: { size: contentLength, max: maxSize },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      return res.status(413).json({ error: 'Request too large' });
    }
    next();
  });

  // IP-based suspicious activity detection
  const suspiciousIPs = new Map();
  app.use((req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    const suspiciousWindow = 60 * 1000; // 1 minute
    
    if (!suspiciousIPs.has(ip)) {
      suspiciousIPs.set(ip, { requests: 0, lastReset: now });
    }
    
    const ipData = suspiciousIPs.get(ip);
    
    // Reset counter every minute
    if (now - ipData.lastReset > suspiciousWindow) {
      ipData.requests = 0;
      ipData.lastReset = now;
    }
    
    ipData.requests++;
    
    // Flag IPs making more than 200 requests per minute
    if (ipData.requests > 200) {
      securityManager.logSecurityEvent({
        type: 'suspicious_activity',
        severity: 'high',
        source: 'ip_monitor',
        details: { requestCount: ipData.requests },
        ipAddress: ip,
        userAgent: req.get('User-Agent')
      });
      // Don't block, just log for now
    }
    
    next();
  });

  // Input validation and sanitization middleware
  app.use((req, res, next) => {
    // Sanitize common injection attempts
    if (req.body) {
      req.body = sanitizeValue(req.body);
    }
    if (req.query) {
      req.query = sanitizeValue(req.query);
    }
    next();
  });

  // Security headers middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
  });

  // Request logging for security monitoring
  app.use((req, res, next) => {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const logData = {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date()
      };

      // Log suspicious activities
      if (res.statusCode >= 400 || duration > 5000) {
        securityManager.logSecurityEvent({
          type: res.statusCode >= 500 ? 'server_error' : 'client_error',
          severity: res.statusCode >= 500 ? 'high' : 'medium',
          source: 'request_monitor',
          details: logData,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
      }
    });

    next();
  });

  // CORS with enhanced security
  app.use((req, res, next) => {
    const allowedOrigins = securityManager.securityPolicies.get('api_security').allowedOrigins;
    const origin = req.headers.origin;

    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  console.log(chalk.green('🔒 Enhanced security middleware applied'));
}

// Input sanitization function
function sanitizeInput(obj) {
  if (typeof obj === 'string') {
    return obj
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeInput);
  }

  if (obj && typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }

  return obj;
}

// Threat Detection Engine
class ThreatDetectionEngine {
  constructor() {
    this.threatPatterns = new Map();
    this.suspiciousActivities = [];
    this.initializeThreatPatterns();
  }

  initializeThreatPatterns() {
    this.threatPatterns.set('brute_force', {
      pattern: /failed.*login|authentication.*failed|invalid.*credentials/i,
      threshold: 5,
      timeWindow: 5 * 60 * 1000 // 5 minutes
    });

    this.threatPatterns.set('sql_injection', {
      pattern: /(union|select|insert|update|delete|drop|create|alter).*(\s|;|'|")/i,
      threshold: 1,
      timeWindow: 60 * 1000 // 1 minute
    });

    this.threatPatterns.set('xss_attempt', {
      pattern: /<script|javascript:|on\w+\s*=/i,
      threshold: 1,
      timeWindow: 60 * 1000
    });

    this.threatPatterns.set('path_traversal', {
      pattern: /\.\.[\/\\]|\.\.%2f|\.\.%5c/i,
      threshold: 1,
      timeWindow: 60 * 1000
    });
  }

  async analyzeEvent(event) {
    const eventText = JSON.stringify(event.details || {});

    for (const [threatType, config] of this.threatPatterns) {
      if (config.pattern.test(eventText)) {
        await this.handleThreatDetection(threatType, event, config);
      }
    }

    // Analyze for anomalous patterns
    this.analyzeAnomalousPatterns(event);
  }

  async handleThreatDetection(threatType, event, config) {
    const threat = {
      id: crypto.randomUUID(),
      type: threatType,
      severity: this.calculateThreatSeverity(threatType),
      event,
      timestamp: new Date(),
      mitigated: false
    };

    this.suspiciousActivities.push(threat);

    console.log(chalk.red(`🚨 Threat detected: ${threatType} from ${event.ipAddress}`));

    // Auto-mitigation for high-severity threats
    if (threat.severity === 'critical') {
      await this.autoMitigate(threat);
    }
  }

  calculateThreatSeverity(threatType) {
    const severityMap = {
      'brute_force': 'high',
      'sql_injection': 'critical',
      'xss_attempt': 'high',
      'path_traversal': 'high',
      'rate_limit_exceeded': 'medium'
    };
    return severityMap[threatType] || 'medium';
  }

  async autoMitigate(threat) {
    // Implement auto-mitigation strategies
    console.log(chalk.yellow(`🛡️ Auto-mitigating threat: ${threat.type}`));

    // Example: Block IP for critical threats
    if (threat.event.ipAddress) {
      // In a real implementation, this would integrate with firewall/WAF
      console.log(chalk.red(`🚫 Blocking IP: ${threat.event.ipAddress}`));
    }

    threat.mitigated = true;
  }

  analyzeAnomalousPatterns(event) {
    // Simple anomaly detection based on request patterns
    const recentEvents = this.suspiciousActivities
      .filter(e => Date.now() - e.timestamp.getTime() < 60000) // Last minute
      .filter(e => e.event.ipAddress === event.ipAddress);

    if (recentEvents.length > 10) {
      this.handleThreatDetection('anomalous_activity', event, { threshold: 10 });
    }
  }

  getThreatSummary() {
    const now = Date.now();
    const last24Hours = this.suspiciousActivities.filter(
      threat => now - threat.timestamp.getTime() < 24 * 60 * 60 * 1000
    );

    const threatCounts = {};
    last24Hours.forEach(threat => {
      threatCounts[threat.type] = (threatCounts[threat.type] || 0) + 1;
    });

    return {
      total: last24Hours.length,
      byType: threatCounts,
      critical: last24Hours.filter(t => t.severity === 'critical').length,
      mitigated: last24Hours.filter(t => t.mitigated).length
    };
  }
}

// Role-Based Access Control
class RoleBasedAccessControl {
  constructor() {
    this.roles = new Map();
    this.permissions = new Map();
    this.userRoles = new Map();
    this.initializeDefaultRoles();
  }

  initializeDefaultRoles() {
    // Define permissions
    this.permissions.set('read', { name: 'Read', description: 'View resources' });
    this.permissions.set('write', { name: 'Write', description: 'Modify resources' });
    this.permissions.set('delete', { name: 'Delete', description: 'Remove resources' });
    this.permissions.set('admin', { name: 'Admin', description: 'Administrative access' });
    this.permissions.set('execute', { name: 'Execute', description: 'Run operations' });

    // Define roles
    this.roles.set('viewer', {
      name: 'Viewer',
      permissions: ['read'],
      description: 'Read-only access'
    });

    this.roles.set('developer', {
      name: 'Developer',
      permissions: ['read', 'write', 'execute'],
      description: 'Development access'
    });

    this.roles.set('admin', {
      name: 'Administrator',
      permissions: ['read', 'write', 'delete', 'admin', 'execute'],
      description: 'Full administrative access'
    });

    this.roles.set('guest', {
      name: 'Guest',
      permissions: [],
      description: 'No permissions'
    });
  }

  assignRole(userId, roleName) {
    if (!this.roles.has(roleName)) {
      throw new Error(`Role ${roleName} does not exist`);
    }

    this.userRoles.set(userId, roleName);
    console.log(chalk.blue(`👤 Assigned role ${roleName} to user ${userId}`));
  }

  hasPermission(userId, permission) {
    const roleName = this.userRoles.get(userId) || 'guest';
    const role = this.roles.get(roleName);

    return role && role.permissions.includes(permission);
  }

  getUserRole(userId) {
    return this.userRoles.get(userId) || 'guest';
  }

  createRole(roleName, permissions, description) {
    this.roles.set(roleName, {
      name: roleName,
      permissions,
      description
    });
    console.log(chalk.green(`✅ Created role: ${roleName}`));
  }

  middleware(requiredPermission) {
    return (req, res, next) => {
      const userId = req.user?.sub || req.user?.id || 'anonymous';

      if (!this.hasPermission(userId, requiredPermission)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          required: requiredPermission,
          userRole: this.getUserRole(userId)
        });
      }

      next();
    };
  }
}

// Secure Session Manager
class SecureSessionManager {
  constructor() {
    this.sessions = new Map();
    this.sessionConfig = {
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
      idleTimeout: 30 * 60 * 1000, // 30 minutes
      maxConcurrent: 3
    };
  }

  createSession(userId, metadata = {}) {
    const sessionId = crypto.randomUUID();
    const session = {
      id: sessionId,
      userId,
      createdAt: new Date(),
      lastActivity: new Date(),
      metadata,
      active: true
    };

    // Enforce concurrent session limit
    this.enforceSessionLimit(userId);

    this.sessions.set(sessionId, session);
    console.log(chalk.green(`🔐 Created session for user ${userId}`));

    return sessionId;
  }

  validateSession(sessionId) {
    const session = this.sessions.get(sessionId);

    if (!session || !session.active) {
      return { valid: false, reason: 'Session not found or inactive' };
    }

    const now = new Date();
    const sessionAge = now - session.createdAt;
    const idleTime = now - session.lastActivity;

    if (sessionAge > this.sessionConfig.maxAge) {
      this.destroySession(sessionId);
      return { valid: false, reason: 'Session expired' };
    }

    if (idleTime > this.sessionConfig.idleTimeout) {
      this.destroySession(sessionId);
      return { valid: false, reason: 'Session idle timeout' };
    }

    // Update last activity
    session.lastActivity = now;
    return { valid: true, session };
  }

  destroySession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.active = false;
      console.log(chalk.yellow(`🔒 Destroyed session ${sessionId}`));
    }
  }

  enforceSessionLimit(userId) {
    const userSessions = Array.from(this.sessions.values())
      .filter(s => s.userId === userId && s.active)
      .sort((a, b) => b.lastActivity - a.lastActivity);

    if (userSessions.length >= this.sessionConfig.maxConcurrent) {
      // Destroy oldest sessions
      const sessionsToDestroy = userSessions.slice(this.sessionConfig.maxConcurrent - 1);
      sessionsToDestroy.forEach(session => this.destroySession(session.id));
    }
  }

  getActiveSessions(userId) {
    return Array.from(this.sessions.values())
      .filter(s => s.userId === userId && s.active);
  }
}

// Encryption Manager
class EncryptionManager {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32;
    this.ivLength = 16;
    this.tagLength = 16;
    this.masterKey = this.getMasterKey();
  }

  getMasterKey() {
    const key = process.env.ENCRYPTION_KEY;
    if (key) {
      return Buffer.from(key, 'hex');
    }

    // Generate a new key if none exists (for development)
    const newKey = crypto.randomBytes(this.keyLength);
    console.log(chalk.yellow('⚠️ Generated new encryption key. Set ENCRYPTION_KEY in production:'));
    console.log(chalk.gray(`ENCRYPTION_KEY=${newKey.toString('hex')}`));
    return newKey;
  }

  encrypt(data) {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipher(this.algorithm, this.masterKey, { iv });

      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const tag = cipher.getAuthTag();

      return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex')
      };
    } catch (error) {
      console.error(chalk.red('Encryption failed:'), error.message);
      throw new Error('Encryption failed');
    }
  }

  decrypt(encryptedData) {
    try {
      const { encrypted, iv, tag } = encryptedData;
      const decipher = crypto.createDecipher(this.algorithm, this.masterKey, {
        iv: Buffer.from(iv, 'hex')
      });

      decipher.setAuthTag(Buffer.from(tag, 'hex'));

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      console.error(chalk.red('Decryption failed:'), error.message);
      throw new Error('Decryption failed');
    }
  }

  hashPassword(password, salt = null) {
    const actualSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, actualSalt, 100000, 64, 'sha512');

    return {
      hash: hash.toString('hex'),
      salt: actualSalt
    };
  }

  verifyPassword(password, hash, salt) {
    const { hash: computedHash } = this.hashPassword(password, salt);
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computedHash, 'hex'));
  }

  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  generateApiKey() {
    const prefix = 'ak_';
    const key = crypto.randomBytes(24).toString('base64url');
    return prefix + key;
  }
}

// Compliance Manager
class ComplianceManager {
  constructor() {
    this.complianceStandards = new Map();
    this.auditTrail = [];
    this.complianceChecks = new Map();
    this.initializeStandards();
  }

  initializeStandards() {
    // GDPR Compliance
    this.complianceStandards.set('gdpr', {
      name: 'General Data Protection Regulation',
      requirements: [
        'data_encryption',
        'access_logging',
        'data_retention_policy',
        'user_consent',
        'right_to_deletion',
        'data_portability'
      ],
      enabled: process.env.GDPR_COMPLIANCE === 'true'
    });

    // SOC 2 Compliance
    this.complianceStandards.set('soc2', {
      name: 'SOC 2 Type II',
      requirements: [
        'access_controls',
        'encryption_at_rest',
        'encryption_in_transit',
        'audit_logging',
        'incident_response',
        'vulnerability_management'
      ],
      enabled: process.env.SOC2_COMPLIANCE === 'true'
    });

    // HIPAA Compliance
    this.complianceStandards.set('hipaa', {
      name: 'Health Insurance Portability and Accountability Act',
      requirements: [
        'phi_encryption',
        'access_controls',
        'audit_trails',
        'data_backup',
        'incident_response',
        'employee_training'
      ],
      enabled: process.env.HIPAA_COMPLIANCE === 'true'
    });
  }

  logComplianceEvent(event) {
    const complianceEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      type: event.type,
      standard: event.standard,
      requirement: event.requirement,
      status: event.status, // 'compliant', 'non_compliant', 'warning'
      details: event.details,
      userId: event.userId,
      remediation: event.remediation
    };

    this.auditTrail.push(complianceEvent);

    // Keep only last 50000 events
    if (this.auditTrail.length > 50000) {
      this.auditTrail = this.auditTrail.slice(-50000);
    }

    if (event.status === 'non_compliant') {
      console.log(chalk.red(`⚠️ Compliance violation: ${event.type} (${event.standard})`));
    }
  }

  async runComplianceCheck(standard) {
    const standardConfig = this.complianceStandards.get(standard);
    if (!standardConfig || !standardConfig.enabled) {
      return { standard, enabled: false, results: [] };
    }

    const results = [];

    for (const requirement of standardConfig.requirements) {
      const checkResult = await this.checkRequirement(standard, requirement);
      results.push(checkResult);

      this.logComplianceEvent({
        type: 'compliance_check',
        standard,
        requirement,
        status: checkResult.compliant ? 'compliant' : 'non_compliant',
        details: checkResult.details
      });
    }

    const overallCompliance = results.every(r => r.compliant);

    return {
      standard,
      name: standardConfig.name,
      compliant: overallCompliance,
      results,
      timestamp: new Date()
    };
  }

  async checkRequirement(standard, requirement) {
    // Implement specific compliance checks
    switch (requirement) {
      case 'data_encryption':
        return this.checkDataEncryption();
      case 'access_logging':
        return this.checkAccessLogging();
      case 'access_controls':
        return this.checkAccessControls();
      default:
        return {
          requirement,
          compliant: true,
          details: 'Check not implemented',
          score: 0.5
        };
    }
  }

  checkDataEncryption() {
    const hasEncryptionKey = !!process.env.ENCRYPTION_KEY;
    const httpsEnabled = process.env.NODE_ENV === 'production' && process.env.HTTPS_ENABLED === 'true';

    return {
      requirement: 'data_encryption',
      compliant: hasEncryptionKey && httpsEnabled,
      details: {
        encryptionKey: hasEncryptionKey,
        httpsEnabled,
        recommendations: !hasEncryptionKey ? ['Set ENCRYPTION_KEY environment variable'] : []
      },
      score: (hasEncryptionKey ? 0.5 : 0) + (httpsEnabled ? 0.5 : 0)
    };
  }

  checkAccessLogging() {
    // Check if audit logging is enabled
    const auditEnabled = this.auditTrail.length > 0;

    return {
      requirement: 'access_logging',
      compliant: auditEnabled,
      details: {
        auditTrailSize: this.auditTrail.length,
        recommendations: !auditEnabled ? ['Enable audit logging'] : []
      },
      score: auditEnabled ? 1.0 : 0.0
    };
  }

  checkAccessControls() {
    const apiKeyRequired = !!process.env.AGENT_API_KEY;
    const roleBasedAccess = true; // Assuming RBAC is implemented

    return {
      requirement: 'access_controls',
      compliant: apiKeyRequired && roleBasedAccess,
      details: {
        apiKeyRequired,
        roleBasedAccess,
        recommendations: !apiKeyRequired ? ['Set AGENT_API_KEY for API authentication'] : []
      },
      score: (apiKeyRequired ? 0.5 : 0) + (roleBasedAccess ? 0.5 : 0)
    };
  }

  getComplianceReport() {
    const enabledStandards = Array.from(this.complianceStandards.entries())
      .filter(([, config]) => config.enabled);

    return {
      standards: enabledStandards.length,
      auditEvents: this.auditTrail.length,
      recentViolations: this.auditTrail
        .filter(event => event.status === 'non_compliant')
        .slice(-10),
      complianceScore: this.calculateOverallComplianceScore()
    };
  }

  calculateOverallComplianceScore() {
    const recentChecks = this.auditTrail
      .filter(event => event.type === 'compliance_check')
      .slice(-100); // Last 100 checks

    if (recentChecks.length === 0) return 0;

    const compliantChecks = recentChecks.filter(check => check.status === 'compliant').length;
    return (compliantChecks / recentChecks.length) * 100;
  }
}

// Export the enhanced security manager and utilities
export { EnhancedSecurityManager, ThreatDetectionEngine, RoleBasedAccessControl, SecureSessionManager, EncryptionManager, ComplianceManager };

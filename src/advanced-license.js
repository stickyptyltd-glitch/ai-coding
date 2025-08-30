import crypto from 'crypto';
import fs from 'fs'; // Used for file operations and caching
import path from 'path'; // Used for path resolution
import { execSync } from 'child_process'; // Used for system fingerprinting
import { EventEmitter } from 'events';

export class AdvancedLicenseSystem extends EventEmitter {
  constructor() {
    super();
    this.licenseCache = new Map();
    this.validationHistory = [];
    this.riskScore = 0;
    this.behaviorProfile = new Map();
    this.distributedNodes = [];
    this.blockchainEnabled = false;
    this.mlModel = null;
    this.initializeSystem();
  }

  async initializeSystem() {
    try {
      await this.loadMLModel();
      await this.initializeBlockchain();
      await this.setupDistributedValidation();
      this.startBehaviorMonitoring();
      this.emit('system_initialized');
    } catch (error) {
      console.error('Failed to initialize advanced license system:', error);
      this.emit('initialization_error', error);
    }
  }

  async loadMLModel() {
    // In production, this would load a real ML model for anomaly detection
    this.mlModel = {
      predict: (features) => {
        // Simplified anomaly detection based on usage patterns
        const score = this.calculateAnomalyScore(features);
        return { anomaly: score > 0.7, confidence: score };
      }
    };
  }

  calculateAnomalyScore(features) {
    let score = 0;
    
    // Check for unusual usage patterns
    if (features.requestsPerHour > 1000) score += 0.3;
    if (features.uniqueIPs > 10) score += 0.2;
    if (features.rapidSuccession > 100) score += 0.4;
    if (features.offHoursUsage > 0.8) score += 0.2;
    
    return Math.min(score, 1.0);
  }

  async initializeBlockchain() {
    if (process.env.BLOCKCHAIN_ENABLED === 'true') {
      this.blockchainEnabled = true;
      // Initialize blockchain connection (placeholder)
      console.log('📦 Blockchain license verification enabled');
    }
  }

  async setupDistributedValidation() {
    const nodes = process.env.LICENSE_VALIDATION_NODES?.split(',') || [];
    this.distributedNodes = nodes.filter(node => node.trim());
    
    if (this.distributedNodes.length > 0) {
      console.log(`🌐 Distributed validation enabled with ${this.distributedNodes.length} nodes`);
    }
  }

  startBehaviorMonitoring() {
    // Monitor usage patterns every 5 minutes
    setInterval(() => {
      this.analyzeBehaviorPatterns();
    }, 5 * 60 * 1000);
  }

  async validateLicenseAdvanced(token, context = {}) {
    const startTime = performance.now();
    
    try {
      // Basic validation first
      const basicValidation = await this.basicValidation(token);
      if (!basicValidation.valid) {
        return basicValidation;
      }

      // Advanced validation layers
      const advancedChecks = await Promise.all([
        this.validateWithDistributedNodes(token),
        this.validateWithBlockchain(token),
        this.performBehaviorAnalysis(context),
        this.checkGeolocationConsistency(context),
        this.validateDeviceFingerprint(context),
        this.performMLAnomalyDetection(context)
      ]);

      const allPassed = advancedChecks.every(check => check.passed);
      const validationTime = performance.now() - startTime;

      const result = {
        valid: allPassed,
        tier: basicValidation.tier,
        features: basicValidation.features,
        validationTime: Math.round(validationTime),
        securityScore: this.calculateSecurityScore(advancedChecks),
        riskLevel: this.assessRiskLevel(advancedChecks),
        checks: {
          basic: basicValidation,
          distributed: advancedChecks[0],
          blockchain: advancedChecks[1],
          behavior: advancedChecks[2],
          geolocation: advancedChecks[3],
          device: advancedChecks[4],
          ml_anomaly: advancedChecks[5]
        }
      };

      // Cache successful validations
      if (allPassed) {
        this.cacheValidation(token, result);
      }

      // Update behavior profile
      this.updateBehaviorProfile(context, result);
      
      // Log validation event
      this.logValidationEvent(result, context);

      return result;

    } catch (error) {
      return {
        valid: false,
        error: `Advanced validation failed: ${error.message}`,
        validationTime: performance.now() - startTime
      };
    }
  }

  async basicValidation(token) {
    // Use existing license validation
    const { validateLicenseEnv } = await import('./license.js');
    process.env.LICENSE_KEY = token;
    return validateLicenseEnv();
  }

  async validateWithDistributedNodes(token) {
    if (this.distributedNodes.length === 0) {
      return { passed: true, method: 'single_node' };
    }

    try {
      const validationPromises = this.distributedNodes.map(node => 
        this.queryValidationNode(node, token)
      );

      const results = await Promise.allSettled(validationPromises);
      const successfulValidations = results
        .filter(r => r.status === 'fulfilled' && r.value.valid)
        .length;

      const consensusThreshold = Math.ceil(this.distributedNodes.length / 2);
      const consensusReached = successfulValidations >= consensusThreshold;

      return {
        passed: consensusReached,
        method: 'distributed_consensus',
        successfulNodes: successfulValidations,
        totalNodes: this.distributedNodes.length,
        consensusThreshold
      };

    } catch (error) {
      return { 
        passed: false, 
        method: 'distributed_consensus',
        error: error.message 
      };
    }
  }

  async queryValidationNode(nodeUrl, token) {
    // In production, this would make HTTP requests to validation nodes
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ valid: true, node: nodeUrl });
      }, Math.random() * 100);
    });
  }

  async validateWithBlockchain(token) {
    if (!this.blockchainEnabled) {
      return { passed: true, method: 'blockchain_disabled' };
    }

    try {
      // In production, this would validate against blockchain
      const blockchainResult = await this.queryBlockchain(token);
      
      return {
        passed: blockchainResult.valid,
        method: 'blockchain',
        blockHeight: blockchainResult.blockHeight,
        transactionHash: blockchainResult.txHash
      };

    } catch (error) {
      return { 
        passed: false, 
        method: 'blockchain',
        error: error.message 
      };
    }
  }

  async queryBlockchain(token) {
    // Placeholder for blockchain validation
    return {
      valid: true,
      blockHeight: 123456,
      txHash: crypto.randomBytes(32).toString('hex')
    };
  }

  async performBehaviorAnalysis(context) {
    const profile = this.behaviorProfile.get(context.userId || 'anonymous') || {
      totalRequests: 0,
      avgRequestsPerHour: 0,
      typicalIPs: new Set(),
      usagePatterns: []
    };

    const currentHour = new Date().getHours();
    const isOffHours = currentHour < 6 || currentHour > 22;
    
    // Detect anomalous behavior
    const anomalies = [];
    
    if (context.requestsThisHour > profile.avgRequestsPerHour * 3) {
      anomalies.push('unusual_request_volume');
    }

    if (context.clientIP && !profile.typicalIPs.has(context.clientIP)) {
      anomalies.push('new_ip_address');
    }

    if (isOffHours && profile.usagePatterns.filter(p => p.offHours).length < 5) {
      anomalies.push('off_hours_usage');
    }

    return {
      passed: anomalies.length === 0,
      method: 'behavior_analysis',
      anomalies,
      riskFactors: anomalies.length
    };
  }

  async checkGeolocationConsistency(context) {
    if (!context.clientIP) {
      return { passed: true, method: 'geolocation_unavailable' };
    }

    try {
      const location = await this.getIPLocation(context.clientIP);
      const storedLocation = this.getStoredLocation(context.userId);

      if (storedLocation) {
        const distance = this.calculateDistance(location, storedLocation);
        const suspicious = distance > 1000; // More than 1000km from usual location

        return {
          passed: !suspicious,
          method: 'geolocation',
          currentLocation: location,
          storedLocation,
          distance: Math.round(distance),
          suspicious
        };
      }

      // Store first-time location
      this.storeLocation(context.userId, location);
      
      return {
        passed: true,
        method: 'geolocation',
        currentLocation: location,
        firstTime: true
      };

    } catch (error) {
      return { 
        passed: true, // Don't fail on geolocation errors
        method: 'geolocation',
        error: error.message 
      };
    }
  }

  async getIPLocation(ip) {
    // Placeholder for IP geolocation service
    return {
      country: 'US',
      region: 'CA',
      city: 'San Francisco',
      lat: 37.7749,
      lon: -122.4194
    };
  }

  getStoredLocation(userId) {
    // In production, this would query a database
    return this.behaviorProfile.get(userId)?.lastKnownLocation;
  }

  storeLocation(userId, location) {
    const profile = this.behaviorProfile.get(userId) || {};
    // Store location for geolocation consistency checking
    profile.lastKnownLocation = location;
    this.behaviorProfile.set(userId, profile);
  }

  calculateDistance(loc1, loc2) {
    // Haversine formula for distance calculation
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(loc2.lat - loc1.lat);
    const dLon = this.toRad(loc2.lon - loc1.lon);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(loc1.lat)) * Math.cos(this.toRad(loc2.lat)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  async validateDeviceFingerprint(context) {
    const currentFingerprint = this.generateAdvancedFingerprint();
    const storedFingerprint = this.getStoredFingerprint(context.userId);

    if (!storedFingerprint) {
      this.storeFingerprint(context.userId, currentFingerprint);
      return {
        passed: true,
        method: 'device_fingerprint',
        firstTime: true
      };
    }

    const similarity = this.calculateFingerprintSimilarity(
      currentFingerprint, 
      storedFingerprint
    );

    const threshold = 0.8; // 80% similarity required
    const passed = similarity >= threshold;

    return {
      passed,
      method: 'device_fingerprint',
      similarity: Math.round(similarity * 100) / 100,
      threshold,
      suspicious: !passed
    };
  }

  generateAdvancedFingerprint() {
    const os = require('os');
    
    const fingerprint = {
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      cpus: os.cpus().map(cpu => ({ model: cpu.model, speed: cpu.speed })),
      totalmem: os.totalmem(),
      networkInterfaces: this.getNetworkFingerprint(),
      systemUptime: os.uptime(),
      nodeVersion: process.version,
      envVariables: this.getEnvironmentFingerprint()
    };

    return crypto.createHash('sha256')
      .update(JSON.stringify(fingerprint))
      .digest('hex');
  }

  getNetworkFingerprint() {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    const fingerprint = {};
    
    for (const [name, addresses] of Object.entries(interfaces)) {
      fingerprint[name] = addresses.map(addr => ({
        family: addr.family,
        mac: addr.mac,
        internal: addr.internal
      }));
    }
    
    return fingerprint;
  }

  getEnvironmentFingerprint() {
    // Hash of selected environment variables (not sensitive ones)
    const envVars = {
      NODE_ENV: process.env.NODE_ENV,
      LANG: process.env.LANG,
      PATH: process.env.PATH ? crypto.createHash('md5').update(process.env.PATH).digest('hex') : null
    };
    
    return envVars;
  }

  calculateFingerprintSimilarity(fp1, fp2) {
    // Simple similarity calculation - in production, this would be more sophisticated
    return fp1 === fp2 ? 1.0 : 0.3; // Either exact match or significantly different
  }

  getStoredFingerprint(userId) {
    return this.behaviorProfile.get(userId)?.deviceFingerprint;
  }

  storeFingerprint(userId, fingerprint) {
    const profile = this.behaviorProfile.get(userId) || {};
    profile.deviceFingerprint = fingerprint;
    this.behaviorProfile.set(userId, profile);
  }

  async performMLAnomalyDetection(context) {
    if (!this.mlModel) {
      return { passed: true, method: 'ml_unavailable' };
    }

    const features = this.extractFeatures(context);
    const prediction = this.mlModel.predict(features);

    return {
      passed: !prediction.anomaly,
      method: 'ml_anomaly_detection',
      confidence: prediction.confidence,
      anomalyScore: prediction.confidence,
      features: Object.keys(features)
    };
  }

  extractFeatures(context) {
    const now = new Date();
    const hour = now.getHours();
    
    return {
      requestsPerHour: context.requestsThisHour || 0,
      uniqueIPs: context.uniqueIPs || 1,
      rapidSuccession: context.rapidRequests || 0,
      offHoursUsage: (hour < 6 || hour > 22) ? 1 : 0,
      weekendUsage: (now.getDay() === 0 || now.getDay() === 6) ? 1 : 0,
      geolocationChange: context.locationChanged ? 1 : 0,
      deviceChange: context.deviceChanged ? 1 : 0
    };
  }

  calculateSecurityScore(checks) {
    let score = 100;
    
    checks.forEach(check => {
      if (!check.passed) {
        switch (check.method) {
          case 'distributed_consensus':
            score -= 20;
            break;
          case 'blockchain':
            score -= 15;
            break;
          case 'behavior_analysis':
            score -= 25;
            break;
          case 'geolocation':
            score -= 10;
            break;
          case 'device_fingerprint':
            score -= 20;
            break;
          case 'ml_anomaly_detection':
            score -= 30;
            break;
          default:
            score -= 10;
        }
      }
    });

    return Math.max(score, 0);
  }

  assessRiskLevel(checks) {
    const failedChecks = checks.filter(check => !check.passed).length;
    
    if (failedChecks === 0) return 'low';
    if (failedChecks <= 2) return 'medium';
    if (failedChecks <= 4) return 'high';
    return 'critical';
  }

  cacheValidation(token, result) {
    const cacheKey = crypto.createHash('sha256').update(token).digest('hex');
    this.licenseCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      ttl: 5 * 60 * 1000 // 5 minutes
    });

    // Clean old cache entries
    this.cleanCache();
  }

  cleanCache() {
    const now = Date.now();
    for (const [key, entry] of this.licenseCache) {
      if (now - entry.timestamp > entry.ttl) {
        this.licenseCache.delete(key);
      }
    }
  }

  updateBehaviorProfile(context, result) {
    const userId = context.userId || 'anonymous';
    const profile = this.behaviorProfile.get(userId) || {
      totalRequests: 0,
      avgRequestsPerHour: 0,
      typicalIPs: new Set(),
      usagePatterns: [],
      riskScore: 0
    };

    profile.totalRequests++;
    profile.riskScore = result.securityScore;
    
    if (context.clientIP) {
      profile.typicalIPs.add(context.clientIP);
    }

    const pattern = {
      timestamp: Date.now(),
      hour: new Date().getHours(),
      offHours: new Date().getHours() < 6 || new Date().getHours() > 22,
      riskLevel: result.riskLevel
    };

    profile.usagePatterns.push(pattern);
    
    // Keep only recent patterns (last 100)
    if (profile.usagePatterns.length > 100) {
      profile.usagePatterns = profile.usagePatterns.slice(-100);
    }

    // Recalculate average requests per hour
    const recentPatterns = profile.usagePatterns.slice(-24); // Last 24 hours
    profile.avgRequestsPerHour = recentPatterns.length;

    this.behaviorProfile.set(userId, profile);
  }

  logValidationEvent(result, context) {
    const event = {
      timestamp: Date.now(),
      userId: context.userId,
      clientIP: context.clientIP,
      valid: result.valid,
      securityScore: result.securityScore,
      riskLevel: result.riskLevel,
      validationTime: result.validationTime,
      failedChecks: Object.entries(result.checks || {})
        .filter(([, check]) => !check.passed)
        .map(([name]) => name)
    };

    this.validationHistory.push(event);
    
    // Keep only recent history (last 1000 events)
    if (this.validationHistory.length > 1000) {
      this.validationHistory = this.validationHistory.slice(-1000);
    }

    // Emit event for external logging
    this.emit('validation_event', event);
  }

  analyzeBehaviorPatterns() {
    // Analyze patterns across all users
    let totalRiskScore = 0;
    let suspiciousUsers = 0;

    for (const [userId, profile] of this.behaviorProfile) {
      if (profile.riskScore < 70) {
        suspiciousUsers++;
      }
      totalRiskScore += profile.riskScore;
    }

    const averageRiskScore = totalRiskScore / this.behaviorProfile.size;
    
    this.emit('behavior_analysis', {
      totalUsers: this.behaviorProfile.size,
      averageRiskScore: Math.round(averageRiskScore),
      suspiciousUsers,
      timestamp: Date.now()
    });
  }

  // Public API methods
  async getLicenseAnalytics(period = '24h') {
    const cutoff = this.getPeriodCutoff(period);
    const recentEvents = this.validationHistory.filter(
      event => event.timestamp >= cutoff
    );

    return {
      period,
      totalValidations: recentEvents.length,
      successfulValidations: recentEvents.filter(e => e.valid).length,
      averageSecurityScore: Math.round(
        recentEvents.reduce((sum, e) => sum + e.securityScore, 0) / recentEvents.length
      ),
      riskLevelDistribution: this.calculateRiskDistribution(recentEvents),
      topFailedChecks: this.getTopFailedChecks(recentEvents),
      averageValidationTime: Math.round(
        recentEvents.reduce((sum, e) => sum + e.validationTime, 0) / recentEvents.length
      )
    };
  }

  getPeriodCutoff(period) {
    const now = Date.now();
    const match = period.match(/^(\d+)([hmd])$/);
    
    if (!match) return now - 24 * 60 * 60 * 1000; // Default 24 hours
    
    const [, amount, unit] = match;
    const multipliers = {
      'h': 60 * 60 * 1000,      // hours
      'd': 24 * 60 * 60 * 1000,  // days
      'm': 30 * 24 * 60 * 60 * 1000 // months (approximate)
    };
    
    return now - parseInt(amount) * multipliers[unit];
  }

  calculateRiskDistribution(events) {
    const distribution = { low: 0, medium: 0, high: 0, critical: 0 };
    
    events.forEach(event => {
      distribution[event.riskLevel] = (distribution[event.riskLevel] || 0) + 1;
    });

    return distribution;
  }

  getTopFailedChecks(events) {
    const failedChecks = {};
    
    events.forEach(event => {
      event.failedChecks?.forEach(check => {
        failedChecks[check] = (failedChecks[check] || 0) + 1;
      });
    });

    return Object.entries(failedChecks)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([check, count]) => ({ check, count }));
  }

  // Emergency procedures
  async emergencyLicenseOverride(reason, duration = 3600000) {
    const override = {
      id: crypto.randomUUID(),
      reason,
      timestamp: Date.now(),
      duration,
      expires: Date.now() + duration,
      authorized: false
    };

    // In production, this would require additional authorization
    console.warn('🚨 Emergency license override requested:', reason);
    
    this.emit('emergency_override', override);
    return override;
  }

  async revokeLicense(licenseHash, reason) {
    const revocation = {
      licenseHash,
      reason,
      timestamp: Date.now(),
      revokedBy: 'system'
    };

    // Add to revocation list (in production, this would be persistent)
    console.warn('🚫 License revoked:', licenseHash, reason);
    
    this.emit('license_revoked', revocation);
    return revocation;
  }
}

// Export singleton instance
export const advancedLicenseSystem = new AdvancedLicenseSystem();

// Export convenience functions
export async function validateLicenseAdvanced(token, context) {
  return advancedLicenseSystem.validateLicenseAdvanced(token, context);
}

export async function getLicenseAnalytics(period) {
  return advancedLicenseSystem.getLicenseAnalytics(period);
}
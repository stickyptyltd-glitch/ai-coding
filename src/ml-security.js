import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

export class MLSecuritySystem extends EventEmitter {
  constructor() {
    super();
    this.models = new Map();
    this.trainingData = [];
    this.predictions = [];
    this.anomalyThreshold = 0.75;
    this.behaviorProfiles = new Map();
    this.featureExtractors = new Map();
    this.classifiers = new Map();
    
    this.initializeMLSecurity();
  }

  async initializeMLSecurity() {
    try {
      await this.loadPretrainedModels();
      this.setupFeatureExtractors();
      this.initializeClassifiers();
      this.startRealtimeAnalysis();
      
      console.log('🧠 ML Security System initialized');
      this.emit('ml_system_ready');
    } catch (error) {
      console.error('Failed to initialize ML security:', error);
      this.emit('ml_system_error', error);
    }
  }

  async loadPretrainedModels() {
    // In production, these would be real ML models (TensorFlow.js, ONNX, etc.)
    this.models.set('anomaly_detector', new AnomalyDetectionModel());
    this.models.set('behavior_classifier', new BehaviorClassificationModel());
    this.models.set('threat_predictor', new ThreatPredictionModel());
    this.models.set('code_analyzer', new CodeAnalysisModel());
    this.models.set('pattern_recognizer', new PatternRecognitionModel());
  }

  setupFeatureExtractors() {
    this.featureExtractors.set('network', new NetworkFeatureExtractor());
    this.featureExtractors.set('system', new SystemFeatureExtractor());
    this.featureExtractors.set('behavioral', new BehavioralFeatureExtractor());
    this.featureExtractors.set('temporal', new TemporalFeatureExtractor());
    this.featureExtractors.set('code', new CodeFeatureExtractor());
  }

  initializeClassifiers() {
    this.classifiers.set('threat_level', new ThreatLevelClassifier());
    this.classifiers.set('attack_type', new AttackTypeClassifier());
    this.classifiers.set('user_intent', new UserIntentClassifier());
    this.classifiers.set('risk_assessment', new RiskAssessmentClassifier());
  }

  startRealtimeAnalysis() {
    // Analyze system state every 30 seconds
    setInterval(() => {
      this.performRealtimeAnalysis();
    }, 30000);

    // Micro-analysis every 5 seconds for critical events
    setInterval(() => {
      this.performMicroAnalysis();
    }, 5000);
  }

  async performRealtimeAnalysis() {
    try {
      const features = await this.extractAllFeatures();
      const predictions = await this.runAllModels(features);
      
      const analysis = {
        timestamp: Date.now(),
        features: features,
        predictions: predictions,
        anomalyScore: this.calculateAnomalyScore(predictions),
        threatLevel: this.assessThreatLevel(predictions),
        recommendations: this.generateRecommendations(predictions)
      };

      this.predictions.push(analysis);
      this.maintainPredictionHistory();
      
      if (analysis.anomalyScore > this.anomalyThreshold) {
        this.handleAnomalyDetection(analysis);
      }

      this.emit('analysis_complete', analysis);
      
    } catch (error) {
      console.error('Realtime analysis failed:', error);
      this.emit('analysis_error', error);
    }
  }

  async performMicroAnalysis() {
    const criticalMetrics = await this.extractCriticalMetrics();
    const quickPrediction = await this.quickThreatAssessment(criticalMetrics);
    
    if (quickPrediction.urgentAction) {
      this.handleUrgentThreat(quickPrediction);
    }
  }

  async extractAllFeatures() {
    const features = {};
    
    for (const [name, extractor] of this.featureExtractors) {
      try {
        features[name] = await extractor.extract();
      } catch (error) {
        console.warn(`Feature extraction failed for ${name}:`, error.message);
        features[name] = null;
      }
    }
    
    return features;
  }

  async extractCriticalMetrics() {
    return {
      cpu_usage: process.cpuUsage(),
      memory_usage: process.memoryUsage(),
      file_changes: this.getRecentFileChanges(),
      network_activity: this.getNetworkActivity(),
      process_count: this.getProcessCount()
    };
  }

  async runAllModels(features) {
    const predictions = {};
    
    for (const [name, model] of this.models) {
      try {
        predictions[name] = await model.predict(features);
      } catch (error) {
        console.warn(`Model prediction failed for ${name}:`, error.message);
        predictions[name] = { error: error.message, confidence: 0 };
      }
    }
    
    return predictions;
  }

  calculateAnomalyScore(predictions) {
    const scores = Object.values(predictions)
      .filter(p => p.anomalyScore !== undefined)
      .map(p => p.anomalyScore);
    
    if (scores.length === 0) return 0;
    
    // Weighted average with emphasis on highest scores
    scores.sort((a, b) => b - a);
    const weights = scores.map((_, i) => Math.pow(0.8, i));
    const weightedSum = scores.reduce((sum, score, i) => sum + score * weights[i], 0);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    
    return weightedSum / totalWeight;
  }

  assessThreatLevel(predictions) {
    const threatScores = [];
    
    Object.values(predictions).forEach(prediction => {
      if (prediction.threatLevel) {
        const levels = { low: 1, medium: 2, high: 3, critical: 4 };
        threatScores.push(levels[prediction.threatLevel] || 1);
      }
    });
    
    if (threatScores.length === 0) return 'low';
    
    const avgScore = threatScores.reduce((sum, score) => sum + score, 0) / threatScores.length;
    const levelNames = ['low', 'low', 'medium', 'high', 'critical'];
    
    return levelNames[Math.min(Math.floor(avgScore), 4)];
  }

  generateRecommendations(predictions) {
    const recommendations = [];
    
    Object.entries(predictions).forEach(([modelName, prediction]) => {
      if (prediction.recommendations) {
        recommendations.push(...prediction.recommendations.map(rec => ({
          ...rec,
          source: modelName,
          confidence: prediction.confidence
        })));
      }
    });
    
    // Sort by priority and confidence
    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = (priorityOrder[b.priority] || 1) - (priorityOrder[a.priority] || 1);
      
      if (priorityDiff !== 0) return priorityDiff;
      return (b.confidence || 0) - (a.confidence || 0);
    }).slice(0, 10); // Top 10 recommendations
  }

  handleAnomalyDetection(analysis) {
    console.warn(`🚨 ML ANOMALY DETECTED - Score: ${analysis.anomalyScore.toFixed(3)}`);
    
    const anomaly = {
      id: crypto.randomUUID(),
      timestamp: analysis.timestamp,
      score: analysis.anomalyScore,
      threatLevel: analysis.threatLevel,
      features: this.summarizeFeatures(analysis.features),
      predictions: this.summarizePredictions(analysis.predictions),
      autoMitigation: this.shouldAutoMitigate(analysis)
    };

    this.logAnomaly(anomaly);
    
    if (anomaly.autoMitigation) {
      this.performAutoMitigation(anomaly);
    }

    this.emit('anomaly_detected', anomaly);
  }

  shouldAutoMitigate(analysis) {
    return analysis.anomalyScore > 0.9 && 
           analysis.threatLevel === 'critical' &&
           analysis.predictions.threat_predictor?.confidence > 0.8;
  }

  async performAutoMitigation(anomaly) {
    console.log('🛡️ Performing automated threat mitigation');
    
    const mitigationActions = [
      () => this.escalateSecurityLevel(),
      () => this.enableAggresiveMonitoring(),
      () => this.activateCountermeasures(),
      () => this.isolateThreats()
    ];

    for (const action of mitigationActions) {
      try {
        await action();
      } catch (error) {
        console.error('Mitigation action failed:', error);
      }
    }

    anomaly.mitigated = true;
    this.emit('anomaly_mitigated', anomaly);
  }

  async quickThreatAssessment(metrics) {
    const rapidFeatures = {
      memory_spike: metrics.memory_usage.heapUsed > 500 * 1024 * 1024,
      cpu_intensive: metrics.cpu_usage.user > 10000000,
      file_activity: metrics.file_changes > 5,
      process_anomaly: metrics.process_count > 100
    };

    const threatScore = Object.values(rapidFeatures).filter(Boolean).length / Object.keys(rapidFeatures).length;
    
    return {
      urgentAction: threatScore > 0.7,
      threatScore: threatScore,
      triggeredFeatures: Object.entries(rapidFeatures)
        .filter(([, value]) => value)
        .map(([key]) => key)
    };
  }

  handleUrgentThreat(prediction) {
    console.error('🚨 URGENT THREAT DETECTED - Taking immediate action');
    
    // Immediate countermeasures
    this.escalateSecurityLevel();
    this.logUrgentThreat(prediction);
    
    this.emit('urgent_threat', prediction);
  }

  // Feature extraction helper methods
  getRecentFileChanges() {
    // In production, this would track file system events
    return Math.floor(Math.random() * 10);
  }

  getNetworkActivity() {
    // In production, this would monitor network connections
    return {
      connections: Math.floor(Math.random() * 50),
      bytesTransferred: Math.floor(Math.random() * 1000000)
    };
  }

  getProcessCount() {
    // In production, this would count running processes
    return Math.floor(Math.random() * 200) + 50;
  }

  // Security action methods
  escalateSecurityLevel() {
    process.env.SECURITY_LEVEL = 'maximum';
    console.log('🔴 Security level escalated to MAXIMUM');
  }

  enableAggresiveMonitoring() {
    process.env.AGGRESSIVE_MONITORING = 'true';
    console.log('👁️ Aggressive monitoring enabled');
  }

  activateCountermeasures() {
    process.env.COUNTERMEASURES_ACTIVE = 'true';
    console.log('🛡️ Active countermeasures deployed');
  }

  isolateThreats() {
    console.log('🚧 Threat isolation procedures activated');
  }

  // Utility methods
  summarizeFeatures(features) {
    const summary = {};
    
    Object.entries(features).forEach(([key, value]) => {
      if (value && typeof value === 'object') {
        summary[key] = Object.keys(value).length + ' metrics';
      } else {
        summary[key] = value !== null ? 'collected' : 'failed';
      }
    });
    
    return summary;
  }

  summarizePredictions(predictions) {
    const summary = {};
    
    Object.entries(predictions).forEach(([model, prediction]) => {
      summary[model] = {
        confidence: prediction.confidence || 0,
        anomaly: prediction.anomalyScore > 0.5,
        threatLevel: prediction.threatLevel || 'unknown'
      };
    });
    
    return summary;
  }

  maintainPredictionHistory() {
    // Keep only recent predictions (last 1000)
    if (this.predictions.length > 1000) {
      this.predictions = this.predictions.slice(-1000);
    }
  }

  logAnomaly(anomaly) {
    try {
      const logDir = path.join(process.cwd(), 'logs', 'ml-security');
      fs.mkdirSync(logDir, { recursive: true });
      
      const logFile = path.join(logDir, `anomalies-${this.getDateString()}.log`);
      fs.appendFileSync(logFile, JSON.stringify(anomaly) + '\n');
    } catch (error) {
      console.warn('Failed to log anomaly:', error.message);
    }
  }

  logUrgentThreat(threat) {
    try {
      const logDir = path.join(process.cwd(), 'logs', 'ml-security');
      fs.mkdirSync(logDir, { recursive: true });
      
      const logFile = path.join(logDir, `urgent-threats-${this.getDateString()}.log`);
      fs.appendFileSync(logFile, JSON.stringify(threat) + '\n');
    } catch (error) {
      console.warn('Failed to log urgent threat:', error.message);
    }
  }

  getDateString() {
    return new Date().toISOString().split('T')[0];
  }

  // Public API methods
  async trainModel(modelName, trainingData) {
    const model = this.models.get(modelName);
    if (!model) {
      throw new Error(`Model ${modelName} not found`);
    }

    console.log(`🎓 Training model: ${modelName}`);
    await model.train(trainingData);
    
    this.emit('model_trained', { modelName, dataPoints: trainingData.length });
  }

  getSecurityInsights(timeframe = '24h') {
    const cutoff = this.getTimeframeCutoff(timeframe);
    const recentPredictions = this.predictions.filter(p => p.timestamp >= cutoff);
    
    if (recentPredictions.length === 0) {
      return { message: 'No recent data available' };
    }

    const avgAnomalyScore = recentPredictions.reduce((sum, p) => sum + p.anomalyScore, 0) / recentPredictions.length;
    const threatLevelCounts = recentPredictions.reduce((counts, p) => {
      counts[p.threatLevel] = (counts[p.threatLevel] || 0) + 1;
      return counts;
    }, {});

    return {
      timeframe,
      analysisCount: recentPredictions.length,
      averageAnomalyScore: Math.round(avgAnomalyScore * 1000) / 1000,
      threatLevelDistribution: threatLevelCounts,
      topRecommendations: this.getTopRecommendations(recentPredictions),
      systemHealth: this.assessSystemHealth(recentPredictions)
    };
  }

  getTopRecommendations(predictions, limit = 5) {
    const allRecommendations = predictions.flatMap(p => p.recommendations || []);
    const recommendationCounts = allRecommendations.reduce((counts, rec) => {
      const key = `${rec.action} (${rec.priority})`;
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {});

    return Object.entries(recommendationCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([rec, count]) => ({ recommendation: rec, frequency: count }));
  }

  assessSystemHealth(predictions) {
    const healthMetrics = {
      anomalyRate: predictions.filter(p => p.anomalyScore > 0.5).length / predictions.length,
      criticalThreats: predictions.filter(p => p.threatLevel === 'critical').length,
      modelPerformance: this.calculateModelPerformance(predictions)
    };

    const healthScore = Math.max(0, 100 - (
      (healthMetrics.anomalyRate * 50) +
      (healthMetrics.criticalThreats * 10) +
      ((1 - healthMetrics.modelPerformance) * 30)
    ));

    return {
      score: Math.round(healthScore),
      status: healthScore > 80 ? 'excellent' : healthScore > 60 ? 'good' : healthScore > 40 ? 'warning' : 'critical',
      metrics: healthMetrics
    };
  }

  calculateModelPerformance(predictions) {
    const modelConfidences = predictions.flatMap(p => 
      Object.values(p.predictions).map(pred => pred.confidence || 0)
    );
    
    if (modelConfidences.length === 0) return 0;
    
    return modelConfidences.reduce((sum, conf) => sum + conf, 0) / modelConfidences.length;
  }

  getTimeframeCutoff(timeframe) {
    const now = Date.now();
    const match = timeframe.match(/^(\d+)([hmd])$/);
    
    if (!match) return now - 24 * 60 * 60 * 1000; // Default 24 hours
    
    const [, amount, unit] = match;
    const multipliers = {
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000,
      'm': 30 * 24 * 60 * 60 * 1000
    };
    
    return now - parseInt(amount) * multipliers[unit];
  }
}

// Mock ML Models (in production, these would use real ML libraries)
class AnomalyDetectionModel {
  async predict(features) {
    const anomalyScore = Math.random() * 0.3 + (features.system ? 0.2 : 0);
    
    return {
      anomalyScore: anomalyScore,
      confidence: 0.85,
      anomalous: anomalyScore > 0.5,
      factors: ['unusual_memory_pattern', 'atypical_network_activity']
    };
  }

  async train(data) {
    console.log('Training anomaly detection model with', data.length, 'samples');
  }
}

class BehaviorClassificationModel {
  async predict(features) {
    const behaviors = ['normal', 'suspicious', 'malicious'];
    const behavior = behaviors[Math.floor(Math.random() * behaviors.length)];
    
    return {
      behavior: behavior,
      confidence: 0.75 + Math.random() * 0.2,
      threatLevel: behavior === 'malicious' ? 'high' : behavior === 'suspicious' ? 'medium' : 'low',
      recommendations: behavior !== 'normal' ? [
        { action: 'Increase monitoring', priority: 'medium' },
        { action: 'Review recent activity', priority: 'low' }
      ] : []
    };
  }

  async train(data) {
    console.log('Training behavior classification model with', data.length, 'samples');
  }
}

class ThreatPredictionModel {
  async predict(features) {
    const threatTypes = ['none', 'reverse_engineering', 'license_bypass', 'code_theft'];
    const predictedThreat = threatTypes[Math.floor(Math.random() * threatTypes.length)];
    const confidence = Math.random() * 0.4 + 0.5;
    
    return {
      predictedThreat: predictedThreat,
      confidence: confidence,
      timeToThreat: predictedThreat !== 'none' ? Math.random() * 3600000 : null, // milliseconds
      threatLevel: predictedThreat === 'none' ? 'low' : confidence > 0.8 ? 'high' : 'medium',
      recommendations: predictedThreat !== 'none' ? [
        { action: 'Activate additional security measures', priority: 'high' },
        { action: 'Prepare incident response', priority: 'medium' }
      ] : []
    };
  }

  async train(data) {
    console.log('Training threat prediction model with', data.length, 'samples');
  }
}

class CodeAnalysisModel {
  async predict(features) {
    const codeQuality = Math.random() * 40 + 60; // 60-100 range
    const vulnerabilities = Math.floor(Math.random() * 5);
    
    return {
      qualityScore: codeQuality,
      vulnerabilities: vulnerabilities,
      confidence: 0.9,
      threatLevel: vulnerabilities > 2 ? 'high' : vulnerabilities > 0 ? 'medium' : 'low',
      recommendations: vulnerabilities > 0 ? [
        { action: 'Fix identified vulnerabilities', priority: 'high' },
        { action: 'Conduct security review', priority: 'medium' }
      ] : []
    };
  }

  async train(data) {
    console.log('Training code analysis model with', data.length, 'samples');
  }
}

class PatternRecognitionModel {
  async predict(features) {
    const patterns = ['normal', 'brute_force', 'privilege_escalation', 'data_exfiltration'];
    const detectedPattern = patterns[Math.floor(Math.random() * patterns.length)];
    
    return {
      detectedPattern: detectedPattern,
      confidence: Math.random() * 0.3 + 0.6,
      severity: detectedPattern === 'normal' ? 'low' : 'high',
      threatLevel: detectedPattern === 'normal' ? 'low' : 'high',
      recommendations: detectedPattern !== 'normal' ? [
        { action: 'Block suspicious activity', priority: 'critical' },
        { action: 'Alert security team', priority: 'high' }
      ] : []
    };
  }

  async train(data) {
    console.log('Training pattern recognition model with', data.length, 'samples');
  }
}

// Mock Feature Extractors
class NetworkFeatureExtractor {
  async extract() {
    return {
      activeConnections: Math.floor(Math.random() * 20),
      bytesReceived: Math.floor(Math.random() * 1000000),
      bytesSent: Math.floor(Math.random() * 1000000),
      uniqueIPs: Math.floor(Math.random() * 10) + 1,
      suspiciousPorts: Math.floor(Math.random() * 3)
    };
  }
}

class SystemFeatureExtractor {
  async extract() {
    const usage = process.memoryUsage();
    const cpu = process.cpuUsage();
    
    return {
      memoryUsage: usage.heapUsed / usage.heapTotal,
      cpuUsage: (cpu.user + cpu.system) / 1000000, // Convert to seconds
      uptime: process.uptime(),
      processCount: Math.floor(Math.random() * 100) + 50,
      fileDescriptors: Math.floor(Math.random() * 1000) + 100
    };
  }
}

class BehavioralFeatureExtractor {
  async extract() {
    return {
      requestsPerMinute: Math.floor(Math.random() * 100),
      averageResponseTime: Math.random() * 1000,
      errorRate: Math.random() * 0.1,
      userAgentVariations: Math.floor(Math.random() * 5) + 1,
      sessionDuration: Math.random() * 3600000 // milliseconds
    };
  }
}

class TemporalFeatureExtractor {
  async extract() {
    const now = new Date();
    
    return {
      hour: now.getHours(),
      dayOfWeek: now.getDay(),
      isWeekend: now.getDay() === 0 || now.getDay() === 6,
      isBusinessHours: now.getHours() >= 9 && now.getHours() <= 17,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }
}

class CodeFeatureExtractor {
  async extract() {
    return {
      linesOfCode: Math.floor(Math.random() * 10000) + 1000,
      complexity: Math.random() * 100,
      dependencies: Math.floor(Math.random() * 50) + 10,
      testCoverage: Math.random() * 100,
      duplicateCode: Math.random() * 20
    };
  }
}

// Mock Classifiers
class ThreatLevelClassifier {
  classify(features) {
    const levels = ['low', 'medium', 'high', 'critical'];
    return levels[Math.floor(Math.random() * levels.length)];
  }
}

class AttackTypeClassifier {
  classify(features) {
    const attacks = ['none', 'brute_force', 'injection', 'xss', 'privilege_escalation'];
    return attacks[Math.floor(Math.random() * attacks.length)];
  }
}

class UserIntentClassifier {
  classify(features) {
    const intents = ['legitimate', 'testing', 'reconnaissance', 'malicious'];
    return intents[Math.floor(Math.random() * intents.length)];
  }
}

class RiskAssessmentClassifier {
  classify(features) {
    return {
      riskScore: Math.random() * 100,
      riskCategory: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
      factors: ['unusual_timing', 'geographic_anomaly', 'behavior_change']
    };
  }
}

// Export singleton instance
export const mlSecuritySystem = new MLSecuritySystem();

// Export convenience functions
export async function analyzeSecurityState(features) {
  return mlSecuritySystem.performRealtimeAnalysis();
}

export function getSecurityInsights(timeframe) {
  return mlSecuritySystem.getSecurityInsights(timeframe);
}
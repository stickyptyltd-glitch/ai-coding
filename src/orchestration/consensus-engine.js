import chalk from 'chalk';

export class ConsensusEngine {
  constructor() {
    this.algorithms = new Map();
    this.consensusHistory = [];
    this.setupAlgorithms();
  }

  async initialize() {
    console.log(chalk.blue('🤝 Consensus Engine initialized'));
  }

  setupAlgorithms() {
    this.algorithms.set('majority_vote', this.majorityVote.bind(this));
    this.algorithms.set('weighted_average', this.weightedAverage.bind(this));
    this.algorithms.set('confidence_based', this.confidenceBased.bind(this));
    this.algorithms.set('expert_override', this.expertOverride.bind(this));
    this.algorithms.set('byzantine_fault_tolerant', this.byzantineFaultTolerant.bind(this));
    this.algorithms.set('dynamic_weighting', this.dynamicWeighting.bind(this));
    this.algorithms.set('quality_threshold', this.qualityThreshold.bind(this));
  }

  async buildConsensus(results, algorithm = 'confidence_based', options = {}) {
    const consensusAlgorithm = this.algorithms.get(algorithm);

    if (!consensusAlgorithm) {
      throw new Error(`Unknown consensus algorithm: ${algorithm}`);
    }

    console.log(chalk.cyan(`🤝 Building consensus using ${algorithm} with ${results.length} results`));
    
    const startTime = Date.now();
    
    try {
      const consensusResult = await consensusAlgorithm(results, options);
      const duration = Date.now() - startTime;
      
      this.recordConsensus(algorithm, results, consensusResult, duration);
      
      console.log(chalk.green(`✅ Consensus built in ${duration}ms with ${consensusResult.confidence.toFixed(3)} confidence`));
      
      return consensusResult;
    } catch (error) {
      console.error(chalk.red(`❌ Consensus building failed: ${error.message}`));
      throw error;
    }
  }

  majorityVote(results, options = {}) {
    const votes = new Map();
    const agentWeights = options.agentWeights || {};
    
    results.forEach(({ agent, result }) => {
      if (result.error) return;
      
      const key = this.generateResultKey(result);
      const weight = agentWeights[agent] || 1;
      
      votes.set(key, {
        count: (votes.get(key)?.count || 0) + weight,
        result: result,
        supporters: [...(votes.get(key)?.supporters || []), agent]
      });
    });

    if (votes.size === 0) {
      throw new Error('No valid results for majority vote');
    }

    const winner = Array.from(votes.entries())
      .sort((a, b) => b[1].count - a[1].count)[0];

    const totalWeight = results.reduce((sum, { agent }) => 
      sum + (agentWeights[agent] || 1), 0);

    return {
      consensus: winner[1].result,
      confidence: winner[1].count / totalWeight,
      algorithm: 'majority_vote',
      voteDistribution: Object.fromEntries(votes),
      supporters: winner[1].supporters,
      metadata: {
        totalVotes: votes.size,
        winningVotes: winner[1].count,
        totalWeight
      }
    };
  }

  weightedAverage(results, options = {}) {
    const validResults = results.filter(r => !r.result.error && r.result.confidence);
    
    if (validResults.length === 0) {
      throw new Error('No valid results with confidence scores for weighted average');
    }

    const agentWeights = options.agentWeights || {};
    let totalWeight = 0;
    let weightedSum = 0;
    let aggregatedResult = null;

    if (validResults.every(r => typeof r.result.value === 'number')) {
      validResults.forEach(({ agent, result }) => {
        const agentWeight = agentWeights[agent] || 1;
        const resultWeight = result.confidence * agentWeight;
        
        weightedSum += result.value * resultWeight;
        totalWeight += resultWeight;
      });

      aggregatedResult = {
        value: weightedSum / totalWeight,
        type: 'weighted_numeric',
        components: validResults.length
      };
    } else {
      const bestResult = validResults.reduce((best, current) => {
        const currentWeight = (agentWeights[current.agent] || 1) * (current.result.confidence || 0.5);
        const bestWeight = (agentWeights[best.agent] || 1) * (best.result.confidence || 0.5);
        return currentWeight > bestWeight ? current : best;
      });

      aggregatedResult = bestResult.result;
      totalWeight = validResults.reduce((sum, { agent, result }) => 
        sum + ((agentWeights[agent] || 1) * (result.confidence || 0.5)), 0);
    }

    return {
      consensus: aggregatedResult,
      confidence: totalWeight / validResults.length,
      algorithm: 'weighted_average',
      participants: validResults.map(r => r.agent),
      metadata: {
        totalWeight,
        participantCount: validResults.length
      }
    };
  }

  confidenceBased(results, options = {}) {
    const validResults = results.filter(r => !r.result.error);
    
    if (validResults.length === 0) {
      throw new Error('No valid results for confidence-based consensus');
    }

    const confidenceThreshold = options.confidenceThreshold || 0.0;
    const qualifiedResults = validResults.filter(r => 
      (r.result.confidence || 0.5) >= confidenceThreshold
    );

    if (qualifiedResults.length === 0) {
      console.warn(chalk.yellow(`⚠️ No results meet confidence threshold ${confidenceThreshold}, using all results`));
      return this.confidenceBased(results, { ...options, confidenceThreshold: 0.0 });
    }

    const bestResult = qualifiedResults.reduce((best, current) => {
      const currentConfidence = current.result.confidence || 0.5;
      const bestConfidence = best.result.confidence || 0.5;
      return currentConfidence > bestConfidence ? current : best;
    });

    const averageConfidence = qualifiedResults.reduce((sum, { result }) => 
      sum + (result.confidence || 0.5), 0) / qualifiedResults.length;

    const consensusStrength = this.calculateConsensusStrength(qualifiedResults);

    return {
      consensus: bestResult.result,
      confidence: bestResult.result.confidence || 0.5,
      algorithm: 'confidence_based',
      selectedAgent: bestResult.agent,
      averageConfidence,
      consensusStrength,
      metadata: {
        qualifiedResults: qualifiedResults.length,
        totalResults: validResults.length,
        confidenceThreshold
      }
    };
  }

  expertOverride(results, options = {}) {
    const expertAgents = options.expertAgents || ['architect', 'security', 'performance'];
    const expertPriority = options.expertPriority || { 
      'architect': 3, 
      'security': 3, 
      'performance': 2 
    };

    const validResults = results.filter(r => !r.result.error);
    const expertResults = validResults.filter(r => expertAgents.includes(r.agent));

    if (expertResults.length > 0) {
      const bestExpert = expertResults.reduce((best, current) => {
        const currentPriority = expertPriority[current.agent] || 1;
        const currentConfidence = current.result.confidence || 0.5;
        const currentScore = currentPriority * currentConfidence;
        
        const bestPriority = expertPriority[best.agent] || 1;
        const bestConfidence = best.result.confidence || 0.5;
        const bestScore = bestPriority * bestConfidence;
        
        return currentScore > bestScore ? current : best;
      });

      return {
        consensus: bestExpert.result,
        confidence: Math.min((bestExpert.result.confidence || 0.5) + 0.1, 1.0),
        algorithm: 'expert_override',
        expertAgent: bestExpert.agent,
        expertPriority: expertPriority[bestExpert.agent] || 1,
        metadata: {
          availableExperts: expertResults.map(r => r.agent),
          totalResults: validResults.length
        }
      };
    }

    console.warn(chalk.yellow('⚠️ No expert results available, falling back to confidence-based'));
    return this.confidenceBased(results, options);
  }

  byzantineFaultTolerant(results, options = {}) {
    const validResults = results.filter(r => !r.result.error);
    const faultTolerance = options.faultTolerance || Math.floor(validResults.length / 3);
    
    if (validResults.length < 3 * faultTolerance + 1) {
      throw new Error(`Insufficient results for Byzantine fault tolerance. Need at least ${3 * faultTolerance + 1}, got ${validResults.length}`);
    }

    const resultClusters = this.clusterSimilarResults(validResults);
    
    const largestCluster = resultClusters.reduce((largest, current) => 
      current.members.length > largest.members.length ? current : largest
    );

    if (largestCluster.members.length < validResults.length - faultTolerance) {
      throw new Error('Cannot achieve Byzantine consensus - too many conflicting results');
    }

    const clusterConsensus = this.buildClusterConsensus(largestCluster);
    const agreementRatio = largestCluster.members.length / validResults.length;

    return {
      consensus: clusterConsensus,
      confidence: agreementRatio,
      algorithm: 'byzantine_fault_tolerant',
      clusterSize: largestCluster.members.length,
      faultTolerance,
      metadata: {
        totalClusters: resultClusters.length,
        largestClusterSize: largestCluster.members.length,
        agreementRatio,
        byzantineResilience: true
      }
    };
  }

  dynamicWeighting(results, options = {}) {
    const validResults = results.filter(r => !r.result.error);
    
    if (validResults.length === 0) {
      throw new Error('No valid results for dynamic weighting');
    }

    const weights = this.calculateDynamicWeights(validResults, options);
    
    let bestResult = null;
    let maxWeightedScore = -1;
    
    validResults.forEach(({ agent, result }) => {
      const confidence = result.confidence || 0.5;
      const dynamicWeight = weights[agent] || 1;
      const weightedScore = confidence * dynamicWeight;
      
      if (weightedScore > maxWeightedScore) {
        maxWeightedScore = weightedScore;
        bestResult = { agent, result };
      }
    });

    const averageWeight = Object.values(weights).reduce((a, b) => a + b, 0) / Object.keys(weights).length;

    return {
      consensus: bestResult.result,
      confidence: maxWeightedScore / (averageWeight || 1),
      algorithm: 'dynamic_weighting',
      selectedAgent: bestResult.agent,
      dynamicWeights: weights,
      metadata: {
        maxWeightedScore,
        averageWeight,
        weightingFactors: options.weightingFactors || {}
      }
    };
  }

  qualityThreshold(results, options = {}) {
    const validResults = results.filter(r => !r.result.error);
    const qualityThreshold = options.qualityThreshold || 0.7;
    const qualityMetrics = options.qualityMetrics || ['confidence', 'completeness', 'accuracy'];

    const qualityScores = validResults.map(({ agent, result }) => {
      const scores = qualityMetrics.map(metric => {
        switch (metric) {
          case 'confidence':
            return result.confidence || 0.5;
          case 'completeness':
            return result.completeness || this.assessCompleteness(result);
          case 'accuracy':
            return result.accuracy || this.assessAccuracy(result);
          default:
            return result[metric] || 0.5;
        }
      });
      
      const averageQuality = scores.reduce((a, b) => a + b, 0) / scores.length;
      
      return {
        agent,
        result,
        quality: averageQuality,
        metrics: Object.fromEntries(qualityMetrics.map((m, i) => [m, scores[i]]))
      };
    });

    const qualityResults = qualityScores.filter(qs => qs.quality >= qualityThreshold);

    if (qualityResults.length === 0) {
      const bestAvailable = qualityScores.reduce((best, current) => 
        current.quality > best.quality ? current : best
      );
      
      console.warn(chalk.yellow(`⚠️ No results meet quality threshold ${qualityThreshold}, using best available (${bestAvailable.quality.toFixed(3)})`));
      
      return {
        consensus: bestAvailable.result,
        confidence: bestAvailable.quality,
        algorithm: 'quality_threshold',
        selectedAgent: bestAvailable.agent,
        qualityScore: bestAvailable.quality,
        thresholdMet: false,
        metadata: {
          qualityThreshold,
          bestQualityScore: bestAvailable.quality,
          qualityMetrics: bestAvailable.metrics
        }
      };
    }

    const bestQualityResult = qualityResults.reduce((best, current) => 
      current.quality > best.quality ? current : best
    );

    return {
      consensus: bestQualityResult.result,
      confidence: bestQualityResult.quality,
      algorithm: 'quality_threshold',
      selectedAgent: bestQualityResult.agent,
      qualityScore: bestQualityResult.quality,
      thresholdMet: true,
      metadata: {
        qualityThreshold,
        qualifiedResults: qualityResults.length,
        totalResults: validResults.length,
        qualityMetrics: bestQualityResult.metrics
      }
    };
  }

  generateResultKey(result) {
    if (result.value !== undefined) {
      return `value_${result.value}`;
    }
    if (result.output) {
      return `output_${this.hashString(result.output.substring(0, 100))}`;
    }
    if (result.type) {
      return `type_${result.type}`;
    }
    return `generic_${this.hashString(JSON.stringify(result))}`;
  }

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  calculateConsensusStrength(results) {
    if (results.length <= 1) return 0.5;
    
    const confidences = results.map(r => r.result.confidence || 0.5);
    const mean = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    const variance = confidences.reduce((sum, conf) => sum + Math.pow(conf - mean, 2), 0) / confidences.length;
    const standardDeviation = Math.sqrt(variance);
    
    const consistencyScore = 1 - (standardDeviation / 1); // Normalized by max possible std dev
    const averageConfidence = mean;
    
    return (consistencyScore + averageConfidence) / 2;
  }

  clusterSimilarResults(results, similarityThreshold = 0.8) {
    const clusters = [];
    
    for (const result of results) {
      let addedToCluster = false;
      
      for (const cluster of clusters) {
        const similarity = this.calculateResultSimilarity(result.result, cluster.representative);
        if (similarity >= similarityThreshold) {
          cluster.members.push(result);
          addedToCluster = true;
          break;
        }
      }
      
      if (!addedToCluster) {
        clusters.push({
          representative: result.result,
          members: [result]
        });
      }
    }
    
    return clusters;
  }

  calculateResultSimilarity(result1, result2) {
    if (!result1 || !result2) return 0;
    
    let similarity = 0;
    let factors = 0;
    
    if (result1.confidence !== undefined && result2.confidence !== undefined) {
      similarity += 1 - Math.abs(result1.confidence - result2.confidence);
      factors++;
    }
    
    if (result1.type && result2.type) {
      similarity += result1.type === result2.type ? 1 : 0;
      factors++;
    }
    
    if (result1.output && result2.output) {
      const textSimilarity = this.calculateTextSimilarity(result1.output, result2.output);
      similarity += textSimilarity;
      factors++;
    }
    
    if (result1.value !== undefined && result2.value !== undefined) {
      const valueSimilarity = 1 - Math.abs(result1.value - result2.value) / Math.max(Math.abs(result1.value), Math.abs(result2.value), 1);
      similarity += Math.max(0, valueSimilarity);
      factors++;
    }
    
    return factors > 0 ? similarity / factors : 0.5;
  }

  calculateTextSimilarity(text1, text2) {
    if (text1 === text2) return 1;
    if (!text1 || !text2) return 0;
    
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const allWords = new Set([...words1, ...words2]);
    const intersection = words1.filter(word => words2.includes(word));
    
    return intersection.length / allWords.size;
  }

  buildClusterConsensus(cluster) {
    if (cluster.members.length === 1) {
      return cluster.members[0].result;
    }
    
    const confidences = cluster.members.map(m => m.result.confidence || 0.5);
    const averageConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    
    const bestMember = cluster.members.reduce((best, current) => 
      (current.result.confidence || 0.5) > (best.result.confidence || 0.5) ? current : best
    );
    
    return {
      ...bestMember.result,
      confidence: averageConfidence,
      clusterConsensus: true,
      clusterSize: cluster.members.length
    };
  }

  calculateDynamicWeights(results, options = {}) {
    const weights = {};
    const factors = options.weightingFactors || {};
    
    const performanceFactor = factors.performance || 0.3;
    const recencyFactor = factors.recency || 0.2;
    const specialtyFactor = factors.specialty || 0.3;
    const consensusFactor = factors.consensus || 0.2;
    
    results.forEach(({ agent, result }) => {
      let weight = 1.0;
      
      if (performanceFactor > 0 && result.performance) {
        weight += performanceFactor * (result.performance.successRate || 0.5);
      }
      
      if (recencyFactor > 0 && result.timestamp) {
        const recency = Math.max(0, 1 - (Date.now() - result.timestamp) / (24 * 60 * 60 * 1000));
        weight += recencyFactor * recency;
      }
      
      if (specialtyFactor > 0 && result.specialty) {
        weight += specialtyFactor * (result.specialty.relevance || 0.5);
      }
      
      if (consensusFactor > 0 && result.consensusHistory) {
        weight += consensusFactor * (result.consensusHistory.accuracy || 0.5);
      }
      
      weights[agent] = Math.max(0.1, weight);
    });
    
    return weights;
  }

  assessCompleteness(result) {
    if (!result) return 0;
    
    let score = 0.5;
    
    if (result.output || result.content) score += 0.2;
    if (result.confidence !== undefined) score += 0.1;
    if (result.metadata) score += 0.1;
    if (result.reasoning || result.explanation) score += 0.1;
    
    return Math.min(score, 1.0);
  }

  assessAccuracy(result) {
    if (result.accuracy !== undefined) return result.accuracy;
    if (result.confidence !== undefined) return result.confidence;
    
    let score = 0.5;
    
    if (result.error) score -= 0.3;
    if (result.warnings && result.warnings.length > 0) score -= 0.1 * result.warnings.length;
    if (result.validationPassed) score += 0.2;
    
    return Math.max(0, Math.min(score, 1.0));
  }

  recordConsensus(algorithm, inputResults, consensusResult, duration) {
    this.consensusHistory.push({
      timestamp: new Date(),
      algorithm,
      inputCount: inputResults.length,
      confidence: consensusResult.confidence,
      duration,
      metadata: consensusResult.metadata || {}
    });
    
    if (this.consensusHistory.length > 1000) {
      this.consensusHistory = this.consensusHistory.slice(-1000);
    }
  }

  getConsensusMetrics() {
    if (this.consensusHistory.length === 0) {
      return {
        totalConsensuses: 0,
        averageConfidence: 0,
        averageDuration: 0,
        algorithmUsage: {}
      };
    }
    
    const recent = this.consensusHistory.slice(-100);
    
    return {
      totalConsensuses: this.consensusHistory.length,
      recentConsensuses: recent.length,
      averageConfidence: recent.reduce((sum, c) => sum + c.confidence, 0) / recent.length,
      averageDuration: recent.reduce((sum, c) => sum + c.duration, 0) / recent.length,
      algorithmUsage: recent.reduce((usage, c) => {
        usage[c.algorithm] = (usage[c.algorithm] || 0) + 1;
        return usage;
      }, {}),
      confidenceDistribution: this.calculateConfidenceDistribution(recent),
      performanceTrends: this.calculatePerformanceTrends()
    };
  }

  calculateConfidenceDistribution(consensuses) {
    const buckets = { low: 0, medium: 0, high: 0 };
    
    consensuses.forEach(c => {
      if (c.confidence < 0.5) buckets.low++;
      else if (c.confidence < 0.8) buckets.medium++;
      else buckets.high++;
    });
    
    return buckets;
  }

  calculatePerformanceTrends() {
    if (this.consensusHistory.length < 20) return null;
    
    const recent = this.consensusHistory.slice(-20);
    const older = this.consensusHistory.slice(-40, -20);
    
    const recentAvgConfidence = recent.reduce((sum, c) => sum + c.confidence, 0) / recent.length;
    const olderAvgConfidence = older.reduce((sum, c) => sum + c.confidence, 0) / older.length;
    
    const recentAvgDuration = recent.reduce((sum, c) => sum + c.duration, 0) / recent.length;
    const olderAvgDuration = older.reduce((sum, c) => sum + c.duration, 0) / older.length;
    
    return {
      confidenceTrend: recentAvgConfidence > olderAvgConfidence ? 'improving' : 'declining',
      confidenceChange: ((recentAvgConfidence - olderAvgConfidence) / olderAvgConfidence * 100).toFixed(1),
      durationTrend: recentAvgDuration < olderAvgDuration ? 'improving' : 'declining',
      durationChange: ((recentAvgDuration - olderAvgDuration) / olderAvgDuration * 100).toFixed(1)
    };
  }
}
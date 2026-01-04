export interface AnalysisResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  keywords: string[];
  entities: {
    type: string;
    value: string;
    confidence: number;
  }[];
  summary: string;
  actionItems: string[];
  risksIdentified: string[];
}

export interface ResponseMetrics {
  responseTime: number;
  tokenCount: number;
  qualityScore: number;
  relevanceScore: number;
  completenessScore: number;
}

export interface FraudIndicators {
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  indicators: {
    type: string;
    description: string;
    confidence: number;
    severity: 'low' | 'medium' | 'high';
  }[];
  recommendation: string;
  next_actions: string[];
}

class ResponseAnalyzer {
  analyzeResponse(response: string, context?: string): AnalysisResult {
    // Extract keywords using simple text analysis
    const keywords = this.extractKeywords(response);

    // Simple sentiment analysis
    const sentiment = this.analyzeSentiment(response);

    // Extract entities (simplified implementation)
    const entities = this.extractEntities(response);

    // Generate summary
    const summary = this.generateSummary(response);

    // Extract action items
    const actionItems = this.extractActionItems(response);

    // Identify risks
    const risksIdentified = this.identifyRisks(response);

    return {
      sentiment,
      confidence: 0.85, // Mock confidence score
      keywords,
      entities,
      summary,
      actionItems,
      risksIdentified
    };
  }

  analyzeMetrics(response: string, startTime: number): ResponseMetrics {
    const responseTime = Date.now() - startTime;
    const tokenCount = this.estimateTokenCount(response);

    // Mock quality scores (in real implementation, these would use ML models)
    const qualityScore = Math.random() * 0.3 + 0.7; // 0.7-1.0
    const relevanceScore = Math.random() * 0.2 + 0.8; // 0.8-1.0
    const completenessScore = Math.random() * 0.25 + 0.75; // 0.75-1.0

    return {
      responseTime,
      tokenCount,
      qualityScore,
      relevanceScore,
      completenessScore
    };
  }

  analyzeFraudIndicators(response: string, investigationData?: any): FraudIndicators {
    const indicators = this.detectFraudPatterns(response);
    const riskLevel = this.calculateRiskLevel(indicators);
    const recommendation = this.generateRecommendation(riskLevel, indicators);
    const nextActions = this.suggestNextActions(riskLevel, indicators);

    return {
      risk_level: riskLevel,
      indicators,
      recommendation,
      next_actions: nextActions
    };
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - remove common words and get significant terms
    const commonWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
      'can', 'this', 'that', 'these', 'those', 'a', 'an'
    ]);

    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.has(word))
      .reduce((acc: string[], word) => {
        if (!acc.includes(word)) acc.push(word);
        return acc;
      }, [])
      .slice(0, 10); // Top 10 keywords
  }

  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['good', 'great', 'excellent', 'positive', 'success', 'secure', 'safe', 'valid'];
    const negativeWords = ['bad', 'poor', 'negative', 'fraud', 'suspicious', 'risk', 'danger', 'invalid'];

    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;

    words.forEach(word => {
      if (positiveWords.some(pw => word.includes(pw))) positiveCount++;
      if (negativeWords.some(nw => word.includes(nw))) negativeCount++;
    });

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private extractEntities(text: string): { type: string; value: string; confidence: number }[] {
    const entities = [];

    // Email patterns
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = text.match(emailRegex) || [];
    emails.forEach(email => {
      entities.push({ type: 'email', value: email, confidence: 0.95 });
    });

    // Phone patterns
    const phoneRegex = /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const phones = text.match(phoneRegex) || [];
    phones.forEach(phone => {
      entities.push({ type: 'phone', value: phone, confidence: 0.9 });
    });

    // IP addresses
    const ipRegex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
    const ips = text.match(ipRegex) || [];
    ips.forEach(ip => {
      entities.push({ type: 'ip_address', value: ip, confidence: 0.85 });
    });

    // Transaction IDs (simple pattern)
    const transactionRegex = /\b[A-Z0-9]{8,}\b/g;
    const transactions = text.match(transactionRegex) || [];
    transactions.slice(0, 3).forEach(txn => {
      entities.push({ type: 'transaction_id', value: txn, confidence: 0.7 });
    });

    return entities;
  }

  private generateSummary(text: string): string {
    // Simple extractive summarization - get first and last sentences
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);

    if (sentences.length <= 2) {
      return text.substring(0, 200) + (text.length > 200 ? '...' : '');
    }

    const firstSentence = sentences[0].trim();
    const lastSentence = sentences[sentences.length - 1].trim();

    return `${firstSentence}. ... ${lastSentence}.`;
  }

  private extractActionItems(text: string): string[] {
    const actionWords = ['investigate', 'review', 'verify', 'check', 'analyze', 'confirm', 'validate'];
    const sentences = text.split(/[.!?]+/);

    return sentences
      .filter(sentence =>
        actionWords.some(word => sentence.toLowerCase().includes(word))
      )
      .map(sentence => sentence.trim())
      .filter(sentence => sentence.length > 0)
      .slice(0, 5); // Max 5 action items
  }

  private identifyRisks(text: string): string[] {
    const riskIndicators = [
      'suspicious activity',
      'fraud detected',
      'security breach',
      'unauthorized access',
      'anomalous behavior',
      'high risk',
      'potential threat'
    ];

    const risks = [];
    const lowerText = text.toLowerCase();

    riskIndicators.forEach(indicator => {
      if (lowerText.includes(indicator)) {
        risks.push(`Detected: ${indicator}`);
      }
    });

    return risks;
  }

  private detectFraudPatterns(text: string): FraudIndicators['indicators'] {
    const indicators = [];
    const lowerText = text.toLowerCase();

    // Pattern detection logic
    if (lowerText.includes('multiple devices')) {
      indicators.push({
        type: 'device_anomaly',
        description: 'Multiple devices detected for single user',
        confidence: 0.8,
        severity: 'medium' as const
      });
    }

    if (lowerText.includes('unusual location')) {
      indicators.push({
        type: 'location_anomaly',
        description: 'Access from unusual geographic location',
        confidence: 0.75,
        severity: 'high' as const
      });
    }

    if (lowerText.includes('rapid transactions')) {
      indicators.push({
        type: 'velocity_anomaly',
        description: 'High transaction velocity detected',
        confidence: 0.9,
        severity: 'high' as const
      });
    }

    return indicators;
  }

  private calculateRiskLevel(indicators: FraudIndicators['indicators']): FraudIndicators['risk_level'] {
    if (indicators.length === 0) return 'low';

    const highSeverityCount = indicators.filter(i => i.severity === 'high').length;
    const avgConfidence = indicators.reduce((sum, i) => sum + i.confidence, 0) / indicators.length;

    if (highSeverityCount >= 2 || avgConfidence > 0.85) return 'critical';
    if (highSeverityCount >= 1 || avgConfidence > 0.7) return 'high';
    if (indicators.length >= 2 || avgConfidence > 0.5) return 'medium';
    return 'low';
  }

  private generateRecommendation(riskLevel: FraudIndicators['risk_level'], indicators: FraudIndicators['indicators']): string {
    switch (riskLevel) {
      case 'critical':
        return 'Immediate escalation required. Block account and initiate full investigation.';
      case 'high':
        return 'Enhanced monitoring and verification required. Consider temporary restrictions.';
      case 'medium':
        return 'Continue monitoring and gather additional evidence. Implement enhanced authentication.';
      default:
        return 'Continue standard monitoring procedures. No immediate action required.';
    }
  }

  private suggestNextActions(riskLevel: FraudIndicators['risk_level'], indicators: FraudIndicators['indicators']): string[] {
    const actions = [];

    switch (riskLevel) {
      case 'critical':
        actions.push('Escalate to fraud team immediately');
        actions.push('Block account pending investigation');
        actions.push('Notify compliance team');
        break;
      case 'high':
        actions.push('Implement enhanced authentication');
        actions.push('Request additional verification');
        actions.push('Monitor for 48 hours');
        break;
      case 'medium':
        actions.push('Continue standard monitoring');
        actions.push('Review transaction patterns');
        actions.push('Schedule follow-up review');
        break;
      default:
        actions.push('Continue routine monitoring');
        break;
    }

    // Add specific actions based on indicators
    indicators.forEach(indicator => {
      switch (indicator.type) {
        case 'device_anomaly':
          actions.push('Verify device ownership');
          break;
        case 'location_anomaly':
          actions.push('Confirm location with user');
          break;
        case 'velocity_anomaly':
          actions.push('Review transaction velocity limits');
          break;
      }
    });

    return [...new Set(actions)]; // Remove duplicates
  }

  private estimateTokenCount(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }
}

export default new ResponseAnalyzer();
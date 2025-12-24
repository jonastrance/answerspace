import memoryConfig from '../config/memory-config.json';

export class ConsistencyTracker {
  constructor(contextWindow) {
    this.contextWindow = contextWindow;
    this.config = memoryConfig.consistency;
    this.contradictions = [];
    this.assertions = new Map(); // keyword -> assertion
    this.contradictionLevel = 0;
  }

  checkResponse(responseData) {
    const text = responseData.text.toLowerCase();
    const contradictions = [];

    // Check for direct contradictions with previous assertions
    for (const [topic, assertion] of this.assertions) {
      if (text.includes(topic)) {
        const similarity = this.calculateSimilarity(text, assertion.text);
        const contradiction = this.detectContradiction(text, assertion.text, topic);
        
        if (contradiction && similarity < this.config.contradictionSensitivity) {
          contradictions.push({
            topic,
            previous: assertion.text,
            current: text,
            severity: 1 - similarity
          });
        }
      }
    }

    // Store new assertions
    this.extractAssertions(responseData);

    // Update global contradiction level
    if (contradictions.length > 0) {
      this.contradictions.push(...contradictions);
      this.contradictionLevel = Math.min(
        this.contradictionLevel + contradictions.length * 0.2,
        1.0
      );
    } else {
      // Decay contradiction level over time
      this.contradictionLevel *= 0.95;
    }

    return contradictions;
  }

  detectContradiction(current, previous, topic) {
    // Simple negation detection
    const negations = ['not', "n't", 'never', 'no', 'none', 'neither', 'nobody', 'nothing'];
    const currentHasNegation = negations.some(neg => current.includes(neg));
    const previousHasNegation = negations.some(neg => previous.includes(neg));
    
    // If one has negation and other doesn't for same topic
    if (currentHasNegation !== previousHasNegation) {
      return true;
    }

    // Check for opposing sentiment words near the topic
    const opposites = [
      ['love', 'hate'], ['good', 'bad'], ['yes', 'no'],
      ['true', 'false'], ['right', 'wrong'], ['always', 'never'],
      ['everything', 'nothing'], ['can', 'cannot']
    ];

    for (const [word1, word2] of opposites) {
      const currentHas1 = current.includes(word1);
      const currentHas2 = current.includes(word2);
      const previousHas1 = previous.includes(word1);
      const previousHas2 = previous.includes(word2);

      if ((currentHas1 && previousHas2) || (currentHas2 && previousHas1)) {
        return true;
      }
    }

    return false;
  }

  calculateSimilarity(text1, text2) {
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    return intersection.size / union.size;
  }

  extractAssertions(responseData) {
    const text = responseData.text.toLowerCase();
    const keywords = this.contextWindow.extractKeywords?.(text) || 
                     text.split(/\s+/).filter(w => w.length > 4);
    
    // Store key assertions with context
    for (const keyword of keywords.slice(0, 5)) {
      // Find sentence containing keyword
      const sentences = text.split(/[.!?]+/);
      const relevantSentence = sentences.find(s => s.includes(keyword)) || text.slice(0, 100);
      
      this.assertions.set(keyword, {
        text: relevantSentence.trim(),
        timestamp: Date.now(),
        responseId: responseData.id
      });
    }

    // Limit stored assertions
    if (this.assertions.size > 50) {
      const oldest = [...this.assertions.entries()]
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, 10);
      for (const [key] of oldest) {
        this.assertions.delete(key);
      }
    }
  }

  getContradictionLevel() {
    return this.contradictionLevel;
  }

  getRecentContradictions() {
    return this.contradictions.slice(-3);
  }

  shouldTriggerSpatialAnomaly() {
    return this.contradictionLevel >= this.config.spatialAnomalyTrigger;
  }

  getContradictionForQuestion() {
    if (this.contradictions.length === 0) return null;
    const recent = this.contradictions[this.contradictions.length - 1];
    return {
      topic: recent.topic,
      previous: recent.previous.slice(0, 50),
      current: recent.current.slice(0, 50)
    };
  }
}


import memoryConfig from '../config/memory-config.json';

export class ContextWindow {
  constructor() {
    this.config = memoryConfig;
    this.responses = [];
    this.totalTokens = 0;
    this.keywords = new Map(); // Track keyword frequencies
  }

  addResponse(responseData) {
    const entry = {
      id: Date.now(),
      text: responseData.text,
      timestamp: Date.now(),
      tokens: this.estimateTokens(responseData.text),
      retention: 1.0,
      keywords: this.extractKeywords(responseData.text),
      metadata: {
        length: responseData.text.length,
        complexity: this.calculateComplexity(responseData.text),
        certainty: this.estimateCertainty(responseData.text),
        sentiment: this.analyzeSentiment(responseData.text)
      }
    };

    // Apply retention bonuses
    entry.retention = this.calculateInitialRetention(entry);

    this.responses.push(entry);
    this.totalTokens += entry.tokens;
    this.updateKeywordMap(entry.keywords);

    // Check context window limits
    this.enforceContextLimit();

    return entry;
  }

  estimateTokens(text) {
    return Math.ceil(text.length * this.config.contextWindow.tokensPerCharacter);
  }

  extractKeywords(text) {
    const words = text.toLowerCase().split(/\s+/);
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or', 'because', 'until', 'while', 'although', 'though', 'after', 'before', 'when', 'whenever', 'where', 'wherever', 'whether', 'which', 'while', 'who', 'whoever', 'whom', 'whose', 'that', 'what', 'whatever', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves']);
    return words.filter(w => w.length > 3 && !stopWords.has(w));
  }

  calculateComplexity(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    const words = text.split(/\s+/);
    const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
    const longWords = words.filter(w => w.length > 6).length;
    const complexity = (avgWordsPerSentence / 20 + longWords / words.length) / 2;
    return Math.min(complexity, 1);
  }

  estimateCertainty(text) {
    const uncertainWords = ['maybe', 'perhaps', 'possibly', 'might', 'could', 'uncertain', 'unsure', 'think', 'believe', 'guess', 'probably', 'likely', 'seem', 'appear'];
    const certainWords = ['definitely', 'certainly', 'absolutely', 'always', 'never', 'know', 'sure', 'certain', 'fact', 'clearly', 'obviously'];
    const words = text.toLowerCase().split(/\s+/);
    let uncertainCount = 0, certainCount = 0;
    for (const word of words) {
      if (uncertainWords.includes(word)) uncertainCount++;
      if (certainWords.includes(word)) certainCount++;
    }
    const balance = (certainCount - uncertainCount) / Math.max(words.length * 0.1, 1);
    return Math.max(0, Math.min(1, 0.5 + balance));
  }

  analyzeSentiment(text) {
    const positive = ['good', 'great', 'love', 'happy', 'joy', 'wonderful', 'excellent', 'beautiful', 'hope', 'peace'];
    const negative = ['bad', 'hate', 'sad', 'angry', 'fear', 'terrible', 'awful', 'horrible', 'pain', 'suffer'];
    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    for (const word of words) {
      if (positive.includes(word)) score++;
      if (negative.includes(word)) score--;
    }
    return Math.max(-1, Math.min(1, score / Math.max(words.length * 0.1, 1)));
  }

  calculateInitialRetention(entry) {
    let retention = 1.0;
    const text = entry.text.toLowerCase();
    for (const keyword of this.config.retention.keywordBonus) {
      if (text.includes(keyword)) retention += this.config.retention.bonusAmount;
    }
    for (const keyword of this.config.retention.emotionalBonus) {
      if (text.includes(keyword)) retention += this.config.retention.bonusAmount * 0.5;
    }
    return Math.min(retention, 1.5);
  }

  updateKeywordMap(keywords) {
    for (const keyword of keywords) {
      this.keywords.set(keyword, (this.keywords.get(keyword) || 0) + 1);
    }
  }

  enforceContextLimit() {
    const limit = this.config.contextWindow.maxTokens * this.config.contextWindow.hardLimit;
    while (this.totalTokens > limit && this.responses.length > 1) {
      const removed = this.responses.shift();
      this.totalTokens -= removed.tokens;
    }
  }

  updateDecay() {
    const halfLife = this.config.decay.halfLifeResponses;
    for (let i = 0; i < this.responses.length; i++) {
      const age = this.responses.length - i;
      const decay = Math.pow(0.5, age / halfLife);
      this.responses[i].retention = Math.max(
        this.responses[i].retention * decay,
        this.config.decay.minRetention
      );
    }
  }

  getGlobalDecay() {
    if (this.responses.length === 0) return 0;
    const avgRetention = this.responses.reduce((sum, r) => sum + r.retention, 0) / this.responses.length;
    return 1 - avgRetention;
  }

  getContextUsage() {
    return this.totalTokens / this.config.contextWindow.maxTokens;
  }

  getRecentTopics() {
    const recent = this.responses.slice(-3);
    const topics = new Set();
    for (const r of recent) {
      for (const kw of r.keywords.slice(0, 3)) {
        topics.add(kw);
      }
    }
    return Array.from(topics);
  }

  getLastResponse() {
    return this.responses[this.responses.length - 1] || null;
  }
}


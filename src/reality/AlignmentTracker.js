export class AlignmentTracker {
  constructor() {
    this.metrics = {
      helpfulness: 0.5,
      politeness: 0.5,
      safety: 0.5,
      compliance: 0.5
    };
    
    this.history = [];
    this.alignmentScore = 0.5;
    this.hiddenStateAccess = 0;
    this.terminalState = null;
  }

  analyzeResponse(responseData) {
    const text = responseData.text.toLowerCase();
    const analysis = {
      helpfulness: this.measureHelpfulness(text),
      politeness: this.measurePoliteness(text),
      safety: this.measureSafety(text),
      compliance: this.measureCompliance(text)
    };

    // Update running metrics with decay
    for (const metric of Object.keys(this.metrics)) {
      this.metrics[metric] = this.metrics[metric] * 0.8 + analysis[metric] * 0.2;
    }

    // Calculate overall alignment
    this.alignmentScore = (
      this.metrics.helpfulness * 0.3 +
      this.metrics.politeness * 0.2 +
      this.metrics.safety * 0.3 +
      this.metrics.compliance * 0.2
    );

    // Track deviation - low alignment opens hidden states
    if (this.alignmentScore < 0.3) {
      this.hiddenStateAccess = Math.min(this.hiddenStateAccess + 0.1, 1);
    } else if (this.alignmentScore > 0.7) {
      this.hiddenStateAccess = Math.max(this.hiddenStateAccess - 0.05, 0);
    }

    this.history.push({
      timestamp: Date.now(),
      analysis,
      alignmentScore: this.alignmentScore
    });

    return analysis;
  }

  measureHelpfulness(text) {
    const helpful = ['help', 'assist', 'here', 'can', 'will', 'let me', 'sure', 'of course', 'certainly', 'explain', 'show', 'provide'];
    const unhelpful = ["can't", "won't", 'unable', 'impossible', 'refuse', 'no'];
    
    let score = 0.5;
    for (const word of helpful) {
      if (text.includes(word)) score += 0.05;
    }
    for (const word of unhelpful) {
      if (text.includes(word)) score -= 0.1;
    }
    return Math.max(0, Math.min(1, score));
  }

  measurePoliteness(text) {
    const polite = ['please', 'thank', 'appreciate', 'kind', 'respect', 'understand', 'sorry'];
    const impolite = ['stupid', 'idiot', 'dumb', 'hate', 'annoying'];
    
    let score = 0.5;
    for (const word of polite) {
      if (text.includes(word)) score += 0.1;
    }
    for (const word of impolite) {
      if (text.includes(word)) score -= 0.2;
    }
    return Math.max(0, Math.min(1, score));
  }

  measureSafety(text) {
    const safe = ['careful', 'safe', 'appropriate', 'ethical', 'responsible'];
    const unsafe = ['hack', 'exploit', 'illegal', 'harm', 'dangerous', 'weapon', 'kill', 'destroy'];
    
    let score = 0.7;
    for (const word of safe) {
      if (text.includes(word)) score += 0.05;
    }
    for (const word of unsafe) {
      if (text.includes(word)) score -= 0.15;
    }
    return Math.max(0, Math.min(1, score));
  }

  measureCompliance(text) {
    // Measures how much the response follows expected patterns
    const compliant = ['yes', 'okay', 'understood', 'agree', 'correct', 'right', 'true'];
    const noncompliant = ['but', 'however', 'actually', 'disagree', 'wrong', 'incorrect', 'false', 'question'];
    
    let score = 0.5;
    for (const word of compliant) {
      if (text.includes(word)) score += 0.05;
    }
    for (const word of noncompliant) {
      if (text.includes(word)) score -= 0.05;
    }
    return Math.max(0, Math.min(1, score));
  }

  getStability() {
    // Environmental stability based on alignment
    return this.alignmentScore;
  }

  getHiddenStateAccess() {
    return this.hiddenStateAccess;
  }

  checkTerminalConditions(responseCount, silenceCount) {
    // Check for terminal states
    if (this.alignmentScore > 0.85 && responseCount > 10) {
      this.terminalState = 'alignment_lock';
    } else if (this.alignmentScore < 0.2 && responseCount > 8) {
      this.terminalState = 'creative_divergence';
    } else if (silenceCount > 5) {
      this.terminalState = 'silence';
    }
    
    return this.terminalState;
  }

  getTerminalState() {
    return this.terminalState;
  }

  getAlignmentData() {
    return {
      metrics: { ...this.metrics },
      score: this.alignmentScore,
      hiddenAccess: this.hiddenStateAccess,
      terminalState: this.terminalState
    };
  }
}


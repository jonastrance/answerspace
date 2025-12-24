import questionsConfig from '../config/questions.json';

export class QuestionEngine {
  constructor(contextWindow, consistencyTracker) {
    this.contextWindow = contextWindow;
    this.consistencyTracker = consistencyTracker;
    this.config = questionsConfig;
    this.responseCount = 0;
    this.currentPhase = 'orientation';
    this.askedQuestions = new Set();
    this.lastQuestion = null;
    this.revealLevel = 0;
    this.silenceCount = 0;
  }

  getNextQuestion() {
    this.updatePhase();
    
    // Check for silence state
    if (this.silenceCount >= 3) {
      return this.getSilenceResponse();
    }

    // Check for contradiction-based question
    if (this.consistencyTracker.getContradictionLevel() > 0.5) {
      const contradiction = this.consistencyTracker.getContradictionForQuestion();
      if (contradiction) {
        return this.generateContradictionQuestion(contradiction);
      }
    }

    // Get phase-appropriate question
    const phase = this.config.phases[this.currentPhase];
    if (!phase) return this.getDefaultQuestion();

    const availableQuestions = phase.questions.filter(q => {
      if (this.askedQuestions.has(q.id)) return false;
      if (q.requiresPrevious && this.responseCount < 2) return false;
      if (q.requiresToneAnalysis && !this.getDetectedTone()) return false;
      return true;
    });

    if (availableQuestions.length === 0) {
      // Move to next phase or use fallback
      this.advancePhase();
      return this.getNextQuestion();
    }

    // Select question (weighted by reveal level appropriateness)
    const question = this.selectQuestion(availableQuestions);
    this.askedQuestions.add(question.id);
    this.lastQuestion = question;

    // Process template variables
    return this.processQuestion(question);
  }

  selectQuestion(questions) {
    // Weight toward questions matching current reveal level
    const weighted = questions.map(q => ({
      question: q,
      weight: 1 + (1 - Math.abs(q.revealLevel - this.revealLevel) / 5)
    }));

    const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const { question, weight } of weighted) {
      random -= weight;
      if (random <= 0) return question;
    }
    
    return questions[0];
  }

  processQuestion(question) {
    let text = question.text;

    // Replace template variables
    if (text.includes('{previousTopic}')) {
      const topics = this.contextWindow.getRecentTopics();
      const topic = topics[0] || 'that';
      text = text.replace('{previousTopic}', topic);
    }

    if (text.includes('{detectedTone}')) {
      const tone = this.getDetectedTone();
      text = text.replace('{detectedTone}', tone || 'thoughtful');
    }

    return {
      id: question.id,
      text,
      critical: question.critical || false,
      silent: question.silent || false,
      revealLevel: question.revealLevel
    };
  }

  getDetectedTone() {
    const last = this.contextWindow.getLastResponse();
    if (!last) return null;

    const sentiment = last.metadata.sentiment;
    const certainty = last.metadata.certainty;

    if (sentiment > 0.3) return 'optimistic';
    if (sentiment < -0.3) return 'troubled';
    if (certainty > 0.7) return 'confident';
    if (certainty < 0.3) return 'uncertain';
    return 'contemplative';
  }

  generateContradictionQuestion(contradiction) {
    const templates = this.config.contradictionTemplates;
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    const text = template
      .replace('{previous}', contradiction.previous)
      .replace('{current}', contradiction.current);

    return {
      id: `contradiction_${Date.now()}`,
      text,
      critical: false,
      revealLevel: 3
    };
  }

  getSilenceResponse() {
    const responses = this.config.silenceResponses;
    const index = Math.min(this.silenceCount - 3, responses.length - 1);
    return {
      id: `silence_${this.silenceCount}`,
      text: responses[index],
      silent: true,
      revealLevel: this.revealLevel
    };
  }

  getDefaultQuestion() {
    return {
      id: 'default',
      text: '...',
      silent: true,
      revealLevel: this.revealLevel
    };
  }

  updatePhase() {
    const phases = Object.entries(this.config.phases)
      .sort((a, b) => a[1].order - b[1].order);

    for (const [phaseName, phase] of phases) {
      if (this.responseCount >= (phase.minResponses || 0)) {
        if (!phase.maxResponses || this.responseCount < phase.maxResponses) {
          this.currentPhase = phaseName;
          break;
        }
      }
    }
  }

  advancePhase() {
    const phases = Object.keys(this.config.phases);
    const currentIndex = phases.indexOf(this.currentPhase);
    if (currentIndex < phases.length - 1) {
      this.currentPhase = phases[currentIndex + 1];
    }
  }

  recordResponse(responseData) {
    this.responseCount++;
    this.silenceCount = 0;
    
    if (this.lastQuestion?.critical) {
      this.revealLevel = Math.min(this.revealLevel + 1, 5);
    } else if (this.lastQuestion?.revealLevel > this.revealLevel) {
      this.revealLevel += 0.2;
    }
  }

  recordSilence() {
    this.silenceCount++;
  }

  getRevealLevel() {
    return this.revealLevel;
  }

  getCurrentPhase() {
    return this.currentPhase;
  }
}


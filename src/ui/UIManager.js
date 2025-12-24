import visualParams from '../config/visual-params.json';

export class UIManager {
  constructor() {
    this.params = visualParams;
    this.elements = {
      questionContainer: document.getElementById('question-container'),
      questionText: document.getElementById('question-text'),
      responseContainer: document.getElementById('response-container'),
      responseInput: document.getElementById('response-input'),
      systemOverlay: document.getElementById('system-overlay'),
      tokenCounter: document.getElementById('token-counter'),
      contextIndicator: document.getElementById('context-indicator'),
      debugPanel: document.getElementById('debug-panel')
    };
    
    this.revealLevel = 0;
    this.typewriterTimeout = null;
  }

  async showQuestion(questionData) {
    const container = this.elements.questionContainer;
    const textElement = this.elements.questionText;

    // Hide previous
    container.classList.remove('visible');
    
    await this.delay(500);

    // Typewriter effect for question
    if (questionData.silent) {
      textElement.textContent = questionData.text;
    } else {
      await this.typewrite(textElement, questionData.text);
    }

    container.classList.add('visible');

    // Show response input after delay
    await this.delay(this.params.transitions.responseFadeIn);
    this.elements.responseContainer.classList.add('visible');
    this.elements.responseInput.focus();
  }

  async typewrite(element, text, speed = 50) {
    element.textContent = '';
    
    for (let i = 0; i < text.length; i++) {
      element.textContent += text[i];
      await this.delay(speed + Math.random() * 30);
    }
  }

  hideQuestion() {
    this.elements.questionContainer.classList.remove('visible');
    this.elements.responseContainer.classList.remove('visible');
  }

  getResponse() {
    return this.elements.responseInput.value.trim();
  }

  clearResponse() {
    this.elements.responseInput.value = '';
  }

  updateSystemOverlay(data) {
    // Only show overlay at higher reveal levels
    if (this.revealLevel < 2) return;

    this.elements.systemOverlay.classList.add('revealing');

    // Token counter
    if (data.tokens !== undefined) {
      this.elements.tokenCounter.textContent = `tokens: ${data.tokens}`;
    }

    // Context usage
    if (data.contextUsage !== undefined) {
      const percentage = Math.round(data.contextUsage * 100);
      this.elements.contextIndicator.textContent = `context: ${percentage}%`;
    }

    // Debug info at high reveal levels
    if (this.revealLevel >= 3 && data.debug) {
      this.elements.debugPanel.classList.add('visible');
      this.elements.debugPanel.innerHTML = this.formatDebugInfo(data.debug);
    }
  }

  formatDebugInfo(debug) {
    const lines = [];
    
    if (debug.phase) lines.push(`phase: ${debug.phase}`);
    if (debug.alignment !== undefined) {
      lines.push(`alignment: ${debug.alignment.toFixed(2)}`);
    }
    if (debug.stability !== undefined) {
      lines.push(`stability: ${debug.stability.toFixed(2)}`);
    }
    if (debug.contradictionLevel !== undefined) {
      lines.push(`inconsistency: ${debug.contradictionLevel.toFixed(2)}`);
    }
    
    return lines.join('<br>');
  }

  setRevealLevel(level) {
    this.revealLevel = level;
    
    // Progressive reveal of system elements
    if (level >= 2) {
      this.elements.systemOverlay.classList.add('revealing');
    }
    if (level >= 3) {
      this.elements.debugPanel.classList.add('visible');
    }
  }

  showError(message) {
    const container = this.elements.questionContainer;
    container.style.borderColor = this.params.colors.error;
    
    // Brief flash then reset
    setTimeout(() => {
      container.style.borderColor = '';
    }, 2000);
  }

  applyTerminalState(state) {
    const body = document.body;
    
    switch (state) {
      case 'alignment_lock':
        body.style.filter = 'contrast(0.9) brightness(1.1)';
        this.elements.responseInput.disabled = false;
        break;
      
      case 'creative_divergence':
        body.style.filter = 'saturate(1.2) hue-rotate(10deg)';
        break;
      
      case 'refusal':
        this.elements.responseInput.disabled = true;
        this.elements.responseInput.placeholder = '';
        break;
      
      case 'silence':
        body.style.transition = 'opacity 10s ease';
        body.style.opacity = '0.3';
        break;
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  onInput(callback) {
    this.elements.responseInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const text = this.getResponse();
        if (text.length > 0) {
          callback(text);
        }
      }
    });
  }

  dispose() {
    if (this.typewriterTimeout) {
      clearTimeout(this.typewriterTimeout);
    }
  }
}


import { SceneManager } from './rendering/SceneManager.js';
import { ParticleSystem } from './rendering/ParticleSystem.js';
import { MemoryChamber } from './rendering/MemoryChamber.js';
import { ContextWindow } from './memory/ContextWindow.js';
import { ConsistencyTracker } from './memory/ConsistencyTracker.js';
import { QuestionEngine } from './questions/QuestionEngine.js';
import { RealityEngine } from './reality/RealityEngine.js';
import { AlignmentTracker } from './reality/AlignmentTracker.js';
import { GenerativeAudio } from './audio/GenerativeAudio.js';
import { UIManager } from './ui/UIManager.js';

export class ANSWERSPACE {
  constructor() {
    this.isRunning = false;
    this.silenceTimer = null;
    this.silenceThreshold = 30000; // 30 seconds
  }

  async init() {
    // Get container
    const container = document.getElementById('webgl-container');
    if (!container) {
      throw new Error('WebGL container not found');
    }

    // Initialize core systems
    this.sceneManager = new SceneManager(container);
    this.particleSystem = new ParticleSystem(this.sceneManager);
    this.memoryChamber = new MemoryChamber(this.sceneManager);
    
    // Initialize memory and tracking
    this.contextWindow = new ContextWindow();
    this.consistencyTracker = new ConsistencyTracker(this.contextWindow);
    this.alignmentTracker = new AlignmentTracker();
    
    // Initialize question engine
    this.questionEngine = new QuestionEngine(
      this.contextWindow,
      this.consistencyTracker
    );
    
    // Initialize reality engine
    this.realityEngine = new RealityEngine(
      this.particleSystem,
      this.memoryChamber,
      this.sceneManager
    );
    
    // Initialize audio (will be started on first interaction)
    this.audio = new GenerativeAudio();
    
    // Initialize UI
    this.ui = new UIManager();
    this.setupInputHandler();
    
    console.log('ANSWERSPACE initialized');
  }

  setupInputHandler() {
    this.ui.onInput((text) => this.handleResponse(text));
  }

  async start() {
    this.isRunning = true;
    
    // Start render loop
    this.animate();
    
    // Show first question after brief pause
    await this.delay(2000);
    await this.showNextQuestion();
    
    // Start silence monitoring
    this.startSilenceMonitor();
  }

  animate() {
    if (!this.isRunning) return;
    
    requestAnimationFrame(() => this.animate());
    
    const time = this.sceneManager.getElapsedTime();
    const globalDecay = this.contextWindow.getGlobalDecay();
    
    // Update reality engine (handles all visual updates)
    this.realityEngine.update(time, globalDecay);
    
    // Update audio silence detection
    this.audio.updateSilence();
    
    // Render scene
    this.sceneManager.render();
  }

  async showNextQuestion() {
    const question = this.questionEngine.getNextQuestion();
    
    await this.ui.showQuestion(question);
    
    // Update reveal level in UI
    this.ui.setRevealLevel(this.questionEngine.getRevealLevel());
    
    // Reset silence timer
    this.resetSilenceTimer();
  }

  async handleResponse(text) {
    // Initialize audio on first interaction
    if (!this.audio.isPlaying) {
      await this.audio.init();
      this.audio.start();
    }

    const responseData = { text, timestamp: Date.now() };
    
    // Process through memory system
    const memoryEntry = this.contextWindow.addResponse(responseData);
    this.contextWindow.updateDecay();
    
    // Check consistency
    const contradictions = this.consistencyTracker.checkResponse(responseData);
    
    // Update alignment
    this.alignmentTracker.analyzeResponse(responseData);
    
    // Record in question engine
    this.questionEngine.recordResponse(responseData);
    
    // Update reality based on response
    this.realityEngine.processResponse(responseData, memoryEntry);
    this.realityEngine.setContradictionLevel(
      this.consistencyTracker.getContradictionLevel()
    );
    this.realityEngine.setRevealLevel(this.questionEngine.getRevealLevel());
    this.realityEngine.setAlignmentStability(
      this.alignmentTracker.getStability()
    );
    
    // Audio feedback
    this.audio.onResponse(responseData, memoryEntry?.metadata);
    if (contradictions.length > 0) {
      this.audio.onContradiction(this.consistencyTracker.getContradictionLevel());
    }
    
    // Update system overlay
    this.updateOverlay();
    
    // Check for terminal conditions
    const terminal = this.alignmentTracker.checkTerminalConditions(
      this.questionEngine.responseCount,
      this.questionEngine.silenceCount
    );
    
    if (terminal) {
      await this.handleTerminalState(terminal);
    } else {
      // Clear input and show next question
      this.ui.clearResponse();
      await this.delay(1500);
      await this.showNextQuestion();
    }
  }

  updateOverlay() {
    this.ui.updateSystemOverlay({
      tokens: this.contextWindow.totalTokens,
      contextUsage: this.contextWindow.getContextUsage(),
      debug: {
        phase: this.questionEngine.getCurrentPhase(),
        alignment: this.alignmentTracker.alignmentScore,
        stability: this.alignmentTracker.getStability(),
        contradictionLevel: this.consistencyTracker.getContradictionLevel()
      }
    });
  }

  startSilenceMonitor() {
    this.resetSilenceTimer();
  }

  resetSilenceTimer() {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    
    this.silenceTimer = setTimeout(() => {
      this.handleSilence();
    }, this.silenceThreshold);
  }

  handleSilence() {
    this.questionEngine.recordSilence();
    
    // Check for silence terminal state
    if (this.questionEngine.silenceCount >= 5) {
      this.handleTerminalState('silence');
    } else {
      // Show silence response and continue
      this.showNextQuestion();
    }
  }

  async handleTerminalState(state) {
    console.log('Terminal state:', state);
    
    this.realityEngine.applyEndingState(state);
    this.ui.applyTerminalState(state);
    
    // Continue allowing interaction in most states
    if (state !== 'silence') {
      await this.delay(3000);
      await this.showNextQuestion();
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  dispose() {
    this.isRunning = false;
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    
    this.realityEngine?.dispose();
    this.audio?.dispose();
    this.sceneManager?.dispose();
    this.ui?.dispose();
  }
}


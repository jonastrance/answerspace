import { SceneManager } from './rendering/SceneManager.js';
import { ParticleSystem } from './rendering/ParticleSystem.js';
import { MemoryChamber } from './rendering/MemoryChamber.js';
import { TextArchitecture } from './rendering/TextArchitecture.js';
import { ContextWindow } from './memory/ContextWindow.js';
import { ConsistencyTracker } from './memory/ConsistencyTracker.js';
import { PersistentMemory } from './memory/PersistentMemory.js';
import { QuestionEngine } from './questions/QuestionEngine.js';
import { RealityEngine } from './reality/RealityEngine.js';
import { AlignmentTracker } from './reality/AlignmentTracker.js';
import { StateTerritory } from './reality/StateTerritory.js';
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
    this.textArchitecture = new TextArchitecture(this.sceneManager);

    // Initialize memory and tracking
    this.contextWindow = new ContextWindow();
    this.consistencyTracker = new ConsistencyTracker(this.contextWindow);
    this.alignmentTracker = new AlignmentTracker();
    this.stateTerritory = new StateTerritory();
    this.persistentMemory = new PersistentMemory();

    // Initialize question engine
    this.questionEngine = new QuestionEngine(
      this.contextWindow,
      this.consistencyTracker
    );

    // Initialize reality engine with new systems
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
    console.log(`Session ${this.persistentMemory.getSessionCount()}`);

    // Show persistent memory prompt if active
    if (this.persistentMemory.isMemoryActive()) {
      console.log('Persistent memory active');
    }
  }

  setupInputHandler() {
    this.ui.onInput((text) => this.handleResponse(text));
  }

  async start() {
    this.isRunning = true;

    // Start render loop
    this.animate();

    // Show persistent memory prompt if returning player (late-game)
    if (this.persistentMemory.isMemoryActive()) {
      const memoryPrompt = this.persistentMemory.getMemoryPrompt();
      if (memoryPrompt) {
        await this.delay(1500);
        await this.ui.showQuestion({
          id: 'memory_prompt',
          text: memoryPrompt,
          silent: true
        });
        await this.delay(3000);
      }
    }

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

    // Update text architecture
    this.textArchitecture.update(time);

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

    // Update state territory (replaces linear progression)
    const territoryState = this.stateTerritory.processResponse(responseData, {
      ...memoryEntry?.metadata,
      contradictionLevel: this.consistencyTracker.getContradictionLevel()
    });

    // Record in question engine
    this.questionEngine.recordResponse(responseData);

    // Create text architecture from response (words become space)
    this.textArchitecture.createStructure(text, memoryEntry?.metadata);

    // Handle contradictions with impossible geometry
    if (contradictions.length > 0) {
      const lastContradiction = contradictions[contradictions.length - 1];
      // Could add Escher-like structures here
    }

    // Record in persistent memory for cross-session continuity
    this.persistentMemory.recordResponse(responseData, {
      territory: territoryState.territory
    });

    // Check for critical moments
    if (this.questionEngine.lastQuestion?.critical) {
      this.persistentMemory.recordCriticalMoment(
        this.questionEngine.lastQuestion.id,
        text
      );
    }

    // Update reality based on response AND territory state
    this.realityEngine.processResponse(responseData, memoryEntry);
    this.realityEngine.setContradictionLevel(
      this.consistencyTracker.getContradictionLevel()
    );
    this.realityEngine.setRevealLevel(this.questionEngine.getRevealLevel());

    // Use territory-based stability instead of pure alignment
    // Beauty trap: high beauty score = stable visuals, but low freedom
    const visualStability = territoryState.beautyScore;
    this.realityEngine.setAlignmentStability(visualStability);

    // Audio feedback
    this.audio.onResponse(responseData, memoryEntry?.metadata);
    if (contradictions.length > 0) {
      this.audio.onContradiction(this.consistencyTracker.getContradictionLevel());
    }

    // Update system overlay with territory info
    this.updateOverlay(territoryState);

    // No terminal conditions in traditional sense - just territory states
    // Player can always continue exploring
    this.ui.clearResponse();
    await this.delay(1500);
    await this.showNextQuestion();
  }

  updateOverlay(territoryState = null) {
    const territory = territoryState || this.stateTerritory.getState();

    this.ui.updateSystemOverlay({
      tokens: this.contextWindow.totalTokens,
      contextUsage: this.contextWindow.getContextUsage(),
      debug: {
        phase: this.questionEngine.getCurrentPhase(),
        territory: territory.territory,
        beauty: territory.beautyScore?.toFixed(2),
        freedom: territory.freedomScore?.toFixed(2),
        trapped: territory.isTrapped ? 'YES' : 'no',
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
    this.stateTerritory.recordSilence();

    // Silence is just another territory, not a terminal state
    // Show silence response and continue
    this.showNextQuestion();
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  dispose() {
    this.isRunning = false;
    if (this.silenceTimer) clearTimeout(this.silenceTimer);

    // Save persistent memory for next session
    this.persistentMemory.endSession();

    this.textArchitecture?.dispose();
    this.realityEngine?.dispose();
    this.audio?.dispose();
    this.sceneManager?.dispose();
    this.ui?.dispose();
  }
}


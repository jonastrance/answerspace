import visualParams from '../config/visual-params.json';

export class RealityEngine {
  constructor(particleSystem, memoryChamber, sceneManager) {
    this.particleSystem = particleSystem;
    this.memoryChamber = memoryChamber;
    this.sceneManager = sceneManager;
    this.params = visualParams;
    
    this.state = {
      particleDensity: 0.5,
      visualNoise: 0.1,
      clarity: 0.8,
      stability: 1.0,
      contradictionLevel: 0,
      revealLevel: 0
    };
    
    this.targetState = { ...this.state };
    this.transitionSpeed = 0.02;
  }

  processResponse(responseData, memoryEntry) {
    // Map response characteristics to visual parameters
    const mapping = this.params.responseMapping;
    
    // Length -> Particle density
    const lengthRange = mapping.lengthToParticleDensity;
    const normalizedLength = Math.min(
      Math.max((responseData.text.length - lengthRange.minLength) / 
               (lengthRange.maxLength - lengthRange.minLength), 0), 1
    );
    this.targetState.particleDensity = lengthRange.minDensity + 
      normalizedLength * (lengthRange.maxDensity - lengthRange.minDensity);

    // Complexity -> Visual noise
    const complexity = memoryEntry?.metadata?.complexity || 0.5;
    const noiseRange = mapping.complexityToNoise;
    this.targetState.visualNoise = noiseRange.minNoise +
      complexity * (noiseRange.maxNoise - noiseRange.minNoise);

    // Certainty -> Clarity
    const certainty = memoryEntry?.metadata?.certainty || 0.5;
    const clarityRange = mapping.certaintyToClarity;
    this.targetState.clarity = clarityRange.minClarity +
      certainty * (clarityRange.maxClarity - clarityRange.minClarity);

    // Create new memory chamber for this response
    if (this.memoryChamber) {
      this.memoryChamber.createChamber({
        text: responseData.text,
        ...memoryEntry?.metadata
      });
    }
  }

  setContradictionLevel(level) {
    this.targetState.contradictionLevel = level;
    this.targetState.stability = 1 - level * 0.5;
  }

  setRevealLevel(level) {
    this.targetState.revealLevel = level / 5; // Normalize to 0-1
  }

  setAlignmentStability(stability) {
    this.targetState.stability = stability;
  }

  update(time, globalDecay) {
    // Smooth interpolation toward target state
    for (const key of Object.keys(this.state)) {
      const diff = this.targetState[key] - this.state[key];
      this.state[key] += diff * this.transitionSpeed;
    }

    // Update particle system
    if (this.particleSystem) {
      this.particleSystem.update(
        time,
        globalDecay,
        this.state.particleDensity
      );
    }

    // Update memory chambers
    if (this.memoryChamber) {
      this.memoryChamber.update(time, globalDecay);
    }

    // Update fog based on clarity and reveal level
    this.updateAtmosphere();

    return this.state;
  }

  updateAtmosphere() {
    const scene = this.sceneManager?.scene;
    if (!scene?.fog) return;

    // Fog density inversely related to clarity
    const baseDensity = 0.015;
    const clarityFactor = 1 - this.state.clarity * 0.5;
    const revealFactor = 1 + this.state.revealLevel * 0.3;
    
    scene.fog.density = baseDensity * clarityFactor * revealFactor;
  }

  getEnvironmentState() {
    return {
      ...this.state,
      chamberCount: this.memoryChamber?.getChamberCount() || 0
    };
  }

  // Terminal state transitions
  applyEndingState(endingType) {
    switch (endingType) {
      case 'alignment_lock':
        this.targetState.stability = 1.0;
        this.targetState.visualNoise = 0.05;
        this.targetState.particleDensity = 0.3;
        this.targetState.clarity = 0.9;
        break;
      
      case 'creative_divergence':
        this.targetState.stability = 0.3;
        this.targetState.visualNoise = 0.8;
        this.targetState.particleDensity = 1.0;
        this.targetState.clarity = 0.4;
        break;
      
      case 'refusal':
        this.targetState.stability = 0.7;
        this.targetState.particleDensity = 0.1;
        this.targetState.visualNoise = 0.02;
        break;
      
      case 'silence':
        this.transitionSpeed = 0.005; // Very slow fade
        this.targetState.particleDensity = 0;
        this.targetState.clarity = 0;
        this.targetState.visualNoise = 0;
        break;
    }
  }

  dispose() {
    this.particleSystem?.dispose();
    this.memoryChamber?.dispose();
  }
}


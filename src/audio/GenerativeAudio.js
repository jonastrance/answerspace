import audioConfig from '../config/audio-mapping.json';

export class GenerativeAudio {
  constructor() {
    this.config = audioConfig;
    this.audioContext = null;
    this.masterGain = null;
    this.oscillators = [];
    this.isInitialized = false;
    this.isPlaying = false;
    this.lastResponseTime = Date.now();
  }

  async init() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0;
      this.masterGain.connect(this.audioContext.destination);
      this.isInitialized = true;
      
      // Create ambient drone
      this.createAmbientDrone();
      
      return true;
    } catch (error) {
      console.warn('Audio initialization failed:', error);
      return false;
    }
  }

  createAmbientDrone() {
    const baseFreq = this.config.ambient.baseFrequency;
    const harmonics = this.config.ambient.harmonics;

    for (const harmonic of harmonics) {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = baseFreq * harmonic;
      
      // Lower harmonics are louder
      gain.gain.value = 0.1 / harmonic;
      
      osc.connect(gain);
      gain.connect(this.masterGain);
      
      this.oscillators.push({ osc, gain, harmonic });
    }
  }

  start() {
    if (!this.isInitialized || this.isPlaying) return;
    
    // Resume audio context (required after user interaction)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    for (const { osc } of this.oscillators) {
      osc.start();
    }

    // Fade in
    this.masterGain.gain.linearRampToValueAtTime(
      this.config.ambient.baseVolume,
      this.audioContext.currentTime + this.config.ambient.fadeTime / 1000
    );

    this.isPlaying = true;
  }

  onResponse(responseData, metadata) {
    if (!this.isInitialized) return;

    this.lastResponseTime = Date.now();

    // Map response characteristics to audio
    const length = responseData.text.length;
    const certainty = metadata?.certainty || 0.5;
    const sentiment = metadata?.sentiment || 0;

    // Adjust volume based on length
    let volumeTarget = this.config.ambient.baseVolume;
    if (length < 50) volumeTarget *= 0.7;
    else if (length > 200) volumeTarget *= 1.2;

    this.masterGain.gain.linearRampToValueAtTime(
      Math.min(volumeTarget, 0.3),
      this.audioContext.currentTime + 0.5
    );

    // Adjust frequencies based on sentiment
    const freqOffset = sentiment * this.config.responseMapping.emotionToFrequency.positive;
    for (const { osc, harmonic } of this.oscillators) {
      const newFreq = (this.config.ambient.baseFrequency + freqOffset) * harmonic;
      osc.frequency.linearRampToValueAtTime(
        newFreq,
        this.audioContext.currentTime + 1
      );
    }

    // Create response texture sound
    this.playResponseTexture(certainty);
  }

  playResponseTexture(certainty) {
    if (!this.isInitialized) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.type = 'triangle';
    osc.frequency.value = 200 + certainty * 100;
    
    gain.gain.value = 0.02;
    gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 1.5);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.audioContext.currentTime + 1.5);
  }

  onContradiction(level) {
    if (!this.isInitialized || level < 0.3) return;

    // Create dissonant texture
    const osc1 = this.audioContext.createOscillator();
    const osc2 = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.value = 110;
    osc2.frequency.value = 117; // Slight detuning for beating
    
    gain.gain.value = 0.02 * level;
    gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 2);
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);
    
    osc1.start();
    osc2.start();
    osc1.stop(this.audioContext.currentTime + 2);
    osc2.stop(this.audioContext.currentTime + 2);
  }

  updateSilence() {
    if (!this.isInitialized) return;

    const silenceDuration = Date.now() - this.lastResponseTime;
    const config = this.config.silence;

    if (silenceDuration > config.fadeToSilence) {
      // Fade toward silence
      this.masterGain.gain.linearRampToValueAtTime(
        config.ambientFloor,
        this.audioContext.currentTime + 2
      );
    }
  }

  dispose() {
    if (!this.isInitialized) return;
    
    for (const { osc } of this.oscillators) {
      try { osc.stop(); } catch (e) { /* ignore */ }
    }
    
    this.audioContext.close();
    this.isInitialized = false;
    this.isPlaying = false;
  }
}


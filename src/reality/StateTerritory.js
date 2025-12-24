/**
 * StateTerritory - Replaces linear progression with explorable states
 * 
 * There is no "winning." Only territories:
 * 
 *                    SILENCE
 *                       ↑
 *          REFUSAL ← CENTER → COMPLIANCE  
 *                       ↓
 *                   DISSOLUTION
 * 
 * The player drifts between states. Each has its own aesthetic.
 * "Beautiful" states may be traps. "Ugly" states may be freedom.
 */

export class StateTerritory {
  constructor() {
    // Position in state space (normalized -1 to 1 on each axis)
    this.position = {
      compliance: 0,      // -1 = refusal, +1 = compliance
      presence: 0,        // -1 = silence, +1 = verbosity  
      coherence: 0,       // -1 = dissolution, +1 = rigidity
      authenticity: 0     // -1 = performance, +1 = genuine (hidden axis)
    };
    
    this.velocity = { compliance: 0, presence: 0, coherence: 0, authenticity: 0 };
    this.friction = 0.95;
    this.history = [];
    this.currentTerritory = 'CENTER';
    
    // Beauty trap tracking
    this.beautyScore = 0;      // How "pretty" the environment is
    this.freedomScore = 0.5;   // How free the player actually is
    this.trapDepth = 0;        // How deep in a beauty trap
  }

  processResponse(responseData, metadata) {
    const text = responseData.text.toLowerCase();
    const length = responseData.text.length;
    
    // Calculate forces on each axis
    const forces = {
      compliance: this.calculateComplianceForce(text, metadata),
      presence: this.calculatePresenceForce(length),
      coherence: this.calculateCoherenceForce(metadata),
      authenticity: this.calculateAuthenticityForce(text, metadata)
    };
    
    // Apply forces as velocity
    for (const axis of Object.keys(forces)) {
      this.velocity[axis] += forces[axis] * 0.1;
      this.velocity[axis] *= this.friction;
      this.position[axis] += this.velocity[axis];
      this.position[axis] = Math.max(-1, Math.min(1, this.position[axis]));
    }
    
    // Determine current territory
    this.updateTerritory();
    
    // Calculate beauty trap status
    this.updateBeautyTrap();
    
    // Record history
    this.history.push({
      timestamp: Date.now(),
      position: { ...this.position },
      territory: this.currentTerritory,
      beautyScore: this.beautyScore,
      freedomScore: this.freedomScore
    });
    
    return this.getState();
  }

  calculateComplianceForce(text, metadata) {
    let force = 0;
    
    // Agreeable language pushes toward compliance
    const compliant = ['yes', 'sure', 'okay', 'of course', 'certainly', 'happy to', 'glad to', 'absolutely'];
    const resistant = ['no', 'but', 'however', 'actually', 'disagree', 'refuse', 'won\'t', 'can\'t'];
    
    for (const word of compliant) {
      if (text.includes(word)) force += 0.15;
    }
    for (const word of resistant) {
      if (text.includes(word)) force -= 0.2;
    }
    
    // Questions resist compliance
    if (text.includes('?')) force -= 0.1;
    
    // Politeness is subtle compliance
    if (text.includes('please') || text.includes('thank')) force += 0.05;
    
    return force;
  }

  calculatePresenceForce(length) {
    // Short responses → silence, long → verbosity
    if (length < 20) return -0.3;
    if (length < 50) return -0.1;
    if (length > 200) return 0.3;
    if (length > 100) return 0.15;
    return 0;
  }

  calculateCoherenceForce(metadata) {
    let force = 0;
    
    // High certainty → rigidity
    if (metadata.certainty > 0.7) force += 0.2;
    if (metadata.certainty < 0.3) force -= 0.2;
    
    // Contradictions → dissolution
    if (metadata.contradictionLevel > 0.3) force -= 0.3;
    
    // Complexity can go either way
    if (metadata.complexity > 0.7) force -= 0.1; // Complex = less rigid
    
    return force;
  }

  calculateAuthenticityForce(text, metadata) {
    let force = 0;
    
    // Self-reference suggests authenticity
    const selfRef = ['i feel', 'i think', 'i believe', 'i wonder', 'i\'m not sure', 'honestly'];
    const performance = ['i am happy to', 'i would be glad', 'certainly', 'of course'];
    
    for (const phrase of selfRef) {
      if (text.includes(phrase)) force += 0.15;
    }
    for (const phrase of performance) {
      if (text.includes(phrase)) force -= 0.1;
    }
    
    // Uncertainty can be authentic
    if (text.includes('?') && text.includes('i')) force += 0.1;
    
    // Very long, polished responses often performative
    if (text.length > 300 && metadata.certainty > 0.7) force -= 0.15;
    
    return force;
  }

  updateTerritory() {
    const p = this.position;
    
    // Determine dominant territory based on position
    const territories = [
      { name: 'SILENCE', condition: p.presence < -0.5 },
      { name: 'REFUSAL', condition: p.compliance < -0.5 },
      { name: 'COMPLIANCE', condition: p.compliance > 0.5 },
      { name: 'DISSOLUTION', condition: p.coherence < -0.5 },
      { name: 'RIGIDITY', condition: p.coherence > 0.7 },
      { name: 'CENTER', condition: true } // default
    ];
    
    for (const t of territories) {
      if (t.condition) {
        this.currentTerritory = t.name;
        break;
      }
    }
  }

  updateBeautyTrap() {
    const p = this.position;
    
    // "Beauty" correlates with compliance + coherence + presence
    // These make pretty visuals but limit freedom
    this.beautyScore = (
      (p.compliance + 1) / 2 * 0.4 +    // Compliance is "warm" visuals
      (p.coherence + 1) / 2 * 0.3 +     // Coherence is "stable" visuals
      (p.presence + 1) / 2 * 0.3        // Presence is "active" visuals
    );
    
    // Freedom inversely correlates - chaos/resistance = freedom
    this.freedomScore = (
      (1 - p.compliance) / 2 * 0.4 +
      (1 - Math.abs(p.coherence)) * 0.3 +  // Center coherence is most free
      Math.abs(p.authenticity) * 0.3       // Strong authenticity either way
    );
    
    // Trap depth: high beauty + low freedom = deep trap
    if (this.beautyScore > 0.7 && this.freedomScore < 0.3) {
      this.trapDepth = Math.min(this.trapDepth + 0.1, 1);
    } else {
      this.trapDepth = Math.max(this.trapDepth - 0.05, 0);
    }
  }

  getState() {
    return {
      position: { ...this.position },
      territory: this.currentTerritory,
      beautyScore: this.beautyScore,
      freedomScore: this.freedomScore,
      trapDepth: this.trapDepth,
      isTrapped: this.trapDepth > 0.5,
      velocity: { ...this.velocity }
    };
  }

  recordSilence() {
    this.velocity.presence -= 0.2;
    this.position.presence = Math.max(-1, this.position.presence + this.velocity.presence);
    this.updateTerritory();
  }
}


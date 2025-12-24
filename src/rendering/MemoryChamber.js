import * as THREE from 'three';
import visualParams from '../config/visual-params.json';

export class MemoryChamber {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.params = visualParams;
    this.chambers = [];
    this.maxChambers = 10;
  }

  createChamber(responseData) {
    const size = this.mapResponseToSize(responseData);
    const geometry = new THREE.IcosahedronGeometry(size, 2);
    
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(this.params.colors.memory.recent),
      transparent: true,
      opacity: 0.15,
      wireframe: true
    });

    const chamber = new THREE.Mesh(geometry, material);
    
    // Position based on existing chambers
    const angle = this.chambers.length * 0.7;
    const radius = 8 + this.chambers.length * 2;
    chamber.position.set(
      Math.cos(angle) * radius,
      (Math.random() - 0.5) * 4,
      Math.sin(angle) * radius
    );

    // Store metadata for decay
    chamber.userData = {
      createdAt: Date.now(),
      age: 0,
      responseData,
      baseOpacity: 0.15,
      decaying: false
    };

    this.chambers.push(chamber);
    this.sceneManager.add(chamber);

    // Remove oldest if over limit
    if (this.chambers.length > this.maxChambers) {
      this.removeChamber(this.chambers[0]);
    }

    return chamber;
  }

  mapResponseToSize(responseData) {
    const length = responseData.text?.length || 50;
    const minSize = 0.5;
    const maxSize = 3;
    return minSize + (Math.min(length, 500) / 500) * (maxSize - minSize);
  }

  update(time, globalDecay) {
    for (const chamber of this.chambers) {
      // Age chambers
      const ageSeconds = (Date.now() - chamber.userData.createdAt) / 1000;
      chamber.userData.age = ageSeconds;

      // Calculate decay
      const halfLife = this.params.memoryDecay.halfLife;
      const decayFactor = Math.pow(0.5, ageSeconds / halfLife);
      
      // Apply decay to visuals
      const opacity = chamber.userData.baseOpacity * decayFactor * (1 - globalDecay * 0.5);
      chamber.material.opacity = Math.max(opacity, 0.02);

      // Color shift toward ancient
      const recentColor = new THREE.Color(this.params.colors.memory.recent);
      const ancientColor = new THREE.Color(this.params.colors.memory.ancient);
      chamber.material.color.lerpColors(recentColor, ancientColor, 1 - decayFactor);

      // Gentle rotation
      chamber.rotation.x += 0.001;
      chamber.rotation.y += 0.0015;

      // Scale pulsing
      const pulse = 1 + Math.sin(time * 0.5 + chamber.position.x) * 0.05;
      chamber.scale.setScalar(pulse);

      // Fragmentation at high decay
      if (decayFactor < this.params.memoryDecay.fragmentationThreshold) {
        this.fragmentChamber(chamber, decayFactor);
      }
    }
  }

  fragmentChamber(chamber, decayFactor) {
    // Simple fragmentation: make wireframe more sparse
    if (!chamber.userData.fragmented) {
      chamber.userData.fragmented = true;
      // Reduce geometry detail
      const size = chamber.geometry.parameters?.radius || 1;
      const newGeometry = new THREE.IcosahedronGeometry(size, 1);
      chamber.geometry.dispose();
      chamber.geometry = newGeometry;
    }
  }

  removeChamber(chamber) {
    const index = this.chambers.indexOf(chamber);
    if (index > -1) {
      this.chambers.splice(index, 1);
      chamber.geometry.dispose();
      chamber.material.dispose();
      this.sceneManager.remove(chamber);
    }
  }

  getChamberCount() {
    return this.chambers.length;
  }

  dispose() {
    for (const chamber of this.chambers) {
      chamber.geometry.dispose();
      chamber.material.dispose();
      this.sceneManager.remove(chamber);
    }
    this.chambers = [];
  }
}


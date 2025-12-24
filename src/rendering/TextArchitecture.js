import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

export class TextArchitecture {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.structures = [];
    this.font = null;
    this.fontLoaded = false;
    this.pendingTexts = [];
    
    this.loadFont();
  }

  async loadFont() {
    const loader = new FontLoader();
    // Using a built-in Three.js font
    const fontUrl = 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/fonts/helvetiker_regular.typeface.json';
    
    try {
      this.font = await new Promise((resolve, reject) => {
        loader.load(fontUrl, resolve, undefined, reject);
      });
      this.fontLoaded = true;
      
      // Process any pending texts
      for (const pending of this.pendingTexts) {
        this.createStructure(pending.text, pending.metadata);
      }
      this.pendingTexts = [];
    } catch (error) {
      console.warn('Font loading failed, using fallback', error);
      this.useFallbackGeometry = true;
      this.fontLoaded = true;
    }
  }

  createStructure(text, metadata = {}) {
    if (!this.fontLoaded) {
      this.pendingTexts.push({ text, metadata });
      return null;
    }

    const words = text.split(/\s+/).filter(w => w.length > 0);
    const group = new THREE.Group();
    
    // Analyze text for architectural decisions
    const isQuestion = text.includes('?');
    const isShort = words.length < 5;
    const isLong = words.length > 20;
    const hasRepetition = this.detectRepetition(words);
    const sentiment = metadata.sentiment || 0;
    
    // Position in space based on existing structures
    const angle = this.structures.length * 0.5;
    const radius = 12 + this.structures.length * 3;
    const basePosition = new THREE.Vector3(
      Math.cos(angle) * radius,
      (Math.random() - 0.5) * 8,
      Math.sin(angle) * radius
    );
    
    group.position.copy(basePosition);

    // Create word meshes based on text characteristics
    if (isQuestion) {
      this.createVoidStructure(group, words);
    } else if (isShort) {
      this.createFragmentStructure(group, words, sentiment);
    } else if (isLong) {
      this.createSprawlingStructure(group, words, sentiment);
    } else {
      this.createStandardStructure(group, words, sentiment);
    }

    // Handle repetition - create pillars
    if (hasRepetition.length > 0) {
      this.addRepetitionPillars(group, hasRepetition);
    }

    group.userData = {
      text,
      metadata,
      createdAt: Date.now(),
      wordCount: words.length
    };

    this.structures.push(group);
    this.sceneManager.add(group);
    
    return group;
  }

  createTextMesh(word, size = 0.3, color = 0xe8e6e3) {
    if (this.useFallbackGeometry || !this.font) {
      // Fallback: simple box per character
      const geometry = new THREE.BoxGeometry(word.length * size * 0.6, size, size * 0.2);
      const material = new THREE.MeshBasicMaterial({ 
        color, 
        transparent: true, 
        opacity: 0.6,
        wireframe: true
      });
      return new THREE.Mesh(geometry, material);
    }

    const geometry = new TextGeometry(word, {
      font: this.font,
      size: size,
      depth: size * 0.2,
      curveSegments: 4,
      bevelEnabled: false
    });
    
    geometry.computeBoundingBox();
    geometry.center();

    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.7,
      wireframe: true
    });

    return new THREE.Mesh(geometry, material);
  }

  createFragmentStructure(group, words, sentiment) {
    // Short responses: floating scattered fragments
    words.forEach((word, i) => {
      const mesh = this.createTextMesh(word, 0.4);
      mesh.position.set(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 4
      );
      mesh.rotation.set(
        Math.random() * 0.3,
        Math.random() * Math.PI * 2,
        Math.random() * 0.3
      );
      group.add(mesh);
    });
  }

  createSprawlingStructure(group, words, sentiment) {
    // Long responses: sprawling connected structures
    let x = 0, y = 0, z = 0;
    const direction = new THREE.Vector3(1, 0, 0);
    
    words.forEach((word, i) => {
      const mesh = this.createTextMesh(word, 0.25);
      mesh.position.set(x, y, z);
      
      // Sprawl outward with gentle curves
      direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.2 + Math.random() * 0.1);
      x += direction.x * (word.length * 0.2 + 0.5);
      y += (Math.random() - 0.5) * 0.3;
      z += direction.z * (word.length * 0.2 + 0.5);
      
      group.add(mesh);
    });
  }

  createVoidStructure(group, words) {
    // Questions create doorways/voids - ring of text
    const radius = 2;
    words.forEach((word, i) => {
      const angle = (i / words.length) * Math.PI * 2;
      const mesh = this.createTextMesh(word, 0.35, 0x6b6b6b);
      mesh.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        0
      );
      mesh.lookAt(0, 0, 0);
      group.add(mesh);
    });
    
    // Add void center
    const voidGeom = new THREE.RingGeometry(0.5, 1.5, 32);
    const voidMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    const voidMesh = new THREE.Mesh(voidGeom, voidMat);
    group.add(voidMesh);
  }

  createStandardStructure(group, words, sentiment) {
    // Medium responses: layered horizontal bands
    const layers = Math.ceil(words.length / 5);
    let wordIndex = 0;

    for (let layer = 0; layer < layers; layer++) {
      const y = layer * 0.8 - (layers * 0.4);
      const wordsInLayer = Math.min(5, words.length - wordIndex);

      for (let w = 0; w < wordsInLayer; w++) {
        const word = words[wordIndex++];
        const mesh = this.createTextMesh(word, 0.3);
        const x = (w - wordsInLayer / 2) * 1.5;
        mesh.position.set(x, y, layer * 0.3);
        group.add(mesh);
      }
    }
  }

  addRepetitionPillars(group, repeatedWords) {
    // Repeated words become vertical pillars
    repeatedWords.forEach((word, i) => {
      const pillarHeight = 3 + word.count * 0.5;
      const geometry = new THREE.CylinderGeometry(0.1, 0.15, pillarHeight, 8);
      const material = new THREE.MeshBasicMaterial({
        color: 0x8b7355,
        transparent: true,
        opacity: 0.5,
        wireframe: true
      });

      const pillar = new THREE.Mesh(geometry, material);
      pillar.position.set(
        (i - repeatedWords.length / 2) * 2,
        pillarHeight / 2 - 1,
        -2
      );

      // Add word label at top
      const label = this.createTextMesh(word.word, 0.2, 0x8b7355);
      label.position.set(0, pillarHeight / 2 + 0.3, 0);
      pillar.add(label);

      group.add(pillar);
    });
  }

  detectRepetition(words) {
    const counts = {};
    for (const word of words) {
      const lower = word.toLowerCase().replace(/[^a-z]/g, '');
      if (lower.length > 3) {
        counts[lower] = (counts[lower] || 0) + 1;
      }
    }

    return Object.entries(counts)
      .filter(([word, count]) => count > 1)
      .map(([word, count]) => ({ word, count }));
  }

  createContradictionGeometry(group, previousText, currentText) {
    // Impossible staircase for contradictions
    const steps = 8;
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const geometry = new THREE.BoxGeometry(1.5, 0.2, 0.8);
      const material = new THREE.MeshBasicMaterial({
        color: 0x8b4049,
        transparent: true,
        opacity: 0.4,
        wireframe: true
      });

      const step = new THREE.Mesh(geometry, material);
      // Penrose stairs - each step goes up but loops back
      step.position.set(
        Math.cos(angle) * 2,
        (i / steps) * 2 - 1,
        Math.sin(angle) * 2
      );
      step.rotation.y = -angle;

      group.add(step);
    }
  }

  update(time) {
    // Gentle rotation and floating for all structures
    for (const structure of this.structures) {
      structure.rotation.y += 0.0005;
      structure.position.y += Math.sin(time * 0.5 + structure.position.x) * 0.001;

      // Fade based on age
      const age = (Date.now() - structure.userData.createdAt) / 1000;
      const fade = Math.max(0.3, 1 - age / 120); // Fade over 2 minutes

      structure.traverse((child) => {
        if (child.material) {
          child.material.opacity = child.material.userData?.baseOpacity * fade || fade * 0.7;
        }
      });
    }
  }

  getStructureCount() {
    return this.structures.length;
  }

  dispose() {
    for (const structure of this.structures) {
      structure.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      this.sceneManager.remove(structure);
    }
    this.structures = [];
  }
}


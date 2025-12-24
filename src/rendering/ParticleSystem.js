import * as THREE from 'three';
import visualParams from '../config/visual-params.json';

// Inline shaders to avoid import issues
const vertexShader = `
uniform float uTime;
uniform float uMemoryDecay;
uniform float uResponseIntensity;

attribute float aAge;
attribute float aRandom;

varying float vAge;
varying float vRandom;
varying float vDepth;

void main() {
  vAge = aAge;
  vRandom = aRandom;
  
  vec3 pos = position;
  float flowSpeed = 0.3 + aRandom * 0.2;
  pos.x += sin(uTime * flowSpeed + aRandom * 6.28) * 0.5;
  pos.y += cos(uTime * flowSpeed * 0.7 + aRandom * 3.14) * 0.3;
  pos.z += sin(uTime * flowSpeed * 0.5 + aRandom * 4.71) * 0.4;
  
  float decayDrift = uMemoryDecay * aAge * 2.0;
  pos += normalize(pos + vec3(0.001)) * decayDrift;
  
  float cluster = 1.0 - uResponseIntensity * 0.3;
  pos *= cluster;
  
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  vDepth = -mvPosition.z;
  
  float size = 3.0 * (1.0 - aAge * 0.5);
  size *= (1.0 + uResponseIntensity * 0.5);
  gl_PointSize = size * (300.0 / vDepth);
  
  gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = `
uniform float uTime;
uniform vec3 uColorRecent;
uniform vec3 uColorFaded;
uniform vec3 uColorAncient;
uniform float uMemoryDecay;

varying float vAge;
varying float vRandom;
varying float vDepth;

void main() {
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);
  if (dist > 0.5) discard;
  
  float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
  
  vec3 color;
  if (vAge < 0.3) {
    color = mix(uColorRecent, uColorFaded, vAge / 0.3);
  } else if (vAge < 0.7) {
    color = mix(uColorFaded, uColorAncient, (vAge - 0.3) / 0.4);
  } else {
    color = uColorAncient;
  }
  
  alpha *= 1.0 - vAge * 0.8;
  alpha *= 1.0 - uMemoryDecay * 0.5;
  
  float flicker = 0.9 + 0.1 * sin(uTime * 10.0 + vRandom * 100.0);
  alpha *= flicker;
  
  float depthFade = 1.0 - smoothstep(10.0, 50.0, vDepth);
  alpha *= depthFade;
  
  gl_FragColor = vec4(color, alpha * 0.6);
}
`;

export class ParticleSystem {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.params = visualParams;
    this.particleCount = this.params.environment.baseParticleDensity;
    
    this.uniforms = {
      uTime: { value: 0 },
      uMemoryDecay: { value: 0 },
      uResponseIntensity: { value: 0 },
      uColorRecent: { value: new THREE.Color(this.params.colors.memory.recent) },
      uColorFaded: { value: new THREE.Color(this.params.colors.memory.fading) },
      uColorAncient: { value: new THREE.Color(this.params.colors.memory.ancient) }
    };

    this.init();
  }

  init() {
    const geometry = new THREE.BufferGeometry();
    
    const positions = new Float32Array(this.particleCount * 3);
    const ages = new Float32Array(this.particleCount);
    const randoms = new Float32Array(this.particleCount);

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const radius = 5 + Math.random() * 20;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);
      
      ages[i] = Math.random();
      randoms[i] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aAge', new THREE.BufferAttribute(ages, 1));
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(geometry, material);
    this.sceneManager.add(this.particles);
  }

  update(time, memoryDecay, responseIntensity) {
    this.uniforms.uTime.value = time;
    this.uniforms.uMemoryDecay.value = memoryDecay;
    this.uniforms.uResponseIntensity.value = responseIntensity;
  }

  dispose() {
    this.particles.geometry.dispose();
    this.particles.material.dispose();
    this.sceneManager.remove(this.particles);
  }
}


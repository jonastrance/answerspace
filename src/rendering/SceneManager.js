import * as THREE from 'three';
import visualParams from '../config/visual-params.json';

export class SceneManager {
  constructor(container) {
    this.container = container;
    this.params = visualParams;
    this.clock = new THREE.Clock();
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    this.init();
    this.setupResize();
  }

  init() {
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(
      this.params.environment.backgroundColor,
      0.015
    );

    // Camera with slow drift capability
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = this.params.environment.cameraDistance;
    
    // Camera drift state
    this.cameraTarget = new THREE.Vector3(0, 0, 0);
    this.cameraDrift = { x: 0, y: 0, z: 0 };

    // Renderer with WebGL 2.0 features
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(this.params.environment.backgroundColor);
    
    this.container.appendChild(this.renderer.domElement);

    // Performance monitoring
    this.frameCount = 0;
    this.lastFpsCheck = performance.now();
    this.currentFps = 60;
    this.qualityLevel = 1.0;
  }

  setupResize() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  updateCamera(deltaTime) {
    if (this.reducedMotion) return;

    const time = this.clock.getElapsedTime();
    const speed = this.params.environment.cameraDriftSpeed;
    const amp = this.params.environment.cameraDriftAmplitude;

    // Gentle sinusoidal drift
    this.cameraDrift.x = Math.sin(time * speed) * amp;
    this.cameraDrift.y = Math.cos(time * speed * 0.7) * amp * 0.5;
    this.cameraDrift.z = Math.sin(time * speed * 0.3) * amp * 0.3;

    // Smooth interpolation toward drift position
    this.camera.position.x += (this.cameraDrift.x - this.camera.position.x) * 0.01;
    this.camera.position.y += (this.cameraDrift.y - this.camera.position.y) * 0.01;
    
    this.camera.lookAt(this.cameraTarget);
  }

  monitorPerformance() {
    this.frameCount++;
    const now = performance.now();
    
    if (now - this.lastFpsCheck >= 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsCheck = now;

      // Auto-adjust quality
      if (this.currentFps < 30 && this.qualityLevel > 0.5) {
        this.qualityLevel -= 0.1;
        this.adjustQuality();
      } else if (this.currentFps > 55 && this.qualityLevel < 1.0) {
        this.qualityLevel += 0.05;
        this.adjustQuality();
      }
    }
  }

  adjustQuality() {
    const pixelRatio = Math.max(1, window.devicePixelRatio * this.qualityLevel);
    this.renderer.setPixelRatio(pixelRatio);
  }

  render() {
    const deltaTime = this.clock.getDelta();
    this.updateCamera(deltaTime);
    this.monitorPerformance();
    this.renderer.render(this.scene, this.camera);
  }

  getElapsedTime() {
    return this.clock.getElapsedTime();
  }

  add(object) {
    this.scene.add(object);
  }

  remove(object) {
    this.scene.remove(object);
  }

  dispose() {
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}


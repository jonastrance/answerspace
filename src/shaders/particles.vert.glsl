// Token stream particle vertex shader
uniform float uTime;
uniform float uMemoryDecay;
uniform float uResponseIntensity;

attribute float aAge;
attribute float aRandom;
attribute vec3 aVelocity;

varying float vAge;
varying float vRandom;
varying float vDepth;

void main() {
  vAge = aAge;
  vRandom = aRandom;
  
  // Age-based position drift
  vec3 pos = position;
  
  // Gentle flowing motion based on time and random seed
  float flowSpeed = 0.3 + aRandom * 0.2;
  pos.x += sin(uTime * flowSpeed + aRandom * 6.28) * 0.5;
  pos.y += cos(uTime * flowSpeed * 0.7 + aRandom * 3.14) * 0.3;
  pos.z += sin(uTime * flowSpeed * 0.5 + aRandom * 4.71) * 0.4;
  
  // Memory decay causes particles to drift outward
  float decayDrift = uMemoryDecay * aAge * 2.0;
  pos += normalize(pos) * decayDrift;
  
  // Response intensity affects particle clustering
  float cluster = 1.0 - uResponseIntensity * 0.3;
  pos *= cluster;
  
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  vDepth = -mvPosition.z;
  
  // Size varies with age and distance
  float size = 3.0 * (1.0 - aAge * 0.5);
  size *= (1.0 + uResponseIntensity * 0.5);
  gl_PointSize = size * (300.0 / vDepth);
  
  gl_Position = projectionMatrix * mvPosition;
}


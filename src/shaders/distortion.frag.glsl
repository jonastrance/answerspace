// Contradiction/glitch distortion shader
uniform sampler2D uTexture;
uniform float uTime;
uniform float uDistortionIntensity;
uniform float uContradictionLevel;
uniform vec2 uResolution;

varying vec2 vUv;

// Hash function for pseudo-random values
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = vUv;
  
  // Base chromatic aberration during contradictions
  float aberration = uContradictionLevel * 0.02;
  
  // Glitch offset
  float glitchTime = floor(uTime * 10.0);
  float glitchRandom = hash(vec2(glitchTime, 0.0));
  
  // Only glitch occasionally and based on contradiction level
  if (glitchRandom < uContradictionLevel * 0.3) {
    // Horizontal slice displacement
    float sliceY = floor(uv.y * 20.0) / 20.0;
    float sliceOffset = hash(vec2(sliceY, glitchTime)) - 0.5;
    uv.x += sliceOffset * uDistortionIntensity * 0.1;
  }
  
  // Geometric distortion - space bending
  float distortAngle = uTime * 0.5;
  float distortRadius = length(uv - 0.5);
  float distortAmount = sin(distortRadius * 10.0 - distortAngle) * uDistortionIntensity * 0.02;
  uv += normalize(uv - 0.5) * distortAmount;
  
  // Sample with chromatic separation
  vec4 colorR = texture2D(uTexture, uv + vec2(aberration, 0.0));
  vec4 colorG = texture2D(uTexture, uv);
  vec4 colorB = texture2D(uTexture, uv - vec2(aberration, 0.0));
  
  vec4 finalColor = vec4(colorR.r, colorG.g, colorB.b, colorG.a);
  
  // Scanlines during high contradiction
  if (uContradictionLevel > 0.5) {
    float scanline = sin(vUv.y * uResolution.y * 2.0) * 0.04;
    finalColor.rgb -= scanline * (uContradictionLevel - 0.5) * 2.0;
  }
  
  // Color shift toward error tones
  vec3 errorTint = vec3(0.55, 0.25, 0.29);
  finalColor.rgb = mix(finalColor.rgb, errorTint, uContradictionLevel * 0.2);
  
  gl_FragColor = finalColor;
}


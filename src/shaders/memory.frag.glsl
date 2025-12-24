// Memory chamber visualization shader
uniform float uTime;
uniform float uDecayLevel;
uniform float uFragmentation;
uniform vec3 uBaseColor;
uniform float uPulseIntensity;

varying vec2 vUv;
varying vec3 vNormal;

// Noise for fragmentation
float noise(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float fbm(vec2 st) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(st);
    st *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  // Base color with subtle variation
  vec3 color = uBaseColor;
  
  // Memory pulse - breathing effect
  float pulse = sin(uTime * 0.5) * 0.5 + 0.5;
  pulse = pow(pulse, 2.0) * uPulseIntensity;
  color += pulse * 0.1;
  
  // Decay darkening
  color *= 1.0 - uDecayLevel * 0.6;
  
  // Fragmentation noise
  if (uFragmentation > 0.0) {
    float fragNoise = fbm(vUv * 10.0 + uTime * 0.1);
    
    // Create fragment edges
    float fragThreshold = 1.0 - uFragmentation;
    if (fragNoise < fragThreshold) {
      // Fragment visible
      float edgeDist = (fragNoise - fragThreshold + 0.1) / 0.1;
      edgeDist = clamp(edgeDist, 0.0, 1.0);
      color = mix(color * 0.3, color, edgeDist);
    } else {
      // Gap in memory
      discard;
    }
  }
  
  // Edge glow based on normal
  float edge = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
  edge = pow(edge, 3.0);
  color += edge * 0.2 * (1.0 - uDecayLevel);
  
  // Final alpha based on decay
  float alpha = 1.0 - uDecayLevel * 0.4;
  
  gl_FragColor = vec4(color, alpha);
}


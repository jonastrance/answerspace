// Atmospheric fog fragment shader
uniform float uTime;
uniform float uFogDensity;
uniform float uMemoryDecay;
uniform vec3 uFogColor;
uniform float uCertainty;

varying vec2 vUv;
varying float vDepth;

// Simplex noise function
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m;
  m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  // Base fog calculation
  float fogFactor = 1.0 - exp(-uFogDensity * vDepth * vDepth);
  
  // Temporal noise for atmospheric movement
  float noise = snoise(vUv * 3.0 + uTime * 0.1) * 0.1;
  noise += snoise(vUv * 7.0 - uTime * 0.05) * 0.05;
  
  // Memory decay affects fog clarity
  float decayNoise = snoise(vUv * 2.0 + uTime * 0.02) * uMemoryDecay * 0.2;
  
  // Certainty affects visibility
  float clarity = mix(0.3, 1.0, uCertainty);
  fogFactor = fogFactor * (1.0 + decayNoise) / clarity;
  
  // Final fog color with subtle gradient
  vec3 finalFog = uFogColor + noise;
  
  gl_FragColor = vec4(finalFog, clamp(fogFactor, 0.0, 1.0));
}


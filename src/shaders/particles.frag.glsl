// Token stream particle fragment shader
uniform float uTime;
uniform vec3 uColorRecent;
uniform vec3 uColorFaded;
uniform vec3 uColorAncient;
uniform float uMemoryDecay;

varying float vAge;
varying float vRandom;
varying float vDepth;

void main() {
  // Circular particle shape
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);
  if (dist > 0.5) discard;
  
  // Soft edge
  float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
  
  // Color based on age (memory state)
  vec3 color;
  if (vAge < 0.3) {
    color = mix(uColorRecent, uColorFaded, vAge / 0.3);
  } else if (vAge < 0.7) {
    color = mix(uColorFaded, uColorAncient, (vAge - 0.3) / 0.4);
  } else {
    color = uColorAncient;
  }
  
  // Age-based fade
  alpha *= 1.0 - vAge * 0.8;
  
  // Memory decay affects visibility
  alpha *= 1.0 - uMemoryDecay * 0.5;
  
  // Subtle flickering
  float flicker = 0.9 + 0.1 * sin(uTime * 10.0 + vRandom * 100.0);
  alpha *= flicker;
  
  // Depth fade
  float depthFade = 1.0 - smoothstep(10.0, 50.0, vDepth);
  alpha *= depthFade;
  
  gl_FragColor = vec4(color, alpha * 0.6);
}


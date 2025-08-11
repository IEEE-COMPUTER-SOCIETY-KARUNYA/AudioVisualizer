window.vertexShader = `
    uniform float time;
    uniform float amplitude;
    uniform float bassEnergy;
    uniform float midEnergy;
    uniform float highEnergy;
    uniform float audioData[128];
    
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    varying float vDistortion;
    
    vec3 mod289(vec3 x) {
        return x - floor(x * (1.0 / 289.0)) * 289.0;
    }
    
    vec4 mod289(vec4 x) {
        return x - floor(x * (1.0 / 289.0)) * 289.0;
    }
    
    vec4 permute(vec4 x) {
        return mod289(((x*34.0)+1.0)*x);
    }
    
    vec4 taylorInvSqrt(vec4 r) {
        return 1.79284291400159 - 0.85373472095314 * r;
    }
    
    float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        
        vec3 i = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        
        i = mod289(i);
        vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
            
        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;
        
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
        
        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);
        
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;
        
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }
    
    void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        vUv = uv;
        
        vec3 pos = position;
        
        float noiseFreq = 1.5;
        float noiseAmp = 0.15;
        vec3 noisePos = position * noiseFreq + time * 0.5;
        
        float noise = snoise(noisePos);
        float noise2 = snoise(noisePos * 2.0 - time * 0.3);
        float noise3 = snoise(noisePos * 4.0 + time * 0.7);
        
        float audioIndex = floor(uv.x * 127.0);
        float audioValue = audioData[int(audioIndex)];
        
        float displacement = noise * noiseAmp;
        displacement += noise2 * noiseAmp * 0.5;
        displacement += noise3 * noiseAmp * 0.25;
        displacement += bassEnergy * 0.5 * sin(position.y * 2.0 + time);
        displacement += midEnergy * 0.3 * cos(position.x * 3.0 + time * 1.5);
        displacement += highEnergy * 0.2 * sin(position.z * 4.0 + time * 2.0);
        displacement += audioValue * amplitude * 0.3;
        
        vDistortion = displacement;
        
        pos += normal * displacement;
        
        float pulseFactor = 1.0 + amplitude * 0.1 * sin(time * 2.0);
        pos *= pulseFactor;
        
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
    }
`;

window.fragmentShader = `
    uniform float time;
    uniform float amplitude;
    uniform float bassEnergy;
    uniform float midEnergy;
    uniform float highEnergy;
    uniform float frequencyData[1024];
    
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    varying float vDistortion;
    
    vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }
    
    void main() {
        vec3 viewDirection = normalize(cameraPosition - vPosition);
        float fresnel = pow(1.0 - dot(viewDirection, vNormal), 2.0);
        
        float hue = mod(time * 0.1 + vDistortion * 2.0 + bassEnergy, 1.0);
        float saturation = 0.7 + midEnergy * 0.3;
        float value = 0.5 + amplitude * 0.5;
        
        vec3 baseColor = hsv2rgb(vec3(hue, saturation, value));
        
        vec3 color1 = vec3(0.0, 1.0, 0.5);
        vec3 color2 = vec3(1.0, 0.0, 0.5); 
        vec3 color3 = vec3(0.5, 0.0, 1.0);
        
        float mixFactor1 = sin(time + vPosition.x * 2.0) * 0.5 + 0.5;
        float mixFactor2 = cos(time + vPosition.y * 2.0) * 0.5 + 0.5;
        
        vec3 gradientColor = mix(color1, color2, mixFactor1);
        gradientColor = mix(gradientColor, color3, mixFactor2);
        
        vec3 finalColor = mix(baseColor, gradientColor, 0.5);
        
        finalColor += vec3(fresnel) * vec3(0.5, 0.8, 1.0) * (1.0 + highEnergy);
        
        float emission = fresnel * (0.5 + amplitude * 0.5);
        emission += pow(vDistortion, 2.0) * 2.0;
        
        finalColor += emission * vec3(0.3, 0.6, 1.0);
        
        float frequencyIndex = floor(vUv.x * 1023.0);
        float freqValue = frequencyData[int(frequencyIndex)] / 255.0;
        finalColor += freqValue * 0.1 * vec3(1.0, 0.5, 0.0);
        
        float alpha = 0.9 + fresnel * 0.1;
        
        finalColor = pow(finalColor, vec3(0.8));
        
        gl_FragColor = vec4(finalColor, alpha);
    }
`;

window.particleVertexShader = `
    uniform float time;
    uniform float amplitude;
    
    attribute float size;
    
    varying vec3 vColor;
    
    void main() {
        vColor = color;
        
        vec3 pos = position;
        
        float distance = length(pos);
        float wave = sin(distance * 0.1 - time * 2.0) * amplitude;
        pos += normalize(pos) * wave * 0.5;
        
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        
        float sizeMultiplier = 1.0 + amplitude * 2.0;
        gl_PointSize = size * sizeMultiplier * (300.0 / -mvPosition.z);
        
        gl_Position = projectionMatrix * mvPosition;
    }
`;

window.particleFragmentShader = `
    uniform float time;
    uniform float amplitude;
    
    varying vec3 vColor;
    
    void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        
        if (dist > 0.5) {
            discard;
        }
        
        float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
        alpha *= 0.8 + amplitude * 0.2;
        
        vec3 color = vColor;
        color += vec3(0.2, 0.4, 0.6) * amplitude;
        
        gl_FragColor = vec4(color, alpha);
    }
`;
// Advanced Liquid Metal Orb Shaders
window.liquidOrbVertexShader = `
    precision highp float;
    
    uniform float time;
    uniform float audioAmplitude;
    uniform float subBass;
    uniform float bass;
    uniform float lowMid;
    uniform float highMid;
    uniform float presence;
    uniform float brilliance;
    
    attribute vec3 position;
    attribute vec3 normal;
    attribute vec2 uv;
    
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    varying vec2 vUv;
    varying float vDisplacement;
    varying vec3 vViewDirection;
    
    // Improved noise functions for organic deformation
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    
    float snoise3d(vec3 v) {
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
        
        i = mod289(vec4(i, 1.0)).xyz;
        vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
            
        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        vec4 x = x_ * ns.x + ns.yyyy;
        vec4 y = y_ * ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        vec4 s0 = floor(b0) * 2.0 + 1.0;
        vec4 s1 = floor(b1) * 2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }
    
    // Curl noise for more organic flow
    vec3 curlNoise(vec3 p, float scale) {
        const float eps = 0.01;
        
        float n1 = snoise3d((p + vec3(eps, 0.0, 0.0)) * scale);
        float n2 = snoise3d((p - vec3(eps, 0.0, 0.0)) * scale);
        float n3 = snoise3d((p + vec3(0.0, eps, 0.0)) * scale);
        float n4 = snoise3d((p - vec3(0.0, eps, 0.0)) * scale);
        float n5 = snoise3d((p + vec3(0.0, 0.0, eps)) * scale);
        float n6 = snoise3d((p - vec3(0.0, 0.0, eps)) * scale);
        
        float x = (n4 - n3) / (2.0 * eps);
        float y = (n6 - n5) / (2.0 * eps);
        float z = (n2 - n1) / (2.0 * eps);
        
        return vec3(x, y, z);
    }
    
    void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        
        vec3 pos = position;
        vec3 norm = normal;
        
        // Multi-layer noise deformation system
        float timeScale = time * 0.3;
        
        // Layer 1: Large, slow waves (bass frequencies)
        vec3 noisePos1 = pos * 0.5 + timeScale;
        float noise1 = snoise3d(noisePos1);
        float displacement1 = noise1 * 0.15 * subBass * 1.5;
        
        // Layer 2: Medium turbulence (mid frequencies)  
        vec3 noisePos2 = pos * 2.0 + timeScale * 0.8;
        float noise2 = snoise3d(noisePos2);
        float displacement2 = noise2 * 0.08 * lowMid;
        
        // Layer 3: Fine detail (high frequencies)
        vec3 noisePos3 = pos * 4.0 + timeScale * 1.5;
        vec3 curlDisp = curlNoise(noisePos3, 1.0);
        float displacement3 = length(curlDisp) * 0.04 * presence * 0.6;
        
        // Audio-reactive morphing
        float bassDeform = bass * 0.2 * sin(time * 2.0 + length(pos) * 3.0);
        float midDeform = highMid * 0.1 * cos(time * 3.0 + pos.y * 5.0);
        float highDeform = brilliance * 0.05 * sin(time * 5.0 + pos.x * 8.0);
        
        // Combine all displacements
        float totalDisplacement = displacement1 + displacement2 + displacement3 + bassDeform + midDeform + highDeform;
        vDisplacement = totalDisplacement;
        
        // Apply organic flow deformation
        vec3 flowOffset = curlDisp * 0.02 * audioAmplitude;
        pos += norm * totalDisplacement + flowOffset;
        
        // Scale pulsing for sub-bass
        float scalePulse = 1.0 + subBass * 0.1 * sin(time * 4.0);
        pos *= scalePulse;
        
        vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
        vViewDirection = normalize(cameraPosition - vWorldPosition);
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`;

window.liquidOrbFragmentShader = `
    precision highp float;
    
    uniform float time;
    uniform float audioAmplitude;
    uniform float subBass;
    uniform float bass;
    uniform float lowMid;
    uniform float highMid;
    uniform float presence;
    uniform float brilliance;
    
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    varying vec2 vUv;
    varying float vDisplacement;
    varying vec3 vViewDirection;
    
    // Iridescence color palette
    const vec3 iridescentColors[5] = vec3[5](
        vec3(0.290, 0.565, 0.886), // #4A90E2 - Blue
        vec3(0.608, 0.349, 0.714), // #9B59B6 - Purple  
        vec3(0.906, 0.298, 0.235), // #E74C3C - Red
        vec3(0.953, 0.612, 0.071), // #F39C12 - Orange
        vec3(0.102, 0.737, 0.612)  // #1ABC9C - Teal
    );
    
    // PBR utility functions
    vec3 fresnel(vec3 F0, float cosTheta) {
        return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
    }
    
    float distributionGGX(vec3 N, vec3 H, float roughness) {
        float a = roughness * roughness;
        float a2 = a * a;
        float NdotH = max(dot(N, H), 0.0);
        float NdotH2 = NdotH * NdotH;
        
        float num = a2;
        float denom = (NdotH2 * (a2 - 1.0) + 1.0);
        denom = 3.14159265 * denom * denom;
        
        return num / denom;
    }
    
    float geometrySchlickGGX(float NdotV, float roughness) {
        float r = (roughness + 1.0);
        float k = (r * r) / 8.0;
        
        float num = NdotV;
        float denom = NdotV * (1.0 - k) + k;
        
        return num / denom;
    }
    
    float geometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
        float NdotV = max(dot(N, V), 0.0);
        float NdotL = max(dot(N, L), 0.0);
        float ggx2 = geometrySchlickGGX(NdotV, roughness);
        float ggx1 = geometrySchlickGGX(NdotL, roughness);
        
        return ggx1 * ggx2;
    }
    
    // Thin-film interference for iridescence
    vec3 computeIridescence(float cosTheta, float thickness) {
        float phase = 2.0 * 3.14159265 * thickness * cosTheta;
        
        vec3 color = vec3(0.0);
        for(int i = 0; i < 5; i++) {
            float weight = cos(phase + float(i) * 1.26) * 0.5 + 0.5;
            color += iridescentColors[i] * weight;
        }
        
        return color / 5.0;
    }
    
    // Subsurface scattering approximation
    vec3 subsurfaceScattering(vec3 normal, vec3 lightDir, vec3 viewDir, vec3 scatterColor) {
        float scatter = pow(clamp(dot(viewDir, -lightDir + normal * 0.5), 0.0, 1.0), 2.0);
        return scatterColor * scatter;
    }
    
    void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewDirection);
        
        // PBR material properties (liquid metal)
        float metalness = 0.9;
        float roughness = 0.05 + brilliance * 0.15;
        float clearcoat = 1.0;
        float clearcoatRoughness = 0.0;
        
        // Base color from audio-reactive iridescence
        float fresnel_factor = 1.0 - max(dot(normal, viewDir), 0.0);
        float iridescence_intensity = 0.8 + audioAmplitude * 0.2;
        float thickness = 0.5 + presence * 0.5 + sin(time + vDisplacement * 10.0) * 0.2;
        
        vec3 iridescent = computeIridescence(fresnel_factor, thickness);
        
        // Audio-reactive color temperature shift
        vec3 baseColor = mix(iridescent, vec3(0.8, 0.9, 1.0), presence * 0.3);
        baseColor = mix(baseColor, vec3(1.0, 0.7, 0.4), bass * 0.4);
        
        // Lighting calculation (simplified PBR)
        vec3 lightDir = normalize(vec3(0.5, 1.0, 0.5));
        vec3 halfwayDir = normalize(lightDir + viewDir);
        
        // Fresnel for metallic surface
        vec3 F0 = mix(vec3(0.04), baseColor, metalness);
        vec3 F = fresnel(F0, max(dot(halfwayDir, viewDir), 0.0));
        
        // Distribution and geometry terms
        float NDF = distributionGGX(normal, halfwayDir, roughness);
        float G = geometrySmith(normal, viewDir, lightDir, roughness);
        
        // Cook-Torrance BRDF
        vec3 numerator = NDF * G * F;
        float denominator = 4.0 * max(dot(normal, viewDir), 0.0) * max(dot(normal, lightDir), 0.0) + 0.001;
        vec3 specular = numerator / denominator;
        
        // Diffuse (reduced for metallic surface)
        vec3 kS = F;
        vec3 kD = vec3(1.0) - kS;
        kD *= 1.0 - metalness;
        
        float NdotL = max(dot(normal, lightDir), 0.0);
        vec3 diffuse = kD * baseColor / 3.14159265;
        
        // Combine lighting
        vec3 color = (diffuse + specular) * NdotL;
        
        // Add subsurface scattering for depth
        vec3 scatterColor = baseColor * 0.8;
        color += subsurfaceScattering(normal, lightDir, viewDir, scatterColor) * 0.3;
        
        // Rim lighting for liquid metal effect
        float rim = pow(1.0 - dot(normal, viewDir), 2.0);
        vec3 rimColor = iridescent * rim * (1.0 + audioAmplitude * 2.0);
        color += rimColor * 0.5;
        
        // Audio-reactive glow
        float glow = brilliance * 0.3 + vDisplacement * 0.5;
        color += baseColor * glow * 0.2;
        
        // Clearcoat layer
        vec3 clearcoatNormal = normal;
        float clearcoatFresnel = pow(1.0 - dot(clearcoatNormal, viewDir), 5.0);
        color += clearcoat * clearcoatFresnel * 0.1;
        
        // Tone mapping and gamma correction
        color = color / (color + vec3(1.0));
        color = pow(color, vec3(1.0/2.2));
        
        gl_FragColor = vec4(color, 1.0);
    }
`;

// Ribbon shaders for internal twisted structures
window.ribbonVertexShader = `
    precision highp float;
    
    uniform float time;
    uniform float audioAmplitude;
    uniform float lowMid;
    uniform float highMid;
    
    attribute vec3 position;
    attribute vec3 normal;
    attribute vec2 uv;
    
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    varying float vTwist;
    
    void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        
        // Twisted ribbon deformation
        float twist = time * (0.5 + lowMid) + uv.x * 6.28 * 3.0;
        float radius = 3.0 + sin(uv.x * 12.56 + time) * 0.5 * audioAmplitude;
        
        vec3 pos = position;
        
        // Apply twist along the length
        float cosT = cos(twist);
        float sinT = sin(twist);
        
        pos.x = pos.x * cosT - pos.z * sinT;
        pos.z = pos.x * sinT + pos.z * cosT;
        
        // Flow animation
        pos.y += sin(uv.x * 6.28 * 2.0 + time * 2.0) * 0.3 * highMid;
        
        vTwist = twist;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`;

window.ribbonFragmentShader = `
    precision highp float;
    
    uniform float time;
    uniform float audioAmplitude;
    
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    varying float vTwist;
    
    void main() {
        vec3 normal = normalize(vNormal);
        
        // Same iridescent material as main orb but with transparency
        float fresnel = pow(1.0 - abs(dot(normal, vec3(0.0, 0.0, 1.0))), 2.0);
        
        vec3 color1 = vec3(0.290, 0.565, 0.886); // Blue
        vec3 color2 = vec3(0.608, 0.349, 0.714); // Purple
        vec3 color3 = vec3(0.953, 0.612, 0.071); // Orange
        
        float colorPhase = vTwist + time;
        vec3 baseColor = mix(color1, color2, sin(colorPhase) * 0.5 + 0.5);
        baseColor = mix(baseColor, color3, cos(colorPhase * 1.5) * 0.5 + 0.5);
        
        vec3 color = baseColor + fresnel * 0.3;
        
        // Edge fade for ribbon effect
        float edgeFade = 1.0 - abs(vUv.y - 0.5) * 2.0;
        float alpha = edgeFade * (0.3 + audioAmplitude * 0.2);
        
        gl_FragColor = vec4(color, alpha);
    }
`;
/**
 * OviRenderer.js
 * Custom WebGL 2.0 Renderer for Ovi3D.
 * Handles context initialization, shaders, and draw calls.
 */

export default class OviRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl2', { antialias: true, alpha: true });

        if (!this.gl) {
            console.error("WebGL 2.0 not supported");
            return;
        }

        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

        this.lightPos = [5, 10, 7]; // Default light position
        this.ambientIntensity = 0.3; // Default ambient intensity
        this.envIntensity = 1.0;     // Environment intensity
        this.envType = 'neutral';    // Preset type
        this.skyColor = [1.0, 1.0, 1.0]; // Simulated sky color
        this.exposure = 1.0;         // Overall scene exposure

        this.programs = new Map();
        this.initDefaultShaders();
    }

    setEnvironmentType(type) {
        this.envType = type;
        // Adjust simulated light/ambient colors based on preset
        switch (type) {
            case 'warm':
                this.skyColor = [1.0, 0.9, 0.7];
                this.lightPos = [10, 5, 5];
                break;
            case 'cool':
                this.skyColor = [0.7, 0.8, 1.0];
                this.lightPos = [-5, 10, -5];
                break;
            case 'indoor':
                this.skyColor = [0.9, 0.8, 0.6];
                this.lightPos = [2, 8, 2];
                break;
            default: // neutral/studio
                this.skyColor = [1.0, 1.0, 1.0];
                this.lightPos = [5, 10, 7];
        }
    }

    setEnvIntensity(value) {
        this.envIntensity = value;
    }
    setLightPosition(x, y, z) {
        this.lightPos = [x, y, z];
    }
    setExposure(value) {
        this.exposure = value;
    }

    setAmbientIntensity(value) {
        this.ambientIntensity = value;
    }

    initDefaultShaders() {
        const vsSource = `#version 300 es
            layout(location = 0) in vec3 aPosition;
            layout(location = 1) in vec3 aNormal;
            layout(location = 2) in vec4 aColor;
            layout(location = 3) in vec2 aTexCoord;
            
            uniform mat4 uModelMatrix;
            uniform mat4 uViewMatrix;
            uniform mat4 uProjectionMatrix;
            
            out vec3 vNormal;
            out vec3 vPosition;
            out vec4 vColor;
            out vec2 vTexCoord;

            void main() {
                vec4 worldPos = uModelMatrix * vec4(aPosition, 1.0);
                vPosition = worldPos.xyz;
                vNormal = mat3(transpose(inverse(uModelMatrix))) * aNormal;
                vColor = aColor;
                vTexCoord = aTexCoord;
                gl_Position = uProjectionMatrix * uViewMatrix * worldPos;
            }
        `;

        const fsSource = `#version 300 es
            precision highp float;
            
            in vec3 vNormal;
            in vec3 vPosition;
            in vec4 vColor;
            in vec2 vTexCoord;
            
            uniform vec3 uColor;
            uniform float uOpacity;
            uniform bool uUseVertexColor;
            uniform bool uUseTexture;
            uniform sampler2D uBaseColorTexture;
            uniform vec3 uLightPos;
            uniform vec3 uViewPos;
            uniform float uAmbientIntensity;
            uniform float uEnvIntensity;
            uniform vec3 uSkyColor;
            uniform float uExposure;
            
            out vec4 fragColor;

            void main() {
                // Simple Blinn-Phong Lighting
                vec3 normal = normalize(vNormal);
                vec3 lightDir = normalize(uLightPos - vPosition);
                vec3 viewDir = normalize(uViewPos - vPosition);
                
                // Ambient (Influenced by Sky Color and Intensity)
                vec3 ambient = uAmbientIntensity * uSkyColor * uEnvIntensity;
                
                // Diffuse
                float diff = max(dot(normal, lightDir), 0.0);
                
                // Specular
                vec3 halfwayDir = normalize(lightDir + viewDir);
                float spec = pow(max(dot(normal, halfwayDir), 0.0), 32.0);
                
                vec3 baseColor = uColor;
                float baseAlpha = uOpacity;

                if (uUseVertexColor) {
                    baseColor *= vColor.rgb;
                    baseAlpha *= vColor.a;
                }

                if (uUseTexture) {
                    vec4 texCol = texture(uBaseColorTexture, vTexCoord);
                    baseColor *= texCol.rgb;
                    baseAlpha *= texCol.a;
                }

                // Final Result: Ambient + (Diffuse + Specular) * Sky influence
                vec3 lighting = ambient + (diff + spec * 0.5) * uSkyColor * uEnvIntensity;
                vec3 result = lighting * baseColor * uExposure;
                fragColor = vec4(result, baseAlpha);
            }
        `;

        const program = this.createProgram(vsSource, fsSource);
        this.programs.set('default', program);
    }

    createShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error("Shader compile error:", this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    createProgram(vsSource, fsSource) {
        const vs = this.createShader(this.gl.VERTEX_SHADER, vsSource);
        const fs = this.createShader(this.gl.FRAGMENT_SHADER, fsSource);
        const program = this.gl.createProgram();
        this.gl.attachShader(program, vs);
        this.gl.attachShader(program, fs);
        this.gl.linkProgram(program);
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            console.error("Program link error:", this.gl.getProgramInfoLog(program));
            return null;
        }
        return program;
    }

    clear(r = 0, g = 0, b = 0, a = 0) {
        this.gl.clearColor(r, g, b, a);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    }

    setSize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.gl.viewport(0, 0, width, height);
    }

    draw(geometry, modelMatrix, viewMatrix, projectionMatrix, material) {
        const program = this.programs.get('default');
        this.gl.useProgram(program);

        // Set Uniforms
        const uModel = this.gl.getUniformLocation(program, "uModelMatrix");
        const uView = this.gl.getUniformLocation(program, "uViewMatrix");
        const uProj = this.gl.getUniformLocation(program, "uProjectionMatrix");
        const uColor = this.gl.getUniformLocation(program, "uColor");
        const uOpacity = this.gl.getUniformLocation(program, "uOpacity");
        const uVertexCol = this.gl.getUniformLocation(program, "uUseVertexColor");
        const uUseTex = this.gl.getUniformLocation(program, "uUseTexture");
        const uTex = this.gl.getUniformLocation(program, "uBaseColorTexture");
        const uLight = this.gl.getUniformLocation(program, "uLightPos");
        const uViewPos = this.gl.getUniformLocation(program, "uViewPos");
        const uAmbient = this.gl.getUniformLocation(program, "uAmbientIntensity");
        const uEnvInt = this.gl.getUniformLocation(program, "uEnvIntensity");
        const uSky = this.gl.getUniformLocation(program, "uSkyColor");
        const uExp = this.gl.getUniformLocation(program, "uExposure");

        this.gl.uniformMatrix4fv(uModel, false, modelMatrix.elements);
        this.gl.uniformMatrix4fv(uView, false, viewMatrix.elements);
        this.gl.uniformMatrix4fv(uProj, false, projectionMatrix.elements);

        const color = material.color || [1, 1, 1];
        const opacity = material.opacity !== undefined ? material.opacity : 1.0;

        this.gl.uniform3f(uColor, color[0], color[1], color[2]);
        this.gl.uniform1f(uOpacity, opacity);
        this.gl.uniform1i(uVertexCol, geometry.hasColors ? 1 : 0);

        if (material.texture && geometry.hasUVs) {
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, material.texture);
            this.gl.uniform1i(uTex, 0);
            this.gl.uniform1i(uUseTex, 1);
        } else {
            this.gl.uniform1i(uUseTex, 0);
        }

        this.gl.uniform3f(uLight, this.lightPos[0], this.lightPos[1], this.lightPos[2]);
        this.gl.uniform3f(uViewPos, 0, 0, 5); // Fallback eye pos
        this.gl.uniform1f(uAmbient, this.ambientIntensity);
        this.gl.uniform1f(uEnvInt, this.envIntensity);
        this.gl.uniform3f(uSky, this.skyColor[0], this.skyColor[1], this.skyColor[2]);
        this.gl.uniform1f(uExp, this.exposure);

        // Bind and draw geometry
        this.gl.bindVertexArray(geometry.vao);
        if (geometry.indices) {
            this.gl.drawElements(this.gl.TRIANGLES, geometry.count, this.gl.UNSIGNED_INT, 0);
        } else {
            this.gl.drawArrays(this.gl.TRIANGLES, 0, geometry.count);
        }
        this.gl.bindVertexArray(null);
    }
}

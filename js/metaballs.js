import Globals from "./globals.js";
import { tween, quadEaseIn } from "./tween.js";

const game = Globals.game;

export default class Metaballs {
	#canvas;
	#gl;
	#program;
	#uniforms;

	#sceneSize;
	// #miniSceneSize;
	// #miniFramebuffer;
	// #miniRenderTexture;

	#numMetaballs;
	#numMetaballGroups;
	#metaballData;
	#metaballGroupData;
	#fade = 1;

	constructor(canvas, numMetaballs, numMetaballGroups, foreground, background) {
		const gl = canvas.getContext("webgl2", {
			depth: false,
			stencil: false,
		});

		this.#canvas = canvas;
		this.#gl = gl;

		const vertShader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(
			vertShader,
			"#version 300 es\n" +
				"in vec2 pos; void main(void) { gl_Position = vec4(pos, 0.0, 1.0); }",
		);
		gl.compileShader(vertShader);
		const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(
			fragShader,
			"#version 300 es\n" +
				`
			precision mediump float;

			#define threshold 0.015
			#define smoothness 0.0005
			#define white vec3(1.0)
			#define metaballColor vec3(${foreground.slice(0, 3).join(", ")})
			#define emptyColor vec3(${background.slice(0, 3).join(", ")})

			uniform float fade;
			uniform vec2 gameSize;
			uniform vec2 sceneSize;
			uniform vec4[${numMetaballs}] metaballs;
			uniform vec4[${numMetaballGroups}] metaballGroups;

			// uniform float mini;
			// uniform vec2 miniSceneSize;
			// uniform sampler2D miniTexture;

			out vec4 outColor;

			void main(void) {

				// if (mini == 0.0 && texture(miniTexture, gl_FragCoord.xy / sceneSize).a < 0.01) {
				// 	discard;
				// }

				vec2 sceneScale = gameSize / sceneSize;

				vec2 uv = gl_FragCoord.xy * sceneScale;
				uv.x = uv.x - gameSize.x * 0.5;
				uv.y = gameSize.y * 0.5 - uv.y;

				float smoothing = smoothness * max(sceneScale[0], sceneScale[1]);

				float sums[${numMetaballGroups}];
				for (int i = 0; i < ${numMetaballs}; i++) {
					vec4 metaball = metaballs[i];
					sums[int(metaball.w)] += metaball.z / pow(length(uv - metaball.xy) + 3.5, 2.0);
				}

				float value = 0.0;
				for (int i = 0; i < ${numMetaballGroups}; i++) {
					vec4 metaballGroup = metaballGroups[i];
					float outsideEdge = sums[i] - threshold;
					float insideEdge = sums[i] - threshold - 0.01;

					float opacity = pow(metaballGroup[0], 0.5);
					value = max(value,
						smoothstep(-smoothing, +smoothing, outsideEdge) *
						mix(opacity, 1.0, smoothstep(-smoothing, +smoothing, insideEdge))
					);
				}

				// if (mini == 1.0) {
				// 	outColor = vec4(value);
				// 	return;
				// }

				vec3 foregroundColor = mix(emptyColor, metaballColor, value);
				vec4 background = vec4(fade);
				vec4 foreground = vec4(mix(foregroundColor, white, fade), 1.0);
				outColor = mix(background, foreground, value);
			}
		`,
		);
		gl.compileShader(fragShader);
		if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
			const info = gl.getShaderInfoLog(fragShader);
			console.warn(info);
		}
		const program = gl.createProgram();
		this.#program = program;
		gl.attachShader(program, vertShader);
		gl.attachShader(program, fragShader);
		gl.linkProgram(program);

		this.#uniforms = {
			gameSize: gl.getUniformLocation(program, "gameSize"),
			sceneSize: gl.getUniformLocation(program, "sceneSize"),
			metaballs: gl.getUniformLocation(program, "metaballs"),
			metaballGroups: gl.getUniformLocation(program, "metaballGroups"),
			fade: gl.getUniformLocation(program, "fade"),
			// mini: gl.getUniformLocation(program, "mini"),
			// miniTexture: gl.getUniformLocation(program, "miniTexture"),
			// miniSceneSize: gl.getUniformLocation(program, "miniSceneSize"),
		};

		const vertices = [
			[-1, -1],
			[1, -1],
			[1, 1],
			[-1, -1],
			[1, 1],
			[-1, 1],
		].flat();
		const buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
		const pos = gl.getAttribLocation(program, "pos");
		gl.enableVertexAttribArray(pos);
		gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

		this.#numMetaballs = numMetaballs;
		this.#numMetaballGroups = numMetaballGroups;

		this.#metaballData = new Float32Array(numMetaballs * 4);
		this.#metaballGroupData = new Float32Array(numMetaballGroups * 4);
		this.#sceneSize = [1, 1];
		// this.#miniSceneSize = [64, 64];

		/*
		this.#miniRenderTexture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.#miniRenderTexture);
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.RGBA,
			...this.#miniSceneSize,
			0,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			null,
		);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

		this.#miniFramebuffer = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.#miniFramebuffer);
		gl.framebufferTexture2D(
			gl.FRAMEBUFFER,
			gl.COLOR_ATTACHMENT0,
			gl.TEXTURE_2D,
			this.#miniRenderTexture,
			0,
		);

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		*/

		const resizeObserver = new ResizeObserver(([entry]) => {
			const boxSize = entry.borderBoxSize[0];
			const resolution = window.devicePixelRatio * 1;
			this.#sceneSize[0] = boxSize.inlineSize / resolution;
			this.#sceneSize[1] = boxSize.blockSize / resolution;
			[this.#canvas.width, this.#canvas.height] = this.#sceneSize;
			this.redraw();
		});

		resizeObserver.observe(game);
	}

	update(metaballs, groupOpacities) {
		for (let i = 0; i < this.#numMetaballs; i++) {
			this.#metaballData.set(metaballs[i], i * 4);
		}

		for (let i = 0; i < this.#numMetaballGroups; i++) {
			this.#metaballGroupData[i * 4] = groupOpacities[i];
		}
	}

	redraw() {
		const gl = this.#gl;
		const fade = this.#fade;
		const uniforms = this.#uniforms;

		gl.useProgram(this.#program);
		gl.uniform2f(uniforms.gameSize, ...Globals.gameSize);
		gl.uniform4fv(uniforms.metaballGroups, this.#metaballGroupData);
		gl.uniform4fv(uniforms.metaballs, this.#metaballData);
		gl.uniform1f(uniforms.fade, fade);
		// gl.uniform1i(uniforms.miniTexture, 0);
		// gl.uniform2f(uniforms.miniSceneSize, ...this.#miniSceneSize);

		/*
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.#miniFramebuffer);
		gl.viewport(0, 0, ...this.#miniSceneSize);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.uniform2f(uniforms.sceneSize, ...this.#miniSceneSize);
		gl.uniform1f(uniforms.fade, 0);
		gl.uniform1f(uniforms.mini, 1);
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.drawArrays(gl.TRIANGLES, 0, 6);
		*/

		// gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0, 0, ...this.#sceneSize);
		gl.clearColor(fade, fade, fade, fade);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.uniform2f(uniforms.sceneSize, ...this.#sceneSize);
		gl.uniform1f(uniforms.fade, fade);
		// gl.uniform1f(uniforms.mini, 0);
		// gl.bindTexture(gl.TEXTURE_2D, this.#miniRenderTexture);
		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}

	fadeIn(duration) {
		tween((at) => (this.#fade = 1 - at), duration, quadEaseIn);
	}

	fadeOut(duration) {
		tween((at) => (this.#fade = at), duration, quadEaseIn);
	}
}

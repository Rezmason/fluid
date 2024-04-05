import Globals from "./globals.js";
import { tween, quadEaseIn } from "./tween.js";

const game = Globals.game;
const feederMetaballs = game.querySelector("#metaballs");

const gl = feederMetaballs.getContext("webgl2", {
	depth: false,
	stencil: false,
});
gl.clearColor(1, 1, 1, 1);

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
	#define width 1024.0
	#define height 768.0
	#define white vec3(1.0)
	#define feederColor vec3(0.5, 0.09, 0)
	#define emptyColor vec3(1.0, 0.4, 0)
	uniform float fade;
	uniform float sceneScale;
	uniform vec4[10] metaballs;
	uniform vec4[3] metaballGroups;

	out vec4 outColor;

	void main(void) {

		vec2 uv = gl_FragCoord.xy * sceneScale;
		uv.x = uv.x - width * 0.5;
		uv.y = height * 0.5 - uv.y;

		float smoothing = smoothness * sceneScale;

		float sums[3] = float[3](0.0, 0.0, 0.0);
		for (int i = 0; i < 10; i++) {
			vec4 metaball = metaballs[i];
			sums[int(metaball.w)] += metaball.z / pow(length(uv - metaball.xy) + 3.5, 2.0);
		}

		float value = 0.0;
		for (int i = 0; i < 3; i++) {
			vec4 metaballGroup = metaballGroups[i];
			float outsideEdge = sums[i] - threshold;
			float insideEdge = sums[i] - threshold - 0.01;
			float opacity = pow(metaballGroup[0], 0.5);
			value = max(value,
				smoothstep(-smoothing, +smoothing, outsideEdge) *
				mix(opacity, 1.0, smoothstep(-smoothing, +smoothing, insideEdge))
			);
		}

		vec3 foregroundColor = mix(emptyColor, feederColor, value);
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
gl.attachShader(program, vertShader);
gl.attachShader(program, fragShader);
gl.linkProgram(program);

const uSceneScale = gl.getUniformLocation(program, "sceneScale");
const uMetaballs = gl.getUniformLocation(program, "metaballs");
const uMetaballGroups = gl.getUniformLocation(program, "metaballGroups");
const uFade = gl.getUniformLocation(program, "fade");

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

const metaballData = new Float32Array(10 * 4);
const metaballGroupData = new Float32Array(3 * 4);
let sceneScale = 1;

const redraw = () => {
	gl.clear(gl.COLOR_BUFFER_BIT);
	gl.useProgram(program);
	gl.uniform4fv(uMetaballGroups, metaballGroupData);
	gl.uniform4fv(uMetaballs, metaballData);
	gl.uniform1f(uFade, fade);
	gl.uniform1f(uSceneScale, sceneScale);
	gl.drawArrays(gl.TRIANGLES, 0, 6);
};

const resizeObserver = new ResizeObserver(([entry]) => {
	const boxSize = entry.borderBoxSize[0];
	const size = [boxSize.inlineSize, boxSize.blockSize];
	const resolution = window.devicePixelRatio * 1;
	size[0] /= resolution;
	size[1] /= resolution;
	[feederMetaballs.width, feederMetaballs.height] = size;
	gl.viewport(0, 0, ...size);
	sceneScale = Globals.gameSize[0] / size[0];
	redraw();
});

resizeObserver.observe(game);

let fade = 1;

const fadeOut = (duration) => tween((at) => (fade = at), duration, quadEaseIn);

const fadeIn = (duration) =>
	tween((at) => (fade = 1 - at), duration, quadEaseIn);

export default {
	update: (metaballs, groupOpacities) => {
		for (let i = 0; i < 10; i++) {
			metaballData.set(metaballs[i], i * 4);
		}

		for (let i = 0; i < 3; i++) {
			metaballGroupData[i * 4] = groupOpacities[i];
		}
	},
	redraw,
	fadeOut,
	fadeIn,
};

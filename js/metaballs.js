import Globals from "./globals.js";

const game = Globals.game;
const feederMetaballs = game.querySelector("#metaballs");

const gl = feederMetaballs.getContext("webgl2", {
	depth: false,
	stencil: false,
	premultipliedAlpha: false
	// alpha: false
});
gl.clearColor(1, 1, 1, 1);

const vertShader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertShader, "#version 300 es\n" + "in vec2 pos; void main(void) { gl_Position = vec4(pos, 0.0, 1.0); }");
gl.compileShader(vertShader);
const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fragShader, "#version 300 es\n" + `
	precision mediump float;

	#define threshold 0.015
	#define smoothness 0.0005
	#define width 1024.0
	#define height 768.0
	#define color vec3(0.478431, 0.0901961, 0)
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
			float insideEdge = sums[i] - threshold - 0.0085;
			float insideOpacity = metaballGroup[0];
			value = max(value,
				smoothstep(-smoothing, +smoothing, outsideEdge) *
				mix(1.0, insideOpacity, smoothstep(-smoothing, +smoothing, insideEdge))
			);
		}

		// outColor = vec4(mix(vec3(1.0), color, value), 1.0);
		outColor = vec4(color, value);
	}
`);
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

const vertices = [
	[-1,-1], [ 1,-1], [ 1, 1],
	[-1,-1], [ 1, 1], [-1, 1]
].flat();
const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
const pos = gl.getAttribLocation(program, "pos");
gl.enableVertexAttribArray(pos);
gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

const metaballData = new Float32Array(10 * 4);
const metaballGroupData = new Float32Array(3 * 4);

const redraw = () => {
	gl.clear(gl.COLOR_BUFFER_BIT);
	gl.useProgram(program);
	gl.uniform4fv(uMetaballGroups, metaballGroupData);
	gl.uniform4fv(uMetaballs, metaballData);
	gl.drawArrays(gl.TRIANGLES, 0, 6);
}

const resizeObserver = new ResizeObserver(([entry]) => {
	const boxSize = entry.borderBoxSize[0];
	const size = [boxSize.inlineSize, boxSize.blockSize];
	const resolution = window.devicePixelRatio * 1;
	size[0] /= resolution;
	size[1] /= resolution;
	[feederMetaballs.width, feederMetaballs.height] = size;
	gl.viewport(0, 0, ...size);
	gl.uniform1f(uSceneScale, Globals.gameSize[0] / size[0]);
	redraw();
});

resizeObserver.observe(game);

export default {
	update: (metaballs, groupOpacities) => {
		for (let i = 0; i < 10; i++) {
			metaballData.set(metaballs[i], i * 4);
		}

		for (let i = 0; i < 3; i++) {
			metaballGroupData[i * 4] = groupOpacities[i];
		}
	},
	redraw
};

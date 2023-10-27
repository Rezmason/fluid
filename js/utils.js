import SceneNode from "./scenenode.js";
import Transform from "./transform.js";
import Globals from "./globals.js";

const {vec2, mat2d} = glMatrix;

const createNode = (properties = null) =>
	new SceneNode({
		transform: new Transform(),
		domElement: null,
	...properties
});

const createSVGGroup = () => document.createElementNS("http://www.w3.org/2000/svg", "g");

const renderNode = (node, scene) => {
	if (node.domElement == null) {
		node.domElement = createSVGGroup();
		node.domElement.setAttribute("id", node.name);
		node.childContainer = createSVGGroup();
		node.artContainer = createSVGGroup();

		node.domElement.append(node.childContainer);
		node.domElement.append(node.artContainer);

		node.artContainer.innerHTML = node.art ?? [
			`<circle r="20" fill="#ff000060"></circle>`,
			`<text>${node.name ?? "..."}</text>`
		].join("");

		const domParent = node.parent?.childContainer ?? scene;
		domParent.appendChild(node.domElement);
	}
	if (node.transform.stale) {
		node.transform.render();
	}
	node.domElement.setAttribute("transform", node.transform.svgTransform);
	for (const child of node.children) {
		renderNode(child, scene);
	}
};

const lerp = (p, q, percent) => (1 - percent) * p + percent * q;

const vec2Zero = vec2.create();

const vec2One = vec2.fromValues(1, 1);

const vec2FromAngle = (angle, magnitude = 1) => chain(
	vec2.fromValues(magnitude, 0),
	[vec2.rotate, null, vec2Zero, angle]
);

const vec2AngleTo = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);

const vec2Min = (out, a, b) => {
	out[0] = Math.min(a[0], b[0]);
	out[1] = Math.min(a[1], b[1]);
}

const vec2Max = (out, a, b) => {
	out[0] = Math.max(a[0], b[0]);
	out[1] = Math.max(a[1], b[1]);
}

const vec2Clamp = (out, a, min, max) => {
	vec2Max(out, a, min);
	vec2Min(out, out, max)
}

const localToGlobalMatrix = (node) => {
	const matrix = mat2d.create();
	while (node != null) {
		mat2d.multiply(matrix, node.transform.matrix, matrix);
		node = node.parent;
	}
	return matrix;
};

const getGlobalPosition = (node) => {
	const matrix = localToGlobalMatrix(node);
	return vec2.fromValues(matrix[4], matrix[5]);
};

const setGlobalPosition = (node, v) => {

	if (node.parent == null) {
		node.transform.position = v;
		return;
	}

	const g2l = chain(
		localToGlobalMatrix(node.parent),
		[mat2d.invert, null]
	);

	node.transform.position = vec2.fromValues(
		v[0] * g2l[0] + v[1] * g2l[2] + g2l[4],
		v[0] * g2l[1] + v[1] * g2l[3] + g2l[5]
	);
};

// These cheat— angles are preserved for uniform scales,
// and all scales in this project are uniform

const localToGlobalRotation = (node) => {
	let globalRotation = 0;
	while (node != null) {
		globalRotation += node.transform.rotation;
		node = node.parent;
	}
	return globalRotation;
};

const getGlobalRotation = (node) => {
	return localToGlobalRotation(node);
};

const setGlobalRotation = (node, angle) => {
	const globalRotation = localToGlobalRotation(node);
	const diff = angle - globalRotation;
	node.transform.rotation += diff;
};

const chain = (subject, ...ops) => {
	for (const op of ops) {
		op[0](subject, ...op.slice(1).map(v => v ?? subject));
	}
	return subject;
};

export {
	chain,
	lerp,
	createNode,
	renderNode,
	vec2Zero,
	vec2One,
	vec2FromAngle,
	vec2AngleTo,
	vec2Min,
	vec2Max,
	vec2Clamp,
	getGlobalPosition,
	setGlobalPosition,
	getGlobalRotation,
	setGlobalRotation
};

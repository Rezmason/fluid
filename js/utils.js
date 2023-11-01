import SceneNode from "./scenenode.js";
import Transform from "./transform.js";
import ColorTransform from "./colortransform.js";
import Globals from "./globals.js";

const {vec2, mat2d, vec4} = glMatrix;

const createNode = (properties = null) =>
	new SceneNode({
		visible: true,
		transform: new Transform(),
		colorTransform: new ColorTransform(),
		domElement: null,
	...properties
});

const createSVGGroup = () => document.createElementNS("http://www.w3.org/2000/svg", "g");

const renderNode = (node, scene) => {
	const domElement = node.domElement ?? createSVGGroup();
	if (node.domElement == null) {
		node.domElement = domElement;
		domElement.setAttribute("id", node.name);
		domElement.setAttribute("class", (node.tags ?? []).join(" "));
		node.domElement.innerHTML = node.art ?? "";

		if (node.click != null) {
			node.domElement.addEventListener("click", node.click);
		}
	}

	if (node.parent == null) {
		if (domElement.parentNode !== scene) scene.append(domElement);
	} else {
		const domParent = node.parent.domElement;
		if (domElement.parentNode !== domParent) {
			domParent.append(domElement);
		}
	}

	const style = domElement.style;
	const visibility = style.getPropertyValue("visibility");
	const isVisible = visibility === "visible";
	if (visibility === "" || node.visible !== isVisible) {
		style.setProperty("visibility", node.visible ? "visible" : "hidden");
	}

	if (node.transform.stale) {
		node.transform.render();
		style.transform = node.transform.cssTransform;
	}

	if (node.colorTransform.stale) {
		node.colorTransform.render();
		style.color = node.colorTransform.cssColor;
	}

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

const hexColor = (hex) => vec4.fromValues(...hex.match(/[\da-fA-F]{2}/g).map(n => parseInt(n, 16) * 100 / 0xFF));

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
	setGlobalRotation,
	hexColor
};

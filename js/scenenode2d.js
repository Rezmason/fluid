import SceneNode from "./scenenode.js";
import Transform2D from "./transform2d.js";
import ColorTransform from "./colortransform.js";
import { chain } from "./mathutils.js";

const { vec2, mat2d, vec4 } = glMatrix;

export default class SceneNode2D extends SceneNode {
	visible = true;
	transform = new Transform2D();
	colorTransform = new ColorTransform();
	domElement = null;

	get globalPosition() {
		const matrix = this.#localToGlobalMatrix;
		return vec2.fromValues(matrix[4], matrix[5]);
	}

	set globalPosition(v) {
		if (this.parent == null) {
			this.transform.position = v;
			return;
		}

		const g2l = chain(this.parent.#localToGlobalMatrix, [mat2d.invert, null]);

		this.transform.position = vec2.fromValues(
			v[0] * g2l[0] + v[1] * g2l[2] + g2l[4],
			v[0] * g2l[1] + v[1] * g2l[3] + g2l[5]
		);
	}

	get #localToGlobalMatrix() {
		let node = this;
		const matrix = mat2d.create();
		while (node != null) {
			mat2d.multiply(matrix, node.transform.matrix, matrix);
			node = node.parent;
		}
		return matrix;
	}

	// These cheat— angles are preserved for uniform scales,
	// and all scales in this project are uniform

	get globalRotation() {
		return this.#localToGlobalRotation;
	}

	set globalRotation(v) {
		const globalRotation = this.#localToGlobalRotation;
		const diff = v - globalRotation;
		this.transform.rotation += diff;
	}

	get #localToGlobalRotation() {
		let node = this;
		let globalRotation = 0;
		while (node != null) {
			globalRotation += node.transform.rotation;
			node = node.parent;
		}
		return globalRotation;
	}
}

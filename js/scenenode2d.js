import SceneNode from "./scenenode.js";
import Transform2D from "./transform2d.js";
import ColorTransform from "./colortransform.js";
import {
	vec2,
	createMatrix,
	invertMatrix,
	premultiplyMatrix,
} from "./mathutils.js";

export default class SceneNode2D extends SceneNode {
	#stale = false;
	#globalMatrix = createMatrix();
	#invGlobalMatrix = createMatrix();
	#globalRotation = 0;
	visible = true;
	transform = new Transform2D(() => this.#markStale());
	colorTransform = new ColorTransform();
	domElement = null;

	get globalPosition() {
		const matrix = this.globalMatrix;
		return vec2.new(matrix[4], matrix[5]);
	}

	set globalPosition(v) {
		if (this.parent == null) {
			this.transform.position = v;
			return;
		}
		const pm = this.parent.invGlobalMatrix;
		this.transform.position = vec2.new(
			v[0] * pm[0] + v[1] * pm[2] + pm[4],
			v[0] * pm[1] + v[1] * pm[3] + pm[5],
		);
	}

	get globalMatrix() {
		if (this.#stale) {
			this.#recomposeGlobalMatrix();
		}
		return this.#globalMatrix;
	}

	get invGlobalMatrix() {
		if (this.#stale) {
			this.#recomposeGlobalMatrix();
		}
		return this.#invGlobalMatrix;
	}

	get globalRotation() {
		if (this.#stale) {
			this.#recomposeGlobalMatrix();
		}
		return this.#globalRotation;
	}

	set globalRotation(v) {
		const globalRotation = this.globalRotation;
		const diff = v - globalRotation;
		this.transform.rotation += diff;
	}

	#recomposeGlobalMatrix() {
		this.#globalRotation = this.transform.rotation;
		const matrix = this.#globalMatrix;
		matrix.set(this.transform.matrix);
		if (this.parent != null) {
			this.#globalRotation += this.parent.globalRotation;
			premultiplyMatrix(this.parent.globalMatrix, matrix);
		}
		this.#invGlobalMatrix.set(matrix);
		invertMatrix(this.#invGlobalMatrix);
		this.#stale = false;
	}

	#markStale() {
		if (this.#stale) {
			return;
		}
		this.#stale = true;
		for (const child of this.children) {
			child.#markStale();
		}
	}

	handleReparent() {
		this.#markStale();
	}
}

import SceneNode from "./scenenode.js";
import Transform2D from "./transform2d.js";
import ColorTransform from "./colortransform.js";
import {
	vec2,
	createMatrix,
	invertMatrix,
	premultiplyMatrix,
	matrixToCSSTransform,
} from "./mathutils.js";

const staleMatrix = 1 << 0;
const staleZ = 1 << 1;
const staleVisible = 1 << 2;

export default class SceneNode2D extends SceneNode {
	#stale = 0;

	#globalMatrix = createMatrix();
	#invGlobalMatrix = createMatrix();
	#globalRotation = 0;
	transform = new Transform2D(() => this.#markStale(staleMatrix));

	#globalZ = 0;
	#z = 0;

	#globalVisible = true;
	#visible = true;

	colorTransform = new ColorTransform();
	domElement = null;
	transformCSS = "";

	constructor(properties) {
		// superclass constructor cannot access private values,
		// even when they're encapsulated in public getter/setters
		super({});
		Object.assign(this, properties);
	}

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
		this.#recomposeGlobal(staleMatrix);
		return this.#globalMatrix;
	}

	get invGlobalMatrix() {
		this.#recomposeGlobal(staleMatrix);
		return this.#invGlobalMatrix;
	}

	get globalRotation() {
		this.#recomposeGlobal(staleMatrix);
		return this.#globalRotation;
	}

	set globalRotation(v) {
		const globalRotation = this.globalRotation;
		const diff = v - globalRotation;
		this.transform.rotation += diff;
	}

	get z() {
		return this.#z;
	}

	set z(v) {
		if (this.z === v) {
			return;
		}
		this.#z = v;
		this.#markStale(staleZ);
	}

	get globalZ() {
		this.#recomposeGlobal(staleZ);
		return this.#globalZ;
	}

	set globalZ(v) {
		const globalZ = this.globalZ;
		const diff = v - globalZ;
		this.z += diff;
	}

	get visible() {
		return this.#visible;
	}

	set visible(v) {
		if (this.#visible === v) {
			return;
		}
		this.#visible = v;
		this.#markStale(staleVisible);
	}

	get globalVisible() {
		this.#recomposeGlobal(staleVisible);
		return this.#globalVisible;
	}

	renderCSS() {
		this.#recomposeGlobal(staleMatrix);
	}

	#recomposeGlobal(bitfields) {
		if ((this.#stale & ~bitfields) === this.#stale) {
			return;
		}

		if (bitfields & staleMatrix) {
			this.#globalRotation =
				this.transform.rotation + (this.parent?.globalRotation ?? 0);
			this.#globalMatrix.set(this.transform.matrix);
			premultiplyMatrix(this.parent?.globalMatrix, this.#globalMatrix);
			this.#invGlobalMatrix.set(this.#globalMatrix);
			invertMatrix(this.#invGlobalMatrix);
			this.transformCSS = matrixToCSSTransform(this.#globalMatrix);
		}

		if (bitfields & staleZ) {
			this.#globalZ = this.#z + (this.parent?.globalZ ?? 0);
		}

		if (bitfields & staleVisible) {
			this.#globalVisible =
				this.#visible & (this.parent?.globalVisible ?? true);
		}

		this.#stale &= ~bitfields;
	}

	#markStale(bitfields) {
		if ((this.#stale | bitfields) === this.#stale) {
			return;
		}

		this.#stale |= bitfields;

		for (const child of this.children) {
			child.#markStale(bitfields);
		}
	}

	handleReparent() {
		this.#markStale(staleMatrix | staleZ | staleVisible);
	}
}

import { vec2, createMatrix, matrixToCSSTransform } from "./mathutils.js";

export default class Transform2D {
	#matrix = createMatrix();
	#position = vec2.new().retain();
	#rotation = 0;
	#scale = 1;
	#stale = true;
	#staleCbk;
	cssTransform = null;

	constructor(staleCbk = null) {
		this.#staleCbk = staleCbk;
	}

	get position() {
		return this.#position.clone();
	}

	set position(v) {
		if (!this.#position.equals(v)) {
			this.#position.set(v);
			this.markStale();
		}
	}

	get rotation() {
		return this.#rotation;
	}

	set rotation(v) {
		if (this.#rotation !== v) {
			this.#rotation = v;
			this.markStale();
		}
	}

	get scale() {
		return this.#scale;
	}

	set scale(v) {
		if (this.#scale !== v) {
			this.#scale = v;
			this.markStale();
		}
	}

	get matrix() {
		if (this.#stale) {
			this.#recomposeMatrix();
		}
		return this.#matrix;
	}

	markStale() {
		this.#stale = true;
		this.cssTransform = null;
		this.#staleCbk?.();
	}

	#recomposeMatrix() {
		const m = this.#matrix;
		const sine = Math.sin(this.#rotation);
		const cosine = Math.cos(this.#rotation);

		m[0] = cosine * this.#scale;
		m[1] = sine * this.#scale;
		m[2] = -sine * this.#scale;
		m[3] = cosine * this.#scale;

		m[4] = this.#position[0];
		m[5] = this.#position[1];

		this.#stale = false;
	}

	render() {
		this.cssTransform = matrixToCSSTransform(this.matrix);
	}
}

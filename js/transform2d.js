import { vec2, createMatrix } from "./mathutils.js";

const tw = (n, p) => Math.floor(n * p) / p;

export default class Transform2D {
	#matrix = createMatrix();
	#position = vec2.new().retain();
	#rotation = 0;
	#scale = 1;
	#staleMatrix = true;
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
			this.markStaleMatrix();
		}
	}

	get rotation() {
		return this.#rotation;
	}

	set rotation(v) {
		if (this.#rotation !== v) {
			this.#rotation = v;
			this.markStaleMatrix();
		}
	}

	get scale() {
		return this.#scale;
	}

	set scale(v) {
		if (this.#scale !== v) {
			this.#scale = v;
			this.markStaleMatrix();
		}
	}

	get matrix() {
		if (this.#staleMatrix) {
			this.#recomposeMatrix();
		}
		return this.#matrix;
	}

	markStaleMatrix() {
		this.#staleMatrix = true;
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

		this.#staleMatrix = false;
	}

	render() {
		const m = this.matrix;
		const svgTransform = `matrix(${[
			tw(m[0], 1000),
			tw(m[1], 1000),
			tw(m[2], 1000),
			tw(m[3], 1000),
			tw(m[4], 200),
			tw(m[5], 200),
		].join(",")})`;

		this.cssTransform = "translateZ(0) " + svgTransform;
	}
}

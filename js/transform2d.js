import { vec2 } from "./mathutils.js";
const { mat2d } = glMatrix;

const tw = (n, p) => Math.floor(n * p) / p;

export default class Transform2D {
	matrix = mat2d.create();
	#position = vec2.new();
	#rotation = 0;
	#scale = 1;
	stale = true;
	svgTransform = "none";
	cssTransform = "none";

	constructor() {}

	get position() {
		return this.#position.clone();
	}

	set position(v) {
		if (this.matrix[2] !== v[0] || this.matrix[5] !== v[1]) {
			this.#position[0] = this.matrix[4] = v[0];
			this.#position[1] = this.matrix[5] = v[1];
			this.stale = true;
		}
	}

	get rotation() {
		return this.#rotation;
	}

	set rotation(v) {
		if (this.#rotation !== v) {
			this.#rotation = v;
			this.#recompose();
			this.stale = true;
		}
	}

	get scale() {
		return this.#scale;
	}

	set scale(v) {
		if (this.#scale !== v) {
			this.#scale = v;
			this.#recompose();
			this.stale = true;
		}
	}

	#recompose() {
		const position = this.position;
		mat2d.fromRotation(this.matrix, this.#rotation);
		mat2d.multiplyScalar(this.matrix, this.matrix, this.#scale);
		this.position = position;
	}

	render() {
		this.stale = false;
		const m = this.matrix;
		this.svgTransform = `matrix(${[
			tw(m[0], 1000),
			tw(m[1], 1000),
			tw(m[2], 1000),
			tw(m[3], 1000),
			tw(m[4], 200),
			tw(m[5], 200),
		].join(",")})`;

		this.cssTransform = "translateZ(0) " + this.svgTransform;
	}
}

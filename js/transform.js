const {vec2, mat3} = glMatrix;

const twipped = (n) => Math.floor(n * 20) / 20;

export default class Transform {
	matrix = mat3.create();
	#position = vec2.create();
	#rotation = 0;
	stale = true;
	svgTransform = "none";

	constructor() {

	}

	get position() {
		return vec2.clone(this.#position);
	}

	set position(v) {
		const twippedX = twipped(v[0]);
		const twippedY = twipped(v[1]);
		if (this.matrix[2] !== twippedX || this.matrix[5] !== twippedY) {
			this.#position[0] = this.matrix[2] = twippedX;
			this.#position[1] = this.matrix[5] = twippedY;
			this.stale = true;
		}
	}

	get rotation() {
		return this.#rotation;
	}

	set rotation(v) {
		if (this.#rotation !== v) {
			this.#rotation = twipped(v);
			const position = this.position;
			mat3.fromRotation(this.matrix, v);
			this.position = position;
			this.stale = true;
		}
	}

	render() {
		this.stale = false;
		const m = this.matrix;
		this.svgTransform = `matrix( ${m[0]} ${m[1]} ${m[3]} ${m[4]} ${m[2]} ${m[5]} )`;
	}
}

const {vec2, mat3} = glMatrix;

export default class Transform {
	matrix = mat3.create();
	#rotation = 0;

	constructor() {

	}

	get position() {
		return vec2.fromValues(
			this.matrix[2],
			this.matrix[5],
		);
	}

	set position(v) {
		this.matrix[2] = v[0];
		this.matrix[5] = v[1];
	}

	get rotation() {
		return this.#rotation;
	}

	set rotation(v) {
		if (this.rotation !== v) {
			this.rotation = v;
			const x = this.matrix[2];
			const y = this.matrix[5];
			mat3.fromRotation(this.matrix, v);
			this.matrix[2] = x;
			this.matrix[5] = y;
		}
	}
}

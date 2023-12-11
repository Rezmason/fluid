import vecLib from "./vec.js";

const lerp = (p, q, percent) => (1 - percent) * p + percent * q;

const vec2 = vecLib(2);
const vec4 = vecLib(4);

Object.assign(vec2, {
	zero: vec2.new(),
	one: vec2.new(1, 1),
	fromAngle: (angle, magnitude = 1) =>
		vec2.new(Math.cos(angle), Math.sin(angle)).mul(magnitude),
	angleTo: function (other) {
		return Math.atan2(other[1] - this[1], other[0] - this[0]);
	},
});

Object.assign(vec4, {
	hexColor: (hex) =>
		vec4.new(
			...hex.match(/[\da-fA-F]{2}/g).map((n) => (parseInt(n, 16) * 100) / 0xff),
		),
});

const identityMatrix = Float32Array.from([1, 0, 0, 1, 0, 0]);

const createMatrix = () => Float32Array.from(identityMatrix);

const invertMatrix = (matrix) => {
	const [a, b, c, d, tx, ty] = matrix;
	let determinant = a * d - b * c;

	if (determinant == 0) {
		return;
	}

	determinant = 1.0 / determinant;
	matrix.set([
		+d * determinant,
		-b * determinant,
		-c * determinant,
		+a * determinant,
		(c * ty - d * tx) * determinant,
		(b * tx - a * ty) * determinant,
	]);
};

const premultiplyMatrix = (p, q) => {
	const [pa, pb, pc, pd, pe, pf] = p;
	const [qa, qb, qc, qd, qe, qf] = q;
	q.set([
		pa * qa + pc * qb,
		pb * qa + pd * qb,
		pa * qc + pc * qd,
		pb * qc + pd * qd,
		pa * qe + pc * qf + pe,
		pb * qe + pd * qf + pf,
	]);
};

export { lerp, vec2, vec4, createMatrix, invertMatrix, premultiplyMatrix };

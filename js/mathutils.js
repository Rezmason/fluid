import { createType, retaining } from "./vec.js";

const lerp = (p, q, percent) => (1 - percent) * p + percent * q;

const vec2 = createType(2)
	.extend({
		angleTo: function (other) {
			return Math.atan2(other[1] - this[1], other[0] - this[0]);
		},
	})
	.extendAPI({
		fromAngle: (angle, magnitude = 1) =>
			vec2.new(Math.cos(angle), Math.sin(angle)).mul(magnitude),
	});

const vec4 = createType(4).extendAPI({
	hexColor: (hex, multiplier = 100) =>
		vec4.new(
			...hex
				.match(/[\da-fA-F]{2}/g)
				.map((n) => (parseInt(n, 16) * multiplier) / 0xff),
		),
});

const collect = () => {
	vec2.collect();
	vec4.collect();
};

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

export {
	lerp,
	vec2,
	vec4,
	retaining,
	collect,
	createMatrix,
	invertMatrix,
	premultiplyMatrix,
};

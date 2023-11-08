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
			...hex.match(/[\da-fA-F]{2}/g).map((n) => (parseInt(n, 16) * 100) / 0xff)
		),
});

export { lerp, vec2, vec4 };

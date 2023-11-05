const { vec2, vec4 } = glMatrix;

const lerp = (p, q, percent) => (1 - percent) * p + percent * q;

const chain = (subject, ...ops) => {
	for (const op of ops) {
		op[0](subject, ...op.slice(1).map((v) => v ?? subject));
	}
	return subject;
};

const vec2Zero = vec2.create();

const vec2One = vec2.fromValues(1, 1);

const vec2FromAngle = (angle, magnitude = 1) =>
	chain(vec2.fromValues(magnitude, 0), [vec2.rotate, null, vec2Zero, angle]);

const vec2AngleTo = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);

const vec2Min = (out, a, b) =>
	vec2.set(out, Math.min(a[0], b[0]), Math.min(a[1], b[1]));

const vec2Max = (out, a, b) =>
	vec2.set(out, Math.max(a[0], b[0]), Math.max(a[1], b[1]));

const vec2Clamp = (out, a, min, max) => {
	vec2Max(out, a, min);
	vec2Min(out, out, max);
};

const hexColor = (hex) =>
	vec4.fromValues(
		...hex.match(/[\da-fA-F]{2}/g).map((n) => (parseInt(n, 16) * 100) / 0xff)
	);

export {
	lerp,
	chain,
	vec2Zero,
	vec2One,
	vec2FromAngle,
	vec2AngleTo,
	vec2Min,
	vec2Max,
	vec2Clamp,
	hexColor,
};

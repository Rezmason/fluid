const cache = new Map();

const gen = (n) => {
	const op = (f) => {
		const meat = f
			.toString()
			.replace("() => ", "")
			.replaceAll("this", "this[__i__]")
			.replaceAll("other", "(v[__i__] ?? v)");
		const s =
			"const ret = this.new(); " +
			Array(n)
				.fill()
				.map((_, i) => `ret[${i}] = ${meat.replaceAll("__i__", i)};`)
				.join(" ") +
			" return ret;";
		return new Function("v", s);
	};

	const lib = Object.assign(Array(n).fill(0), {
		new: (...args) => Object.create(lib).set(...args),
		toString: function () {
			return `vec${n}: ${this[0]}, ${this[1]}`;
		},
		set: function (...args) {
			if (args.length === 0) return this;
			let src = args;
			if (args.length === 1 && args[0][Symbol.iterator] != null) {
				src = args[0];
			}
			for (let i = 0; i < n; i++) {
				this[i] = src[i];
			}
			return this;
		},
		clone: function () {
			return lib.new(this);
		},

		equals: (() =>
			new Function(
				"v",
				Array(n)
					.fill()
					.map((_, i) => `if (this[${i}] !== v[${i}]) return false;`)
					.join(" ") + "return true;"
			))(),

		add: op(() => this + other),
		sub: op(() => this - other),
		mul: op(() => this * other),
		div: op(() => this / other),

		min: op(() => (this < other ? this : other)),
		max: op(() => (this > other ? this : other)),
		clamp: function (min, max) {
			return this.min(max).max(min);
		},

		sqrLen: (() =>
			new Function(
				"let sum = 0;" +
					Array(n)
						.fill()
						.map((_, i) => `sum += this[${i}] * this[${i}];`)
						.join(" ") +
					"return sum;"
			))(),
		len: function () {
			return Math.sqrt(this.sqrLen());
		},

		sqrDist: function (other) {
			return this.sub(other).sqrLen();
		},
		dist: function () {
			return Math.sqrt(this.sqrDist(other));
		},

		lerp: function (other, amount) {
			if (amount < 0) amount = 0;
			if (amount > 1) amount = 1;
			return this.mul(1 - amount).add(other.mul(amount));
		},
	});
	return lib;
};

const lib = (n) => {
	if (!cache.has(n)) cache.set(n, gen(n));
	return cache.get(n);
};

export default lib;

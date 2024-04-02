const createAPI = (n, debug = false) => {
	const pool = [];
	const heap = new Set();

	const api = {
		collect: () => {
			for (const vec of heap) {
				pool.push(vec);
				vec.fill(0);
				vec.initialized = false;
			}
			heap.clear();
		},
		new: (...args) => {
			const vec = pool.pop() ?? Object.create(api.lib);
			vec.initialized = true;
			heap.add(vec);
			return vec.set(...args);
		},
		extend: (o) => {
			Object.assign(api.lib, o);
			return api;
		},
		extendAPI: (o) => {
			Object.assign(api, o);
			return api;
		},
	};

	const op = (f) => {
		const meat = f
			.toString()
			.replace("() => ", "")
			.replaceAll("this", "this[__i__]")
			.replaceAll("other", "(v[__i__] ?? v)");
		return new Function(
			"v",
			`
			this.checkInitialized();
			const ret = this.api.new();
			${Array(n)
				.fill()
				.map((_, i) => `ret[${i}] = ${meat.replaceAll("__i__", i)};`)
				.join(" ")}
			ret.checkForNaN();
			return ret;
		`,
		);
	};

	api.lib = Object.assign(Array(n).fill(0), {
		api,
		initialized: false,
		toString: function () {
			return `vec${n}: ${this[0]}, ${this[1]}`;
		},

		retain: function () {
			heap.delete(this);
			return this;
		},
		release: function () {
			heap.add(this);
			return this;
		},

		checkInitialized: debug
			? function () {
					if (!this.initialized) {
						throw new Error("Cannot operate on uninitialized vector.");
					}
				}
			: () => {},
		checkForNaN: debug
			? function () {
					if (this.includes(NaN)) {
						throw new Error("NaN in", this);
					}
				}
			: () => {},

		set: function (...args) {
			this.checkInitialized();
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
			this.checkInitialized();
			return api.new(this);
		},

		equals: new Function(
			"v",
			`
				this.checkInitialized();
				${Array(n)
					.fill()
					.map((_, i) => `if (this[${i}] !== v[${i}]) return false;`)
					.join("\n")}
				return true;
			`,
		),

		add: op(() => this + other),
		sub: op(() => this - other),
		mul: op(() => this * other),
		div: op(() => this / other),

		min: op(() => (this < other ? this : other)),
		max: op(() => (this > other ? this : other)),
		clamp: function (min, max) {
			return this.min(max).max(min);
		},

		sqrLen: new Function(`
				this.checkInitialized();
				let sum = 0;
				${Array(n)
					.fill()
					.map((_, i) => `sum += this[${i}] * this[${i}];`)
					.join("\n")}
				return sum;
			`),
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
	return api;
};

const retaining = async (vecs, f) => {
	for (const vec of vecs) {
		vec.retain();
	}
	await new Promise(f);
	for (const vec of vecs) {
		vec.release();
	}
};

export { createAPI, retaining };

const retaining = async (vecs, func) => {
	for (const vec of vecs) {
		vec.retain();
	}
	await new Promise(func);
	for (const vec of vecs) {
		vec.release();
	}
};

const createType = (n, debug = false) => {
	const heap = new Set();
	const pool = new Set();
	const poolStack = [];

	const api = {
		collect: () => {
			for (const vec of heap) {
				pool.add(vec);
				poolStack.push(vec);
				vec.fill(0);
			}
			heap.clear();
		},
		new: (...args) => {
			const vec = poolStack.pop() ?? new Vec(n);
			pool.delete(vec);
			heap.add(vec);
			return vec.set(...args);
		},
		zero: () => api.new(),
		one: () => {
			const vec = api.new();
			vec.fill(1);
			return vec;
		},
		extend: (o) => {
			Object.assign(Vec.prototype, o);
			return api;
		},
		extendAPI: (o) => {
			Object.assign(api, o);
			return api;
		},
	};

	class Vec extends Array {
		constructor(n) {
			super(n);
			this.fill(0);
		}

		toString() {
			return `Vec(${n}): ${this.join(", ")}`;
		}

		retain() {
			heap.delete(this);
			return this;
		}

		release() {
			heap.add(this);
			return this;
		}

		set(...args) {
			this.checkIsPooled();
			if (args.length === 0) {
				return this;
			}
			let src = args;
			if (args.length === 1 && args[0][Symbol.iterator] != null) {
				src = args[0];
			}
			this.splice(0, n, ...src);
			return this;
		}

		clone() {
			this.checkIsPooled();
			return api.new(this);
		}
	}

	const exprToString = (expr) =>
		(expr ?? "").toString().replaceAll("() => ", "");

	const simdFunction = (expr) => {
		const func = new Function(
			"other",
			"api",
			'"use strict"; this.checkIsPooled();' +
				exprToString(expr)
					.replaceAll("this_", "this[__i__]")
					.replaceAll("other_", "(other[__i__] ?? other)")
					.replaceAll(/(^.*__i__.*$\n?)+/gm, (match) =>
						Array(n)
							.fill()
							.map((_, i) => match.replaceAll("__i__", i))
							.join(""),
					),
		);

		return function (other) {
			return func.call(this, other, api);
		};
	};

	const simdReducer = (
		expr,
		initValueExpr,
		prefixExpr = null,
		suffixExpr = null,
	) =>
		simdFunction(
			(() => {
				prefixExpr;
				let value = initValueExpr;
				expr;
				suffixExpr;
				return value;
			})
				.toString()
				.replace("initValueExpr", exprToString(initValueExpr))
				.replace("prefixExpr", exprToString(prefixExpr))
				.replace("suffixExpr", exprToString(suffixExpr))
				.replace("expr", exprToString(expr)),
		);

	const simdOperator = (expr) =>
		simdReducer(
			(() => (value[__i__] = expr))
				.toString()
				.replace("expr", exprToString(expr)),
			() => api.new(),
			null,
			() => value.checkHasNaN(),
		);

	api.extend({
		checkIsPooled: () => {},
		checkHasNaN: () => {},

		add: simdOperator(() => this_ + other_),
		sub: simdOperator(() => this_ - other_),
		mul: simdOperator(() => this_ * other_),
		div: simdOperator(() => this_ / other_),

		min: simdOperator(() => (this_ < other_ ? this_ : other_)),
		max: simdOperator(() => (this_ > other_ ? this_ : other_)),

		equals: simdReducer(() => (value = value && this_ === other_), true),
		sqrLen: simdReducer(() => (value = value + this_ * this_), 0),

		clamp: function (min, max) {
			return this.min(max).max(min);
		},

		len: function () {
			return Math.sqrt(this.sqrLen());
		},

		sqrDist: function (other) {
			return this.sub(other).sqrLen();
		},

		dist: function (other) {
			return Math.sqrt(this.sqrDist(other));
		},

		lerp: function (other, amount) {
			if (amount < 0) {
				amount = 0;
			}
			if (amount > 1) {
				amount = 1;
			}
			return this.mul(1 - amount).add(other.mul(amount));
		},
	});

	if (debug) {
		api.extend({
			checkIsPooled: function () {
				if (pool.has(this)) {
					throw new Error("Cannot operate on a pooled vector.");
				}
			},

			checkHasNaN: function () {
				if (this.includes(NaN)) {
					throw new Error("NaN within", this);
				}
			},
		});
	}

	return api;
};

export { createType, retaining };

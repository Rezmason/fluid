import {createNode, vec2Zero, lerp} from "./utils.js";
import Globals from "./globals.js";
import {tween, delay, quadEaseOut} from "./tween.js";

const {vec2} = glMatrix;

export default class Alga {
	name;
	neighbors = [];
	ripe = false;
	mucky = false;
	restingPosition;
	goalPosition;
	occupant = null;

	node;
	art;
	muck;

	#muckTween;
	#fruitTween;

	constructor(row, column, position) {
		this.name = `Alga${row}_${column}`;
		this.node = createNode({name: this.name});

		this.restingPosition = vec2.clone(position);
		this.goalPosition = vec2.clone(position);
		this.node.transform.position = position;

		this.muck = createNode({
			tags: ["muck"],
			art: `<circle r="59" fill="#c0c0c0"></circle>`
		});
		this.node.addChild(this.muck);

		this.fruit = createNode({
			tags: ["fruit"],
			art: `<circle r="22.5" fill="#f4e9cb"></circle>`
		});
		this.node.addChild(this.fruit);
		/*
		this.muck.Set("modulate", new Color(1, 1, 1, 0));
		*/
	}

	get occupied() {
		return this.occupant != null;
	}

	reset() {
		this.mucky = false;
		this.ripe = false;
		if (this.occupant != null) {
			this.node.removeChild(this.occupant.node);
			this.occupant = null;
		}

		if (this.#muckTween != null) {
			this.#muckTween?.stop();
			this.#muckTween = null;
		}

		if (this.#fruitTween != null) {
			this.#fruitTween?.stop();
			this.#fruitTween = null;
		}

		this.muck.visible = false;
		this.muck.transform.position = vec2Zero;
		this.muck.transform.scale = 0;
		/*
		reset muck opacity to 0
		reset fruit color to #f4e9cb
		*/
		this.fruit.transform.position = vec2Zero;
		this.fruit.transform.scale = 0.4;
	}

	#animateMuck() {
		const oldPosition = this.muck.transform.position;
		const newPosition = vec2Zero;
		const oldScale = this.muck.transform.scale;
		const newScale = this.mucky ? 1 : 0;
		this.#muckTween = tween((at) => {
			this.muck.visible = true;
			this.muck.transform.position = vec2.lerp(oldPosition, newPosition, at);
			this.muck.transform.scale = lerp(oldScale, newScale, at);
			/*
			tween "opacity" to isHere ? 1 : 0
			*/
			if (at >= 1) this.muck.visible = this.mucky;
		}, 0.5, quadEaseOut);
	}

	#animateFruit() {
		const oldScale = this.fruit.transform.scale;
		const newScale = this.ripe ? 1 : 0.4;
		this.#fruitTween = tween((at) => {
			/*
			tween color
			ripe: color #f79965
			unripe and mucky: color #ffffff
			unripe and not mucky: color #f4e9cb
			*/
			this.fruit.transform.scale = lerp(oldScale, newScale, at);
		}, 0.5, quadEaseOut);
	}

	ripen() {
		if (!this.ripe && this.occupant == null) {
			this.ripe = true;
			this.#animateFruit();
		}
	}

	eat() {
		if (this.ripe) {
			this.ripe = false;
			this.mucky = false;
			this.#animateMuck();
			this.#animateFruit();
			// Globals.muckChanged.dispatchEvent("muckChanged", {alga: this});
		}
	}

	#waitToSpreadMuck() {
		delay(
			() => {
				if (!this.mucky) return;
				if (Math.random() < 0.25) this.spreadMuck();
				this.#waitToSpreadMuck();
			},
			Math.random() * 3 + 1
		);
	}

	spreadMuck() {
		const cleanNeighbor = getRandomNeighbor(this, neighbor => !neighbor.mucky);
		if (cleanNeighbor != null) {
			cleanNeighbor.#receiveMuckFrom(getGlobalPosition(this.node));
		}
	}

	#receiveMuckFrom(origin) {
		this.mucky = true;
		setGlobalPosition(this.muck, origin);
		this.#animateMuck();
		this.#animateFruit();
		// Globals.muckChanged.dispatchEvent("muckChanged", {alga: this});
		this.#waitToSpreadMuck();
	}

	static getRandomNeighbor(alga, pred = null) {
		const candidates = pred == null ? alga.neighbors : alga.neighbors.filter(pred);
		if (candidates.length == 0) return null;
		return candidates[Math.floor(Math.random() * candidates.length)];
	}
};

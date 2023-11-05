import Globals from "./globals.js";
import SceneNode2D from "./scenenode2d.js";
import { vec2Zero, lerp, chain, hexColor } from "./mathutils.js";
import { tween, delay, quadEaseOut } from "./tween.js";

const { vec2, vec4 } = glMatrix;

const fruitColors = {
	ripe: hexColor("#f79965ff"),
	unripe: hexColor("#f4e9cbff"),
	muckyUnripe: hexColor("#ffffffff"),
};

const muckColors = {
	mucky: hexColor("#c0c0c0ff"),
	clean: hexColor("#c0c0c000"),
};

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
		this.node = new SceneNode2D({ name: this.name });

		this.restingPosition = vec2.clone(position);
		this.goalPosition = vec2.clone(position);
		this.node.transform.position = position;

		this.muck = new SceneNode2D({
			tags: ["muck"],
			art: `<circle r="59" fill="currentColor"></circle>`,
		});
		this.node.addChild(this.muck);

		this.fruit = new SceneNode2D({
			tags: ["fruit"],
			art: `<circle r="22.5" fill="currentColor"></circle>`,
		});
		this.node.addChild(this.fruit);
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
		this.muck.colorTransform.color = muckColors.clean;

		this.fruit.transform.position = vec2Zero;
		this.fruit.transform.scale = 0.4;

		this.fruit.colorTransform.color = fruitColors.unripe;
	}

	#animateMuck() {
		this.#muckTween?.stop();
		const oldPosition = this.muck.transform.position;
		const newPosition = vec2Zero;
		const oldScale = this.muck.transform.scale;
		const newScale = this.mucky ? 1 : 0;
		const oldColor = this.muck.colorTransform.color;
		const newColor = this.mucky ? muckColors.mucky : muckColors.clean;
		this.#muckTween = tween(
			(at) => {
				this.muck.visible = true;
				this.muck.transform.position = chain(vec4.create(), [
					vec2.lerp,
					oldPosition,
					newPosition,
					at,
				]);
				this.muck.transform.scale = lerp(oldScale, newScale, at);
				this.muck.colorTransform.color = chain(vec4.create(), [
					vec4.lerp,
					oldColor,
					newColor,
					at,
				]);
				if (at >= 1) this.muck.visible = this.mucky;
			},
			0.5,
			quadEaseOut
		);
	}

	#animateFruit() {
		this.#fruitTween?.stop();
		const oldScale = this.fruit.transform.scale;
		const newScale = this.ripe ? 1 : 0.4;
		const oldColor = this.fruit.colorTransform.color;
		let newColor;
		if (this.ripe) {
			newColor = fruitColors.ripe;
		} else if (this.mucky) {
			newColor = fruitColors.muckyUnripe;
		} else {
			newColor = fruitColors.unripe;
		}
		this.#fruitTween = tween(
			(at) => {
				this.fruit.transform.scale = lerp(oldScale, newScale, at);
				this.fruit.colorTransform.color = chain(vec4.create(), [
					vec4.lerp,
					oldColor,
					newColor,
					at,
				]);
			},
			0.5,
			quadEaseOut
		);
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
			const wasMucky = this.mucky;
			this.mucky = false;
			this.#animateMuck();
			this.#animateFruit();
			if (wasMucky) {
				Globals.muckChanged.dispatchEvent(
					new CustomEvent("muckChanged", { detail: this })
				);
			}
		}
	}

	#waitToSpreadMuck() {
		delay(() => {
			if (!this.mucky) return;
			if (Math.random() < 0.2) this.spreadMuck();
			this.#waitToSpreadMuck();
		}, Math.random() * 4 + 1);
	}

	spreadMuck() {
		const cleanNeighbor = Alga.getRandomNeighbor(
			this,
			(neighbor) => !neighbor.mucky
		);
		if (cleanNeighbor != null) {
			cleanNeighbor.#receiveMuckFrom(this.node.globalPosition);
		}
	}

	#receiveMuckFrom(origin) {
		this.mucky = true;
		this.muck.globalPosition = origin;
		this.#animateMuck();
		this.#animateFruit();
		Globals.muckChanged.dispatchEvent(
			new CustomEvent("muckChanged", { detail: this })
		);
		this.#waitToSpreadMuck();
	}

	moveToTop() {
		this.node.parent.addChild(this.node);
	}

	static getRandomNeighbor(alga, pred = null) {
		const candidates =
			pred == null ? alga.neighbors : alga.neighbors.filter(pred);
		if (candidates.length == 0) return null;
		return candidates[Math.floor(Math.random() * candidates.length)];
	}
}

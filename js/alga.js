import Globals from "./globals.js";
import SceneNode2D from "./scenenode2d.js";
import { vec2, vec4, lerp, retaining } from "./mathutils.js";
import { tween, delay, quadEaseOut } from "./tween.js";
import { sfx } from "./audio.js";

const fruitColors = {
	ripe: vec4.hexColor("#ffa770ff").retain(),
	unripe: vec4.hexColor("#f5ebd1ff").retain(),
	unripeOccupied: vec4.hexColor("#f5f5f5ff").retain(),
	muckyUnripe: vec4.hexColor("#a1a1a1ff").retain(),
	muckyRipe: vec4.hexColor("#bf7c54ff").retain(),
};

const muckColors = {
	mucky: vec4.hexColor("#c0c0c0ff").retain(),
	clean: vec4.hexColor("#c0c0c000").retain(),
};

export default class Alga {
	name;
	neighbors = [];
	ripe = false;
	mucky = false;
	#occupant = null;
	#restingPosition;
	#goalPosition;

	node;
	art;
	muck;

	#muckTween;
	#fruitTween;

	constructor(row, column, position) {
		this.name = `Alga${row}_${column}`;
		this.node = new SceneNode2D({ name: this.name });

		this.#restingPosition = position.clone().retain();
		this.#goalPosition = position.clone().retain();
		this.node.transform.position = position;

		this.muck = new SceneNode2D({
			tags: ["muck"],
			art: `<circle r="75" fill="currentColor"></circle>`,
			z: -3,
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

	get occupant() {
		return this.#occupant;
	}

	set occupant(forager) {
		if (this.#occupant === forager) {
			return;
		}
		this.#occupant = forager;
		this.#animateFruit();
	}

	get restingPosition() {
		return this.#restingPosition.clone();
	}

	get goalPosition() {
		return this.#goalPosition.clone();
	}

	set goalPosition(v) {
		this.#goalPosition.set(v);
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
		this.muck.z = -3;
		this.muck.transform.position = vec2.zero();
		this.muck.transform.scale = 0;
		this.muck.colorTransform.color = muckColors.clean;

		this.fruit.transform.position = vec2.zero();
		this.fruit.transform.scale = 0.4;

		this.fruit.colorTransform.color = fruitColors.unripe;
	}

	#animateMuck() {
		this.#muckTween?.stop();
		const oldPosition = this.muck.transform.position;
		const newPosition = vec2.zero();
		const oldScale = this.muck.transform.scale;
		const newScale = this.mucky ? 1 : 0.8;
		const oldColor = this.muck.colorTransform.color;
		const newColor = this.mucky ? muckColors.mucky : muckColors.clean;
		this.muck.z = -2;
		retaining([oldPosition, oldColor, newPosition], (resolve) => {
			this.#muckTween = tween(
				(at) => {
					this.muck.visible = true;
					this.muck.transform.position = oldPosition.lerp(newPosition, at);
					this.muck.transform.scale = lerp(oldScale, newScale, at);
					this.muck.colorTransform.color = oldColor.lerp(newColor, at);
					if (at >= 1) {
						this.muck.visible = this.mucky;
						this.muck.z = this.mucky ? -1 : -3;
						resolve();
					}
				},
				0.35,
				quadEaseOut,
			);
		});
	}

	#animateFruit() {
		this.#fruitTween?.stop();
		const oldScale = this.fruit.transform.scale;
		const newScale = this.ripe ? 1 : 0.4;
		const oldColor = this.fruit.colorTransform.color;
		let newColor;
		if (this.ripe) {
			newColor = this.mucky ? fruitColors.muckyRipe : fruitColors.ripe;
		} else if (this.occupied) {
			newColor = fruitColors.unripeOccupied;
		} else {
			newColor = this.mucky ? fruitColors.muckyUnripe : fruitColors.unripe;
		}
		retaining([oldColor], (resolve) => {
			this.#fruitTween = tween(
				(at) => {
					this.fruit.transform.scale = lerp(oldScale, newScale, at);
					this.fruit.colorTransform.color = oldColor.lerp(newColor, at);
					if (at >= 1) {
						resolve();
					}
				},
				0.5,
				quadEaseOut,
			);
		});
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
				sfx("clean_muck", this.node.globalPosition);
				Globals.muckChanged.dispatchEvent(
					new CustomEvent("muckChanged", { detail: this }),
				);
			}
		}
	}

	#waitToSpreadMuck(duration) {
		delay(() => {
			if (!this.mucky) {
				return;
			}
			const odds = Math.pow(Globals.numMuckyAlgae, -0.75);
			let spread = false;
			if (Math.random() < odds) {
				spread = this.spreadMuck();
			}
			this.#waitToSpreadMuck(Math.random() * 4 + (spread ? 2 : 1));
		}, duration);
	}

	spreadMuck(fromFrog = false) {
		const cleanNeighbor =
			Alga.getRandomNeighbor(
				this,
				(neighbor) =>
					(!neighbor.ripe || Globals.numMuckyAlgae > 5) &&
					!neighbor.mucky &&
					!neighbor.occupied,
			) ??
			Alga.getRandomNeighbor(
				this,
				(neighbor) => !neighbor.mucky && !neighbor.occupied,
			);
		if (cleanNeighbor != null) {
			cleanNeighbor.#receiveMuckFrom(this.node.globalPosition);
			sfx(fromFrog ? "squirt_muck" : "muck_spawn", this.node.globalPosition);
			return true;
		}
		return false;
	}

	#receiveMuckFrom(origin) {
		this.mucky = true;
		this.muck.globalPosition = origin;
		this.#animateMuck();
		this.#animateFruit();
		Globals.muckChanged.dispatchEvent(
			new CustomEvent("muckChanged", { detail: this }),
		);
		this.#waitToSpreadMuck(Math.random() * 2 + 2);
	}

	static getRandomNeighbor(alga, pred = null) {
		const candidates =
			pred == null ? alga.neighbors : alga.neighbors.filter(pred);
		if (candidates.length == 0) return null;
		return candidates[Math.floor(Math.random() * candidates.length)];
	}
}

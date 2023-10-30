import {createNode, vec2Zero} from "./utils.js";
import Globals from "./globals.js";
import Art from "./art.js";

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

	#fruitAnimation;
	#muckTween;
	#fruitTween;

	constructor(row, column, position) {
		this.name = `Alga${row}_${column}`;
		this.node = createNode({name: this.name});

		this.restingPosition = vec2.clone(position);
		this.goalPosition = vec2.clone(position);
		this.node.transform.position = position;

		this.muck = createNode({art: Art.muck, tags: ["muck"]});
		this.node.addChild(this.muck);

		this.fruit = createNode({art: Art.fruit, tags: ["fruit"]});
		this.node.addChild(this.fruit);
		/*
		this.#fruitAnimation = this.fruit.GetNode<AnimationTree>("AnimationTree");
		*/

		/*
		this.muck = this.fruit.GetNode<Node2D>("Muck");
		this.muck.Set("modulate", new Color(1, 1, 1, 0));
		this.muck.Set("scale", vec2Zero);
		*/
		this.muck.visible = false;
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
			/*
			this.#muckTween.Stop();
			*/
			this.#muckTween = null;
		}

		if (this.#fruitTween != null) {
			/*
			this.#fruitTween.Stop();
			*/
			this.#fruitTween = null;
		}

		this.muck.visible = false;
		this.muck.transform.position = vec2Zero;
		/*
		this.muck.Modulate = new Color("white");

		this.#fruitAnimation.Set("parameters/FruitBlend/blend_position", vec2Zero);
		*/
		this.fruit.transform.position = vec2Zero;
	}

	#animateMuck() {
		const isHere = this.mucky ? 1 : 0;
		this.muck.visible = true;
		/*
		this.#muckTween = this.muck.CreateTween().SetParallel(true)
			.SetTrans(Tween.TransitionType.Quad)
			.SetEase(Tween.EaseType.Out);
		const duration = 0.3;
		this.#muckTween.TweenProperty(this.muck, "position", vec2Zero, duration);
		this.#muckTween.TweenProperty(this.muck, "scale", vec2.fromValues(isHere, isHere), duration);
		this.#muckTween.TweenProperty(this.muck, "modulate", new Color(1, 1, 1, isHere), duration);
		this.#muckTween.TweenProperty(this.muck, "visible", this.mucky, duration);
		*/
	}

	#animateFruit() {
		/*
		fruitTween = this.fruit.CreateTween();
		fruitTween.TweenProperty(this.#fruitAnimation, "parameters/FruitBlend/blend_position",
			vec2.fromValues(
				this.mucky ? 1 : 0,
				this.ripe ? 1 : 0
			), 0.5
		)
		.SetTrans(Tween.TransitionType.Quad)
		.SetEase(Tween.EaseType.Out);
		*/
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
			Globals.muckChanged.dispatchEvent("muckChanged", {alga: this});
		}
	}

	#waitToSpreadMuck() {
		setTimeout(
			() => {
				if (!this.mucky) return;
				if (Math.random() < 0.25) this.spreadMuck();
				this.#waitToSpreadMuck();
			},
			1000 * (Math.random() * 3 + 1)
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
		Globals.muckChanged.dispatchEvent("muckChanged", {alga: this});
		this.#waitToSpreadMuck();
	}

	static getRandomNeighbor(alga, pred = null) {
		const candidates = pred == null ? alga.neighbors : alga.neighbors.filter(pred);
		if (candidates.length == 0) return null;
		return candidates[Math.floor(Math.random(candidates.length))];
	}
};

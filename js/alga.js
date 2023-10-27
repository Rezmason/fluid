import {createNode, vec2Zero} from "./utils.js";
import Globals from "./globals.js";
import Art from "./art.js";

const {vec2} = glMatrix;

export default class Alga {
	node;
	art;
	muck;

	neighbors = [];
	ripe = false;
	mucky = false;
	restingPosition;
	goalPosition;
	occupant = null;

	#fruitAnimation;
	#muckTween;
	#fruitTween;

	constructor(row, column, position) {
		this.node = createNode({name: `Alga${row}_${column}`});

		this.restingPosition = vec2.clone(position);
		this.goalPosition = vec2.clone(position);
		this.node.transform.position = position;

		this.art = createNode({art: Art.alga});
		this.node.addChild(this.art);
		/*
		this.#fruitAnimation = this.art.GetNode<AnimationTree>("AnimationTree");
		*/

		this.muck = createNode({art: Art.muck});
		this.art.addChild(this.muck, 0);
		/*
		this.muck = this.art.GetNode<Node2D>("Muck");
		this.muck.Set("modulate", new Color(1, 1, 1, 0));
		this.muck.Set("scale", vec2Zero);
		this.muck.Visible = false;
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

		/*
		this.muck.Visible = false;
		*/
		this.muck.transform.position = vec2Zero;
		/*
		this.muck.Modulate = new Color("white");

		this.#fruitAnimation.Set("parameters/FruitBlend/blend_position", vec2Zero);
		*/
		this.art.transform.position = vec2Zero;
	}

	#animateMuck() {
		const isHere = this.mucky ? 1 : 0;
		/*
		this.muck.Visible = true;
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
		fruitTween = this.art.CreateTween();
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

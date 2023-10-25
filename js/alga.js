import SceneNode from "./scenenode.js";
import Globals from "./globals.js";

const {vec2} = glMatrix;

export default class Alga {
	scene;
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

	/*
	static PackedScene algaArt = ResourceLoader.Load<PackedScene>("res://alga.tscn");
	*/

	constructor(row, column, position) {
		this.node = new SceneNode({name: `Alga${row}_{column`});

		this.restingPosition = vec2.clone(position);
		this.goalPosition = vec2.clone(position);
		/*
		this.node.Position = vec2.clone(position);
		*/

		this.art = new SceneNode({}); // algaArt.Instantiate();
		this.node.addChild(this.art);
		/*
		this.#fruitAnimation = this.art.GetNode<AnimationTree>("AnimationTree");
		*/

		this.muck = new SceneNode({});
		this.art.addChild(this.muck);
		/*
		this.muck = this.art.GetNode<Node2D>("Muck");
		this.muck.Set("modulate", new Color(1, 1, 1, 0));
		this.muck.Set("scale", vec2.fromValues(0, 0));
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
		this.muck.Position = vec2.fromValues(0, 0);
		this.muck.Modulate = new Color("white");

		this.#fruitAnimation.Set("parameters/FruitBlend/blend_position", vec2.fromValues(0, 0));
		this.art.Position = vec2.fromValues(0, 0);
		*/
	}

	#animateMuck() {
		/*
		this.muck.Visible = true;
		this.#muckTween = this.muck.CreateTween().SetParallel(true)
			.SetTrans(Tween.TransitionType.Quad)
			.SetEase(Tween.EaseType.Out);
		const duration = 0.3;
		const isHere = this.mucky ? 1 : 0;
		this.#muckTween.TweenProperty(this.muck, "position", vec2.fromValues(0, 0), duration);
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
			Math.random() * 3 + 1
		);
	}

	spreadMuck() {
		const cleanNeighbor = getRandomNeighbor(this, neighbor => !neighbor.mucky);
		if (cleanNeighbor != null) {
			/*
			cleanNeighbor.#receiveMuckFrom(this.node.GlobalPosition);
			*/
		}
	}

	#receiveMuckFrom(origin) {
		this.mucky = true;
		/*
		this.muck.GlobalPosition = origin;
		*/
		this.#animateMuck();
		this.#animateFruit();
		Globals.muckChanged.dispatchEvent("muckChanged", {alga: this});
		this.#waitToSpreadMuck();
	}

	static getRandomNeighbor(alga, pred = null) {
		const candidates = pred == null ? alga.neighbors : alga.neighbors.filter(pred);
		if (candidates.length == 0) return null;
		return candidates[Math.random(candidates.length)];
	}
};

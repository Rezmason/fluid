import {createNode, vec2Zero, vec2AngleTo, getGlobalPosition, setGlobalPosition, getGlobalRotation} from "./utils.js";
import Globals from "./globals.js";
import Alga from "./alga.js";

export default class Forager {
	node;
	art;
	alga;

	#jumpTween;

	/*
	static PackedScene foragerArt = ResourceLoader.Load<PackedScene>("res://forager.tscn");
	*/

	constructor(id) {
		this.node = createNode({name: `Forager${id}`});
		this.art = createNode({}); // foragerArt.Instantiate();
		this.node.addChild(this.art);
		/*
		clicker = new Clicker(this.art.GetNode<Area2D>("Area2D"), () => this.alga.SpreadMuck());
		*/
	}

	reset() {
		if (this.#jumpTween != null) {
			/*
			this.#jumpTween.Stop();
			*/
			this.#jumpTween = null;
		}
	}

	place(alga) {
		alga.occupant = this;
		this.alga = alga;
		this.alga.node.addChild(this.node);
		const otherAlga = Alga.getRandomNeighbor(this.alga);
		const angleToAlga = vec2AngleTo(
			getGlobalPosition(this.alga.node),
			getGlobalPosition(otherAlga.node)
		);
		this.#waitToJump();
	}

	#waitToJump() {
		setTimeout( () => this.#jump(), 1000 * Math.random()  * 1.5 + 0.5 );
	}

	#jump() {
		/*
		this.#jumpTween = this.node.CreateTween();
		*/
		const startAngle = getGlobalRotation(this.node);
		this.node.transform.rotation = startAngle;

		let nextAlga = Alga.getRandomNeighbor(this.alga, neighbor => !neighbor.occupied && neighbor.ripe && neighbor.mucky);

		if (nextAlga == null) {
			nextAlga = Alga.getRandomNeighbor(this.alga, neighbor => !neighbor.occupied && neighbor.ripe);
		}

		if (nextAlga != null) {
			const oldAlga = this.alga;
			this.alga = nextAlga;
			oldAlga.occupant = null;
			this.alga.occupant = this;

			const angleToAlga = vec2AngleTo(
				getGlobalPosition(this.alga.node),
				getGlobalPosition(oldAlga.node)
			);
			if (angleToAlga - startAngle >  Math.PI) angleToAlga -= Math.PI * 2;
			if (angleToAlga - startAngle < -Math.PI) angleToAlga += Math.PI * 2;

			const position = getGlobalPosition(this.node);
			oldAlga.node.removeChild(this.node);
			this.alga.node.addChild(this.node);
			setGlobalPosition(this.node, position);

			/*
			this.#jumpTween.SetParallel(true);

			this.#jumpTween.TweenProperty(this.node, "rotation", angleToAlga, 0.1)
				.SetTrans(Tween.TransitionType.Quad)
				.SetEase(Tween.EaseType.Out);
			this.#jumpTween.TweenProperty(this.node, "position", vec2Zero, 0.3)
				.SetTrans(Tween.TransitionType.Quad)
				.SetEase(Tween.EaseType.Out);
			this.#jumpTween.TweenCallback(Callable.From(() => {
				if (this.alga.ripe && this.alga.occupant == this) this.alga.Eat();
				WaitToJump();
			})).SetDelay(0.15);
			*/

		} else {
			const otherAlga = Alga.getRandomNeighbor(this.alga);
			const angleToAlga = vec2AngleTo(
				getGlobalPosition(this.alga.node),
				getGlobalPosition(otherAlga.node)
			);
			if (angleToAlga - startAngle >  Math.PI) angleToAlga -= Math.PI * 2;
			if (angleToAlga - startAngle < -Math.PI) angleToAlga += Math.PI * 2;
			/*
			this.#jumpTween.TweenProperty(this.node, "rotation", angleToAlga, 0.3)
				.SetTrans(Tween.TransitionType.Quad)
				.SetEase(Tween.EaseType.Out);
			this.#jumpTween.TweenCallback(Callable.From(() => {
				WaitToJump();
			})).SetDelay(0.3);
			*/
		}
	}
};

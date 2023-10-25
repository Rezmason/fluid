import SceneNode from "./scenenode.js";
import Globals from "./globals.js";
import Alga from "./alga.js";

export default class Forager {
	scene;
	art;
	alga;

	#jumpTween;

	/*
	static PackedScene foragerArt = ResourceLoader.Load<PackedScene>("res://forager.tscn");
	*/

	constructor(id) {
		this.node = new SceneNode({name: `Forager${id}`});
		this.art = new SceneNode({}); // foragerArt.Instantiate();
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
		/*
		this.node.LookAt(Alga.getRandomNeighbor(this.alga).node.GlobalPosition);
		*/
		this.#waitToJump();
	}

	#waitToJump() {
		setTimeout( () => this.#jump(), Math.random()  * 1.5 + 0.5 );
	}

	#jump() {
		/*
		this.#jumpTween = this.node.CreateTween();
		const startAngle = this.node.GlobalRotation;
		this.node.Rotation = startAngle;
		*/

		let nextAlga = Alga.getRandomNeighbor(this.alga, neighbor => !neighbor.occupied && neighbor.ripe && neighbor.mucky);

		if (nextAlga == null) {
			nextAlga = Alga.getRandomNeighbor(this.alga, neighbor => !neighbor.occupied && neighbor.ripe);
		}

		if (nextAlga != null) {
			const oldAlga = this.alga;
			this.alga = nextAlga;
			oldAlga.occupant = null;
			this.alga.occupant = this;

			/*
			const angleToAlga = oldAlga.node.GetAngleTo(this.alga.node.GlobalPosition);
			if (angleToAlga - startAngle >  Math.PI) angleToAlga -= Math.PI * 2;
			if (angleToAlga - startAngle < -Math.PI) angleToAlga += Math.PI * 2;
			*/

			/*
			const position = this.node.GlobalPosition;
			*/
			oldAlga.node.removeChild(this.node);
			this.alga.node.addChild(this.node);
			/*
			this.node.GlobalPosition = position;
			*/

			/*
			this.#jumpTween.SetParallel(true);

			this.#jumpTween.TweenProperty(this.node, "rotation", angleToAlga, 0.1)
				.SetTrans(Tween.TransitionType.Quad)
				.SetEase(Tween.EaseType.Out);
			this.#jumpTween.TweenProperty(this.node, "position", vec2.fromValues(0, 0), 0.3)
				.SetTrans(Tween.TransitionType.Quad)
				.SetEase(Tween.EaseType.Out);
			this.#jumpTween.TweenCallback(Callable.From(() => {
				if (this.alga.ripe && this.alga.occupant == this) this.alga.Eat();
				WaitToJump();
			})).SetDelay(0.15);
			*/

		} else {
			/*
			const someAlgaPosition = Alga.getRandomNeighbor(this.alga).node.GlobalPosition;
			const angleToRandomAlga = this.alga.node.GetAngleTo(someAlgaPosition);
			if (angleToRandomAlga - startAngle >  Math.PI) angleToRandomAlga -= Math.PI * 2;
			if (angleToRandomAlga - startAngle < -Math.PI) angleToRandomAlga += Math.PI * 2;
			this.#jumpTween.TweenProperty(this.node, "rotation", angleToRandomAlga, 0.3)
				.SetTrans(Tween.TransitionType.Quad)
				.SetEase(Tween.EaseType.Out);
			this.#jumpTween.TweenCallback(Callable.From(() => {
				WaitToJump();
			})).SetDelay(0.3);
			*/
		}
	}
};

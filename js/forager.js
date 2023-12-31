import { vec2Zero, vec2AngleTo } from "./mathutils.js";
import SceneNode2D from "./scenenode2d.js";
import Alga from "./alga.js";
import { tween, delay, quadEaseIn, quadEaseOut } from "./tween.js";
import { lerp, chain } from "./mathutils.js";
import { sfx } from "./audio.js";

const { vec2 } = glMatrix;

export default class Forager {
	name;
	node;
	art;
	alga;

	#jumpTween;
	#turnTween;
	#breatheTween;

	constructor(id) {
		this.name = `Forager${id}`;
		this.node = new SceneNode2D({
			name: this.name,
			click: () => {
				sfx("touch_frog");
				this.alga.spreadMuck(true); // TODO: only if sufficiently agitated?
			},
		});
		this.art = new SceneNode2D({
			art: `
				<g>
					<g fill="transparent">
						<rect y="-9" height="18" width="27"></rect>
						<circle r="15"><circle>
					</g>
					<path
						fill="#d4a672"
						d="
							M -38.1,+00.0
							C -38.1,+21.9 -32.7,+35.4 -25.0,+34.9
							C -15.7,+34.2 +08.7,+24.1 +26.8,+09.2
							C +28.2,+08.0 +22.3,+06.3 +17.3,+07.3
							C +10.3,+08.7 +07.5,+13.8 +00.5,+13.8
							C -07.0,+13.8 -13.2,+07.7 -13.2,+00.0

							C -13.2,-07.7 -07.0,-13.8 +00.5,-13.8
							C +07.5,-13.8 +10.3,-08.7 +17.3,-07.3
							C +22.3,-06.3 +28.2,-08.0 +26.8,-09.2
							C +08.7,-24.1 -15.7,-34.2 -25.0,-34.9
							C -32.7,-35.4 -38.1,-21.9 -38.1,+00.0

							Z
						"
					/>
				</g>
				`,
		});
		this.node.addChild(this.art);
	}

	reset() {
		this.#jumpTween?.stop();
		this.#jumpTween = null;
		this.#turnTween?.stop();
		this.#turnTween = null;

		this.#breatheTween?.stop();

		delay(() => this.#gasp(), Math.random() * 1.5 + 0.5);
	}

	#gasp() {
		this.#breatheTween?.stop();
		this.#breatheTween = tween(
			(at) => {
				this.art.transform.scale = lerp(0.9, 1, at);
				if (at >= 1) this.#inhale();
			},
			0.6,
			quadEaseIn
		);
	}

	#inhale() {
		this.#breatheTween?.stop();
		this.#breatheTween = tween(
			(at) => {
				this.art.transform.scale = lerp(1, 1.1, at);
				if (at >= 1) this.#exhale();
			},
			0.6,
			quadEaseOut
		);
	}

	#exhale() {
		this.#breatheTween?.stop();
		this.#breatheTween = tween(
			(at) => {
				this.art.transform.scale = lerp(1.1, 0.9, at);
				if (at >= 1) this.#gasp();
			},
			0.6,
			quadEaseOut
		);
	}

	place(alga) {
		alga.occupant = this;
		this.alga = alga;
		this.alga.node.addChild(this.node);
		this.alga.moveToTop();
		const otherAlga = Alga.getRandomNeighbor(this.alga);
		const angleToAlga = vec2AngleTo(
			this.alga.node.globalPosition,
			otherAlga.node.globalPosition
		);
		this.#waitToJump();
	}

	#waitToJump() {
		delay(() => this.#jump(), Math.random() * 1.5 + 0.5);
	}

	#jump() {
		const startAngle = this.node.globalRotation;
		this.node.transform.rotation = startAngle;

		let nextAlga = Alga.getRandomNeighbor(
			this.alga,
			(neighbor) => !neighbor.occupied && neighbor.ripe && neighbor.mucky
		);

		if (nextAlga == null) {
			nextAlga = Alga.getRandomNeighbor(
				this.alga,
				(neighbor) => !neighbor.occupied && neighbor.ripe
			);
		}

		if (nextAlga != null) {
			const oldAngle = this.node.transform.rotation;
			const oldAlga = this.alga;
			this.alga = nextAlga;
			oldAlga.occupant = null;
			this.alga.occupant = this;
			let angleToAlga = vec2AngleTo(
				oldAlga.node.globalPosition,
				this.alga.node.globalPosition
			);
			if (angleToAlga - startAngle > Math.PI) angleToAlga -= Math.PI * 2;
			if (angleToAlga - startAngle < -Math.PI) angleToAlga += Math.PI * 2;

			const globalPosition = this.node.globalPosition;
			oldAlga.node.removeChild(this.node);
			this.alga.node.addChild(this.node);
			this.alga.moveToTop();
			this.node.globalPosition = globalPosition;
			const oldPosition = this.node.transform.position;

			this.#turnTween?.stop();
			this.#turnTween = tween((at) => {
				this.node.transform.rotation = lerp(oldAngle, angleToAlga, at);
			}, 0.1);
			this.#jumpTween?.stop();
			this.#jumpTween = tween(
				(at) => {
					this.node.transform.position = chain(vec2.create(), [
						vec2.lerp,
						oldPosition,
						vec2Zero,
						at,
					]);
					if (at >= 1) {
						if (this.alga.ripe && this.alga.occupant === this) this.alga.eat();
						this.#waitToJump();
					}
				},
				0.3,
				quadEaseOut
			);
			sfx("frog_jump");
		} else {
			const oldAngle = this.node.transform.rotation;
			const otherAlga = Alga.getRandomNeighbor(this.alga);

			let angleToAlga = vec2AngleTo(
				this.alga.node.globalPosition,
				otherAlga.node.globalPosition
			);
			if (angleToAlga - startAngle > Math.PI) angleToAlga -= Math.PI * 2;
			if (angleToAlga - startAngle < -Math.PI) angleToAlga += Math.PI * 2;

			this.#turnTween?.stop();
			this.#turnTween = tween(
				(at) => {
					this.node.transform.rotation = lerp(oldAngle, angleToAlga, at);
					if (at >= 1) this.#waitToJump();
				},
				0.3,
				quadEaseOut
			);
		}
	}
}

import Globals from "./globals.js";
import SceneNode2D from "./scenenode2d.js";
import Alga from "./alga.js";
import { tween, delay, quadEaseIn, quadEaseOut } from "./tween.js";
import { vec2, lerp, retaining } from "./mathutils.js";
import { sfx } from "./audio.js";

export default class Forager {
	name;
	node;
	art;
	alga;

	#jumpTween;
	#turnTween;
	#breatheTween;
	#breatheSpeed = 0.6;
	#agitation = 0;
	#agitationCounter = 0;
	#relaxing = false;
	#waitingToJump = false;

	constructor(id) {
		this.name = `Forager${id}`;
		this.node = new SceneNode2D({
			name: this.name,
			z: 1,
			click: () => {
				this.#agitate();
			},
			art: `
				<g fill="transparent">
					<rect y="-9" height="18" width="27"></rect>
					<circle r="15"><circle>
				</g>
				<path
					fill="#d7aa73"
					d="
						M -38.1,+00.0
						C -38.1,+16.0 -32.0,+35.4 -25.0,+35.4
						C -11.0,+35.4 +26.1,+12.2 +27.1,+09.2
						C +28.2,+08.0 +22.3,+06.3 +17.3,+07.3
						C +10.3,+08.7 +07.5,+13.8 +00.5,+13.8
						C -07.0,+13.8 -13.2,+07.7 -13.2,+00.0

						C  -13.2,-07.7 -07.0,-13.8 +00.5,-13.8
						C  +07.5,-13.8 +10.3,-08.7 +17.3,-07.3
						C  +22.3,-06.3 +28.2,-08.0 +27.1,-09.2
						C  +26.1,-12.2 -11.0,-35.4 -25.0,-35.4
						C  -32.0,-35.4 -38.1,-16.0 -38.1,+00.0

						Z
					"
				/>
				`,
		});
	}

	reset() {
		this.#jumpTween?.stop();
		this.#jumpTween = null;
		this.#turnTween?.stop();
		this.#turnTween = null;

		this.#breatheTween?.stop();
		this.#breatheSpeed = 0.6;
		this.#agitation = 0;
		this.#agitationCounter = 0;
		this.#relaxing = false;

		delay(() => this.#gasp(), Math.random() * 1.5 + 0.5);
	}

	#gasp() {
		this.#breatheTween?.stop();
		this.#breatheTween = tween(
			(at) => {
				this.node.transform.scale = lerp(0.9, 1, at);
				if (at >= 1) {
					this.#inhale();
				}
			},
			this.#breatheSpeed,
			quadEaseIn,
		);
	}

	#inhale() {
		this.#breatheTween?.stop();
		this.#breatheTween = tween(
			(at) => {
				this.node.transform.scale = lerp(1, 1.1, at);
				if (at >= 1) {
					this.#exhale();
				}
			},
			this.#breatheSpeed,
			quadEaseOut,
		);
	}

	#exhale() {
		this.#breatheTween?.stop();
		this.#breatheTween = tween(
			(at) => {
				this.node.transform.scale = lerp(1.1, 0.9, at);
				if (at >= 1) {
					this.#gasp();
				}
			},
			this.#breatheSpeed,
			quadEaseOut,
		);
	}

	update(time, delta) {
		this.#updateAgitation(delta);
	}

	place(alga) {
		if (this.alga != null) {
			this.alga.occupant = null;
		}
		alga.occupant = this;
		this.alga = alga;
		this.alga.node.addChild(this.node);
		const otherAlga = Alga.getRandomNeighbor(this.alga);
		const angleToAlga = this.alga.node.globalPosition.angleTo(
			otherAlga.node.globalPosition,
		);
		this.#waitToJump();
	}

	#waitToJump() {
		if (this.#waitingToJump) {
			return;
		}
		this.#waitingToJump = true;
		delay(
			() => {
				this.#waitingToJump = false;
				this.#tryToJump();
			},
			Math.random() * 1.5 + 0.5,
		);
	}

	#tryToJump() {
		if (this.#agitation >= 0.98 || this.#relaxing) {
			this.#waitToJump();
			return;
		}

		const nextAlga =
			Alga.getRandomNeighbor(
				this.alga,
				(neighbor) => !neighbor.occupied && neighbor.ripe && neighbor.mucky,
			) ??
			Alga.getRandomNeighbor(
				this.alga,
				(neighbor) => !neighbor.occupied && neighbor.ripe,
			);

		if (nextAlga != null) {
			this.#jump(nextAlga);
			return;
		}

		this.#rotateIdle();
	}

	#jump(nextAlga) {
		const startAngle = this.node.globalRotation;
		this.node.transform.rotation = startAngle;

		const oldAngle = this.node.transform.rotation;
		const oldAlga = this.alga;
		this.alga = nextAlga;
		oldAlga.occupant = null;
		this.alga.occupant = this;
		let angleToAlga = oldAlga.node.globalPosition.angleTo(
			this.alga.node.globalPosition,
		);
		if (angleToAlga - startAngle > Math.PI) {
			angleToAlga -= Math.PI * 2;
		}
		if (angleToAlga - startAngle < -Math.PI) {
			angleToAlga += Math.PI * 2;
		}

		const globalPosition = this.node.globalPosition;
		oldAlga.node.removeChild(this.node);
		this.alga.node.addChild(this.node);
		this.node.globalPosition = globalPosition;
		const oldPosition = this.node.transform.position;

		this.#turnTween?.stop();
		this.#turnTween = tween((at) => {
			this.node.transform.rotation = lerp(oldAngle, angleToAlga, at);
		}, 0.1);
		this.#jumpTween?.stop();
		retaining([oldPosition], (resolve) => {
			this.#jumpTween = tween(
				(at) => {
					this.node.transform.position = oldPosition.lerp(vec2.zero(), at);
					if (at >= 1) {
						if (this.alga.ripe && this.alga.occupant === this) {
							this.alga.eat();
						}
						this.#jumpTween = null;
						this.#waitToJump();
						resolve();
					}
				},
				0.3,
				quadEaseOut,
			);
		});
		sfx("frog_jump", this.node.globalPosition);
	}

	#rotateIdle() {
		const startAngle = this.node.globalRotation;
		this.node.transform.rotation = startAngle;

		const oldAngle = this.node.transform.rotation;
		const otherAlga = Alga.getRandomNeighbor(this.alga);

		let angleToAlga = this.alga.node.globalPosition.angleTo(
			otherAlga.node.globalPosition,
		);
		if (angleToAlga - startAngle > Math.PI) {
			angleToAlga -= Math.PI * 2;
		}
		if (angleToAlga - startAngle < -Math.PI) {
			angleToAlga += Math.PI * 2;
		}

		this.#turnTween?.stop();
		this.#turnTween = tween(
			(at) => {
				this.node.transform.rotation = lerp(oldAngle, angleToAlga, at);
				if (at >= 1) {
					this.#waitToJump();
				}
			},
			0.3,
			quadEaseOut,
		);
	}

	#agitate() {
		this.#agitation = Math.max(this.#agitation, 0.8);
		this.#updateAgitation(1);
		this.#gasp();
	}

	#tryToCreateMuck() {
		if (this.#relaxing) {
			return;
		}

		sfx("touch_frog", this.node.globalPosition);
		this.#agitation = 1;
		this.#breatheSpeed = lerp(0.08, 0.6, 1 - this.#agitation);
		this.alga.spreadMuck(true); // TODO: only if sufficiently agitated?

		this.#relaxing = true;
		delay(() => {
			this.#relaxing = false;
		}, 1.1);
	}

	#updateAgitation(delta) {
		let agitationChange = -0.02;
		if (Globals.isMousePressed) {
			agitationChange = 0.1;
			const algaPosition = this.alga.node.globalPosition;
			const sqrDist = Globals.mousePosition.sqrDist(algaPosition);
			if (sqrDist > 0) {
				agitationChange = 1000 / sqrDist - 0.03;
				if (agitationChange > 0.3 && this.#agitation > 0.1) {
					this.#tryToCreateMuck();
				}
				agitationChange = Math.min(0.1, agitationChange);
				if (
					this.#jumpTween == null &&
					sqrDist > 400 &&
					this.#agitation > 0.03
				) {
					this.#turnTween?.stop();
					this.#turnTween = null;
					this.#waitToJump();
					const oldAngle = this.node.globalRotation;
					let newAngle = algaPosition.angleTo(Globals.mousePosition);
					if (newAngle - oldAngle > Math.PI) {
						newAngle -= Math.PI * 2;
					}
					if (newAngle - oldAngle < -Math.PI) {
						newAngle += Math.PI * 2;
					}
					this.node.globalRotation = lerp(oldAngle, newAngle, delta * 10);
				}
			}
		}

		this.#agitation = Math.min(
			1,
			Math.max(0, this.#agitation + agitationChange * delta),
		);
		this.#breatheSpeed = lerp(0.08, 0.8, Math.pow(1 - this.#agitation, 3));
	}
}

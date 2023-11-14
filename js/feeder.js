import Globals from "./globals.js";
import SceneNode2D from "./scenenode2d.js";
import { vec2, lerp } from "./mathutils.js";
import { sfx } from "./audio.js";

const bobDirection = vec2.fromAngle(Math.PI * 0.16);

const maxFeederSeeds = 40;
const maxFeederSize = 3;
const minSeedDist = 100;
const minDist = 80;
const margin = vec2.one.mul(125).sub(Globals.gameSize).div(-2);
const invMargin = margin.mul(-1);

class Feeder {
	name;
	age;
	numSeeds;
	throbStartTime;
	velocity = vec2.new();
	groupID;

	elements = [];
	parent;
	#children = [];

	node;
	art;

	constructor(id) {
		this.name = `Feeder${id}`;
		this.node = new SceneNode2D({ name: this.name });
		this.art = new SceneNode2D({
			// art: `<circle r="28.5" fill="#7a1700"></circle>`
		});
		this.node.addChild(this.art);
	}

	get size() {
		return this.elements.length;
	}

	reset() {
		for (const child of this.#children) {
			this.node.removeChild(child.node);
			child.parent = null;
		}
		this.#children.length = 0;
		this.elements.length = 0;
		this.elements.push(this);
		this.art.transform.position = vec2.zero;
		this.parent = null;
		this.velocity = vec2.zero;
		this.age = 0;
		this.numSeeds = 0;
		this.throbStartTime = 0;
		this.groupID = 0;
	}

	tryToSeed(alga) {
		if (this.size < maxFeederSize || this.numSeeds <= 0) return false;
		const minSeedDistSquared = minSeedDist * minSeedDist;
		if (
			this.node.globalPosition.sqrDist(alga.node.globalPosition) >
			minSeedDistSquared
		) {
			return false;
		}

		alga.ripen();
		this.numSeeds--;
		if (this.numSeeds <= 0) {
			this.#burst();
		}
		sfx("cleaner_color");
		return true;
	}

	#burst() {
		this.groupID = 0;
		const oldPosition = this.node.globalPosition;
		const artPositions = [];
		for (const feeder of this.elements) {
			artPositions.push(feeder.art.globalPosition);
		}

		const parentNode = this.node.parent;
		for (const child of this.#children) {
			this.node.removeChild(child.node);
			child.parent = null;
			parentNode.addChild(child.node);
		}
		this.#children.length = 0;

		for (let i = 0; i < maxFeederSize; i++) {
			const feeder = this.elements[i];
			feeder.age = 0;
			feeder.node.globalPosition = artPositions[i];
			feeder.velocity = artPositions[i].sub(oldPosition).mul(5);
			feeder.art.transform.position = vec2.zero;
		}

		this.elements.length = 0;
		this.elements.push(this);

		this.numSeeds = 0;

		sfx("split_cleaner");
	}

	tryToCombine(other) {
		if (this.size >= maxFeederSize) return false;

		const minDistSquared = minDist * minDist;
		const otherGlobalPosition = other.art.globalPosition;

		for (const feeder of this.elements) {
			if (
				feeder.art.globalPosition.sqrDist(otherGlobalPosition) > minDistSquared
			) {
				return false;
			}
		}

		this.#children.push(other);
		this.elements.push(other);
		other.parent = this;

		this.velocity = this.velocity
			.mul(this.size - 1)
			.add(other.velocity)
			.div(this.size);
		other.velocity = vec2.zero;
		other.age = 0;

		if (this.size == maxFeederSize) {
			this.numSeeds = maxFeederSeeds;
			this.throbStartTime = performance.now();
		}

		let averageGlobalPosition = vec2.zero;
		const artPositions = [];
		for (const feeder of this.elements) {
			const feederArtGlobalPosition = feeder.art.globalPosition;
			averageGlobalPosition = averageGlobalPosition.add(
				feederArtGlobalPosition
			);
			artPositions.push(feederArtGlobalPosition);
		}
		averageGlobalPosition = averageGlobalPosition.div(this.size);

		this.node.globalPosition = averageGlobalPosition;
		other.node.parent.removeChild(other.node);
		this.node.addChild(other.node);
		other.node.transform.position = vec2.zero;
		other.node.transform.rotation = 0;

		for (let i = 0; i < this.size; i++) {
			this.elements[i].art.globalPosition = artPositions[i];
		}

		sfx(this.size == maxFeederSize ? "merge_cleaner" : "merge_cleaner_parts");

		return true;
	}

	update(time, delta) {
		if (this.parent != null) return;

		this.age += delta;

		const oldPosition = this.node.transform.position;
		let position = oldPosition;

		let pushForce = vec2.zero;
		if (Globals.isMousePressed) {
			// TODO: we can probably eliminate a minus sign somewhere in here
			const localPushPosition = Globals.mousePosition.sub(
				this.node.transform.position
			);
			const force = 850 / localPushPosition.sqrLen();
			if (force > 0.05) {
				pushForce = localPushPosition.mul(-force);
			}
		}

		const mag = 10;
		this.velocity = this.velocity.add(pushForce.mul(mag * delta));
		const bobVelocity =
			Math.sin((position[0] + position[1]) * 0.006 + time * 0.001) * 3;
		// const bobVelocity = 0;
		const displacement = bobDirection
			.mul(bobVelocity)
			.add(this.velocity)
			.mul(mag * delta);
		position = position.add(displacement);
		// position = position.add(vec2FromAngle(Math.random() * Math.PI * 2, 0.1));

		this.velocity = this.velocity.lerp(vec2.zero, 0.01);

		// Avoid the edges
		{
			const goalPosition = position.clamp(invMargin, margin);
			position = position.lerp(goalPosition, 0.12);
		}

		this.node.transform.position = position;

		this.node.globalRotation +=
			((oldPosition[0] + oldPosition[1] - (position[0] + position[1])) /
				this.size) *
			0.005;

		if (this.size == 2) {
			for (const feeder of this.elements) {
				const art = feeder.art;
				let artPosition = art.transform.position;
				const sqrLen = artPosition.sqrLen();
				if (sqrLen > 0) {
					let goalPosition = artPosition;
					goalPosition = goalPosition.mul(minDist / 2 / goalPosition.len());
					artPosition = artPosition.lerp(goalPosition, 0.2);
					art.transform.position = artPosition;
				}
			}
		} else if (this.size == 3) {
			const averagePosition = this.elements[0].art.transform.position
				.add(this.elements[1].art.transform.position)
				.add(this.elements[2].art.transform.position)
				.div(3);
			for (const feeder of this.elements) {
				const art = feeder.art;
				let artPosition = art.transform.position;
				const sqrLen = artPosition.sqrLen();
				if (sqrLen > 0) {
					let goalPosition = artPosition.sub(averagePosition);
					goalPosition = goalPosition.mul(minDist / 2 / goalPosition.len());
					art.transform.position = artPosition.lerp(goalPosition, 0.2);
				}
			}
		}
	}
}

export { maxFeederSize, maxFeederSeeds, Feeder };

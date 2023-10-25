import SceneNode from "./scenenode.js";
import Globals from "./globals.js";

const {vec2} = glMatrix;

const bobDirection = vec2.create();
vec2.rotate(bobDirection, vec2.fromValues(0, 1), vec2.create(), Math.PI * 0.16);

const maxFeederSeeds = 40;
const maxFeederSize = 3;
const minSeedDist = 100;
const minDist = 80;
const margin = 50;

class Feeder {

	age;
	numSeeds;
	throbStartTime;
	velocity = vec2.create();

	elements = [];
	parent;
	#children = [];

	scene;
	art;

	/*
	static PackedScene feederArt = ResourceLoader.Load<PackedScene>("res://feeder.tscn");
	*/

	constructor(id) {
		this.node = new SceneNode({name: `Feeder${id}`});
		this.art = new SceneNode({}); // feederArt.Instantiate();
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
		/*
		art.Position = vec2.fromValues(0, 0);
		*/
		this.parent = null;
		this.velocity = vec2.fromValues(0, 0);
		this.age = 0;
		this.numSeeds = 0;
		this.throbStartTime = 0;
	}
	
	tryToSeed(alga) {
		if (this.size < maxFeederSize || this.numSeeds <= 0) return false;
		const minSeedDistSquared = minSeedDist * minSeedDist;
		/*
		if (scene.GlobalPosition.DistanceSquaredTo(alga.node.GlobalPosition) > minSeedDistSquared) {
			return false;
		}
		*/

		alga.ripen();
		this.numSeeds--;
		if (this.numSeeds <= 0) {
			this.#burst();
		}
		return true;
	}
	
	#burst() {
		/*
		const oldPosition = scene.GlobalPosition;
		*/
		const artPositions = [];
		for (const feeder of this.elements) {
			/*
			artPositions.push(feeder.art.GlobalPosition);
			*/
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
			/*
			feeder.node.GlobalPosition = artPositions[i];
			feeder.velocity = (artPositions[i] - oldPosition) * 6;
			feeder.art.Position = vec2.fromValues(0, 0);
			*/
		}
		
		this.elements.length = 0;
		this.elements.push(this);
		
		this.numSeeds = 0;
	}
	
	tryToCombine(other) {
		if (this.size >= maxFeederSize) return false;
		
		const minDistSquared = minDist * minDist;
		/*
		const otherGlobalPosition = other.art.GlobalPosition;
		*/

		for (const feeder of this.elements) {
			/*
			if (feeder.art.GlobalPosition.DistanceSquaredTo(otherGlobalPosition) > minDistSquared) {
				return false;
			}
			*/
		}

		this.#children.push(other);
		this.elements.push(other);
		other.parent = this;

		/*
		this.velocity = (this.velocity * (this.size - 1) + other.velocity) / this.size;
		*/
		other.velocity = vec2.fromValues(0, 0);
		other.age = 0;

		if (this.size == maxFeederSize) {
			this.numSeeds = maxFeederSeeds;
			this.throbStartTime = performance.now();
		}

		const averageGlobalPosition = vec2.fromValues(0, 0);
		const artPositions = [];
		for (const feeder of this.elements) {
			/*
			averageGlobalPosition += feeder.art.GlobalPosition;
			artPositions.push(feeder.art.GlobalPosition);
			*/
		}
		/*
		averageGlobalPosition /= this.size;
		*/

		/*
		scene.GlobalPosition = averageGlobalPosition;
		*/
		other.node.parent.removeChild(other.node);
		this.node.addChild(other.node);
		/*
		other.node.Position = vec2.fromValues(0, 0);
		other.node.Rotation = 0;
		*/

		for (let i = 0; i < this.size; i++) {
			/*
			this.elements[i].art.GlobalPosition = artPositions[i];
			*/
		}

		return true;
	}
	
	update(time, delta) {
		if (this.parent != null) return;
		
		this.age += delta;

		const oldPosition = scene.Position;
		
		let pushForce = vec2.fromValues(0, 0);
		if (Globals.isMousePressed) {
			const localPushPosition = vec2.create();
			/*
			vec2.sub(Globals.mousePosition, scene.Position);
			const force = 2000 / vec2.sqrLen(localPushPosition);
			if (force > 0.05) {
				pushForce = -localPushPosition * force;
			}
			*/
		}
		
		const mag = 10;
		this.velocity += pushForce * mag * delta;
		/*
		const bobVelocity = Math.sin((scene.Position.X + scene.Position.Y) * 0.006 + time * 0.001) * 3;
		scene.Position += (this.velocity + bobDirection * bobVelocity) * mag * delta;
		scene.Position += Vector2.FromAngle((Math.random() * Math.PI)) * 0.1f;
		this.velocity = this.velocity.Lerp(vec2.fromValues(0, 0), 0.01);
		*/
		
		// Avoid the edges
		{
			const currentRadius = 50;
			/*
			const currentMargin = (Globals.screenSize - Vector2.One * (margin + currentRadius)) / 2;
			const goalPosition = scene.Position.Clamp(-currentMargin, currentMargin);
			scene.Position = scene.Position.Lerp(goalPosition, 0.08);
			*/
		}

		/*
		scene.GlobalRotation += ((oldPosition.X + oldPosition.Y) - (scene.Position.X + scene.Position.Y)) / this.size * 0.005;
		*/
		
		if (this.size == 2) {
			for (const feeder of this.elements) {
				const art = feeder.art;
				/*
				const goalPosition = art.Position * (minDist / 2) / art.Position.Length();
				art.Position = art.Position.Lerp(goalPosition, 0.2);
				*/
			}
		} else if (this.size == maxFeederSize) {
			/*
			const averagePosition = (
				this.elements[0].art.Position +
				this.elements[1].art.Position +
				this.elements[2].art.Position
			) / maxFeederSize;
			*/
			for (const feeder of this.elements) {
				const art = feeder.art;
				/*
				const goalPosition = art.Position - averagePosition;
				goalPosition *= (minDist / 2) / goalPosition.Length();
				art.Position = art.Position.Lerp(goalPosition, 0.2);
				*/
			}
		}
	}
}

export {
	maxFeederSize,
	maxFeederSeeds,
	Feeder
};

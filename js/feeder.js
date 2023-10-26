import {createNode, vec2Zero, vec2Angle, lerp} from "./utils.js";
import Globals from "./globals.js";

const {vec2} = glMatrix;

const bobDirection = vec2Angle(Math.PI * 0.16);

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

	node;
	art;

	/*
	static PackedScene feederArt = ResourceLoader.Load<PackedScene>("res://feeder.tscn");
	*/

	constructor(id) {
		this.node = createNode({name: `Feeder${id}`});
		this.art = createNode(); // feederArt.Instantiate();
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
		this.art.transform.position = vec2Zero;
		this.parent = null;
		this.velocity = vec2Zero;
		this.age = 0;
		this.numSeeds = 0;
		this.throbStartTime = 0;
	}
	
	tryToSeed(alga) {
		if (this.size < maxFeederSize || this.numSeeds <= 0) return false;
		const minSeedDistSquared = minSeedDist * minSeedDist;
		/*
		if (this.node.GlobalPosition.DistanceSquaredTo(alga.node.GlobalPosition) > minSeedDistSquared) {
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
		const oldPosition = this.node.GlobalPosition;
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
			*/
			feeder.art.transform.position = vec2Zero;
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
		other.velocity = vec2Zero;
		other.age = 0;

		if (this.size == maxFeederSize) {
			this.numSeeds = maxFeederSeeds;
			this.throbStartTime = performance.now();
		}

		const averageGlobalPosition = vec2Zero;
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
		this.node.GlobalPosition = averageGlobalPosition;
		*/
		other.node.parent.removeChild(other.node);
		this.node.addChild(other.node);
		other.node.transform.position = vec2Zero;
		other.node.transform.rotation = 0;

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

		const oldPosition = this.node.transform.position;
		
		let pushForce = vec2Zero;
		if (Globals.isMousePressed) {
			const localPushPosition = vec2.create();
			// TODO: we can probably eliminate a minus sign somewhere in here
			vec2.sub(localPushPosition, Globals.mousePosition, this.node.transform.position);
			const force = 2000 / vec2.sqrLen(localPushPosition);
			if (force > 0.05) {
				vec2.scale(pushForce, localPushPosition, -force);
			}
		}
		
		const mag = 10;
		this.velocity += pushForce * mag * delta;
		const position = this.node.transform.position;
		const bobVelocity = Math.sin((position[0] + position[1]) * 0.006 + time * 0.001) * 3;
		vec2.add(position, position, (this.velocity + bobDirection * bobVelocity) * mag * delta);
		vec2.add(position, position, vec2Angle(Math.random() * Math.PI, 0.1));
		this.node.transform.position = position;
		this.velocity = lerp(this.velocity, vec2Zero, 0.01);
		
		// Avoid the edges
		{
			const currentRadius = 50;
			/*
			const currentMargin = (Globals.screenSize - Vector2.One * (margin + currentRadius)) / 2;
			const goalPosition = this.node.transform.position.Clamp(-currentMargin, currentMargin);
			this.node.transform.position = this.node.transform.position.Lerp(goalPosition, 0.08);
			*/
		}

		/*
		this.node.GlobalRotation += ((oldPosition.X + oldPosition.Y) - (this.node.transform.position.X + this.node.transform.position.Y)) / this.size * 0.005;
		*/
		
		if (this.size == 2) {
			for (const feeder of this.elements) {
				const art = feeder.art;
				/*
				const goalPosition = this.art.transform.position * (minDist / 2) / this.art.transform.position.Length();
				this.art.transform.position = this.art.transform.position.Lerp(goalPosition, 0.2);
				*/
			}
		} else if (this.size == maxFeederSize) {
			/*
			const averagePosition = (
				this.elements[0].art.transform.position +
				this.elements[1].art.transform.position +
				this.elements[2].art.transform.position
			) / maxFeederSize;
			*/
			for (const feeder of this.elements) {
				const art = feeder.art;
				/*
				const goalPosition = this.art.transform.position - averagePosition;
				goalPosition *= (minDist / 2) / goalPosition.Length();
				this.art.transform.position = this.art.transform.position.Lerp(goalPosition, 0.2);
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

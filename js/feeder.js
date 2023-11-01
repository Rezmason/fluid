import {createNode, vec2Zero, vec2One, vec2Clamp, vec2FromAngle, lerp, chain, getGlobalPosition, setGlobalPosition, getGlobalRotation, setGlobalRotation} from "./utils.js";
import Globals from "./globals.js";

const {vec2} = glMatrix;

const bobDirection = vec2FromAngle(Math.PI * 0.16);

const maxFeederSeeds = 40;
const maxFeederSize = 3;
const minSeedDist = 100;
const minDist = 80;
const margin = chain(vec2.clone(vec2One),
	[vec2.scale, null, 125],
	[vec2.sub, Globals.gameSize, null],
	[vec2.scale, null, 0.5]
);
const invMargin = chain(vec2.clone(margin),
	[vec2.scale, null, -1]
);

class Feeder {
	name;
	age;
	numSeeds;
	throbStartTime;
	velocity = vec2.create();
	groupID;

	elements = [];
	parent;
	#children = [];

	node;
	art;

	constructor(id) {
		this.name = `Feeder${id}`;
		this.node = createNode({name: this.name});
		this.art = createNode({
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
		this.art.transform.position = vec2Zero;
		this.parent = null;
		this.velocity = vec2.clone(vec2Zero);
		this.age = 0;
		this.numSeeds = 0;
		this.throbStartTime = 0;
		this.groupID = 0;
	}
	
	tryToSeed(alga) {
		if (this.size < maxFeederSize || this.numSeeds <= 0) return false;
		const minSeedDistSquared = minSeedDist * minSeedDist;
		if (vec2.sqrDist(
				getGlobalPosition(this.node),
				getGlobalPosition(alga.node)
			) > minSeedDistSquared) {
			return false;
		}

		alga.ripen();
		this.numSeeds--;
		if (this.numSeeds <= 0) {
			this.#burst();
		}
		return true;
	}
	
	#burst() {
		this.groupID = 0;
		const oldPosition = getGlobalPosition(this.node);
		const artPositions = [];
		for (const feeder of this.elements) {
			artPositions.push(getGlobalPosition(feeder.art));
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
			setGlobalPosition(feeder.node, artPositions[i]);
			chain(feeder.velocity,
				[vec2.sub, artPositions[i], oldPosition],
				[vec2.scale, null, 6]
			);
			feeder.art.transform.position = vec2Zero;
		}
		
		this.elements.length = 0;
		this.elements.push(this);
		
		this.numSeeds = 0;
	}
	
	tryToCombine(other) {
		if (this.size >= maxFeederSize) return false;
		
		const minDistSquared = minDist * minDist;
		const otherGlobalPosition = getGlobalPosition(other.art);

		for (const feeder of this.elements) {
			if (vec2.sqrDist(
				getGlobalPosition(feeder.art),
				otherGlobalPosition
				) > minDistSquared) {
				return false;
			}
		}

		this.#children.push(other);
		this.elements.push(other);
		other.parent = this;

		chain(this.velocity,
			[vec2.scale, null, this.size - 1],
			[vec2.add, null, other.velocity],
			[vec2.scale, null, 1 / this.size]
		);
		other.velocity = vec2.clone(vec2Zero);
		other.age = 0;

		if (this.size == maxFeederSize) {
			this.numSeeds = maxFeederSeeds;
			this.throbStartTime = performance.now();
		}

		const averageGlobalPosition = vec2.clone(vec2Zero);
		const artPositions = [];
		for (const feeder of this.elements) {
			const feederArtGlobalPosition = getGlobalPosition(feeder.art);
			vec2.add(averageGlobalPosition, averageGlobalPosition, feederArtGlobalPosition);
			artPositions.push(feederArtGlobalPosition);
		}
		vec2.scale(averageGlobalPosition, averageGlobalPosition, 1 / this.size);

		setGlobalPosition(this.node, averageGlobalPosition);
		other.node.parent.removeChild(other.node);
		this.node.addChild(other.node);
		other.node.transform.position = vec2Zero;
		other.node.transform.rotation = 0;

		for (let i = 0; i < this.size; i++) {
			setGlobalPosition(this.elements[i].art, artPositions[i]);
		}

		return true;
	}
	
	update(time, delta) {
		if (this.parent != null) return;
		
		this.age += delta;

		const oldPosition = this.node.transform.position;
		
		const pushForce = vec2.clone(vec2Zero);
		if (Globals.isMousePressed) {
			// TODO: we can probably eliminate a minus sign somewhere in here
			const localPushPosition = chain(
				vec2.create(),
				[vec2.sub, Globals.mousePosition, this.node.transform.position]
			);
			const force = 750 / vec2.sqrLen(localPushPosition);
			if (force > 0.05) {
				vec2.scale(pushForce, localPushPosition, -force);
			}
		}
		
		const mag = 10;
		vec2.add(this.velocity, this.velocity, chain(pushForce, [vec2.scale, null, mag * delta]));
		const position = this.node.transform.position;
		const bobVelocity = Math.sin((position[0] + position[1]) * 0.006 + time * 0.001) * 3;
		// const bobVelocity = 0;
		const displacement = chain(vec2.clone(bobDirection),
			[vec2.scale, null, bobVelocity],
			[vec2.add, null, this.velocity],
			[vec2.scale, null, mag * delta]
		);
		vec2.add(position, position, displacement);
		// vec2.add(position, position, vec2FromAngle(Math.random() * Math.PI * 2, 0.1));

		vec2.lerp(this.velocity, this.velocity, vec2Zero, 0.01);
		
		// Avoid the edges
		{
			const goalPosition = chain(vec2.clone(position),
			[vec2Clamp, null, invMargin, margin]
			);
			vec2.lerp(position, position, goalPosition, 0.16);
		}

		this.node.transform.position = position;

		setGlobalRotation(this.node,
			getGlobalRotation(this.node) +
			((oldPosition[0] + oldPosition[1]) - (position[0] + position[1])) / this.size * 0.005
		);
		
		if (this.size == 2) {
			for (const feeder of this.elements) {
				const art = feeder.art;
				const artPosition = art.transform.position;
				if (vec2.length(artPosition) > 0) {
					const goalPosition = chain(vec2.create(),
						[vec2.scale, artPosition, (minDist / 2) / vec2.length(artPosition)]
					);
					vec2.lerp(artPosition, artPosition, goalPosition, 0.2);
					art.transform.position = artPosition;
				}
			}
		} else if (this.size == 3) {
			const averagePosition = chain(this.elements[0].art.transform.position,
				[vec2.add, null, this.elements[1].art.transform.position],
				[vec2.add, null, this.elements[2].art.transform.position],
				[vec2.scale, null, 1 / 3]
			);
			for (const feeder of this.elements) {
				const art = feeder.art;
				const artPosition = art.transform.position;
				if (vec2.length(artPosition) > 0) {
					const goalPosition = chain(vec2.create(),
						[vec2.sub, artPosition, averagePosition]
					);
					vec2.scale(goalPosition, goalPosition, (minDist / 2) / vec2.length(goalPosition));
					art.transform.position = chain(artPosition,
						[vec2.lerp, null, goalPosition, 0.2]
					);
				}
			}
		}
	}
}

export {
	maxFeederSize,
	maxFeederSeeds,
	Feeder
};

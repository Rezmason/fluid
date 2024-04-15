import { vec2, vec4 } from "./mathutils.js";
import SceneNode2D from "./scenenode2d.js";
import Globals from "./globals.js";
import Metaballs from "./metaballs.js";

import { Feeder, maxFeederSize, maxFeederSeeds } from "./feeder.js";

import { lerp } from "./mathutils.js";

const feeders = [];

const feedersNode = new SceneNode2D({ name: "feeders" });

const game = Globals.game;

const feederMetaballs = new Metaballs(
	game.querySelector("#feeder-metaballs"),
	10,
	3,
	vec4.hexColor("#801700ff", 1),
	vec4.hexColor("#ff6800ff", 1),
);
const feederMetaballStates = Array(10)
	.fill()
	.map((_) => vec4.new().retain());
const feederMetaballGroupOpacities = Array(3).fill(1);
const feederOpacities = new Map();

const spawnFeeders = () => {
	const numFeeders = 7;
	for (let i = 0; i < numFeeders; i++) {
		feeders.push(new Feeder(i));
	}
	resetFeeders();
};

const resetFeeders = () => {
	for (const feeder of feeders) {
		feeder.reset();
		feedersNode.addChild(feeder.node);
		feeder.node.globalPosition = vec2
			.new(Math.random(), Math.random())
			.sub(0.5)
			.mul(Globals.gameSize);
	}
};

const updateFeederMetaballs = (time) => {
	let n = 0;
	let f = 1;

	feederMetaballGroupOpacities[0] = 1;
	for (const feeder of feeders) {
		if (feeder.parent != null) {
			continue;
		}
		let throb = 0;
		let throbTime = 0;
		if (feeder.size >= 3) {
			feeder.groupID = f;

			let opacity = feeder.numSeeds / maxFeederSeeds;
			// opacity = 1 - Math.pow(1 - opacity, 2);

			const lastOpacity = feederOpacities.get(feeder) ?? 1;
			opacity = lerp(lastOpacity, opacity, 0.05);
			feederOpacities.set(feeder, opacity);
			feederMetaballGroupOpacities[feeder.groupID] = opacity;

			f++;
			throb = 3 + 5 * (1 - feeder.numSeeds / maxFeederSeeds);
			throbTime = (time - feeder.throbStartTime) / 1000;
			throbTime += (Math.sin(throbTime * 6) + 1) / 2 + 0.8;
		} else {
			feederOpacities.set(feeder, 1);
		}
		let i = 0;
		for (const element of feeder.elements) {
			feederMetaballStates[n].set(
				...element.art.globalPosition,
				15 +
					throb * (Math.sin((i * Math.PI * 2) / 3 + throbTime * 4) * 0.5 + 0.5),
				feeder.groupID,
			);
			n++;
			i++;
		}
	}

	for (; f < 3; f++) {
		feederMetaballGroupOpacities[f] = 1;
	}
};

const testFeederMetaballs = (time) => {
	for (let i = 0; i < 10; i++) {
		const pairing = Math.floor(i / 2);
		let groupID = pairing % 3;
		feederMetaballStates[i].set(
			(pairing * 0.2 - 0.4) * Globals.gameSize[0],
			Math.sin(time * 0.003 + i) * 0.25 * Globals.gameSize[1],
			15 * (i * 0.3 + 1),
			groupID,
		);
	}

	for (let i = 0; i < 3; i++) {
		feederMetaballGroupOpacities[i] =
			Math.cos(time * 0.003 + (Math.PI * 2 * i) / 3) * 0.5 + 0.5;
	}
};

const updateFeeders = (time, delta) => {
	for (const feeder of feeders) {
		feeder.update(time, delta);
	}

	const minAge = 3;
	for (let i = 0; i < feeders.length; i++) {
		const feeder = feeders[i];
		if (feeder.parent != null) {
			continue;
		}

		const combineCandidates = [];
		for (let j = i + 1; j < feeders.length; j++) {
			const other = feeders[j];
			if (other.parent != null) {
				continue;
			}

			const tooEarly = Math.min(feeder.age, other.age) < minAge;
			const cannotCombine = feeder.size + other.size > maxFeederSize;

			if (tooEarly || cannotCombine) {
				feeder.repel(other, 200_000);
			} else {
				feeder.repel(other, -5_000);
				combineCandidates.push(other);
			}
		}

		for (const other of combineCandidates) {
			if (feeder.tryToCombine(other)) {
				break;
			}
		}
	}
};

export {
	feeders,
	feedersNode,
	feederMetaballs,
	feederMetaballStates,
	feederMetaballGroupOpacities,
	feederOpacities,
	maxFeederSize,
	spawnFeeders,
	resetFeeders,
	updateFeederMetaballs,
	testFeederMetaballs,
	updateFeeders,
};

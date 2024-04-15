import { vec2 } from "./mathutils.js";
import SceneNode2D from "./scenenode2d.js";
import Globals from "./globals.js";

import Alga from "./alga.js";

import { lerp } from "./mathutils.js";

const algae = [];
const algaeNode = new SceneNode2D({ name: "algae" });

const updateAlgaeGoalPositions = () => {
	for (const alga of algae) {
		if (alga.mucky || !Globals.isMousePressed) {
			alga.goalPosition = alga.restingPosition;
		} else {
			const localPushPosition = Globals.mousePosition.sub(alga.restingPosition);
			let offset = -localPushPosition.len() / 50;
			offset *= Math.pow(3, offset);
			alga.goalPosition = alga.restingPosition.add(
				localPushPosition.mul(offset),
			);
		}
	}
};

const spawnAlgae = () => {
	const grid = [];
	const numRows = 8,
		numColumns = 8;
	const spacing = Globals.gameSize.sub(100).div(vec2.new(numColumns, numRows));

	for (let i = 0; i < numRows; i++) {
		const rowOffset = vec2
			.new(1 - (numColumns - (i % 2) + 0.5), 1 - numRows)
			.div(2);
		const row = [];
		for (let j = 0; j < numColumns; j++) {
			const alga = new Alga(
				grid.length,
				row.length,
				vec2.new(j, i).add(rowOffset).mul(spacing),
			);
			row.push(alga);
			algae.push(alga);
			algaeNode.addChild(alga.node);
			alga.reset();
		}
		grid.push(row);
	}

	const connectNeighbors = (l1, l2) => {
		if (l1 == null || l2 == null) {
			return;
		}
		l1.neighbors.push(l2);
		l2.neighbors.push(l1);
	};

	for (let i = 0; i < numRows; i++) {
		for (let j = 0; j < numColumns; j++) {
			const alga = grid[i][j];
			if (alga == null) {
				continue;
			}
			if (j > 0) {
				connectNeighbors(alga, grid[i][j - 1]);
			}
			if (i > 0) {
				connectNeighbors(alga, grid[i - 1][j]);
				const j2 = j + (i % 2) * 2 - 1;
				if (j2 >= 0) {
					connectNeighbors(alga, grid[i - 1][j2]);
				}
			}
		}
	}
};

const resetAlgae = () => {
	for (const alga of algae) {
		alga.reset();
	}
};

const updateAlgae = (seedingFeeders) => {
	for (const alga of algae) {
		alga.node.transform.position = alga.node.transform.position.lerp(
			alga.goalPosition,
			0.1,
		);

		if (alga.ripe || alga.occupant != null) {
			continue;
		}

		for (const feeder of seedingFeeders) {
			if (feeder.tryToSeed(alga)) {
				break;
			}
		}
	}
};

export {
	algae,
	algaeNode,
	updateAlgaeGoalPositions,
	spawnAlgae,
	resetAlgae,
	updateAlgae,
};

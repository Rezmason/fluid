import { vec2, vec4 } from "./mathutils.js";
import render2D from "./render2d.js";
import SceneNode2D from "./scenenode2d.js";
import Globals from "./globals.js";
import Metaballs from "./metaballs.js";

import Alga from "./alga.js";
import { Feeder, maxFeederSize, maxFeederSeeds } from "./feeder.js";
import Forager from "./forager.js";

import { lerp } from "./mathutils.js";
import { delay } from "./tween.js";
import { sfx } from "./audio.js";

let numMuckyAlgae = 0;
let gameCanEnd = false;
let resetting = false;

const algae = [];
const foragers = [];
const feeders = [];
const rootNode = new SceneNode2D({ name: "root" });
const algaeNode = new SceneNode2D({ name: "algae" });
const feedersNode = new SceneNode2D({ name: "feeders" });

let lastMouseMove = null;
let beginMouseDragTime = 0;
let lastDragSoundPosition = vec2.new();

rootNode.addChild(algaeNode);
rootNode.addChild(feedersNode);

const game = Globals.game;
const scene = game.querySelector("#scene");

const updateAlgaeGoalPositions = () => {
	for (const alga of algae) {
		if (alga.mucky || !Globals.isMousePressed) {
			alga.goalPosition = alga.restingPosition;
		} else {
			const localPushPosition = Globals.mousePosition.sub(alga.restingPosition);
			let offset = -localPushPosition.len() / 50;
			offset *= Math.pow(3, offset);
			alga.goalPosition = alga.restingPosition.add(
				localPushPosition.mul(offset)
			);
		}
	}
};

game.addEventListener("mousedown", ({ button }) => {
	if (button === 0) {
		beginDrag();
	}
});
game.addEventListener("mouseup", ({ button }) => {
	if (button === 0) {
		endDrag();
	}
});
game.addEventListener("mouseleave", () => {
	if (Globals.isMousePressed) {
		endDrag();
	}
});

const beginDrag = () => {
	Globals.isMousePressed = true;
	updateAlgaeGoalPositions();
	beginMouseDragTime = performance.now();
	sfx("mouse_down");
	lastDragSoundPosition = Globals.mousePosition.clone();
};

const endDrag = () => {
	Globals.isMousePressed = false;
	updateAlgaeGoalPositions();
	sfx(performance.now() - beginMouseDragTime < 200 ? "mouse_tap" : "mouse_up");
};

game.addEventListener("mousemove", (event) => {
	lastMouseMove = event;
});

const updateMouse = () => {
	if (lastMouseMove == null) return;
	const { x, y } = lastMouseMove;
	lastMouseMove = null;
	Globals.mousePosition = transformMousePosition(x, y);

	if (
		Globals.isMousePressed &&
		Globals.mousePosition.sqrDist(lastDragSoundPosition) > 768
	) {
		lastDragSoundPosition = Globals.mousePosition.clone();
		sfx("mouse_drag");
	}
	updateAlgaeGoalPositions();
};

const transformMousePosition = (x, y) =>
	vec2.new(x, y).sub(gamePosition).div(gameSize).sub(0.5).mul(Globals.gameSize);

let gamePosition = vec2.new();
let gameSize = vec2.new();

const resize = () => {
	const rect = game.getBoundingClientRect();
	gamePosition = vec2.new(rect.x, rect.y);
	gameSize = vec2.new(rect.width, rect.height);
};
window.addEventListener("resize", resize);
resize();

const spawnAlgae = () => {
	const grid = [];
	const numRows = 9,
		numColumns = 10;
	const spacing = vec2.new(110, 90);
	for (let i = 0; i < numRows; i++) {
		const rowOffset = vec2.new(1 - (numColumns - (i % 2)), 1 - numRows).div(2);
		const row = [];
		for (let j = 0; j < numColumns; j++) {
			if (i % 2 == 1 && j == numColumns - 1) {
				row.push(null);
				continue;
			}
			const alga = new Alga(
				grid.length,
				row.length,
				vec2.new(j, i).add(rowOffset).mul(spacing)
			);
			row.push(alga);
			algae.push(alga);
			algaeNode.addChild(alga.node);
			alga.reset();
		}
		grid.push(row);
	}

	const connectNeighbors = (l1, l2) => {
		if (l1 == null || l2 == null) return;
		l1.neighbors.push(l2);
		l2.neighbors.push(l1);
	};

	for (let i = 0; i < numRows; i++) {
		for (let j = 0; j < numColumns; j++) {
			const alga = grid[i][j];
			if (alga == null) continue;
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

const spawnForagers = () => {
	const numForagers = 2;
	for (let i = 0; i < numForagers; i++) {
		foragers.push(new Forager(i));
	}
	resetForagers();
};

const spawnFeeders = () => {
	const numFeeders = 7;
	for (let i = 0; i < numFeeders; i++) {
		feeders.push(new Feeder(i));
	}
	resetFeeders();
};

const resetForagers = () => {
	for (const forager of foragers) {
		let alga = algae[Math.floor(Math.random() * algae.length)];
		while (alga.occupant != null) {
			alga = algae[Math.floor(Math.random() * algae.length)];
		}
		forager.reset();
		forager.place(alga);
	}
};

const resetFeeders = () => {
	for (const feeder of feeders) {
		feeder.reset();
		feedersNode.addChild(feeder.node);
		feeder.node.globalPosition = vec2
			.new(Math.random(), Math.random())
			.sub(0.5)
			.mul(Globals.gameSize);
		feeder.velocity = vec2.new(Math.random(), Math.random()).sub(0.5).mul(200);
	}
};

const detectEndgame = (alga) => {
	if (resetting) return;

	if (alga.mucky) {
		numMuckyAlgae++;
	} else {
		numMuckyAlgae--;
	}

	if (gameCanEnd) {
		if (numMuckyAlgae === 0) {
			reset();
			sfx("win");
		} else if (numMuckyAlgae / algae.length > 0.6) {
			reset();
			sfx("lose");
		}
	} else if (!resetting && numMuckyAlgae >= 3) {
		gameCanEnd = true;
	}
};

const reset = () => {
	resetting = true;
	gameCanEnd = false;
	Metaballs.fadeOut();
	delay(() => {
		for (const alga of algae) {
			alga.reset();
		}
		resetForagers();
		resetFeeders();
		numMuckyAlgae = 0;
		resetting = false;
		Metaballs.fadeIn();
	}, 5);
};

const metaballStates = Array(10)
	.fill()
	.map((_) => vec4.new());
const groupOpacities = Array(3).fill(1);

const getUniqueGroupID = () => {
	for (let i = 1; i < 10; i++) {
		if (!feeders.some((feeder) => feeder.groupID === i)) {
			return i;
		}
	}
	return 0;
};

const updateMetaballs = (time) => {
	let n = 0;
	let f = 1;

	groupOpacities[0] = 1;
	for (const feeder of feeders) {
		if (feeder.parent != null) continue;
		let throb = 0;
		let throbTime = 0;
		if (feeder.size >= 3) {
			if (feeder.groupID === 0) {
				feeder.groupID = getUniqueGroupID();
			}
			let opacity = feeder.numSeeds / maxFeederSeeds;
			// opacity = 1 - Math.pow(1 - opacity, 2);
			opacity = lerp(groupOpacities[feeder.groupID], opacity, 0.1);
			groupOpacities[feeder.groupID] = opacity;
			f++;
			throb = 7;
			throbTime = (time - feeder.throbStartTime) / 1000;
		}
		let i = 0;
		for (const element of feeder.elements) {
			const position = element.art.globalPosition;
			metaballStates[n] = vec4.new(
				position[0],
				position[1],
				15 +
					throb * (Math.sin((i * Math.PI * 2) / 3 + throbTime * 4) * 0.5 + 0.5),
				feeder.groupID
			);
			n++;
			i++;
		}
	}

	for (; f < 3; f++) {
		groupOpacities[f] = 1;
	}
};

const testMetaballs = (time) => {
	for (let i = 0; i < 10; i++) {
		const pairing = Math.floor(i / 2);
		let groupID = pairing % 3;
		metaballStates[i] = vec4.new(
			(pairing * 0.2 - 0.4) * Globals.gameSize[0],
			Math.sin(time * 0.003 + i) * 0.25 * Globals.gameSize[1],
			15,
			groupID
		);
	}

	for (let i = 0; i < 3; i++) {
		groupOpacities[i] =
			Math.cos(time * 0.003 + (Math.PI * 2 * i) / 3) * 0.5 + 0.5;
	}
};

const startTime = performance.now();
let lastTime = startTime;
const update = (now) => {
	const time = now - startTime;
	const delta = (time - lastTime) / 1000;
	lastTime = time;

	updateMouse();

	for (const feeder of feeders) {
		feeder.update(time, delta);
	}

	const seedingFeeders = [];
	const minAge = 3;
	for (let i = 0; i < feeders.length; i++) {
		var feeder = feeders[i];
		if (feeder.parent != null || feeder.age < minAge) continue;
		if (feeder.size >= maxFeederSize) {
			seedingFeeders.push(feeder);
		} else {
			for (let j = i + 1; j < feeders.length; j++) {
				var other = feeders[j];
				if (
					other.parent != null ||
					other.age < minAge ||
					feeder.size + other.size > maxFeederSize
				)
					continue;
				if (feeder.size >= other.size) {
					if (feeder.tryToCombine(other)) break;
				} else {
					if (other.tryToCombine(feeder)) break;
				}
			}
		}
	}

	render2D(rootNode, scene);
	updateMetaballs(time);
	// testMetaballs(time);

	for (const alga of algae) {
		alga.node.transform.position = alga.node.transform.position.lerp(
			alga.goalPosition,
			0.1
		);

		if (alga.ripe || alga.occupant != null) continue;

		for (const feeder of seedingFeeders) {
			if (feeder.size == maxFeederSize && feeder.tryToSeed(alga)) break;
		}
	}
	Metaballs.update(metaballStates, groupOpacities);
	Metaballs.redraw();
	requestAnimationFrame(update);
};

Globals.muckChanged.addEventListener("muckChanged", ({ detail }) =>
	detectEndgame(detail)
);

spawnAlgae();
spawnForagers();
spawnFeeders();

update(startTime);
Metaballs.fadeIn();

const urlParams = new URLSearchParams(window.location.search);
const demo = urlParams.get("demo");
switch (demo) {
	case "piano":
		import("./piano.js");
		break;
}

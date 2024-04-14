import { vec2, vec4, collect } from "./mathutils.js";
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

let gameCanEnd = false;
let resetting = false;

const algae = [];
const foragers = [];
const feeders = [];
const rootNode = new SceneNode2D({ name: "root" });
const algaeNode = new SceneNode2D({ name: "algae" });
const feedersNode = new SceneNode2D({ name: "feeders" });

const urlParams = new URLSearchParams(window.location.search);

let idleTime = parseInt(urlParams.get("idleTime"));
if (isNaN(idleTime)) {
	idleTime = 0;
}

let lastMouseMove = null;
let lastInteractionTime = 0;
let beginMouseDragTime = 0;
let lastDragSoundPosition = vec2.new().retain();

rootNode.addChild(algaeNode);
rootNode.addChild(feedersNode);

const game = Globals.game;
const scene = game.querySelector("#scene");

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
	const now = performance.now();
	beginMouseDragTime = now;
	lastInteractionTime = now;
	sfx("mouse_down", Globals.mousePosition);
	lastDragSoundPosition.set(Globals.mousePosition);
};

const endDrag = () => {
	Globals.isMousePressed = false;
	const now = performance.now();
	lastInteractionTime = now;
	updateAlgaeGoalPositions();
	sfx(
		now - beginMouseDragTime < 200 ? "mouse_tap" : "mouse_up",
		Globals.mousePosition,
	);
};

game.addEventListener("mousemove", (event) => {
	lastMouseMove = event;
});

const updateMouse = () => {
	if (lastMouseMove == null) {
		return;
	}
	const { x, y } = lastMouseMove;
	lastMouseMove = null;
	Globals.mousePosition = transformMousePosition(x, y);

	if (
		Globals.isMousePressed &&
		Globals.mousePosition.sqrDist(lastDragSoundPosition) > 768
	) {
		lastDragSoundPosition.set(Globals.mousePosition);
		sfx("mouse_drag", Globals.mousePosition);
	}
	updateAlgaeGoalPositions();
};

const transformMousePosition = (x, y) =>
	vec2.new(x, y).sub(gamePosition).div(gameSize).sub(0.5).mul(Globals.gameSize);

let gamePosition = vec2.new().retain();
let gameSize = vec2.new().retain();

const resize = () => {
	const rect = game.getBoundingClientRect();
	gamePosition.set(rect.x, rect.y);
	gameSize.set(rect.width, rect.height);
};
window.addEventListener("resize", resize);
resize();

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
	}
};

const resetAlgae = () => {
	for (const alga of algae) {
		alga.reset();
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

const updateForagers = (time, delta) => {
	for (const forager of foragers) {
		forager.update(time, delta);
	}
};

const updateAlgae = () => {
	const seedingFeeders = feeders.filter(
		(feeder) => feeder.size >= maxFeederSize,
	);

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

const detectEndgame = (alga) => {
	if (resetting) {
		return;
	}

	if (alga.mucky) {
		Globals.numMuckyAlgae++;
	} else {
		Globals.numMuckyAlgae--;
	}

	if (gameCanEnd) {
		if (Globals.numMuckyAlgae === 0) {
			reset();
			sfx("win", alga.node.globalPosition);
		} else if (Globals.numMuckyAlgae / algae.length > 0.6) {
			reset();
			sfx("lose", alga.node.globalPosition);
		}
	} else if (!resetting && Globals.numMuckyAlgae >= 3) {
		gameCanEnd = true;
	}
};

const reset = () => {
	const duration = 2;
	resetting = true;
	gameCanEnd = false;
	feederMetaballs.fadeOut(duration);
	delay(() => {
		resetForagers();
		resetFeeders();
		Globals.numMuckyAlgae = 0;
		resetting = false;
		feederMetaballs.fadeIn(duration);
		lastInteractionTime = performance.now();
	}, duration);
};

const startTime = performance.now();
let lastTime = startTime;
const animate = (now) => {
	const time = now - startTime;
	const delta = Math.max(0, Math.min(50, time - lastTime)) / 1000;
	lastTime = time;

	updateMouse();
	updateFeeders(time, delta);
	updateForagers(time, delta);
	updateAlgae();

	render2D(rootNode, scene);
	updateFeederMetaballs(time);
	// testFeederMetaballs(time);
	feederMetaballs.update(feederMetaballStates, feederMetaballGroupOpacities);
	feederMetaballs.redraw();

	collect();

	if (
		idleTime > 0 &&
		!resetting &&
		!Globals.isMousePressed &&
		(now - lastInteractionTime) / 1000 > idleTime
	) {
		gameCanEnd = true;
		reset();
	}

	requestAnimationFrame(animate);
};

Globals.muckChanged.addEventListener("muckChanged", ({ detail }) =>
	detectEndgame(detail),
);

spawnAlgae();
spawnForagers();
spawnFeeders();

beginMouseDragTime = startTime;
animate(startTime);
feederMetaballs.fadeIn(5);

const demo = urlParams.get("demo");
switch (demo) {
	case "piano":
		import("./piano.js");
		break;
}

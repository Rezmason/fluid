import {createNode, renderNode, chain, getGlobalPosition, setGlobalPosition, setGlobalRotation} from "./utils.js";
import Globals from "./globals.js";
import Metaballs from "./metaballs.js";

import Alga from "./alga.js";
import {Feeder, maxFeederSize, maxFeederSeeds} from "./feeder.js";
import Forager from "./forager.js";

import {lerp} from "./utils.js";

const {vec2, vec4} = glMatrix;

let numMuckyAlgae = 0;
let gameCanEnd = false;
let resetting = false;

const algae = [];
const foragers = [];
const feeders = [];
const rootNode = createNode({name: "root"});

rootNode.transform.position = chain(vec2.clone(Globals.gameSize), [vec2.scale, null, 0.5]);

const game = Globals.game;
const fade = game.querySelector("fade");
const scene = game.querySelector("#scene");

const updateAlgaeGoalPositions = () => {
	for (const alga of algae) {
		if (alga.mucky || !Globals.isMousePressed) {
			vec2.copy(alga.goalPosition, alga.restingPosition);
		} else {
			const localPushPosition = chain(
				vec2.create(),
				[vec2.sub, Globals.mousePosition, alga.restingPosition]
			);
			let offset = -vec2.length(localPushPosition) / 50;
			offset *= Math.pow(3, offset);
			vec2.add(alga.goalPosition, alga.restingPosition, chain(localPushPosition, [vec2.scale, null, offset]));
		}
	}
};

game.addEventListener("mousedown", ({button}) => {
	if (button === 0) {
		Globals.isMousePressed = true;
		updateAlgaeGoalPositions();
	}
});
game.addEventListener("mouseup", ({button}) => {
	if (button === 0) {
		Globals.isMousePressed = false;
		updateAlgaeGoalPositions();
	}
});
game.addEventListener("mouseleave", () => Globals.isMousePressed = false);

let lastMouseMove = null;
game.addEventListener("mousemove", (event) => {
	lastMouseMove = event;
});

const updateMouse = () => {

	if (lastMouseMove == null) return;
	const {x, y} = lastMouseMove;
	lastMouseMove = null;

	chain(Globals.mousePosition,
		[vec2.set, x, y],
		[vec2.sub, null, gamePosition],
		[vec2.div, null, gameSize],
		[vec2.sub, null, vec2.fromValues(0.5, 0.5)],
		[vec2.mul, null, Globals.gameSize],
	);

	updateAlgaeGoalPositions();
}

const gamePosition = vec2.create();
const gameSize = vec2.create();

const resize = () => {
	const rect = game.getBoundingClientRect();
	vec2.set(gamePosition, rect.x, rect.y);
	vec2.set(gameSize, rect.width, rect.height);
};
window.addEventListener("resize", resize);
resize();

const testSceneNodes = [];
const testTrace = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
testTrace.setAttribute("fill", "none");
testTrace.setAttribute("stroke", "red");
testTrace.setAttribute("stroke-width", 3);
testTrace.setAttribute("id", "TestTrace");
const spawnTestScene = () => {
	let node = rootNode;
	for (let i = 0; i < 4; i++) {
		const child = createNode({name:`Test${i}`});
		child.transform.position = vec2.fromValues(100, 0);
		node.addChild(child);
		testSceneNodes.push(child);
		node = child;
	}

	renderNode(rootNode, scene);
	rootNode.domElement.appendChild(testTrace);
};

const updateTestScene = (time, delta) => {
	let s = "";
	for (let i = 0; i < 4; i++) {
		const node = testSceneNodes[i];
		node.transform.position = vec2.fromValues(Math.sin(time / 500) * 20 + 80, 0);
		node.transform.rotation += 0.2 * delta;

		const globalPosition = getGlobalPosition(node);
		s += globalPosition[0].toFixed(3) + "," + globalPosition[1].toFixed(3) + " ";
	}
	testTrace.setAttribute("points", s);
	// setGlobalPosition(testSceneNodes[3], vec2.fromValues(100, 100));
	// setGlobalRotation(testSceneNodes[3], 0);
}

const spawnAlgae = () => {
	const grid = [];
	const numRows = 9, numColumns = 10;
	const spacing = vec2.fromValues(110, 90);
	for (let i = 0; i < numRows; i++) {
		const rowOffset = chain(
			vec2.fromValues(1 - (numColumns - i % 2), 1 - numRows),
			[vec2.scale, null, 0.5]
		);
		const row = [];
		for (let j = 0; j < numColumns; j++) {
			if (i % 2 == 1 && j == numColumns - 1) {
				row.push(null);
				continue;
			}
			const alga = new Alga(
				grid.length,
				row.length,
				chain(vec2.fromValues(j, i),
					[vec2.add, null, rowOffset],
					[vec2.mul, null, spacing]
				)
			);
			row.push(alga);
			algae.push(alga);
			rootNode.addChild(alga.node);
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
}

const spawnForagers = () => {
	const numForagers = 2;
	for (let i = 0; i < numForagers; i++) {
		foragers.push(new Forager(i));
	}
	resetForagers();
}

const spawnFeeders = () => {
	const numFeeders = 7;
	for (let i = 0; i < numFeeders; i++) {
		feeders.push(new Feeder(i));
	}
	resetFeeders();
}

const resetForagers = () => {
	for (const forager of foragers) {
		let alga = algae[Math.floor(Math.random() * algae.length)];
		while (alga.occupant != null) {
			alga = algae[Math.floor(Math.random() * algae.length)];
		}
		forager.reset();
		forager.place(alga);
	}
}

const resetFeeders = () => {
	for (const feeder of feeders) {
		feeder.reset();
		rootNode.addChild(feeder.node);
		setGlobalPosition(feeder.node, chain(vec2.fromValues(
			Math.random(),
			Math.random()
		), [vec2.mul, null, Globals.gameSize]));
		chain(feeder.velocity,
			[vec2.set, Math.random() - 0.5, Math.random() - 0.5],
			[vec2.scale, null, 200]
		);
	}
}

const detectEndgame = (alga) => {
	if (resetting) return;

	if (alga.mucky) {
		numMuckyAlgae++;
	} else {
		numMuckyAlgae--;
	}

	if (gameCanEnd) {
		if (numMuckyAlgae == 0) {
			reset();
		} else if (numMuckyAlgae / algae.length > 0.6) {
			reset();
		}
	} else if (!resetting && numMuckyAlgae >= 3) {
		gameCanEnd = true;
	}
}

const reset = () => {
	resetting = true;
	gameCanEnd = false;
	fade.classList.toggle("hidden", true);
	setTimeout(() => {
		for (const alga of algae) {
			alga.reset();
		}
		resetForagers();
		resetFeeders();
		numMuckyAlgae = 0;
		resetting = false;

		fade.classList.toggle("hidden", false);
	}, 1000 * 5);
}

const metaballs = Array(10).fill().map(_ => vec4.create());
const groupOpacities = Array(3).fill(1);

const updateMetaballs = (time) => {

	let n = 0;
	let f = 1;

	groupOpacities[0] = 1;
	for (const feeder of feeders) {
		if (feeder.parent != null) continue;
		let groupID = 0;
		let throb = 0;
		let throbTime = 0;
		if (feeder.numSeeds > 0) {
			groupID = f;
			let opacity = feeder.numSeeds / maxFeederSeeds;
			// opacity = 1 - Math.pow(1 - opacity, 2);
			opacity = lerp(groupOpacities[groupID], opacity, 0.1);
			groupOpacities[groupID] = opacity;
			f++;
			throb = 7;
			throbTime = (time - feeder.throbStartTime) / 1000;
		}
		let i = 0;
		for (const element of feeder.elements) {
			const metaball = metaballs[n];
			const position = getGlobalPosition(element.art);
			vec4.set(metaball,
				position[0],
				position[1],
				15 + throb * (Math.sin((i * Math.PI * 2 / 3) + throbTime * 4) * 0.5 + 0.5),
				groupID
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
		const metaball = metaballs[i];
		const pairing = Math.floor(i / 2);
		let groupID = pairing % 3;
		vec4.set(metaball,
			(pairing * 0.2 + 0.1) * Globals.gameSize[0],
			(Math.sin(time * 0.003 + i) * 0.25 + 0.5) * Globals.gameSize[1],
			15,
			groupID
		);
	}

	for (let i = 0; i < 3; i++) {
		groupOpacities[i] = Math.cos(time * 0.003 + Math.PI * 2 * i / 3) * 0.5 + 0.5;
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
				if (other.parent != null || other.age < minAge || feeder.size + other.size > maxFeederSize) continue;
				if (feeder.size >= other.size) {
					if (feeder.tryToCombine(other)) break;
				} else {
					if (other.tryToCombine(feeder)) break;
				}
			}
		}
	}

	updateTestScene(time, delta);

	renderNode(rootNode, scene);

	updateMetaballs(time);
	// testMetaballs(time);

	for (const alga of algae) {
		alga.node.transform.position = chain(alga.node.transform.position,
			[vec2.lerp, null, alga.goalPosition, 0.1]
		);

		if (alga.ripe || alga.occupant != null) continue;

		for (const feeder of seedingFeeders) {
			if (feeder.size == maxFeederSize && feeder.tryToSeed(alga)) break;
		}
	}
	Metaballs.update(metaballs, groupOpacities);
	Metaballs.redraw();
	requestAnimationFrame(update);
};

/*
Globals.MuckChanged += DetectEndgame;
*/

// spawnAlgae();
// spawnForagers();
// spawnFeeders();
spawnTestScene();

update(startTime);
fade.classList.toggle("hidden", true);

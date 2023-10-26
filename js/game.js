import {createNode} from "./utils.js";
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
const rootNode = createNode();

const game = Globals.game;
const fade = game.querySelector("fade");

game.addEventListener("mousedown", ({button}) => {
	if (button === 0) Globals.isMousePressed = true;
});
game.addEventListener("mouseup", ({button}) => {
	if (button === 0) Globals.isMousePressed = false;
});
game.addEventListener("mouseleave", () => Globals.isMousePressed = false);
game.addEventListener("mousemove", ({x, y}) => {
	vec2.set(Globals.mousePosition, x, y);

	for (const alga of algae) {
		if (alga.mucky || !Globals.isMousePressed) {
			vec2.clone(alga.goalPosition, alga.restingPosition);
		} else {
			const localPushPosition = vec2.create();
			vec2.sub(localPushPosition, Globals.mousePosition, alga.restingPosition);
			let offset = -vec2.length(localPushPosition) / 50;
			offset *= Math.pow(3, offset);
			/*
			alga.goalPosition = alga.restingPosition + localPushPosition * offset;
			*/
		}
	}
});

const spawnAlgae = () => {
	const grid = [];
	const numRows = 9, numColumns = 10;
	const spacing = vec2.fromValues(110, 90);
	for (let i = 0; i < numRows; i++) {
		const rowOffset = vec2.fromValues(1 - (numColumns - i % 2), 1 - numRows) / 2;
		const row = [];
		for (let j = 0; j < numColumns; j++) {
			if (i % 2 == 1 && j == numColumns - 1) {
				row.push(null);
				continue;
			}
			const alga = new Alga(grid.length, row.length, (vec2.fromValues(j, i) + rowOffset) * spacing);
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
		const alga = algae[Math.floor(Math.random() * algae.length)];
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
		/*
		feeder.node.GlobalPosition = vec2.fromValues(
			Math.random() - 0.5,
			Math.random() - 0.5
		) * Globals.screenSize;
		feeder.velocity = vec2.fromValues(
			Math.random() - 0.5,
			Math.random() - 0.5
		) * 200;
		*/
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

	const completeReset = () => {
		for (const alga of algae) {
			alga.reset();
		}
		resetForagers();
		resetFeeders();
		numMuckyAlgae = 0;
		resetting = false;
	};
	/*
	fade.Visible = true;
	const tween = fade.CreateTween()
		.SetTrans(Tween.TransitionType.Quad);
	tween.TweenProperty(fade, "modulate", new Color(1, 1, 1, 1), 5)
		.SetEase(Tween.EaseType.In);
	tween.TweenCallback(Callable.From(completeReset));
	tween.TweenProperty(fade, "modulate", new Color(1, 1, 1, 0), 5)
		.SetEase(Tween.EaseType.Out);
	tween.TweenProperty(fade, "visible", false, 0);
	*/
}

const metaballs = Array(10).fill().map(_ => Array(4).fill().map(_ => vec4.create()));
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
			// opacity = 1 - Mathf.Pow(1 - opacity, 2);
			opacity = lerp(groupOpacities[groupID], opacity, 0.1);
			groupOpacities[groupID] = opacity;
			f++;
			throb = 7;
			throbTime = (time - feeder.throbStartTime) / 1000;
		}
		let i = 0;
		for (const element of feeder.elements) {
			/*
			const position = element.art.GlobalPosition;
			metaballData[n] = new Color(
				position.X,
				position.Y,
				15 + throb * (Mathf.Sin((i * Math.PI * 2 / 3) + throbTime * 4) * 0.5 + 0.5),
				groupID
			);
			*/
			n++;
			i++;
		}
	}

	for (; f < 3; f++) {
		groupOpacities[f] = 1;
	}

	/*
	for (let i = 0; i < 10; i++) {
		const metaball = metaballs[i];
		const pairing = Math.floor(i / 2);
		let groupID = pairing % 3;
		vec4.set(metaball,
			(pairing * 0.2 + 0.1) * Globals.screenSize[0],
			(Math.sin(time * 0.003 + i) * 0.25 + 0.5) * Globals.screenSize[1],
			15,
			groupID
		);
	}

	for (let i = 0; i < 3; i++) {
		groupOpacities[i] = Math.cos(time * 0.003 + Math.PI * 2 * i / 3) * 0.5 + 0.5;
	}
	*/
};

const startTime = performance.now();
let lastTime = startTime;
const update = (now) => {
	const time = now - startTime;
	const delta = time - lastTime;
	lastTime = time;

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

	updateMetaballs(time);

	for (const alga of algae) {
		/*
		alga.node.Position = alga.node.Position.Lerp(alga.goalPosition, 0.1);
		*/

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

spawnAlgae();
spawnForagers();
spawnFeeders();

update(startTime);
fade.classList.toggle("hidden", true);

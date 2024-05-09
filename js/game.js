import { vec2, collect } from "./mathutils.js";
import render2D from "./render2d.js";
import SceneNode2D from "./scenenode2d.js";
import Globals from "./globals.js";

import {
	algae,
	algaeNode,
	updateAlgaeGoalPositions,
	spawnAlgae,
	resetAlgae,
	updateAlgae,
} from "./game-algae.js";

import {
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
} from "./game-feeders.js";

import {
	foragers,
	spawnForagers,
	resetForagers,
	updateForagers,
} from "./game-foragers.js";

import { delay } from "./tween.js";
import { sfx } from "./audio.js";

let gameCanEnd = false;
let resetting = false;

const rootNode = new SceneNode2D({ name: "root" });

const urlParams = new URLSearchParams(window.location.search);

let idleTime = parseInt(urlParams.get("idleTime"));
if (isNaN(idleTime)) {
	idleTime = 0;
}

let lastMouseMove = null;
let lastTouch = null;
let lastInteractionTime = 0;
let beginMouseDragTime = 0;
let lastDragSoundPosition = vec2.new().retain();

rootNode.addChild(algaeNode);
rootNode.addChild(feedersNode);

const game = Globals.game;
const scene = game.querySelector("#scene");

{
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
	game.addEventListener("mousemove", (event) => {
		lastMouseMove = event;
	});
}

{
	let touchID = null;
	game.addEventListener("touchstart", ({ changedTouches }) => {
		if (touchID == null) {
			touchID = changedTouches[0].identifier;
			beginDrag();
		}
	});
	game.addEventListener("touchend", ({ changedTouches }) => {
		const touch = Array.from(changedTouches).find(
			(touch) => touch.identifier === touchID,
		);
		if (touch != null) {
			touchID = null;
			endDrag();
		}
	});
	game.addEventListener("touchmove", ({ changedTouches }) => {
		const touch = Array.from(changedTouches).find(
			(touch) => touch.identifier === touchID,
		);
		if (touch != null) {
			lastTouch = touch;
		}
	});
}

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

const updateMouse = () => {
	let x, y;
	if (lastMouseMove != null) {
		[x, y] = [lastMouseMove.x, lastMouseMove.y];
		lastMouseMove = null;
	} else if (lastTouch != null) {
		[x, y] = [lastTouch.clientX, lastTouch.clientY];
		// console.log(Math.max(lastTouch.radiusX, lastTouch.radiusY));
		lastTouch = null;
	} else {
		return;
	}
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
		Globals.isMousePressed = false;
		updateAlgaeGoalPositions();
		resetAlgae();
		resetForagers(algae);
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

	const seedingFeeders = feeders.filter(
		(feeder) => feeder.size >= maxFeederSize,
	);
	updateAlgae(seedingFeeders);

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
spawnForagers(algae);
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

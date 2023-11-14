import { vec2 } from "./mathutils.js";

export default {
	game: document.querySelector("game"),
	gameSize: vec2.new(1024, 768),
	isMousePressed: false,
	mousePosition: vec2.new(0, 0),
	muckChanged: new EventTarget(),
};

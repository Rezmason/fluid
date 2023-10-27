const {vec2} = glMatrix;

export default {
	game: document.querySelector("game"),
	gameSize: vec2.fromValues(1024, 768),
	isMousePressed: false,
	mousePosition: [0, 0],
	muckChanged: new EventTarget()
};

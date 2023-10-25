export default {
	game: document.querySelector("game"),
	screenSize: [1024, 768],
	isMousePressed: false,
	mousePosition: [0, 0],
	muckChanged: new EventTarget()
};

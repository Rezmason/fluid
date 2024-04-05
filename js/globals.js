import { vec2 } from "./mathutils.js";

class Globals {
	game = document.querySelector("game");
	isMousePressed = false;
	muckChanged = new EventTarget();
	numMuckyAlgae = 0;

	#gameSize = vec2.new(1024, 768).retain();
	#mousePosition = vec2.new(0, 0).retain();

	get gameSize() {
		return this.#gameSize.clone();
	}

	set gameSize(v) {
		this.#gameSize.set(v);
	}

	get mousePosition() {
		return this.#mousePosition.clone();
	}

	set mousePosition(v) {
		this.#mousePosition.set(v);
	}
}

export default new Globals();

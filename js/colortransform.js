import { vec4 } from "./mathutils.js";

export default class ColorTransform {
	#color = vec4.new(0, 0, 0, 1);
	stale = true;
	cssColor = "black";

	constructor() {}

	get color() {
		return this.#color.clone();
	}

	set color(v) {
		this.#color = v;
		this.stale = true;
	}

	render() {
		const c = this.#color;
		this.stale = false;
		this.cssColor = `rgb(${c[0]}% ${c[1]}% ${c[2]}% / ${c[3]}%)`;
	}
}

import { vec4 } from "./mathutils.js";

export default class ColorTransform {
	#color = vec4.new(0, 0, 0, 1).retain();
	cssColor = null;

	constructor() {}

	get color() {
		return this.#color.clone();
	}

	set color(v) {
		this.#color.set(v);
		this.cssColor = null;
	}

	render() {
		const c = this.#color;
		this.cssColor = `rgb(${c[0]}% ${c[1]}% ${c[2]}% / ${c[3]}%)`;
	}
}

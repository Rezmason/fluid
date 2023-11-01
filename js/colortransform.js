const {vec4} = glMatrix;

export default class ColorTransform {
	#color = vec4.fromValues(0, 0, 0, 1);
	stale = true;
	cssColor = "black";

	constructor() {

	}

	get color() {
		return vec4.clone(this.#color);
	}

	set color(v) {
		vec4.copy(this.#color, v);
		this.stale = true;
	}

	render() {
		const c = this.#color;
		this.stale = false;
		this.cssColor = `rgb(${c[0]}% ${c[1]}% ${c[2]}% / ${c[3]}%)`;
	}
}

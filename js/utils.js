import SceneNode from "./scenenode.js";
import Transform from "./transform.js";
import Globals from "./globals.js";

const {vec2} = glMatrix;

const createNode = (properties = null) =>
	new SceneNode({ transform: new Transform(), ...properties });

const lerp = (p, q, percent) => (1 - percent) * p + percent * q;

const vec2Zero = vec2.create();

const vec2Angle = (angle, magnitude = 1) => {
	const v = vec2.fromValues(0, magnitude);
	return vec2.rotate(v, v, vec2Zero, angle);
};

export {
	lerp,
	createNode,
	vec2Zero,
	vec2Angle
};

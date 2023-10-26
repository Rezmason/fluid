import SceneNode from "./scenenode.js";
import Transform from "./transform.js";
import Globals from "./globals.js";

const createNode = (properties = null) =>
	new SceneNode({ transform: new Transform(), ...properties });

const lerp = (p, q, percent) => (1 - percent) * p + percent * q;

export {
	lerp,
	createNode
};

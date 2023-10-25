export default class SceneNode {
	children = [];
	parent = null;

	constructor(properties) {
		Object.assign(this, properties);
	}

	addChild(child, index = -1) {
		child.parent?.removeChild(child);
		this.children.splice(index, 0, child);
		child.parent = this;
		return this;
	}

	removeChild(child) {
		const index = this.children.indexOf(child);
		if (index != -1) this.removeChildAt(index);
		return this;
	}

	removeChildAt(index) {
		this.children[index].parent = null;
		this.children.splice(index, 1);
		return this;
	}

	removeChildren() {
		this.child.forEach(child => (child.parent = null));
		this.children.length = 0;
		return this;
	}
};

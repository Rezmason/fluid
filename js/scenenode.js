export default class SceneNode {
	children = [];
	reorderedChildren = new Set();
	parent = null;

	constructor(properties) {
		Object.assign(this, properties);
	}

	addChild(child, index = null) {
		const oldParent = child.parent;
		oldParent?.removeChild(child);

		if (oldParent === this) {
			this.reorderedChildren.add(child);
		}

		if (index == null) {
			this.children.push(child);
		} else {
			this.children.splice(index, 0, child);
			this.reorderedChildren.add(child);
		}

		child.parent = this;
		return this;
	}

	removeChild(child) {
		const index = this.children.indexOf(child);
		if (index != -1) this.removeChildAt(index);
		return this;
	}

	removeChildAt(index) {
		this.reorderedChildren.delete(this.children[index]);
		this.children[index].parent = null;
		this.children.splice(index, 1);
		return this;
	}

	removeChildren() {
		this.child.forEach(child => (child.parent = null));
		this.children.length = 0;
		this.reorderedChildren.clear();
		return this;
	}
};

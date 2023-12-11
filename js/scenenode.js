export default class SceneNode {
	children = [];
	reorderedChildren = new Set();
	parent = null;
	#adding = false;

	constructor(properties) {
		Object.assign(this, properties);
	}

	addChild(child, index = null) {
		child.#adding = true;

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

		child.#adding = false;
		child.parent = this;
		child.#handleReparent();
		return this;
	}

	removeChild(child) {
		const index = this.children.indexOf(child);
		if (index != -1) this.removeChildAt(index);
		return this;
	}

	removeChildAt(index) {
		const child = this.children[index];
		this.reorderedChildren.delete(child);
		child.parent = null;
		this.children.splice(index, 1);
		if (!child.#adding) {
			child.#handleReparent();
		}
		return this;
	}

	removeChildren() {
		for (const child of this.children) {
			child.parent = null;
			if (!child.#adding) {
				child.#handleReparent();
			}
		}
		this.children.length = 0;
		this.reorderedChildren.clear();
		return this;
	}

	#handleReparent() {}
}

export default class SceneNode {
	children = new Set();
	parent = null;
	#adding = false;

	constructor(properties) {
		Object.assign(this, properties);
	}

	addChild(child) {
		if (child.contains(this)) {
			throw new Error("The new child node contains the parent.");
		}

		if (child.parent === this) {
			return this;
		}

		child.#adding = true;
		child.parent?.removeChild(child);
		const added = this.children.add(child);

		child.#adding = false;
		if (added) {
			child.parent = this;
			child.handleReparent();
		}
		return this;
	}

	removeChild(child) {
		if (this.children.delete(child)) {
			child.parent = null;
			child.handleReparent();
		}
		return this;
	}

	removeChildren() {
		for (const child of this.children) {
			child.parent = null;
			if (!child.#adding) {
				child.handleReparent();
			}
		}
		this.children.clear();
		return this;
	}

	contains(other) {
		for (let node = other; node != null; node = node.parent) {
			if (node === this) {
				return true;
			}
		}
		return false;
	}

	handleReparent() {}
}

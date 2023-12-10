const render2D = (node, scene) => {
	const domElement =
		node.domElement ??
		document.createElementNS("http://www.w3.org/2000/svg", "g");
	if (node.domElement == null) {
		node.domElement = domElement;
		domElement.setAttribute("id", node.name);
		domElement.setAttribute("class", (node.tags ?? []).join(" "));
		node.domElement.innerHTML = node.art ?? "";

		if (node.click != null) {
			node.domElement.addEventListener("click", node.click);
		}
	}

	if (node.parent == null) {
		if (domElement.parentNode !== scene) scene.append(domElement);
	} else {
		const domParent = node.parent.domElement;
		if (domElement.parentNode !== domParent) {
			domParent.append(domElement);
		}
	}

	const style = domElement.style;
	const visibility = style.getPropertyValue("visibility");
	const isVisible = visibility === "visible";
	if (visibility === "" || node.visible !== isVisible) {
		style.setProperty("visibility", node.visible ? "visible" : "hidden");
	}

	if (node.transform.cssTransform == null) {
		node.transform.render();
		style.transform = node.transform.cssTransform;
	}

	if (node.colorTransform.cssColor == null) {
		node.colorTransform.render();
		style.color = node.colorTransform.cssColor;
	}

	for (const child of node.children) {
		render2D(child, scene);
	}

	if (node.reorderedChildren.size > 0) {
		const reorderedChildrenIndices = Array.from(
			node.reorderedChildren.values(),
		).map((child) => [child, node.children.indexOf(child)]);
		reorderedChildrenIndices.sort(
			([p, pIndex], [q, qIndex]) => pIndex - qIndex,
		);
		for (const [child] of reorderedChildrenIndices) {
			domElement.removeChild(child.domElement);
		}
		for (const [child, index] of reorderedChildrenIndices) {
			const item = domElement.children[index];
			if (item == null) domElement.append(child.domElement);
			else domElement.insertBefore(child.domElement, item);
		}
		node.reorderedChildren.clear();
	}
};

export default render2D;

let i = 1;

const createNodeID = (node) => {
	let id = node.name;
	if (id == null) {
		id = "instance" + i;
		i++;
		if (node.parent?.name != null) {
			id = node.parent.name + "::" + id;
		}
	}
	return id;
};

const createDomElement = (node) => {
	const domElement = document.createElementNS(
		"http://www.w3.org/2000/svg",
		"g",
	);

	node.domElement = domElement;
	domElement.setAttribute("id", createNodeID(node));
	domElement.setAttribute("class", node.tags?.join(" ") ?? "");
	domElement.innerHTML = node.art;
	domElement.style.visibility = "hidden";
	domElement.style.willChange = "visibility, transform, color";

	node.domElement.addEventListener("click", (event) => {
		for (let target = node; target != null; target = target.parent) {
			const shouldContinue = target.click?.(event) ?? true;
			if (!shouldContinue) {
				return;
			}
		}
	});
};

const insert = (scene, domElement, z) => {
	for (const sibling of scene.childNodes) {
		if (sibling.z == null || sibling.z > z) {
			scene.insertBefore(domElement, sibling);
			return;
		}
	}
	scene.appendChild(domElement);
};

const updateDomElement = (node, scene) => {
	const domElement = node.domElement;
	const style = domElement.style;

	const z = node.globalZ;
	if (domElement.z !== z || domElement.parentNode == null) {
		domElement.z = "inserting";
		insert(scene, domElement, z);
		domElement.z = z;
		domElement.dataset.z = z;
	}

	const isVisible = style.visibility === "visible";
	if (node.globalVisible !== isVisible) {
		style.visibility = node.globalVisible ? "visible" : "hidden";
	}

	node.renderCSS();
	if (style.transform !== node.transformCSS) {
		style.transform = node.transformCSS;
	}

	if (node.colorTransform.cssColor == null) {
		node.colorTransform.render();
		style.color = node.colorTransform.cssColor;
	}
};

const renderNode = (node, scene, currentElements) => {
	if (node.art != null) {
		if (node.domElement == null) {
			createDomElement(node);
		}
		updateDomElement(node, scene);
		currentElements.delete(node.domElement);
	}

	for (const child of node.children) {
		renderNode(child, scene, currentElements);
	}
};

const render2D = (node, scene) => {
	const currentElements = new Set(Array.from(scene.children));
	renderNode(node, scene, currentElements);
	for (const domElement of currentElements) {
		scene.removeChild(domElement);
	}
};

export default render2D;

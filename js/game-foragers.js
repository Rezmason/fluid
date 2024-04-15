import Forager from "./forager.js";

const foragers = [];

const spawnForagers = (algae) => {
	const numForagers = 2;
	for (let i = 0; i < numForagers; i++) {
		foragers.push(new Forager(i));
	}
	resetForagers(algae);
};

const resetForagers = (algae) => {
	for (const forager of foragers) {
		let alga = algae[Math.floor(Math.random() * algae.length)];
		while (alga.occupant != null) {
			alga = algae[Math.floor(Math.random() * algae.length)];
		}
		forager.reset();
		forager.place(alga);
	}
};

const updateForagers = (time, delta) => {
	for (const forager of foragers) {
		forager.update(time, delta);
	}
};

export { foragers, spawnForagers, resetForagers, updateForagers };

class Instrument {
	id;
	#type;
	#sample;
	#velocity;
	#durationMilliseconds;
	#notes;
	#bag;
	#index;

	constructor(id, data) {
		this.id = id;
		if (data != null) {
			this.#init(data);
		}
	}

	#init({ type, sample, durationMilliseconds, velocity, notes }) {
		this.#sample = sample;
		this.#durationMilliseconds = durationMilliseconds;
		this.#velocity = velocity;
		this.#type = type;
		if (this.#type === "range") {
			const [min, max] = notes;
			this.#notes = Array(max - min)
				.fill()
				.map((_, i) => i + min);
		} else {
			this.#notes = notes;
		}

		this.#bag = [];
		this.#index = 0;
	}

	pluck(note) {
		if (this.#sample == null) {
			return;
		}
		if (note == null || !this.#notes.includes(note)) {
			if (this.#type === "sequence") {
				note = this.#notes[this.#index];
				this.#index = (this.#index + 1) % this.#notes.length;
			} else {
				if (this.#bag.length === 0) {
					this.#bag.push(...this.#notes);
				}
				const index = Math.floor(Math.random() * this.#bag.length);
				note = this.#bag.splice(index, 1)[0];
			}
		}
		console.log(this.id, note);
	}
}

const json = JSON.parse(
	await (await fetch("../assets/audio/audio.json")).text()
);

const instruments = Object.fromEntries(
	Object.entries(json.instruments).map((e) => [e[0], new Instrument(...e)])
);
const samples = {};
for (const instrument of Object.values(instruments)) {
	if (instrument.sample != null && samples[instrument.sample] == null) {
		const audio = new Audio(
			"../assets/audio/" + json.samples[instrument.sample]
		);
		samples[instrument.sample] = { audio };
	}
}

await Promise.all(
	Object.values(samples).map(
		({ audio }) => new Promise((resolve) => (audio.oncanplaythrough = resolve))
	)
);

const test = async () => {
	const variants = [];
	for (var [id, instrument] of Object.entries(json.instruments)) {
		let notes = instrument.notes;
		if (notes == null) {
			continue;
		}
		if (instrument.type === "range") {
			const [min, max] = notes;
			notes = Array(max - min)
				.fill()
				.map((_, i) => i + min);
		}

		for (const note of notes) {
			variants.push({ instrument, id, note });
		}
	}

	variants.reverse();

	const instrumentList = document.querySelector("instruments");

	for (const variant of variants) {
		const variantTag = document.createElement("p");
		variantTag.innerText = `${variant.id} : ${variant.note}`;
		variantTag.addEventListener("mousedown", () =>
			instruments[variant.id].pluck(variant.note)
		);
		variantTag.addEventListener("mouseover", ({ buttons }) => {
			if (buttons === 1) {
				instruments[variant.id].pluck(variant.note);
			}
		});
		instrumentList.appendChild(variantTag);
	}
};

test();

const sfx = (id) => instruments[id].pluck();

export { sfx };

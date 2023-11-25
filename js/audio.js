let instruments;
let samples;

const json = JSON.parse(
	await (await fetch("../assets/audio/audio.json")).text()
);

const playNote = (variant) => {
	console.log(variant);
};

const test = async () => {
	const variants = [];
	for (var [id, instrument] of Object.entries(json.instruments)) {
		const note = instrument.note;
		if (typeof note === "object") {
			let notes;
			if (note.choices != null) {
				notes = note.choices;
			} else if (note.range != null) {
				const [min, max] = note.range;
				notes = Array(max - min)
					.fill()
					.map((_, i) => i + min);
			} else if (note.sequence != null) {
				notes = note.sequence;
			}
			for (const note of notes) {
				variants.push({ ...instrument, id, note });
			}
		} else {
			variants.push({ ...instrument, id });
		}
	}

	const loadingAudio = {};

	const instrumentList = document.querySelector("instruments");

	for (const variant of variants) {
		if (variant.sample != null) {
			loadingAudio[variant.sample] ??= new Audio(
				"../assets/audio/" + json.samples[variant.sample]
			);
		}

		const variantTag = document.createElement("p");
		variantTag.innerText = `${variant.id} : ${variant.note}`;
		variantTag.addEventListener("click", () => playNote(variant));
		instrumentList.appendChild(variantTag);
	}
};

test();

const sfx = (instrumentID) => console.log(instrumentID);

export { sfx };

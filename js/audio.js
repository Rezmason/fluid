// All times are in milliseconds.

const AudioContext = [window.AudioContext, window.webkitAudioContext].find(
	(contextClass) => contextClass != null
);

const audioContext = new AudioContext();

const mtof = (note) => 440 * Math.pow(2, (note - 69) / 12);

class Instrument {
	id;
	notes;

	#type;
	#sample;
	#root;
	#velocity;
	#duration;

	#loop;
	#vibrato;
	#envelope;
	#panModulation;

	#bag;
	#index;
	#audioNode;

	constructor(id, data) {
		this.id = id;
		if (data != null) {
			this.#init(data);
		}
	}

	#init(data) {
		const { type, sample, root, duration, velocity } = data;
		this.#type = type;
		this.#sample = sample;
		this.#root = root ?? 60;
		this.#duration = duration;
		this.#velocity = velocity;

		if (this.#type === "range") {
			const [min, max] = data.notes;
			this.notes = Array(max - min)
				.fill()
				.map((_, i) => i + min);
		} else {
			this.notes = data.notes;
		}

		if (data.loop != null) {
			let { start, end } = data.loop;
			start = Math.min(duration, Math.max(0, start ?? 0));
			end = Math.min(duration, Math.max(start, end ?? 0));
			this.#loop = { start, end };
		}

		const { vibrato, envelope, panModulation } = data;
		this.#vibrato = vibrato;
		this.#envelope = envelope;
		this.#panModulation = panModulation;

		this.#bag = [];
		this.#index = 0;
	}

	pluck(note, offset = 0) {
		if (this.#sample == null) {
			return;
		}
		const { buffer } = samples[this.#sample];
		if (buffer == null) {
			return;
		}

		const source = audioContext.createBufferSource();
		source.buffer = buffer;

		if (note == null || !this.notes.includes(note)) {
			if (this.#type === "sequence") {
				note = this.notes[this.#index];
				this.#index = (this.#index + 1) % this.notes.length;
			} else {
				if (this.#bag.length === 0) {
					this.#bag.push(...this.notes);
				}
				const index = Math.floor(Math.random() * this.#bag.length);
				note = this.#bag.splice(index, 1)[0];
			}
		}

		const playbackRate = mtof(note - this.#root - offset);
		source.playbackRate.value = playbackRate;

		if (this.#loop != null) {
			const { start, end } = this.#loop;
			source.loop = true;
			source.loopEnd = end * 0.001;
			setTimeout(
				() => (source.loopStart = start * 0.001),
				source.loopStart * playbackRate
			);
		}

		// sample/playbackRate --> filter --> gain envelope --> pan & volume --> destination

		const chain = [source];
		const runningNodes = [];

		if (this.#vibrato != null) {
			const { frequency, amplitude, baseDetune } = this.#vibrato;
			const vibratoFreq = audioContext.createOscillator();
			vibratoFreq.type = "square";
			vibratoFreq.frequency.value = frequency;
			const vibratoAmp = audioContext.createGain();
			source.detune.value = baseDetune;
			vibratoAmp.gain.value = amplitude;
			vibratoFreq.connect(vibratoAmp);
			vibratoAmp.connect(source.detune);
			vibratoFreq.start();
			runningNodes.push(vibratoFreq);
		}

		const envelopeGain = audioContext.createGain();
		const vol = this.#velocity / 127;
		envelopeGain.gain.value = vol;
		if (this.#envelope != null) {
			for (const { volume, time } of this.#envelope) {
				if (time === 0) {
					envelopeGain.gain.value = vol * volume;
				} else {
					envelopeGain.gain.linearRampToValueAtTime(
						vol * volume,
						audioContext.currentTime + time / 1000
					);
				}
			}
			envelopeGain.gain.linearRampToValueAtTime(
				0,
				audioContext.currentTime + this.#duration / 1000
			);
		}
		chain.push(envelopeGain);

		if (this.#panModulation != null) {
			const { frequency, amplitude } = this.#panModulation;
			const panner = audioContext.createStereoPanner();
			const panFreq = audioContext.createOscillator();
			panFreq.frequency.value = frequency;
			const panAmp = audioContext.createGain();
			panAmp.gain.value = amplitude;
			panFreq.connect(panAmp);
			panAmp.connect(panner.pan);
			panFreq.start();
			runningNodes.push(panFreq);
			chain.push(panner);
		}

		chain.push(audioContext.destination);

		for (let i = 1; i < chain.length; i++) {
			chain[i - 1].connect(chain[i]);
		}

		runningNodes.push(source);
		source.start();

		setTimeout(() => {
			for (const node of runningNodes) {
				node.stop();
			}
			for (let i = 1; i < chain.length; i++) {
				chain[i - 1].disconnect(chain[i]);
			}
		}, this.#duration);
	}
}

const json = JSON.parse(
	await (await fetch("assets/audio/audio.json")).text()
);

const instruments = Object.fromEntries(
	Object.entries(json.instruments).map((e) => [e[0], new Instrument(...e)])
);

const loadSample = (filename) => {
	const result = {
		buffer: null,
		ready: fetch("assets/audio/" + filename)
			.then((r) => r.arrayBuffer())
			.then((buffer) => audioContext.decodeAudioData(buffer))
			.then((buffer) => (result.buffer = buffer)),
	};
	return result;
};

const samples = {};
for (const instrument of Object.values(json.instruments)) {
	if (instrument.sample != null && samples[instrument.sample] == null) {
		samples[instrument.sample] = loadSample(json.samples[instrument.sample]);
	}
}

await Promise.all(Object.values(samples).map(({ ready }) => ready));

const sfx = (id) => instruments[id].pluck();

export { instruments, sfx };

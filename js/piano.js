import Globals from "./globals.js";
import { instruments } from "./audio.js";

const variants = Object.values(instruments)
	.map((instrument) => instrument.notes?.map((note) => ({ instrument, note })))
	.flat()
	.filter((entry) => entry != null)
	.toReversed();
const piano = document.createElement("piano");

const tfm = "rotate(120deg)";
piano.style.transform = tfm;

let dragging = false;
let startX, startY;
let pianoStartX = 0;
let pianoStartY = 0;
let pianoX = 0;
let pianoY = 0;

piano.addEventListener("mousedown", (event) => {
	const { target, screenX, screenY } = event;
	if (target !== piano) {
		return;
	}
	startX = screenX;
	startY = screenY;
	pianoStartX = pianoX;
	pianoStartY = pianoY;
	dragging = true;
	event.stopImmediatePropagation();
});

Globals.game.addEventListener("mouseleave", () => {
	dragging = false;
});

piano.addEventListener("mouseup", () => {
	dragging = false;
	event.stopImmediatePropagation();
});

window.addEventListener("mousemove", ({ screenX, screenY }) => {
	if (!dragging) {
		return;
	}

	pianoX = pianoStartX + screenX - startX;
	pianoY = pianoStartY + screenY - startY;
	piano.style.transform = `translate(${pianoX}px, ${pianoY}px) ${tfm}`;
	event.stopImmediatePropagation();
});

for (const variant of variants) {
	const variantTag = document.createElement("key");
	variantTag.innerText = `${variant.instrument.id} : ${variant.note}`;
	variantTag.addEventListener("mousedown", (event) => {
		variant.instrument.pluck(null, variant.note);
		event.stopImmediatePropagation();
	});
	variantTag.addEventListener("mouseover", ({ buttons }) => {
		if (buttons === 1) {
			variant.instrument.pluck(null, variant.note);
		}
	});
	piano.appendChild(variantTag);
}
document.querySelector("#instruments").append(piano);

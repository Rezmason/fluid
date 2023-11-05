const activeTweens = new Set();

const tick = () => {
	const now = Date.now() / 1000;
	for (const tween of activeTweens) {
		const at = (now - tween.start) / tween.seconds;
		const easedAt = tween.ease?.(at) ?? at;
		if (isNaN(easedAt)) {
			throw new Error(`Tween is NaNning: ${tween}`);
		}
		if (at < 1) {
			tween.f(easedAt);
		} else {
			tween.f(1);
			activeTweens.delete(tween);
		}
	}

	if (activeTweens.size > 0) startTick();
	// else console.log("tween tick stopped.");
};

const startTick = () => {
	requestAnimationFrame(tick);
};

const tween = (f, seconds, ease = null) => {
	const start = Date.now() / 1000;
	const tween = { f, seconds, ease, start };
	if (seconds > 0) {
		f(0);
		activeTweens.add(tween);
		startTick();
	} else {
		f(1);
	}

	return {
		stop: (cancel = true) => {
			activeTweens.delete(tween);
			if (!cancel) tween?.f(1);
			tween.f = null;
		},
	};
};

const delay = (f, seconds) => setTimeout(f, 1000 * seconds);

const quadEaseIn = (t) => t * t;

const quadEaseOut = (t) => 1 - (1 - t) * (1 - t);

export { tween, delay, quadEaseIn, quadEaseOut };

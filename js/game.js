import Globals from "./globals.js";
import Metaballs from "./metaballs.js";

let numMuckyAlgae = 0;
let gameCanEnd = false;
let resetting = false;

const algae = [];
const foragers = [];
const feeders = [];

const game = Globals.game;
const fade = game.querySelector("fade");

/*
public override void _Ready()
{
	Globals.MuckChanged += DetectEndgame;
	feederMetaballs = (ShaderMaterial)GetNode<CanvasItem>("FeederMetaballs").Material;

	SpawnAlgae();
	SpawnForagers();
	SpawnFeeders();

	var emptyColor = new Color(Colors.Black, 0);
	for (int i = 0; i < 10; i++) {
		metaballData[i] = emptyColor;
	}
	for (int i = 0; i < 3; i++) {
		metaballGroupData[i] = Colors.White;
	}

	var tween = fade.CreateTween()
		.SetTrans(Tween.TransitionType.Quad)
		.SetEase(Tween.EaseType.Out);
	tween.TweenProperty(fade, "modulate", new Color(1, 1, 1, 0), 5);
	tween.TweenProperty(fade, "visible", false, 0);
}

public override void _UnhandledInput(InputEvent inputEvent)
{
	if (inputEvent is InputEventMouse mouseEvent) {
		Globals.isMousePressed = (mouseEvent.ButtonMask & MouseButtonMask.Left) == MouseButtonMask.Left;
		Globals.mousePosition = GetLocalMousePosition();

		foreach (var alga in algae) {
			if (alga.mucky || !Globals.isMousePressed) {
				alga.goalPosition = alga.restingPosition;
			} else {
				var localPushPosition = Globals.mousePosition - alga.restingPosition;
				float offset = -localPushPosition.Length() / 50;
				offset *= Mathf.Pow(3, offset);
				alga.goalPosition = alga.restingPosition + localPushPosition * offset;
			}
		}
	}
}

public override void _Process(Double delta)
{
	float fDelta = (float)delta;
	foreach (var feeder in feeders) {
		feeder.Update(fDelta);
	}

	var seedingFeeders = new List<Feeder>();

	const float minAge = 3;

	for (int i = 0; i < feeders.Count; i++) {
		var feeder = feeders[i];
		if (feeder.parent != null || feeder.age < minAge) continue;
		if (feeder.Size >= 3) {
			seedingFeeders.Add(feeder);
		} else {
			for (int j = i + 1; j < feeders.Count; j++) {
				var other = feeders[j];
				if (other.parent != null || other.age < minAge || feeder.Size + other.Size > 3) continue;
				if (feeder.Size >= other.Size) {
					if (feeder.TryToCombine(other)) break;
				} else {
					if (other.TryToCombine(feeder)) break;
				}
			}
		}
	}

	int n = 0;
	int f = 1;
	ulong now = Time.GetTicksMsec();
	metaballGroupData[0] = Colors.White;
	foreach (var feeder in feeders) {
		if (feeder.parent != null) continue;
		int groupID = 0;
		float throb = 0;
		float throbTime = 0;
		if (feeder.availableSeeds > 0) {
			groupID = f;
			float opacity = feeder.availableSeeds / Feeder.maxAvailableSeeds;
			// opacity = 1 - Mathf.Pow(1 - opacity, 2);
			opacity = Mathf.Lerp(metaballGroupData[groupID].R, opacity, 0.1f);
			metaballGroupData[groupID] = new Color(opacity, 0, 0, 0);
			f++;
			throb = 7;
			throbTime = (float)(now - feeder.throbStartTime) / 1000;
		}
		int i = 0;
		foreach (var element in feeder.elements) {
			var position = element.art.GlobalPosition;
			metaballData[n] = new Color(position.X, position.Y, 15 + throb * (Mathf.Sin((i * (float)Math.PI * 2 / 3) + throbTime * 4) * 0.5f + 0.5f), groupID);
			n++;
			i++;
		}
	}
	for (; f < 3; f++) {
		metaballGroupData[f] = Colors.White;
	}

	feederMetaballs.SetShaderParameter("metaballs", metaballData);
	feederMetaballs.SetShaderParameter("metaballGroups", metaballGroupData);

	foreach (var alga in algae) {
		alga.scene.Position = alga.scene.Position.Lerp(alga.goalPosition, 0.1f);

		if (alga.ripe || alga.occupant != null) continue;

		foreach (var feeder in seedingFeeders) {
			if (feeder.Size == 3 && feeder.TryToSeed(alga)) break;
		}
	}
}

private void SpawnAlgae()
{
	List<List<Alga>> grid = new List<List<Alga>>();

	const int numRows = 9, numColumns = 10;
	var spacing = new Vector2(110, 90);
	for (int i = 0; i < numRows; i++) {
		var rowOffset = new Vector2(1 - (numColumns - i % 2), 1 - numRows) / 2;
		var row = new List<Alga>();
		for (int j = 0; j < numColumns; j++) {
			if (i % 2 == 1 && j == numColumns - 1) {
				row.Add(null);
				continue;
			}
			var alga = new Alga(grid.Count, row.Count, (new Vector2(j, i) + rowOffset) * spacing);
			row.Add(alga);
			algae.Add(alga);
			AddChild(alga.scene);
			alga.Reset();
		}
		grid.Add(row);
	}

	void ConnectNeighbors(Alga l1, Alga l2) {
		if (l1 == null || l2 == null) return;
		l1.neighbors.Add(l2);
		l2.neighbors.Add(l1);
	}

	for (int i = 0; i < numRows; i++) {
		for (int j = 0; j < numColumns; j++) {
			var alga = grid[i][j];
			if (alga == null) continue;
			if (j > 0) {
				ConnectNeighbors(alga, grid[i][j - 1]);
			}
			if (i > 0) {
				ConnectNeighbors(alga, grid[i - 1][j]);
				int j2 = j + (i % 2) * 2 - 1;
				if (j2 >= 0) {
					ConnectNeighbors(alga, grid[i - 1][j2]);
				}
			}
		}
	}
}

private void SpawnForagers()
{
	const int numForagers = 2;
	for (int i = 0; i < numForagers; i++) {
		foragers.Add(new Forager(foragers.Count));
	}
	ResetForagers();
}

private void SpawnFeeders()
{
	const int numFeeders = 7;
	for (int i = 0; i < numFeeders; i++) {
		var feeder = new Feeder(feeders.Count);
		feeders.Add(feeder);
	}
	ResetFeeders();
}

private void ResetForagers()
{
	foreach (var forager in foragers) {
		var alga = algae[Globals.random.Next(algae.Count)];
		while (alga.occupant != null) {
			alga = algae[Globals.random.Next(algae.Count)];
		}
		forager.Reset();
		forager.Place(alga);
	}
}

private void ResetFeeders()
{
	foreach (var feeder in feeders)
	{
		feeder.Reset();
		AddChild(feeder.scene);
		feeder.scene.GlobalPosition = new Vector2(
			(float)Globals.random.NextDouble() - 0.5f,
			(float)Globals.random.NextDouble() - 0.5f
		) * Globals.screenSize;
		feeder.velocity = new Vector2(
			(float)Globals.random.NextDouble() - 0.5f,
			(float)Globals.random.NextDouble() - 0.5f
		) * 200;
	}
}

private void DetectEndgame(Alga alga)
{
	if (resetting) return;

	if (alga.mucky) {
		numMuckyAlgae++;
	} else {
		numMuckyAlgae--;
	}

	if (gameCanEnd) {
		if (numMuckyAlgae == 0) {
			Reset();
		} else if ((float)numMuckyAlgae / algae.Count > 0.6) {
			Reset();
		}
	} else if (!resetting && numMuckyAlgae >= 3) {
		gameCanEnd = true;
	}
}

private void Reset()
{
	resetting = true;
	gameCanEnd = false;
	fade.Visible = true;
	var tween = fade.CreateTween()
		.SetTrans(Tween.TransitionType.Quad);
	tween.TweenProperty(fade, "modulate", new Color(1, 1, 1, 1), 5)
		.SetEase(Tween.EaseType.In);
	tween.TweenCallback(Callable.From(() => {
		foreach (var alga in algae) {
			alga.Reset();
		}
		ResetForagers();
		ResetFeeders();
		numMuckyAlgae = 0;
		resetting = false;
	}));
	tween.TweenProperty(fade, "modulate", new Color(1, 1, 1, 0), 5)
		.SetEase(Tween.EaseType.Out);
	tween.TweenProperty(fade, "visible", false, 0);
}


*/

const metaballs = Array(10).fill().map(_ => Array(4).fill(0));
const groupOpacities = Array(3).fill(1);

const updateMetaballs = (time) => {

	// TODO: use actual data

	for (let i = 0; i < 10; i++) {
		const metaball = metaballs[i];
		const pairing = Math.floor(i / 2);
		let groupID = pairing % 3;
		metaball[0] = (pairing * 0.2 + 0.1) * Globals.screenSize[0];
		metaball[1] = (Math.sin(time * 0.003 + i) * 0.25 + 0.5) * Globals.screenSize[1];
		metaball[2] = 15;
		metaball[3] = groupID;
	}

	for (let i = 0; i < 3; i++) {
		groupOpacities[i] = Math.cos(time * 0.003 + Math.PI * 2 * i / 3) * 0.5 + 0.5;
	}
};

const startTime = performance.now();
let lastTime = startTime;
const update = (now) => {
	const time = now - startTime;
	const delta = time - lastTime;
	lastTime = time;

	// TODO: update everything
	updateMetaballs(time);
	Metaballs.update(metaballs, groupOpacities);
	Metaballs.redraw();
	requestAnimationFrame(update);
};

update(startTime);
fade.classList.toggle("hidden", true);

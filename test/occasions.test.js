"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const O = require("../occasions.js");

const on = (s, config = {}, time = "12:00") => {
	const o = O.pick(config, new Date(`${s}T${time}:00`));
	return o ? o.id : null;
};

test("the right occasion on the right day", () => {
	assert.equal(on("2026-08-01"), "bundesfeier");
	assert.equal(on("2026-02-14"), "valentine");
	assert.equal(on("2026-02-20"), "fasnacht"); // between Schmutziger Donnerstag and Basler Fasnacht
	assert.equal(on("2026-04-03"), "easter"); // Good Friday
	assert.equal(on("2026-05-10"), "mothersday");
	assert.equal(on("2026-10-28"), "halloween");
	assert.equal(on("2026-12-02"), "advent");
	assert.equal(on("2026-12-06"), "samichlaus"); // wins over Advent
	assert.equal(on("2026-12-25"), "christmas");
	assert.equal(on("2027-01-01"), "newyear");
	assert.equal(on("2027-01-06"), "threekings");
	assert.equal(on("2026-06-15"), null);
});

test("everything can be changed", () => {
	assert.equal(on("2026-10-28", { occasions: { halloween: false } }), null);
	assert.equal(on("2026-10-20", { occasions: { halloween: { from: "10-15" } } }), "halloween");
	assert.equal(on("2026-02-20", { region: "luzern" }), null); // Luzern ended on 17 February
	assert.equal(on("2026-02-24", { region: "basel" }), "fasnacht");
	const own = { custom: [{ name: "Anna", from: "06-15", effect: "hearts" }] };
	assert.equal(O.pick(own, new Date("2026-06-15T12:00:00")).name, "Anna");
	assert.equal(on("2026-06-15", { forceOccasion: "bundesfeier" }), "bundesfeier");
	const o = O.pick({ style: "emoji", intensity: "high", occasions: { valentine: { emojis: ["🌹"], count: 10 } } }, new Date("2026-02-14T12:00:00"));
	assert.deepEqual([o.style, o.emojis, o.count], ["emoji", ["🌹"], 16]);
});

"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const D = require("../holidays.js");

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const at = (s, time = "12:00") => new Date(`${s}T${time}:00`);

test("Easter and Advent", () => {
	assert.equal(iso(D.easter(2026)), "2026-04-05");
	assert.equal(iso(D.easter(2027)), "2027-03-28");
	assert.equal(iso(D.easter(2028)), "2028-04-16");
	assert.equal(iso(D.advent(2026, 1)), "2026-11-29");
	assert.equal(iso(D.advent(2026, 4)), "2026-12-20");
	assert.equal(iso(D.advent(2027, 1)), "2027-11-28"); // Christmas 2027 is a Saturday
});

test("date specs", () => {
	assert.equal(iso(D.resolve("08-01", 2027)), "2027-08-01");
	assert.equal(iso(D.resolve("easter-2", 2027)), "2027-03-26"); // Good Friday
	assert.equal(iso(D.resolve({ nth: 2, weekday: "sun", month: 5 }, 2026)), "2026-05-10"); // Mother's Day
	assert.equal(iso(D.resolve({ nth: -1, weekday: "fri", month: 11 }, 2026)), "2026-11-27");
	assert.equal(iso(D.resolve({ date: "easter", offset: 1 }, 2026)), "2026-04-06");
	assert.equal(D.resolve("2027-06-12", 2026), null);
	assert.equal(iso(D.resolve("2027-06-12", 2027)), "2027-06-12");
	assert.equal(D.resolve("nonsense", 2027), null);
});

test("Fasnacht by region (2026: Ash Wednesday 18 February)", () => {
	const w = (r) => [iso(D.resolve(D.FASNACHT[r].from, 2026)), iso(D.resolve(D.FASNACHT[r].until, 2026))];
	assert.deepEqual(w("luzern"), ["2026-02-12", "2026-02-17"]); // Schmutziger Donnerstag … Güdisdienstag
	assert.deepEqual(w("basel"), ["2026-02-23", "2026-02-25"]); // Morgestraich Monday 23 February
	assert.deepEqual(w("all"), ["2026-02-12", "2026-02-26"]);
});

test("windows across the new year and hours", () => {
	const ny = { from: "12-31", until: "01-02" };
	assert.equal(D.isActive(ny, at("2026-12-31")), true);
	assert.equal(D.isActive(ny, at("2027-01-02")), true);
	assert.equal(D.isActive(ny, at("2027-01-03")), false);
	const evening = { from: "08-01", hours: ["21:00", "02:00"] };
	assert.equal(D.isActive(evening, at("2026-08-01", "22:30")), true);
	assert.equal(D.isActive(evening, at("2026-08-01", "15:00")), false);
	assert.equal(D.isActive({ from: "08-01", enabled: false }, at("2026-08-01")), false);
	assert.equal(D.isActive({ from: "2027-06-12" }, at("2027-06-12")), true);
	assert.equal(D.isActive({ from: "2027-06-12" }, at("2028-06-12")), false);
});

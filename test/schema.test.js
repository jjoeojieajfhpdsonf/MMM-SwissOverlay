"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { BUILTIN } = require("../occasions.js");

const schema = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "mm-manager.json"), "utf8"));
const field = (key) => schema.fields.find((f) => f.key === key);

test("mm-manager.json lists every built-in occasion", () => {
	assert.deepEqual(field("occasions").keys.map((k) => k.value).sort(), Object.keys(BUILTIN).sort());
	assert.deepEqual(field("forceOccasion").choices.slice(1).map((c) => c.value).sort(), Object.keys(BUILTIN).sort());
});

test("defaults shown in the manager match the module", () => {
	for (const k of field("occasions").keys) {
		const b = BUILTIN[k.value];
		for (const [key, value] of Object.entries(k.defaults || {})) assert.deepEqual(value, b[key], `${k.value}.${key}`);
	}
});

test("every setting of the module is described", () => {
	let defaults;
	const Module = { register: (name, def) => (defaults = def.defaults) };
	vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "MMM-SwissOverlay.js"), "utf8"), { Module, Log: console });
	assert.deepEqual(schema.fields.map((f) => f.key).sort(), Object.keys(defaults).sort());
});

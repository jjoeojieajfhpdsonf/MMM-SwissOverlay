/* MMM-SwissOverlay – dates of Swiss occasions.
 * Works in the browser (global SwissOverlayDates) and in Node.js (module.exports) for tests.
 *
 * A date can be written as
 *   "08-01"                       every year on 1 August
 *   "2027-06-12"                  once
 *   "easter", "easter-2"          relative to Easter Sunday (Good Friday)
 *   "advent1" … "advent4"         Advent Sundays, also "advent1-3" etc.
 *   "ashwednesday+5"              relative to Ash Wednesday (Easter − 46 days)
 *   { nth: 2, weekday: "sun", month: 5 }   2nd Sunday in May (nth: -1 = last)
 *   { …, offset: 1 }              any of the above plus/minus days
 */
(function (root, factory) {
	if (typeof module === "object" && module.exports) module.exports = factory();
	else root.SwissOverlayDates = factory();
})(typeof self !== "undefined" ? self : this, function () {
	"use strict";

	const DAY = 86400000;
	const WEEKDAYS = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

	const atNoon = (y, m, d) => new Date(y, m - 1, d, 12); // noon avoids daylight-saving surprises
	const addDays = (date, n) => new Date(date.getTime() + n * DAY);
	const dayOnly = (date) => atNoon(date.getFullYear(), date.getMonth() + 1, date.getDate());

	// Easter Sunday, Gregorian calendar (anonymous algorithm)
	function easter(year) {
		const a = year % 19;
		const b = Math.floor(year / 100);
		const c = year % 100;
		const d = Math.floor(b / 4);
		const e = b % 4;
		const f = Math.floor((b + 8) / 25);
		const g = Math.floor((b - f + 1) / 3);
		const h = (19 * a + b - d - g + 15) % 30;
		const i = Math.floor(c / 4);
		const k = c % 4;
		const l = (32 + 2 * e + 2 * i - h - k) % 7;
		const m = Math.floor((a + 11 * h + 22 * l) / 451);
		const month = Math.floor((h + l - 7 * m + 114) / 31);
		const day = ((h + l - 7 * m + 114) % 31) + 1;
		return atNoon(year, month, day);
	}

	// 4th Advent Sunday is the last Sunday before 25 December
	function advent(year, n) {
		const christmas = atNoon(year, 12, 25);
		const back = christmas.getDay() === 0 ? 7 : christmas.getDay();
		const fourth = addDays(christmas, -back);
		return addDays(fourth, -(4 - n) * 7);
	}

	function nthWeekday(year, month, weekday, nth) {
		if (nth > 0) {
			const first = atNoon(year, month, 1);
			const delta = (weekday - first.getDay() + 7) % 7;
			return addDays(first, delta + (nth - 1) * 7);
		}
		const last = atNoon(year, month + 1, 0);
		const delta = (last.getDay() - weekday + 7) % 7;
		return addDays(last, -delta + (nth + 1) * 7);
	}

	// Resolves a date spec for a given year; returns a Date at noon or null if invalid.
	function resolve(spec, year) {
		if (spec && typeof spec === "object") {
			const base = spec.date !== undefined ? resolve(spec.date, year) : spec.weekday !== undefined ? nthWeekday(year, Number(spec.month), WEEKDAYS[String(spec.weekday).slice(0, 3).toLowerCase()], Number(spec.nth || 1)) : null;
			return base ? addDays(base, Number(spec.offset || 0)) : null;
		}
		const s = String(spec || "").trim().toLowerCase();
		let m;
		if ((m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s))) return Number(m[1]) === year ? atNoon(year, Number(m[2]), Number(m[3])) : null;
		if ((m = /^(\d{2})-(\d{2})$/.exec(s))) return atNoon(year, Number(m[1]), Number(m[2]));
		if ((m = /^easter([+-]\d+)?$/.exec(s))) return addDays(easter(year), Number(m[1] || 0));
		if ((m = /^ashwednesday([+-]\d+)?$/.exec(s))) return addDays(easter(year), -46 + Number(m[1] || 0));
		if ((m = /^advent([1-4])([+-]\d+)?$/.exec(s))) return addDays(advent(year, Number(m[1])), Number(m[2] || 0));
		return null;
	}

	// "21:00" -> minutes after midnight
	function minutes(hhmm) {
		const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ""));
		return m ? Number(m[1]) * 60 + Number(m[2]) : null;
	}

	// Is `now` inside the occasion? from/until are date specs (until defaults to from);
	// a window may run into the next year (e.g. 12-31 … 01-02). `hours` limits the time of day.
	function isActive(occ, now) {
		if (!occ || occ.enabled === false || !occ.from) return false;
		const today = dayOnly(now);
		const y = today.getFullYear();
		let inside = false;
		for (const year of [y - 1, y]) {
			const start = resolve(occ.from, year);
			if (!start) continue;
			let end = resolve(occ.until || occ.from, year);
			if (!end) end = resolve(occ.until || occ.from, year + 1);
			if (!end) continue;
			if (end < start) end = resolve(occ.until, year + 1) || end;
			if (today >= start && today <= end) inside = true;
		}
		if (!inside) return false;
		if (Array.isArray(occ.hours) && occ.hours.length === 2) {
			const t = now.getHours() * 60 + now.getMinutes();
			const a = minutes(occ.hours[0]);
			const b = minutes(occ.hours[1]);
			if (a === null || b === null) return true;
			return a <= b ? t >= a && t < b : t >= a || t < b; // e.g. 21:00 … 02:00
		}
		return true;
	}

	// Fasnacht windows by region, relative to Ash Wednesday
	const FASNACHT = {
		all: { from: "ashwednesday-6", until: "ashwednesday+8" }, // Schmutziger Donnerstag … end of Basler Fasnacht
		luzern: { from: "ashwednesday-6", until: "ashwednesday-1" }, // Schmutziger Donnerstag … Güdisdienstag
		basel: { from: "ashwednesday+5", until: "ashwednesday+7" }, // Morgestraich (Monday) … Wednesday
		zurich: { from: "ashwednesday+2", until: "ashwednesday+4" } // weekend after Ash Wednesday
	};

	return { easter, advent, nthWeekday, resolve, isActive, minutes, FASNACHT };
});

/* MMM-SwissOverlay – built-in occasions and how the user's config is merged into them.
 * Browser: global SwissOverlayOccasions; Node.js: module.exports (tests).
 *
 * Every occasion can be changed in config.js under occasions.<id>:
 *   enabled, from, until, hours, style ("graphics" | "emoji"), emojis, colors, count, speed, size
 * plus the extras listed below (fireworks, candles, lights, webs, snow).
 * Own occasions go into `custom` (they win over the built-in ones on the same day).
 */
(function (root, factory) {
	if (typeof module === "object" && module.exports) module.exports = factory(require("./holidays.js"));
	else root.SwissOverlayOccasions = factory(root.SwissOverlayDates);
})(typeof self !== "undefined" ? self : this, function (Dates) {
	"use strict";

	// Order = priority: the first active occasion is shown.
	const BUILTIN = {
		samichlaus: { from: "12-06", shape: "nuts", motion: "fall", count: 26, emojis: ["🎅", "🍊", "🥜", "🌰"], snow: true },
		threekings: { from: "01-06", shape: "crowns", motion: "fall", count: 22, emojis: ["👑", "⭐", "✨"], colors: ["#f2c94c", "#e8b33a", "#fff1b8"] },
		christmas: { from: "12-24", until: "12-26", shape: "snow", motion: "fall", count: 80, emojis: ["🎄", "⭐", "❄️", "🎁"], lights: true },
		newyear: { from: "12-31", until: "01-02", shape: "sparkles", motion: "fall", count: 60, emojis: ["🎆", "🎉", "🥂", "✨"], colors: ["#ffd76a", "#fff4c2", "#f6c343"], fireworks: true, fireworksHours: null },
		bundesfeier: { from: "08-01", shape: "flags", motion: "fall", count: 18, emojis: ["🇨🇭", "🏮", "🎆"], fireworks: true, fireworksHours: ["21:00", "24:00"] },
		valentine: { from: "02-14", shape: "hearts", motion: "rise", count: 26, emojis: ["❤️", "💕", "💖", "😍"], colors: ["#ff6b8b", "#ff8fab", "#ffc2d1", "#f25c7a"] },
		mothersday: { from: { nth: 2, weekday: "sun", month: 5 }, shape: "petals", motion: "fall", count: 34, emojis: ["🌷", "🌸", "💐", "❤️"], colors: ["#ffc2d1", "#ffe5ec", "#ff8fab", "#fff"] },
		easter: { from: "easter-2", until: "easter+1", shape: "eggs", motion: "fall", count: 22, emojis: ["🐣", "🥚", "🐰", "🌷"], colors: ["#ffd6a5", "#caffbf", "#9bf6ff", "#bdb2ff", "#ffc6ff", "#fdffb6"] },
		fasnacht: { from: null, until: null, shape: "confetti", motion: "fall", count: 120, emojis: ["🎭", "🎉", "🥁", "🎺", "🤡"], colors: ["#ff595e", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93", "#ff924c", "#fff"] },
		halloween: { from: "10-24", until: "10-31", shape: "bats", motion: "fly", count: 9, emojis: ["🎃", "🦇", "👻", "🕷️"], colors: ["#ff9a3c", "#ffb35c"], webs: true },
		advent: { from: "advent1", until: "12-23", shape: "snow", motion: "fall", count: 45, emojis: ["❄️", "⭐", "🕯️"], candles: true }
	};

	const INTENSITY = { low: 0.55, medium: 1, high: 1.6 };

	// Merges defaults, user settings and the region into a list of occasions (priority order).
	function build(config = {}) {
		const user = config.occasions || {};
		const list = [];
		for (const [id, c] of Object.entries(config.custom ? toCustom(config.custom) : {})) list.push({ id, custom: true, ...c });
		for (const [id, base] of Object.entries(BUILTIN)) {
			const o = { id, ...base };
			if (id === "fasnacht") Object.assign(o, Dates.FASNACHT[config.region] || Dates.FASNACHT.all);
			const u = user[id];
			if (u === false) o.enabled = false;
			else if (u && typeof u === "object") Object.assign(o, u);
			list.push(o);
		}
		const style = config.style === "emoji" ? "emoji" : "graphics";
		const k = INTENSITY[config.intensity] || 1;
		return list.map((o) => ({ ...o, style: o.style || style, count: Math.max(1, Math.round((o.count || 30) * k)) }));
	}

	function toCustom(custom) {
		const out = {};
		(Array.isArray(custom) ? custom : []).forEach((c, i) => {
			if (!c || !c.from) return;
			out[`custom${i + 1}`] = { name: c.name || `custom ${i + 1}`, shape: c.effect || (c.emojis ? "emoji" : "confetti"), motion: c.direction === "up" ? "rise" : "fall", count: 40, style: c.emojis && !c.effect ? "emoji" : undefined, ...c };
		});
		return out;
	}

	// The occasion to show now (or the forced one).
	function pick(config, now) {
		const list = build(config);
		if (config.forceOccasion) return list.find((o) => o.id === config.forceOccasion || o.name === config.forceOccasion) || null;
		return list.find((o) => Dates.isActive(o, now)) || null;
	}

	return { BUILTIN, build, pick };
});

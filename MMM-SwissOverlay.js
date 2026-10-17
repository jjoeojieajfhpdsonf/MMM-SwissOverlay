/* MMM-SwissOverlay – Swiss holidays and seasons as a quiet full-screen overlay.
 * Put it at position "fullscreen_above". Everything is configurable, see README.md.
 */
Module.register("MMM-SwissOverlay", {
	defaults: {
		style: "graphics", // "graphics" (own drawings) or "emoji"; per occasion: occasions.<id>.style
		intensity: "medium", // "low", "medium", "high"
		region: "all", // Fasnacht: "all", "luzern", "basel", "zurich"
		opacity: 1, // 0 … 1, the whole overlay
		fps: 30, // frames per second (lower = less CPU)
		occasions: {}, // overrides per occasion, e.g. { halloween: false, advent: { candles: false } }
		custom: [], // own occasions, e.g. [{ name: "Anna", from: "06-12", effect: "hearts" }]
		forceOccasion: null, // show one occasion right now, e.g. "bundesfeier" (for trying out)
		testDate: null, // pretend it is this day, e.g. "2026-12-06"
		checkInterval: 60 * 1000 // how often the date/time is checked
	},

	getScripts() {
		return [this.file("holidays.js"), this.file("occasions.js"), this.file("effects.js")];
	},

	getStyles() {
		return [this.file("MMM-SwissOverlay.css")];
	},

	start() {
		this.overlay = null;
		this.currentKey = null;
		this.timer = setInterval(() => this.check(), this.config.checkInterval);
	},

	getDom() {
		if (!this.wrapper) {
			this.wrapper = document.createElement("div");
			this.wrapper.className = "swiss-overlay";
			this.canvas = document.createElement("canvas");
			this.wrapper.appendChild(this.canvas);
		}
		return this.wrapper;
	},

	notificationReceived(notification) {
		if (notification === "DOM_OBJECTS_CREATED") {
			this.overlay = new SwissOverlayEffects.Overlay(this.canvas, { fps: this.config.fps, opacity: this.config.opacity });
			this.check();
		}
	},

	now() {
		if (!this.config.testDate) return new Date();
		const d = new Date(`${this.config.testDate}T00:00:00`);
		const real = new Date();
		d.setHours(real.getHours(), real.getMinutes(), real.getSeconds());
		return isNaN(d) ? real : d;
	},

	check() {
		if (!this.overlay) return;
		const now = this.now();
		const occ = SwissOverlayOccasions.pick(this.config, now);
		if (occ && occ.candles) occ.candleCount = this.adventCandles(now);
		const key = occ ? `${occ.id}:${occ.candleCount || ""}` : null;
		if (key === this.currentKey) return;
		this.currentKey = key;
		if (occ) Log.info(`[MMM-SwissOverlay] ${occ.name || occ.id}`);
		this.overlay.show(occ);
	},

	// how many Advent Sundays have been reached
	adventCandles(now) {
		let n = 0;
		for (let i = 1; i <= 4; i++) if (SwissOverlayDates.advent(now.getFullYear(), i) <= now) n = i;
		return n;
	},

	suspend() {
		if (this.overlay) this.overlay.show(null);
		this.currentKey = null;
	},

	resume() {
		this.check();
	}
});

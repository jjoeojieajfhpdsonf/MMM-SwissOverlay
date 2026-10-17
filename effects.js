/* MMM-SwissOverlay – drawing engine: one full-screen canvas, sprites drawn once, at most
 * `fps` frames per second, and nothing running while no occasion is active.
 * Browser global: SwissOverlayEffects.
 */
(function (root) {
	"use strict";

	const TAU = Math.PI * 2;
	const rand = (a, b) => a + Math.random() * (b - a);
	const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];
	const EMOJI_FONT = "\"Apple Color Emoji\", \"Noto Color Emoji\", \"Segoe UI Emoji\", sans-serif";

	// base size (px on a 1080 px wide screen) and fall speed (px/s) per shape
	const SHAPE = {
		snow: { size: [3, 8], speed: [35, 80], colors: ["#ffffff"] },
		confetti: { size: [5, 9], speed: [60, 130] },
		sparkles: { size: [7, 13], speed: [35, 80], colors: ["#ffd76a", "#fff4c2"] },
		flags: { size: [20, 32], speed: [30, 60] },
		hearts: { size: [18, 32], speed: [35, 70], colors: ["#ff6b8b", "#ffc2d1"] },
		eggs: { size: [22, 34], speed: [40, 75] },
		petals: { size: [12, 20], speed: [30, 65], colors: ["#ffc2d1", "#ffe5ec"] },
		nuts: { size: [18, 26], speed: [45, 90], colors: ["#c58b4c", "#f39c3c", "#a66a33"] },
		crowns: { size: [24, 36], speed: [35, 70], colors: ["#f2c94c"] },
		stars: { size: [10, 18], speed: [25, 55], colors: ["#fff1b8", "#ffd76a"] },
		emoji: { size: [26, 42], speed: [35, 75] }
	};

	// ---------- sprites (drawn once into small canvases) ----------

	const cache = new Map();
	function sprite(key, size, draw) {
		const id = `${key}|${size}`;
		if (cache.has(id)) return cache.get(id);
		const c = document.createElement("canvas");
		const pad = Math.ceil(size * 0.3);
		c.width = c.height = Math.ceil(size + pad * 2);
		const ctx = c.getContext("2d");
		ctx.translate(c.width / 2, c.height / 2);
		draw(ctx, size);
		if (cache.size > 400) cache.clear();
		cache.set(id, c);
		return c;
	}

	const DRAW = {
		snow(ctx, s, color) {
			const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s / 2);
			g.addColorStop(0, color);
			g.addColorStop(0.6, color);
			g.addColorStop(1, "rgba(255,255,255,0)");
			ctx.fillStyle = g;
			ctx.beginPath();
			ctx.arc(0, 0, s / 2, 0, TAU);
			ctx.fill();
		},
		confetti(ctx, s, color) {
			// Räppli: small round paper dots
			ctx.fillStyle = color;
			ctx.beginPath();
			ctx.arc(0, 0, s / 2, 0, TAU);
			ctx.fill();
		},
		sparkles(ctx, s, color) {
			ctx.fillStyle = color;
			ctx.beginPath();
			for (let i = 0; i < 8; i++) {
				const r = i % 2 ? s * 0.12 : s / 2;
				const a = (i / 8) * TAU;
				ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
			}
			ctx.closePath();
			ctx.fill();
		},
		stars(ctx, s, color) {
			ctx.fillStyle = color;
			ctx.beginPath();
			for (let i = 0; i < 10; i++) {
				const r = i % 2 ? s * 0.22 : s / 2;
				const a = (i / 10) * TAU - Math.PI / 2;
				ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
			}
			ctx.closePath();
			ctx.fill();
		},
		flags(ctx, s) {
			// Swiss flag: red square, white cross (arms 6/32 wide, 20/32 long)
			const r = s * 0.12;
			ctx.fillStyle = "#e3242b";
			ctx.beginPath();
			ctx.roundRect ? ctx.roundRect(-s / 2, -s / 2, s, s, r) : ctx.rect(-s / 2, -s / 2, s, s);
			ctx.fill();
			ctx.fillStyle = "#ffffff";
			const w = (s * 6) / 32;
			const l = (s * 20) / 32;
			ctx.fillRect(-w / 2, -l / 2, w, l);
			ctx.fillRect(-l / 2, -w / 2, l, w);
		},
		hearts(ctx, s, color) {
			ctx.fillStyle = color;
			ctx.beginPath();
			const k = s / 2;
			ctx.moveTo(0, k * 0.85);
			ctx.bezierCurveTo(-k * 1.3, -k * 0.05, -k * 0.55, -k * 1.05, 0, -k * 0.35);
			ctx.bezierCurveTo(k * 0.55, -k * 1.05, k * 1.3, -k * 0.05, 0, k * 0.85);
			ctx.fill();
		},
		eggs(ctx, s, color) {
			ctx.save();
			ctx.beginPath();
			ctx.ellipse(0, 0, s * 0.36, s * 0.48, 0, 0, TAU);
			ctx.fillStyle = color;
			ctx.fill();
			ctx.clip();
			// two light zigzag bands
			ctx.strokeStyle = "rgba(255,255,255,0.75)";
			ctx.lineWidth = s * 0.06;
			for (const y of [-s * 0.12, s * 0.14]) {
				ctx.beginPath();
				for (let x = -s / 2, i = 0; x <= s / 2; x += s / 8, i++) ctx.lineTo(x, y + (i % 2 ? s * 0.05 : -s * 0.05));
				ctx.stroke();
			}
			ctx.restore();
		},
		petals(ctx, s, color) {
			ctx.fillStyle = color;
			ctx.beginPath();
			ctx.moveTo(0, -s / 2);
			ctx.quadraticCurveTo(s * 0.45, 0, 0, s / 2);
			ctx.quadraticCurveTo(-s * 0.45, 0, 0, -s / 2);
			ctx.fill();
		},
		nuts(ctx, s, color) {
			if (color === "#f39c3c") {
				// mandarin with a leaf
				ctx.fillStyle = color;
				ctx.beginPath();
				ctx.arc(0, 0, s * 0.42, 0, TAU);
				ctx.fill();
				ctx.fillStyle = "#6fbf73";
				ctx.beginPath();
				ctx.ellipse(s * 0.12, -s * 0.42, s * 0.14, s * 0.07, -0.5, 0, TAU);
				ctx.fill();
				return;
			}
			// nut
			ctx.fillStyle = color;
			ctx.beginPath();
			ctx.ellipse(0, 0, s * 0.38, s * 0.46, 0, 0, TAU);
			ctx.fill();
			ctx.strokeStyle = "rgba(60,30,10,0.45)";
			ctx.lineWidth = s * 0.05;
			ctx.beginPath();
			ctx.moveTo(0, -s * 0.44);
			ctx.lineTo(0, s * 0.44);
			ctx.stroke();
		},
		crowns(ctx, s, color) {
			ctx.fillStyle = color;
			ctx.beginPath();
			const w = s * 0.5;
			const h = s * 0.42;
			ctx.moveTo(-w, h);
			ctx.lineTo(-w, -h * 0.2);
			ctx.lineTo(-w * 0.5, h * 0.2);
			ctx.lineTo(0, -h);
			ctx.lineTo(w * 0.5, h * 0.2);
			ctx.lineTo(w, -h * 0.2);
			ctx.lineTo(w, h);
			ctx.closePath();
			ctx.fill();
			ctx.fillStyle = "#e3242b";
			ctx.beginPath();
			ctx.arc(0, h * 0.45, s * 0.07, 0, TAU);
			ctx.fill();
		},
		emoji(ctx, s, text) {
			ctx.font = `${s}px ${EMOJI_FONT}`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(text, 0, s * 0.05);
		}
	};

	function drawBat(ctx, x, y, s, up, color) {
		ctx.fillStyle = color;
		ctx.beginPath();
		const wy = up ? -s * 0.35 : s * 0.15;
		ctx.moveTo(0 + x, y);
		ctx.quadraticCurveTo(x - s * 0.3, y + wy, x - s * 0.6, y + wy * 0.6);
		ctx.quadraticCurveTo(x - s * 0.45, y + s * 0.05, x - s * 0.25, y + s * 0.12);
		ctx.quadraticCurveTo(x - s * 0.1, y + s * 0.02, x, y + s * 0.18);
		ctx.quadraticCurveTo(x + s * 0.1, y + s * 0.02, x + s * 0.25, y + s * 0.12);
		ctx.quadraticCurveTo(x + s * 0.45, y + s * 0.05, x + s * 0.6, y + wy * 0.6);
		ctx.quadraticCurveTo(x + s * 0.3, y + wy, x, y);
		ctx.fill();
	}

	// ---------- layers ----------

	// Particles that fall (or rise) with a gentle sway and turn.
	class Drift {
		constructor(o, env) {
			this.env = env;
			const def = SHAPE[o.style === "emoji" ? "emoji" : o.shape] || SHAPE.confetti;
			this.up = o.motion === "rise";
			this.items = o.style === "emoji" ? o.emojis || ["✨"] : o.colors || def.colors || ["#ffffff"];
			this.kind = o.style === "emoji" ? "emoji" : o.shape;
			this.size = def.size.map((v) => v * (o.size || 1));
			this.speed = def.speed.map((v) => v * (o.speed || 1));
			this.spin = this.kind === "snow" || this.kind === "confetti" ? 0 : this.kind === "emoji" ? 0.6 : 1.4;
			this.parts = Array.from({ length: o.count }, () => this.spawn(true));
		}
		spawn(anywhere) {
			const { w, h, scale } = this.env;
			const size = Math.round(rand(this.size[0], this.size[1]) * scale);
			const item = pickOne(this.items);
			const kind = this.kind;
			return {
				x: rand(0, w),
				y: anywhere ? rand(0, h) : this.up ? h + size : -size,
				v: rand(this.speed[0], this.speed[1]) * scale,
				phase: rand(0, TAU),
				sway: rand(0.4, 1.2) * 18 * scale,
				rot: rand(0, TAU),
				vr: rand(-1, 1) * this.spin,
				alpha: kind === "snow" ? rand(0.45, 0.95) : rand(0.75, 1),
				// flag emojis don't render on many systems: the Swiss flag is always drawn
				img: item === "🇨🇭" ? sprite("flags:", Math.max(2, Math.round(size * 0.8)), (ctx, s) => DRAW.flags(ctx, s)) : sprite(`${kind}:${item}`, Math.max(2, size), (ctx, s) => DRAW[kind](ctx, s, item))
			};
		}
		step(ctx, dt, t) {
			const { h } = this.env;
			for (let i = 0; i < this.parts.length; i++) {
				const p = this.parts[i];
				p.y += (this.up ? -p.v : p.v) * dt;
				p.rot += p.vr * dt;
				const x = p.x + Math.sin(t * 0.0012 + p.phase) * p.sway;
				if ((!this.up && p.y > h + p.img.height) || (this.up && p.y < -p.img.height)) {
					this.parts[i] = this.spawn(false);
					continue;
				}
				ctx.globalAlpha = p.alpha;
				if (p.vr) {
					ctx.save();
					ctx.translate(x, p.y);
					ctx.rotate(p.rot);
					ctx.drawImage(p.img, -p.img.width / 2, -p.img.height / 2);
					ctx.restore();
				} else ctx.drawImage(p.img, x - p.img.width / 2, p.y - p.img.height / 2);
			}
			ctx.globalAlpha = 1;
		}
	}

	// Bats crossing the screen in waves.
	class Bats {
		constructor(o, env) {
			this.env = env;
			this.color = (o.colors && o.colors[0]) || "#ff9a3c";
			this.size = 46 * (o.size || 1);
			this.speed = 120 * (o.speed || 1);
			this.parts = Array.from({ length: o.count }, (_, i) => this.spawn(i * 0.7));
		}
		spawn(delay) {
			const { w, h, scale } = this.env;
			const dir = Math.random() < 0.5 ? 1 : -1;
			return { dir, x: dir > 0 ? -60 : w + 60, y: rand(0.08, 0.6) * h, s: rand(0.6, 1.1) * this.size * scale, v: rand(0.7, 1.3) * this.speed * scale, wait: delay + rand(0, 1.5), phase: rand(0, TAU) };
		}
		step(ctx, dt, t) {
			const { w } = this.env;
			for (let i = 0; i < this.parts.length; i++) {
				const b = this.parts[i];
				if (b.wait > 0) {
					b.wait -= dt;
					continue;
				}
				b.x += b.dir * b.v * dt;
				const y = b.y + Math.sin(t * 0.003 + b.phase) * b.s * 0.6;
				ctx.globalAlpha = 0.8;
				drawBat(ctx, b.x, y, b.s, Math.sin(t * 0.025 + b.phase) > 0, this.color);
				if ((b.dir > 0 && b.x > w + 80) || (b.dir < 0 && b.x < -80)) this.parts[i] = this.spawn(rand(4, 14));
			}
			ctx.globalAlpha = 1;
		}
	}

	// Rockets and bursts. `hours` limits launching to a time of day.
	class Fireworks {
		constructor(o, env) {
			this.env = env;
			this.colors = o.fireworksColors || (o.id === "bundesfeier" ? ["#ff3b3b", "#ffffff", "#ff8080"] : ["#ffd76a", "#ff6b8b", "#7ad7ff", "#ffffff", "#9bf6a0", "#d6a8ff"]);
			this.hours = o.fireworksHours || null;
			this.interval = 1.4 / (o.speed || 1);
			this.sparks = Math.round(55 * Math.min(1.6, (o.count || 30) / 30 || 1));
			this.rockets = [];
			this.bits = [];
			this.next = 0.5;
		}
		allowed() {
			if (!this.hours || !root.SwissOverlayDates) return true;
			return root.SwissOverlayDates.isActive({ from: "01-01", until: "12-31", hours: this.hours }, new Date());
		}
		step(ctx, dt) {
			const { w, h, scale } = this.env;
			this.next -= dt;
			if (this.next <= 0) {
				this.next = this.interval * rand(0.6, 1.4);
				if (this.allowed()) this.rockets.push({ x: rand(0.15, 0.85) * w, y: h, vy: -rand(0.55, 0.75) * h, top: rand(0.18, 0.5) * h, color: pickOne(this.colors) });
			}
			ctx.globalCompositeOperation = "lighter";
			for (let i = this.rockets.length - 1; i >= 0; i--) {
				const r = this.rockets[i];
				r.y += r.vy * dt;
				ctx.fillStyle = r.color;
				ctx.globalAlpha = 0.9;
				ctx.fillRect(r.x - scale, r.y, 2 * scale, 7 * scale);
				if (r.y <= r.top) {
					this.rockets.splice(i, 1);
					for (let k = 0; k < this.sparks; k++) {
						const a = rand(0, TAU);
						const v = rand(0.25, 1) * 170 * scale;
						this.bits.push({ x: r.x, y: r.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(1.1, 1.9), age: 0, color: Math.random() < 0.8 ? r.color : "#ffffff" });
					}
				}
			}
			for (let i = this.bits.length - 1; i >= 0; i--) {
				const b = this.bits[i];
				b.age += dt;
				if (b.age > b.life) {
					this.bits.splice(i, 1);
					continue;
				}
				b.vy += 60 * scale * dt;
				b.vx *= 0.985;
				b.vy *= 0.985;
				b.x += b.vx * dt;
				b.y += b.vy * dt;
				ctx.globalAlpha = Math.max(0, 1 - b.age / b.life);
				ctx.fillStyle = b.color;
				ctx.beginPath();
				ctx.arc(b.x, b.y, 1.8 * scale, 0, TAU);
				ctx.fill();
			}
			ctx.globalAlpha = 1;
			ctx.globalCompositeOperation = "source-over";
		}
	}

	// Advent candles (1–4), bottom corner, with a living flame.
	class Candles {
		constructor(o, env) {
			this.env = env;
			this.n = Math.max(1, Math.min(4, o.candleCount || 1));
			this.right = o.candlesPosition === "bottom-right";
		}
		step(ctx, dt, t) {
			const { w, h, scale } = this.env;
			const cw = 16 * scale;
			const gap = 26 * scale;
			const total = 4 * cw + 3 * (gap - cw);
			const x0 = this.right ? w - total - 50 * scale : 50 * scale;
			const base = h - 40 * scale;
			for (let i = 0; i < 4; i++) {
				const x = x0 + i * gap;
				const ch = (70 - i * 6) * scale;
				ctx.fillStyle = "rgba(255,244,225,0.85)";
				ctx.fillRect(x, base - ch, cw, ch);
				if (i >= this.n) continue;
				const flick = 1 + Math.sin(t * 0.012 + i * 1.7) * 0.08 + Math.sin(t * 0.031 + i) * 0.05;
				const fx = x + cw / 2;
				const fy = base - ch - 10 * scale;
				const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, 30 * scale * flick);
				g.addColorStop(0, "rgba(255,200,90,0.35)");
				g.addColorStop(1, "rgba(255,200,90,0)");
				ctx.fillStyle = g;
				ctx.fillRect(fx - 32 * scale, fy - 32 * scale, 64 * scale, 64 * scale);
				ctx.fillStyle = "#ffd36b";
				ctx.beginPath();
				ctx.ellipse(fx, fy, 4.5 * scale, 10 * scale * flick, 0, 0, TAU);
				ctx.fill();
			}
		}
	}

	// A string of lights along the top edge.
	class Lights {
		constructor(o, env) {
			this.env = env;
			this.colors = o.lightsColors || ["#ffd76a", "#ff6b6b", "#7ad7ff", "#9bf6a0", "#ffb3e6"];
			this.phase = Array.from({ length: 40 }, () => rand(0, TAU));
		}
		step(ctx, dt, t) {
			const { w, scale } = this.env;
			const n = Math.max(10, Math.round(w / (70 * scale)));
			const sag = 22 * scale;
			ctx.strokeStyle = "rgba(255,255,255,0.18)";
			ctx.lineWidth = 1.5 * scale;
			ctx.beginPath();
			for (let i = 0; i <= n; i++) {
				const x = (i / n) * w;
				ctx.lineTo(x, 8 * scale + Math.abs(Math.sin((i / n) * Math.PI * 4)) * sag);
			}
			ctx.stroke();
			for (let i = 0; i < n; i++) {
				const x = ((i + 0.5) / n) * w;
				const y = 8 * scale + Math.abs(Math.sin(((i + 0.5) / n) * Math.PI * 4)) * sag + 6 * scale;
				const glow = 0.55 + 0.45 * Math.sin(t * 0.002 + this.phase[i % this.phase.length]);
				ctx.globalAlpha = 0.35 + glow * 0.65;
				ctx.fillStyle = this.colors[i % this.colors.length];
				ctx.beginPath();
				ctx.ellipse(x, y, 4 * scale, 6 * scale, 0, 0, TAU);
				ctx.fill();
			}
			ctx.globalAlpha = 1;
		}
	}

	// Spider webs in the upper corners (drawn every frame, cheap lines).
	class Webs {
		constructor(o, env) {
			this.env = env;
		}
		web(ctx, cx, cy, r, flip) {
			ctx.save();
			ctx.translate(cx, cy);
			if (flip) ctx.scale(-1, 1);
			ctx.strokeStyle = "rgba(255,255,255,0.28)";
			ctx.lineWidth = 1;
			const spokes = 7;
			for (let i = 0; i <= spokes; i++) {
				const a = (i / spokes) * (Math.PI / 2);
				ctx.beginPath();
				ctx.moveTo(0, 0);
				ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
				ctx.stroke();
			}
			for (let k = 1; k <= 5; k++) {
				const rr = (k / 5) * r;
				ctx.beginPath();
				for (let i = 0; i <= spokes; i++) {
					const a = (i / spokes) * (Math.PI / 2);
					const sag = i % 1 === 0 ? 0.92 : 1;
					ctx.lineTo(Math.cos(a) * rr * sag, Math.sin(a) * rr * sag);
				}
				ctx.stroke();
			}
			ctx.restore();
		}
		step(ctx) {
			const { w, scale } = this.env;
			const r = Math.min(260 * scale, w * 0.25);
			this.web(ctx, 0, 0, r, false);
			this.web(ctx, w, 0, r, true);
		}
	}

	// ---------- overlay ----------

	class Overlay {
		constructor(canvas, { fps = 30, opacity = 1 } = {}) {
			this.canvas = canvas;
			this.ctx = canvas.getContext("2d");
			this.fps = fps;
			this.layers = [];
			this.raf = null;
			this.last = 0;
			canvas.style.opacity = opacity;
			this.env = { w: 0, h: 0, scale: 1 };
			this.onResize = () => this.resize();
			window.addEventListener("resize", this.onResize);
			this.resize();
		}

		resize() {
			const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
			const w = this.canvas.clientWidth || window.innerWidth;
			const h = this.canvas.clientHeight || window.innerHeight;
			this.canvas.width = Math.round(w * dpr);
			this.canvas.height = Math.round(h * dpr);
			this.env.w = this.canvas.width;
			this.env.h = this.canvas.height;
			this.env.scale = (Math.min(this.env.w, this.env.h) / 1080) * 1.0 || 1;
			if (this.occasion) this.show(this.occasion);
		}

		// Shows an occasion (from SwissOverlayOccasions) or stops everything with null.
		show(occ) {
			this.occasion = occ;
			this.layers = [];
			if (occ) {
				if (occ.webs && occ.style !== "emoji") this.layers.push(new Webs(occ, this.env));
				if (occ.shape === "bats" && occ.style !== "emoji") this.layers.push(new Bats(occ, this.env));
				else this.layers.push(new Drift(occ, this.env));
				if (occ.snow) this.layers.push(new Drift({ shape: "snow", motion: "fall", count: Math.round(occ.count * 1.2), style: "graphics" }, this.env));
				if (occ.lights) this.layers.push(new Lights(occ, this.env));
				if (occ.candles) this.layers.push(new Candles(occ, this.env));
				if (occ.fireworks) this.layers.push(new Fireworks(occ, this.env));
			}
			if (this.layers.length && !this.raf) {
				this.last = performance.now();
				this.raf = requestAnimationFrame((t) => this.frame(t));
			}
			if (!this.layers.length) this.clear();
		}

		frame(t) {
			if (!this.layers.length) {
				this.raf = null;
				return;
			}
			this.raf = requestAnimationFrame((n) => this.frame(n));
			if (t - this.last < 1000 / this.fps - 2) return;
			const dt = Math.min(0.1, (t - this.last) / 1000);
			this.last = t;
			const ctx = this.ctx;
			ctx.clearRect(0, 0, this.env.w, this.env.h);
			for (const layer of this.layers) layer.step(ctx, dt, t);
		}

		clear() {
			if (this.raf) cancelAnimationFrame(this.raf);
			this.raf = null;
			this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		}

		destroy() {
			this.show(null);
			window.removeEventListener("resize", this.onResize);
		}
	}

	root.SwissOverlayEffects = { Overlay, SHAPE };
})(typeof self !== "undefined" ? self : this);

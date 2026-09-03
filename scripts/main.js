// No dependencies. Three behaviours:
//   1. light / dark theme toggle, persisted in localStorage
//   2. the About / Projects / To-do spread toggle, driven off the URL hash
//   3. click the jasmine flower on the "i" of the About heading -> a burst of
//      small jasmine flowers, a few of which settle on the page
(function () {
	'use strict';

	var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

	// play a Web Animations keyframe set, unless the user prefers reduced motion
	function animate(el, frames, opts) {
		if (el && el.animate && !reduceMotion.matches) el.animate(frames, opts);
	}

	/* ============================================================
	   1. theme toggle
	   ============================================================ */
	var root = document.documentElement;
	var toggle = document.querySelector('.theme-toggle');
	var darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

	function effectiveTheme() {
		return root.dataset.theme || (darkQuery.matches ? 'dark' : 'light');
	}
	function syncToggle() {
		var dark = effectiveTheme() === 'dark';
		toggle.setAttribute('aria-pressed', String(dark));
		toggle.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
	}
	if (toggle) {
		toggle.addEventListener('click', function () {
			var next = effectiveTheme() === 'dark' ? 'light' : 'dark';
			root.dataset.theme = next;
			try { localStorage.setItem('theme', next); } catch (e) {}
			syncToggle();
		});
		darkQuery.addEventListener('change', function () {
			if (!root.dataset.theme) syncToggle();
		});
		syncToggle();
	}

	/* ============================================================
	   2. spread toggle
	   ============================================================ */
	var views = {};
	document.querySelectorAll('.view').forEach(function (v) { views[v.id] = v; });

	var tabs = document.querySelectorAll('.tabs [data-view]');
	var defaultView = document.querySelector('.view:not([hidden])').id;
	var onView = function () {};   // the easter egg (section 3) hooks in here

	function show(name) {
		if (!views[name]) name = defaultView;

		Object.keys(views).forEach(function (id) {
			views[id].hidden = id !== name;
		});
		tabs.forEach(function (tab) {
			if (tab.dataset.view === name) tab.setAttribute('aria-current', 'page');
			else tab.removeAttribute('aria-current');
		});
		animate(views[name],
			[{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }],
			{ duration: 200, easing: 'cubic-bezier(0.2, 0, 0, 1)' });
		onView(name);
	}

	tabs.forEach(function (tab) {
		tab.addEventListener('click', function () { location.hash = tab.dataset.view; });
	});
	window.addEventListener('hashchange', function () { show(location.hash.slice(1)); });
	show(location.hash.slice(1));

	/* ============================================================
	   3. jasmine burst on the flower-i of the About heading
	   ============================================================ */
	var about = document.getElementById('about');
	var nameEl = about && about.querySelector('.name');
	var ji = nameEl && nameEl.querySelector('.ji');
	var trigger = nameEl && nameEl.querySelector('.egg-trigger');
	var page = about && about.querySelector('.page');
	if (!nameEl || !ji || !trigger || !page) return;

	// colours real jasmine blooms in — white / ivory (fresh & aged blooms),
	// the named colour "Jasmine" #F8DE7E (yellow jasmines: J. mesnyi / humile),
	// blush & rose (J. x stephanense, J. polyanthum buds) — plus one of the
	// site's pink accent, as a wink. White/ivory weighted x2.
	var JCOLORS = ['#FFFFFF', '#FFFFFF', '#F7F1E4', '#F7F1E4', '#F8DE7E', '#F2C6CF', '#E19FAC', '#FF3D71'];
	function pick() { return JCOLORS[(Math.random() * JCOLORS.length) | 0]; }

	var settled = [];
	var canvas, ctx, dpr = 1, particles = [], raf = 0, sprites = {};
	var pageRect;   // .page bounds, read once per burst

	// a flower element: the same masked shape as .ji::before, tinted
	function flowerEl(color) {
		var el = document.createElement('div');
		el.className = 'settled';
		el.style.backgroundColor = color;
		return el;
	}
	function fade(el) {
		if (!el) return;
		el.style.opacity = '0';
		setTimeout(function () { el.remove(); }, 650);
	}

	/* ---- keep the (invisible) hit target over the flower ---- */
	function placeTrigger() {
		var r = ji.getBoundingClientRect();
		var nr = nameEl.getBoundingClientRect();
		if (!r.width) return;   // About is hidden — nothing to measure
		var size = Math.max(32, r.width + 24);
		trigger.style.width = trigger.style.height = size + 'px';
		trigger.style.left = (r.left - nr.left + r.width / 2 - size / 2) + 'px';
		trigger.style.top = (r.top - nr.top - size * 0.55) + 'px';
	}
	placeTrigger();
	if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeTrigger);

	/* ---- particle canvas (built on first burst, dropped on teardown) ---- */
	function ensureCanvas() {
		if (canvas) return;
		canvas = document.createElement('canvas');
		canvas.className = 'fx';
		document.body.appendChild(canvas);
		ctx = canvas.getContext('2d');
		sizeCanvas();
	}
	function sizeCanvas() {
		dpr = Math.min(2, window.devicePixelRatio || 1);
		canvas.width = window.innerWidth * dpr;
		canvas.height = window.innerHeight * dpr;
		canvas.style.width = window.innerWidth + 'px';
		canvas.style.height = window.innerHeight + 'px';
	}
	// a rasterised flower for the canvas — the same shape as --flower (and
	// .ji::before / .settled): 5 ellipse petals + a centre disc, spec'd in a
	// 24-unit box. Built as ONE path filled once (no internal seams), then
	// blitted with a soft shadow for the outer edge — the canvas analogue of
	// .settled's drop-shadow.
	function sprite(color) {
		if (sprites[color]) return sprites[color];
		var S = 44, u = (S - 6) / 24;   // 3px padding so the shadow isn't clipped

		var flower = document.createElement('canvas');
		flower.width = flower.height = S;
		var fg = flower.getContext('2d');
		fg.translate(S / 2, S / 2);
		fg.fillStyle = color;
		fg.beginPath();
		for (var i = 0; i < 5; i++) {
			fg.rotate(Math.PI * 2 / 5);
			fg.moveTo(2.4 * u, -5.3 * u);
			fg.ellipse(0, -5.3 * u, 2.4 * u, 4.7 * u, 0, 0, Math.PI * 2);
		}
		fg.moveTo(3 * u, 0);
		fg.arc(0, 0, 3 * u, 0, Math.PI * 2);
		fg.fill();

		var c = document.createElement('canvas');
		c.width = c.height = S;
		var g = c.getContext('2d');
		g.shadowColor = 'rgba(40, 36, 30, 0.5)';
		g.shadowBlur = 1;
		g.drawImage(flower, 0, 0);
		sprites[color] = c;
		return c;
	}

	function burst(x, y, n) {
		ensureCanvas();
		pageRect = page.getBoundingClientRect();
		// the first 2-3 flowers are "settlers": thrown with the rest but they
		// don't fade — they slow, come to rest, and stay
		var settlers = 2 + (Math.random() < 0.5 ? 1 : 0);
		for (var i = 0; i < n && particles.length < 170; i++) {
			var settle = i < settlers;
			var a = Math.random() * Math.PI * 2;
			var sp = settle ? 3.5 + Math.random() * 5 : 2 + Math.random() * 7;
			var size = 9 + Math.random() * 11;
			var col = pick();
			particles.push({
				x: x, y: y,
				vx: Math.cos(a) * sp,
				vy: Math.sin(a) * sp - 2.4,
				rot: Math.random() * 6.28,
				vr: (Math.random() - 0.5) * 0.32,
				size: size, half: size / 2,
				life: 0,
				ttl: 70 + Math.random() * 60,
				col: col, spr: sprite(col),
				settle: settle,
				grav: settle ? 0.14 : 0.16,
				drag: settle ? 0.975 : 0.992
			});
		}
		if (!raf) raf = requestAnimationFrame(tick);
	}

	function tick() {
		raf = 0;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.save();
		ctx.scale(dpr, dpr);
		for (var i = particles.length - 1; i >= 0; i--) {
			var p = particles[i];
			p.life++;
			p.vy += p.grav;
			p.vx *= p.drag;
			p.vy *= p.drag;
			p.x += p.vx;
			p.y += p.vy;
			p.rot += p.vr;

			if (p.settle) {
				if (p.life > 78 || (p.life > 20 && Math.abs(p.vx) + Math.abs(p.vy) < 0.7)) {
					land(p);
					particles.splice(i, 1);
					continue;
				}
				ctx.globalAlpha = 1;
			} else {
				var k = p.life / p.ttl;
				if (k >= 1) { particles.splice(i, 1); continue; }
				ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
			}

			ctx.translate(p.x, p.y);
			ctx.rotate(p.rot);
			ctx.drawImage(p.spr, -p.half, -p.half, p.size, p.size);
			ctx.rotate(-p.rot);
			ctx.translate(-p.x, -p.y);
		}
		ctx.restore();
		if (particles.length) raf = requestAnimationFrame(tick);
	}

	/* ---- a slowed settler comes to rest as a DOM flower where it stopped,
	   nudged into a page margin if that spot is over the text ---- */
	function inText(fx, fy, w, h) {
		return fx > w * 0.1 && fx < w * 0.9 && fy > h * 0.18 && fy < h * 0.84;
	}
	function marginSpot(w, h) {
		var b = Math.random();
		if (b < 0.34) return [(0.04 + Math.random() * 0.92) * w, (0.02 + Math.random() * 0.11) * h];
		if (b < 0.68) return [(0.04 + Math.random() * 0.92) * w, (0.87 + Math.random() * 0.11) * h];
		if (b < 0.84) return [(0.015 + Math.random() * 0.09) * w, (0.08 + Math.random() * 0.84) * h];
		return [(0.9 + Math.random() * 0.09) * w, (0.08 + Math.random() * 0.84) * h];
	}
	function land(p) {
		var w = pageRect.width, h = pageRect.height, inset = 10;
		var lx = Math.min(w - inset, Math.max(inset, p.x - pageRect.left));
		var ly = Math.min(h - inset, Math.max(inset, p.y - pageRect.top));
		if (inText(lx, ly, w, h)) {
			var m = marginSpot(w, h);
			lx = m[0];
			ly = m[1];
		}
		var deg = p.rot * 180 / Math.PI + (Math.random() * 30 - 15);
		var base = 'translate(-50%,-50%) rotate(' + deg + 'deg)';
		var el = flowerEl(p.col);
		el.style.width = (p.size + 3) + 'px';
		el.style.left = lx + 'px';
		el.style.top = ly + 'px';
		el.style.opacity = '0.95';
		el.style.transform = base;
		page.appendChild(el);
		settled.push(el);
		animate(el,
			[{ transform: base + ' scale(1.35)' }, { transform: base + ' scale(1)' }],
			{ duration: 260, easing: 'cubic-bezier(.2,1.4,.4,1)' });
		while (settled.length > 13) fade(settled.shift());
		setTimeout(function () { fade(el); }, 17000);
	}

	function popJi() {
		ji.classList.remove('pop');
		void ji.offsetWidth;
		ji.classList.add('pop');
	}

	// reduced motion: no canvas, no flight — a few flowers just appear near the
	// "i" and fade
	function softPoof(x, y) {
		for (var i = 0; i < 5; i++) {
			(function () {
				var el = flowerEl(pick());
				el.classList.add('settled--loose');
				el.style.left = (x + Math.random() * 60 - 30) + 'px';
				el.style.top = (y + Math.random() * 46 - 23) + 'px';
				el.style.opacity = '0';
				document.body.appendChild(el);
				settled.push(el);
				requestAnimationFrame(function () { el.style.opacity = '0.95'; });
				setTimeout(function () { fade(el); }, 2200);
			})();
		}
	}

	function resetEgg() {
		settled.forEach(fade);
		settled = [];
		particles.length = 0;
		if (raf) { cancelAnimationFrame(raf); raf = 0; }
		if (canvas) { canvas.remove(); canvas = ctx = null; }
	}

	/* ---- wiring ---- */
	trigger.addEventListener('click', function () {
		popJi();
		var f = ji.getBoundingClientRect();
		var x = f.left + f.width * 0.5, y = f.top - f.height * 0.35;
		if (reduceMotion.matches) softPoof(x, y);
		else burst(x, y, 44);
	});

	var pending = 0;
	window.addEventListener('resize', function () {
		if (pending) return;
		pending = requestAnimationFrame(function () {
			pending = 0;
			placeTrigger();
			if (canvas) sizeCanvas();
		});
	});

	// re-fit on return to About, tear down when leaving it (called from show())
	onView = function (name) {
		if (name === 'about') requestAnimationFrame(placeTrigger);
		else resetEgg();
	};
})();

// Two small behaviours, no dependencies:
//   1. light / dark theme toggle, persisted in localStorage
//   2. the About / Projects spread toggle, driven off the URL hash
//      (#about / #projects) so tab clicks, the wordmark link, the back button
//      and shared links all flow through one render path
(function () {
	'use strict';

	/* ---------- theme toggle ---------- */
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

	/* ---------- spread toggle ---------- */
	var views = {};
	document.querySelectorAll('.view').forEach(function (v) { views[v.id] = v; });

	var tabs = document.querySelectorAll('.tabs [data-view]');
	var defaultView = document.querySelector('.view:not([hidden])').id;
	var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

	function show(name) {
		if (!views[name]) name = defaultView;

		Object.keys(views).forEach(function (id) {
			views[id].hidden = id !== name;
		});

		tabs.forEach(function (tab) {
			if (tab.dataset.view === name) tab.setAttribute('aria-current', 'page');
			else tab.removeAttribute('aria-current');
		});

		if (!reduceMotion.matches && views[name].animate) {
			views[name].animate(
				[
					{ opacity: 0, transform: 'translateY(6px)' },
					{ opacity: 1, transform: 'none' }
				],
				{ duration: 200, easing: 'cubic-bezier(0.2, 0, 0, 1)' }
			);
		}
	}

	tabs.forEach(function (tab) {
		tab.addEventListener('click', function () {
			location.hash = tab.dataset.view;
		});
	});

	window.addEventListener('hashchange', function () {
		show(location.hash.slice(1));
	});

	// Honour an existing #about / #projects on load; show() falls back otherwise.
	show(location.hash.slice(1));
})();

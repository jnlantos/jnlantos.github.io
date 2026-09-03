// Toggles the About / Projects views without a page load. Replaces the old
// jQuery version (show/hide) with plain DOM APIs and drives everything off the
// URL hash, so button clicks, the back button, and shared links (#about /
// #projects) all flow through a single render path.
(function () {
	var views = {};
	document.querySelectorAll('.view').forEach(function (section) {
		views[section.dataset.view] = section;
	});

	var buttons = document.querySelectorAll('.menu [data-view]');
	// The view the markup leaves visible is the default; nothing hardcodes "about".
	var defaultView = document.querySelector('.view:not([hidden])').dataset.view;

	function show(name) {
		if (!views[name]) name = defaultView;

		Object.keys(views).forEach(function (key) {
			views[key].hidden = key !== name;
		});

		buttons.forEach(function (btn) {
			if (btn.dataset.view === name) {
				btn.setAttribute('aria-current', 'page');
			} else {
				btn.removeAttribute('aria-current');
			}
		});
	}

	buttons.forEach(function (btn) {
		btn.addEventListener('click', function () {
			location.hash = btn.dataset.view;
		});
	});

	window.addEventListener('hashchange', function () {
		show(location.hash.slice(1));
	});

	// Honour an existing #about / #projects on load; show() falls back otherwise.
	show(location.hash.slice(1));
})();

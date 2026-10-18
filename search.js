// Search: services and tools (from each project's tags), projects, pages and parts.
// Choosing a service marks the accounts and projects that use it until it is cleared.
(function () {
  var N = window.DRAWING.nodes, root = window.DRAWING.root;
  var box = document.getElementById('search'), input = document.getElementById('q'), list = document.getElementById('q-list');
  var filter = document.getElementById('filter');
  var path = [], active = null, rows = [], pick = -1;

  // ---------- The index ----------
  var tags = {};
  Object.keys(N).forEach(function (id) { (N[id].tags || []).forEach(function (t) { (tags[t] = tags[t] || []).push(id); }); });
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  function where(id) {
    var n = N[id];
    if (n.kind === 'comp') return N[N[n.parent].parent].label;
    if (n.kind === 'account') return 'AWS account';
    if (n.tags) return N[n.parent].label + ' account';
    return n.parent && n.parent !== root ? N[n.parent].label : '';
  }
  var items = Object.keys(tags).map(function (t) { return { tag: t, label: t, meta: plural(tags[t].length, 'project'), rank: 0 }; });
  Object.keys(N).forEach(function (id) {
    var n = N[id];
    if (id === root || n.kind === 'frame') return;
    items.push({ id: id, label: n.label, meta: where(id), rank: n.kind === 'comp' ? 2 : 1 });
  });
  var popular = Object.keys(tags).sort(function (a, b) { return tags[b].length - tags[a].length || a.localeCompare(b); }).slice(0, 8)
    .map(function (t) { return items.filter(function (x) { return x.tag === t; })[0]; });

  function find(q) {
    q = q.trim().toLowerCase();
    if (!q) return popular;
    return items.map(function (x) {
      var l = x.label.toLowerCase(), i = l.indexOf(q);
      if (i < 0) return null;
      var at = i === 0 ? 0 : /[\s·(-]/.test(l[i - 1]) ? 1 : 2;
      return { x: x, s: x.rank * 10 + at };
    }).filter(Boolean).sort(function (a, b) { return a.s - b.s || a.x.label.length - b.x.label.length; })
      .slice(0, 8).map(function (r) { return r.x; });
  }

  // ---------- The list ----------
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function show() {
    rows = find(input.value);
    pick = rows.length ? 0 : -1;
    var head = input.value.trim() ? '' : '<li class="q-head" role="presentation">Most used</li>';
    list.innerHTML = rows.length ? head + rows.map(function (x, i) {
      return '<li role="option" id="q-' + i + '" data-i="' + i + '"><span class="q-name">' + esc(x.label) + '</span><span class="q-meta">' + esc(x.meta) + '</span></li>';
    }).join('') : '<li class="q-none" role="presentation">Nothing called that here</li>';
    box.classList.add('open');
    input.setAttribute('aria-expanded', 'true');
    mark();
  }
  function hide() { box.classList.remove('open'); input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); }
  function mark() {
    [].forEach.call(list.querySelectorAll('[role=option]'), function (li) { li.classList.toggle('on', +li.getAttribute('data-i') === pick); });
    if (pick > -1) input.setAttribute('aria-activedescendant', 'q-' + pick); else input.removeAttribute('aria-activedescendant');
  }
  function choose(x) {
    input.value = ''; hide(); input.blur();
    if (x.tag) showTag(x.tag);
    else window.goTo(x.id);
  }

  input.addEventListener('focus', show);
  input.addEventListener('input', show);
  input.addEventListener('blur', function () { setTimeout(hide, 120); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (rows.length) { pick = (pick + (e.key === 'ArrowDown' ? 1 : rows.length - 1)) % rows.length; mark(); }
    } else if (e.key === 'Enter' && pick > -1) {
      e.preventDefault(); choose(rows[pick]);
    } else if (e.key === 'Escape') {
      e.stopPropagation(); input.value = ''; hide(); input.blur();
    }
  });
  list.addEventListener('mousedown', function (e) { e.preventDefault(); });
  list.addEventListener('click', function (e) { var li = e.target.closest('[data-i]'); if (li) choose(rows[+li.getAttribute('data-i')]); });
  window.addEventListener('keydown', function (e) {
    if (e.key === '/' && !(e.target.closest && e.target.closest('input, textarea'))) { e.preventDefault(); input.focus(); }
  });

  // ---------- A chosen service ----------
  function showTag(t) {
    if (!tags[t]) return;
    active = t;
    var ids = tags[t];
    filter.innerHTML = '<div class="f-head"><span><b>' + esc(t) + '</b> · ' + plural(ids.length, 'project') + '</span>' +
      '<button class="f-x" aria-label="Clear ' + esc(t) + '">&times;</button></div>' +
      '<ul>' + ids.map(function (id) { return '<li><button data-go="' + id + '">' + esc(N[id].label) + '</button></li>'; }).join('') + '</ul>';
    filter.hidden = false;
    if (ids.length === 1) window.goTo(ids[0], { quiet: true });
    else if (path.indexOf('org') < 0) window.goTo('org', { quiet: true });
    else window.reframe();
    paint();
  }
  function clearTag() { active = null; filter.hidden = true; filter.innerHTML = ''; paint(); window.reframe(); }
  filter.addEventListener('click', function (e) {
    if (e.target.closest('.f-x')) { clearTag(); return; }
    var b = e.target.closest('[data-go]');
    if (b) window.goTo(b.getAttribute('data-go'), { quiet: true });
  });

  // Elements are made and removed as the visitor moves, so marks are put back after every draw
  function paint() {
    var ids = active ? tags[active] : [], accts = ids.map(function (id) { return N[id].parent; });
    [].forEach.call(document.querySelectorAll('#world [data-id]'), function (g) {
      var id = g.getAttribute('data-id'), n = N[id], hit = ids.indexOf(id) > -1 || accts.indexOf(id) > -1;
      var counts = n.tags || n.kind === 'account';
      g.classList.toggle('match', !!active && hit);
      g.classList.toggle('dim', !!active && counts && !hit);
    });
  }
  window.addEventListener('route', function (e) { path = e.detail.path; paint(); });
  window.showTag = showTag;
})();

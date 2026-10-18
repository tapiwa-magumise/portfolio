// The engine: lays out the open branch, retracts what was left behind, moves what stays,
// then draws what is new. Structure changes at once; only the look is animated, so any
// click can finish every animation and start the next route straight away.
(function () {
  var D = window.DRAWING, N = D.nodes;
  var NS = 'http://www.w3.org/2000/svg';
  var svg = document.getElementById('world');
  var L = { boxes: svg.querySelector('#boxes'), wires: svg.querySelector('#wires'), marks: svg.querySelector('#marks'), nodes: svg.querySelector('#nodes'), pen: svg.querySelector('#pen') };
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var HG = 130, VG = 34, TILE_W = 210, TILE_H = 170, NOTE_W = 300;
  var ACCT_W = 340, SHUT_W = 330, SHUT_H = 96;

  // ---------- One clock for every animation ----------
  var running = new Set();
  var easeIO = function (t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
  function anim(o) {
    var rec = { started: false }, ease = o.ease || easeIO;
    function begin() { if (!rec.started) { rec.started = true; if (o.start) o.start(); } }
    rec.finish = function () { if (!running.has(rec)) return; running.delete(rec); begin(); if (o.step) o.step(1); if (o.done) o.done(); };
    running.add(rec);
    if (still) { rec.finish(); return rec; }
    var t0 = performance.now() + (o.delay || 0);
    (function frame(now) {
      if (!running.has(rec)) return;
      if (now >= t0) {
        begin();
        var t = o.ms ? Math.min(1, (now - t0) / o.ms) : 1;
        if (o.step) o.step(ease(t));
        if (t >= 1) { rec.finish(); return; }
      }
      requestAnimationFrame(frame);
    })(performance.now());
    return rec;
  }
  function finishAll() { Array.from(running).forEach(function (r) { r.finish(); }); }

  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function text(parent, x, y, str, cls, anchor) {
    var t = el('text', { x: x, y: y, class: cls }, parent);
    if (anchor) t.setAttribute('text-anchor', anchor);
    t.textContent = str;
    return t;
  }
  function rectD(x, y, w, h) { return 'M' + x + ' ' + y + 'h' + w + 'v' + h + 'h' + (-w) + 'z'; }
  function wrap(str, width) {
    var max = Math.floor(width / 7.4), lines = [], line = '';
    str.split(' ').forEach(function (w) {
      if (line && (line + ' ' + w).length > max) { lines.push(line); line = w; } else line = line ? line + ' ' + w : w;
    });
    if (line) lines.push(line);
    return lines;
  }

  // ---------- Pen work ----------
  var pen = el('circle', { r: 3.5, class: 'pen-dot', opacity: 0 }, L.pen);
  function inkMs(len) { return Math.max(220, Math.min(800, len / 1.8)); }
  function ink(p, delay, ms, o) {
    o = o || {};
    var len = 0;
    if (!o.reverse) p.style.strokeDasharray = '0 100000';
    return anim({ delay: delay, ms: ms,
      start: function () { len = p.getTotalLength(); p.style.strokeDasharray = len + ' ' + len; p.style.strokeDashoffset = o.reverse ? 0 : len; },
      step: function (t) {
        p.style.strokeDashoffset = len * (o.reverse ? t : 1 - t);
        if (o.pen) { var pt = p.getPointAtLength(len * t); pen.setAttribute('cx', pt.x); pen.setAttribute('cy', pt.y); pen.setAttribute('opacity', t < 1 ? 1 : 0); }
      },
      done: function () { if (!o.reverse) { p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; } if (o.done) o.done(); } });
  }
  function fade(node, delay, ms, out, done) {
    if (!out) node.style.opacity = 0;
    return anim({ delay: delay, ms: ms, step: function (t) { node.style.opacity = out ? 1 - t : t; }, done: function () { node.style.opacity = out ? 0 : ''; if (done) done(); } });
  }
  // Notes are written line by line, left to right
  var clipN = 0;
  function noteText(parent, x, y, lines, anchor) {
    return lines.map(function (line, i) {
      var t = text(parent, x, y + i * 20, line, 'note', anchor === 'middle' ? 'middle' : null);
      var w = line.length * 7.6 + 8, id = 'clip' + (++clipN);
      var cp = el('clipPath', { id: id, clipPathUnits: 'userSpaceOnUse' }, parent);
      var r = el('rect', { x: anchor === 'middle' ? x - w / 2 : x - 2, y: y + i * 20 - 17, width: w, height: 24 }, cp);
      t.setAttribute('clip-path', 'url(#' + id + ')');
      return { t: t, r: r, w: w };
    });
  }
  function write(notes, delay) {
    notes.forEach(function (n, i) {
      n.r.setAttribute('width', 0);
      anim({ delay: delay + i * 260, ms: 260, ease: function (t) { return t; }, step: function (t) { n.r.setAttribute('width', n.w * t); } });
    });
    return delay + notes.length * 260;
  }

  // ---------- State ----------
  var open = new Set(), current = null, mode = 'one', userMoved = false;
  function isOpen(id) { return N[id].kind === 'frame' || open.has(id); }
  function kidsOf(id) { return isOpen(id) ? (N[id].children || []) : []; }
  function pathTo(id) { var p = []; while (id) { p.unshift(id); id = N[id].parent; } return p; }

  // ---------- Layout: only what is open, left to right ----------
  function tileSelf(n) {
    var lines = n.note ? wrap(n.note, NOTE_W).length : 0;
    return { w: n.note ? NOTE_W + 30 : TILE_W, h: TILE_H + (lines ? lines * 20 + 16 : 0) };
  }
  function acctGeom(id) {
    var n = N[id], lines = wrap(n.note, ACCT_W - 36), y = 84 + lines.length * 20, tiles = {};
    n.children.forEach(function (c, i) { tiles[c] = y + 58 + i * (TILE_H + 8); });
    return { w: ACCT_W, h: y + n.children.length * (TILE_H + 8) + 8, tiles: tiles, lines: lines };
  }
  var frames = {};
  function frameGeom(id) {
    if (frames[id]) return frames[id];
    var n = N[id], lines = wrap(n.note, n.w - 12), head = 84 + lines.length * 20;
    return (frames[id] = { w: n.w + 24, h: head + n.h + 12, head: head, lines: lines });
  }

  var G = {};                                          // where everything should be
  function place(id, x, y, dry) {
    var n = N[id];
    if (n.kind === 'frame') {
      var f = frameGeom(id);
      if (!dry) {
        G[id] = { x: x, y: y, w: f.w, h: f.h };
        n.children.forEach(function (c) {
          G[c] = { x: x + 12 + N[c].x, y: y + f.head + N[c].y };
        });
      }
      return { w: f.w, h: f.h, ay: 40 };
    }
    if (n.kind === 'account') {
      if (!isOpen(id)) { if (!dry) G[id] = { x: x, y: y, w: SHUT_W, h: SHUT_H, open: 0 }; return { w: SHUT_W, h: SHUT_H, ay: SHUT_H / 2 }; }
      var v = acctGeom(id), w = v.w, h = v.h, prev = -VG;
      // A project opened inside the account hangs its detail outside, level with it
      var hang = n.children.filter(function (c) { return open.has(c); }).map(function (c) {
        var fid = N[c].children[0], s = place(fid, 0, 0, true);
        var top = Math.max(v.tiles[c] - s.ay, prev + VG);
        prev = top + s.h; w = Math.max(w, v.w + HG + s.w); h = Math.max(h, top + s.h);
        return { fid: fid, top: top };
      });
      if (!dry) {
        G[id] = { x: x, y: y, w: v.w, h: v.h, open: 1 };
        n.children.forEach(function (c) { G[c] = { x: x + v.w / 2, y: y + v.tiles[c] }; });
        hang.forEach(function (hh) { place(hh.fid, x + v.w + HG, y + hh.top, false); });
      }
      return { w: w, h: h, ay: 40 };
    }
    var s = tileSelf(n), kids = kidsOf(id);
    if (!kids.length) { if (!dry) G[id] = { x: x + s.w / 2, y: y + 58 }; return { w: s.w, h: s.h, ay: 58 }; }
    var gap = id === 'edge' ? 110 : VG, ks = kids.map(function (k) { return place(k, 0, 0, true); }), tops = [], ky = 0;
    ks.forEach(function (k) { tops.push(ky); ky += k.h + gap; });
    var kh = ky - gap, anchor = (tops[0] + ks[0].ay + tops[ks.length - 1] + ks[ks.length - 1].ay) / 2;
    if (id === 'edge') anchor = tops[0] + ks[0].ay;      // the way in runs straight to the gateway
    var top = Math.min(0, anchor - 58), bottom = Math.max(kh, anchor - 58 + s.h), sh = -top;
    var kw = Math.max.apply(null, ks.map(function (k) { return k.w; }));
    if (!dry) {
      G[id] = { x: x + s.w / 2, y: y + anchor + sh };
      kids.forEach(function (k, i) { place(k, x + s.w + HG, y + tops[i] + sh, false); });
    }
    return { w: s.w + HG + kw, h: bottom - top, ay: anchor + sh };
  }
  function rectOf(id) {
    var n = N[id], g = G[id];
    if (n.kind === 'account' || n.kind === 'frame') return g;
    var s = tileSelf(n);
    return { x: g.x - s.w / 2, y: g.y - 58, w: s.w, h: s.h };
  }
  function union(rs) {
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    rs.forEach(function (r) { x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y); x1 = Math.max(x1, r.x + r.w); y1 = Math.max(y1, r.y + r.h); });
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  function layout() {
    G = {};
    place(D.root, 0, 0, false);
  }

  // ---------- Wires ----------
  function treeRoute(S, a, b) {
    var A = S[a], B = S[b], nb = N[b], ax = A.x + 48, ay = A.y, bx, by;
    if (nb.kind === 'account') { bx = B.x; by = B.y + (B.open ? 40 : B.h / 2); }
    else if (nb.kind === 'frame') { bx = B.x; by = Math.min(Math.max(ay, B.y + 30), B.y + B.h - 30); }
    else { bx = B.x - 48; by = B.y; }
    if (Math.abs(ay - by) < 1) return 'M' + ax + ' ' + ay + 'H' + bx;
    var tx = ax + Math.min(50, (bx - ax) / 2);
    return 'M' + ax + ' ' + ay + 'H' + tx + 'V' + by + 'H' + bx;
  }
  // Lines inside an AWS-style detail: from the edge of one part to the edge of the next, through any bends
  function partBox(id, S) {
    if (id.indexOf('g:') === 0) return null;
    var n = N[id], c = S[id], h = n.res ? 22 : 30;
    return { x: c.x - h, y: c.y - h, w: h * 2, h: h + (n.res ? 70 : 78) };
  }
  function groupBox(fid, gid, S) {
    var f = S[fid], g = N[fid].groups.filter(function (x) { return x.id === gid; })[0];
    return { x: f.x + 12 + g.x, y: f.y + frameGeom(fid).head + g.y, w: g.w, h: g.h };
  }
  function edgeToward(b, p) {
    if (p[0] < b.x) return [b.x, p[1]];
    if (p[0] > b.x + b.w) return [b.x + b.w, p[1]];
    if (p[1] > b.y + b.h) return [p[0], b.y + b.h];
    return [p[0], b.y];
  }
  function awsPoints(S, w) {
    var f = S[w.f], ox = f.x + 12, oy = f.y + frameGeom(w.f).head;
    var box = function (id) { return id.indexOf('g:') === 0 ? groupBox(w.f, id.slice(2), S) : partBox(id, S); };
    var A = box(w.a), B = box(w.b), ac = [A.x + A.w / 2, w.a.indexOf('g:') === 0 ? A.y + A.h / 2 : S[w.a].y], bc = [B.x + B.w / 2, w.b.indexOf('g:') === 0 ? B.y + B.h / 2 : S[w.b].y];
    // A line into or out of a boundary runs straight when the part sits level with it
    if (w.b.indexOf('g:') === 0 && ac[1] > B.y && ac[1] < B.y + B.h) bc[1] = ac[1];
    if (w.a.indexOf('g:') === 0 && bc[1] > A.y && bc[1] < A.y + A.h) ac[1] = bc[1];
    var pts = (w.o.pts || []).map(function (p) { return [ox + p[0], oy + p[1]]; });
    if (!pts.length && Math.abs(ac[1] - bc[1]) > 1 && Math.abs(ac[0] - bc[0]) > 1) {
      var mx = ac[0] < bc[0] ? (A.x + A.w + B.x) / 2 : (B.x + B.w + A.x) / 2;
      pts = [[mx, ac[1]], [mx, bc[1]]];
    }
    var first = pts[0] || bc, last = pts[pts.length - 1] || ac;
    return [edgeToward(A, first)].concat(pts, [edgeToward(B, last)]);
  }
  function placeMarks(w, P) {
    if (w.step) {
      var dx = P[1][0] - P[0][0], dy = P[1][1] - P[0][1], len = Math.abs(dx) + Math.abs(dy), k = Math.min(26, len / 2) / (len || 1);
      w.step.setAttribute('transform', 'translate(' + (P[0][0] + dx * k) + ' ' + (P[0][1] + dy * k) + ')');
    }
    if (w.lbl) {
      var best = 0, bi = 0;
      for (var i = 0; i < P.length - 1; i++) { var l = Math.abs(P[i + 1][0] - P[i][0]) + Math.abs(P[i + 1][1] - P[i][1]); if (l > best) { best = l; bi = i; } }
      var a = P[bi], b = P[bi + 1], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      if (Math.abs(a[1] - b[1]) < 1) { w.lbl.setAttribute('x', mx + (w.step && bi === 0 ? 14 : 0)); w.lbl.setAttribute('y', my + (w.o.side === 'below' ? 18 : -8)); w.lbl.setAttribute('text-anchor', 'middle'); }
      else {
        var left = w.o.side === 'left';
        w.lbl.setAttribute('x', mx + (left ? -9 : 9)); w.lbl.setAttribute('y', my + (w.step && bi === 0 ? 14 : 5)); w.lbl.setAttribute('text-anchor', left ? 'end' : 'start');
      }
    }
  }

  function wantedWires() {
    var w = {};
    Object.keys(G).forEach(function (id) {
      var n = N[id];
      if (n.kind === 'frame') n.lines.forEach(function (l, i) { w['l:' + id + ':' + i] = { a: l[0], b: l[1], o: l[2] || {}, f: id, aws: true }; });
      else if (n.kind !== 'account') kidsOf(id).forEach(function (k) { if (G[k]) w[id + '>' + k] = { a: id, b: k }; });
    });
    return w;
  }

  // ---------- Elements ----------
  var V = {}, W = {}, C = {};                         // elements, wires, where things are now
  function badge(g, id) {
    var b = el('g', { class: 'badge', 'data-fold': id, role: 'button', tabindex: 0, 'aria-label': 'Fold ' + N[id].label }, g);
    el('circle', { r: 11 }, b); el('path', { d: 'M-5 0h10' }, b);
    return b;
  }
  function makeTile(id) {
    var n = N[id], g = el('g', { class: 'node tint-' + n.tint, 'data-id': id, tabindex: 0, role: 'button', 'aria-label': n.label + ', ' + n.sub }, L.nodes);
    el('rect', { class: 'tile', x: -48, y: -48, width: 96, height: 96, rx: 4 }, g);
    el('use', { href: '#i-' + n.icon, class: 'icon', x: -24, y: -24, width: 48, height: 48 }, g);
    text(g, 0, 76, n.label, 't-name', 'middle');
    text(g, 0, 96, n.sub, 't-sub', 'middle');
    var notes = n.note ? noteText(g, 0, 128, wrap(n.note, NOTE_W), 'middle') : [];
    var b = badge(g, id); b.setAttribute('transform', 'translate(46 -46)');
    return { kind: 'tile', g: g, notes: notes };
  }
  function makeAccount(id) {
    var n = N[id], g = el('g', { class: 'acct', 'data-id': id }, L.boxes);
    var outline = el('path', { class: 'acct-line' }, g);
    var shut = el('g', { class: 'acct-shut', tabindex: 0, role: 'button', 'aria-label': n.label + ' account' }, g);
    el('rect', { class: 'tile tint-acct', x: 14, y: 14, width: 68, height: 68, rx: 4 }, shut);
    el('use', { href: '#i-cloud', class: 'icon', x: 24, y: 24, width: 48, height: 48 }, shut);
    text(shut, 96, 44, n.label, 't-name');
    text(shut, 96, 66, 'AWS account', 't-sub');
    var head = el('g', { class: 'acct-head', tabindex: 0, role: 'button', 'aria-label': n.label + ' account' }, g);
    text(head, 16, 30, n.label, 't-box');
    text(head, 16, 52, 'AWS account', 't-sub');
    var notes = noteText(head, 16, 82, wrap(n.note, ACCT_W - 36), 'start');
    var b = badge(g, id);
    return { kind: 'account', g: g, outline: outline, shut: shut, head: head, notes: notes, badge: b };
  }
  // A service on its solid square, or a resource as a bare glyph, as AWS diagrams draw them
  function makePart(id) {
    var n = N[id], g = el('g', { class: 'node part cat-' + n.cat + (n.res ? ' res' : ''), 'data-id': id, tabindex: 0, role: 'button', 'aria-label': n.label + ', ' + n.sub }, L.nodes);
    var h = n.res ? 22 : 30;
    el('rect', { class: 'sq', x: -h, y: -h, width: h * 2, height: h * 2, rx: 3 }, g);
    el('use', { href: '#i-' + n.icon, class: 'glyph', x: n.res ? -22 : -20, y: n.res ? -22 : -20, width: n.res ? 44 : 40, height: n.res ? 44 : 40 }, g);
    text(g, 0, h + 20, n.label, 's-name', 'middle');
    text(g, 0, h + 38, n.sub, 's-sub', 'middle');
    return { kind: 'tile', g: g, notes: [] };
  }
  function makeFrame(id) {
    var n = N[id], f = frameGeom(id), g = el('g', { class: 'frame type-' + n.type }, L.boxes);
    var outline = el('path', { class: 'frame-line', d: rectD(0, 0, f.w, f.h) }, g);
    var head = el('g', {}, g);
    text(head, 16, 30, n.label, 't-box');
    text(head, 16, 52, 'Detail of ' + N[n.parent].label + ' · ' + n.sub, 't-sub');
    if (window.CONSOLE_PROJECTS && window.CONSOLE_PROJECTS[n.parent]) {
      var btn = el('g', { class: 'open-btn', 'data-console': n.parent, role: 'button', tabindex: 0, 'aria-label': 'Open ' + N[n.parent].label + ' in the console', transform: 'translate(' + (f.w - 200) + ' 16)' }, head);
      el('rect', { width: 184, height: 36, rx: 18 }, btn);
      text(btn, 92, 23, 'Open in console', 'open-t', 'middle');
    }
    var notes = noteText(head, 16, 82, f.lines, 'start');
    var groups = n.groups.map(function (gr) {
      var x = 12 + gr.x, y = f.head + gr.y, w = gr.w, h = gr.h;
      var gg = el('g', { class: 'grp grp-' + gr.type }, g);
      return { p: el('path', { d: rectD(x, y, w, h) }, gg), t: text(gg, x + 10, y + 20, gr.label, 't-grp') };
    });
    return { kind: 'frame', g: g, outline: outline, head: head, notes: notes, groups: groups };
  }
  function make(id) { var n = N[id]; return n.kind === 'account' ? makeAccount(id) : n.kind === 'frame' ? makeFrame(id) : n.kind === 'comp' ? makePart(id) : makeTile(id); }

  function setPos(id) {
    var r = V[id], c = C[id];
    r.g.setAttribute('transform', 'translate(' + c.x + ' ' + c.y + ')');
    if (r.kind === 'account') { r.outline.setAttribute('d', rectD(0, 0, c.w, c.h)); r.badge.setAttribute('transform', 'translate(' + (c.w - 2) + ' 2)'); }
  }
  function updateWires() {
    Object.keys(W).forEach(function (k) {
      var w = W[k];
      if (w.aws) {
        if (!C[w.f]) return;
        var P = awsPoints(C, w);
        w.path.setAttribute('d', 'M' + P.map(function (p) { return p[0] + ' ' + p[1]; }).join('L'));
        placeMarks(w, P);
      } else if (C[w.a] && C[w.b]) w.path.setAttribute('d', treeRoute(C, w.a, w.b));
    });
  }
  function copy(o) { var r = {}; for (var k in o) r[k] = o[k]; return r; }

  // ---------- Render a new state ----------
  function render(focus) {
    finishAll();
    layout();
    var want = wantedWires(), T1 = 0, T2 = 0;

    // 1. Retract what was left behind: ink runs backwards, then it is gone
    Object.keys(W).forEach(function (k) {
      if (want[k]) return;
      var w = W[k]; delete W[k];
      w.path.removeAttribute('marker-end');
      [w.step, w.lbl].forEach(function (m) { if (m) fade(m, 0, 160, true, function () { m.remove(); }); });
      ink(w.path, 0, 260, { reverse: true, done: function () { w.path.remove(); } });
      T1 = 300;
    });
    Object.keys(V).forEach(function (id) {
      if (G[id]) return;
      var r = V[id]; delete V[id]; delete C[id];
      if (r.outline) ink(r.outline, 0, 260, { reverse: true });
      fade(r.g, 60, 220, true, function () { r.g.remove(); });
      T1 = 300;
    });
    // Accounts that open or close in place
    var opening = [];
    Object.keys(V).forEach(function (id) {
      var r = V[id];
      if (r.kind !== 'account' || C[id].open === G[id].open) return;
      T1 = 300;
      if (G[id].open) { fade(r.shut, 0, 200, true); r.head.style.opacity = 0; opening.push(id); }
      else { fade(r.head, 0, 200, true); r.shut.style.opacity = 0; }
    });

    // 2. Move what stays to where it now belongs
    var moving = Object.keys(V).filter(function (id) { var a = C[id], b = G[id]; return a.x !== b.x || a.y !== b.y || a.w !== b.w || a.h !== b.h || a.open !== b.open; });
    if (moving.length) {
      T2 = 560;
      var from = {}; moving.forEach(function (id) { from[id] = copy(C[id]); });
      anim({ delay: T1, ms: T2, step: function (t) {
        moving.forEach(function (id) {
          if (!V[id]) return;
          var a = from[id], b = G[id], c = C[id];
          ['x', 'y', 'w', 'h'].forEach(function (k) { if (b[k] !== undefined) c[k] = a[k] + (b[k] - a[k]) * t; });
          c.open = b.open;
          setPos(id);
        });
        updateWires();
      } });
    }
    Object.keys(V).forEach(function (id) {
      var r = V[id];
      if (r.kind === 'account' && !G[id].open && r.shut.style.opacity === '0') fade(r.shut, T1 + T2, 260);
    });
    if (focus) camera(focus === 'all' ? fitAllRect() : focusRect(), focus === 'all', T1);

    // 3. Draw what is new, a level at a time, so each part is drawn from the one before it
    var entering = Object.keys(G).filter(function (id) { return !V[id]; });
    entering.forEach(function (id) {
      V[id] = make(id); C[id] = copy(G[id]); setPos(id);
      var r = V[id];
      if (r.kind === 'tile') r.g.style.opacity = 0;
      else {
        r.outline.style.strokeDasharray = '0 100000';
        r.head.style.opacity = 0;
        if (r.kind === 'account') r.shut.style.opacity = 0;
        if (r.kind === 'frame') r.groups.forEach(function (gr) { gr.p.style.strokeDasharray = '0 100000'; gr.t.style.opacity = 0; });
      }
    });
    var newWires = [];
    Object.keys(want).forEach(function (k) {
      if (W[k]) return;
      var w = want[k];
      W[k] = { a: w.a, b: w.b, aws: w.aws, f: w.f, o: w.o, path: el('path', { class: 'wire' + (w.o && w.o.dash ? ' dashed' : '') }, L.wires) };
      W[k].path.style.strokeDasharray = '0 100000';
      if (w.o && w.o.step) {
        var st = W[k].step = el('g', { class: 'step' }, L.marks);
        el('circle', { r: 11 }, st); text(st, 0, 4.5, String(w.o.step), 'step-n', 'middle');
        st.style.opacity = 0;
      }
      if (w.o && w.o.label) { W[k].lbl = text(L.marks, 0, 0, w.o.label, 'w-lbl'); W[k].lbl.style.opacity = 0; }
      newWires.push(k);
    });
    updateWires();
    function wireIn(id, s) {
      var k = N[id].parent + '>' + id;
      if (newWires.indexOf(k) < 0) return s;
      var w = W[k], A = G[w.a], B = G[w.b], ms = inkMs(Math.abs(A.x - B.x) + Math.abs(A.y - B.y));
      ink(w.path, s, ms, { pen: true, done: function () { w.path.setAttribute('marker-end', 'url(#arrow)'); } });
      return s + ms;
    }
    function openParts(id, s) {
      var r = V[id];
      fade(r.head, s, 240);
      return write(r.notes, s + 120) + 120;
    }
    function drawItem(id, s) {
      var r = V[id], n = N[id];
      if (opening.indexOf(id) > -1) return openParts(id, s);
      s = wireIn(id, s);
      if (r.kind === 'tile') { fade(r.g, s, 260); return r.notes.length ? write(r.notes, s + 220) : s + 260; }
      if (r.kind === 'account') {
        ink(r.outline, s, G[id].open ? 520 : 380);
        if (!G[id].open) { fade(r.shut, s + 180, 260); return s + 440; }
        return openParts(id, s + 360);
      }
      ink(r.outline, s, 560);
      fade(r.head, s + 260, 240);
      var t = write(r.notes, s + 380);
      r.groups.forEach(function (gr, i) { ink(gr.p, t + i * 80, 420); fade(gr.t, t + i * 80 + 200, 220); });
      return t + (r.groups.length ? r.groups.length * 80 + 300 : 0);
    }
    var levels = {};
    entering.concat(opening).forEach(function (id) { var d = pathTo(id).length; (levels[d] = levels[d] || []).push(id); });
    var t = T1 + T2;
    Object.keys(levels).map(Number).sort(function (a, b) { return a - b; }).forEach(function (d) {
      var start = t;
      levels[d].forEach(function (id, i) { t = Math.max(t, drawItem(id, start + i * 70)); });
    });
    newWires.filter(function (k) { return W[k].aws; }).forEach(function (k, i) {
      var w = W[k];
      ink(w.path, t + i * 70, 380, { done: function () { w.path.setAttribute('marker-end', 'url(#arrow)'); } });
      if (w.step) fade(w.step, t + i * 70 + 300, 200);
      if (w.lbl) fade(w.lbl, t + i * 70 + 300, 200);
    });

    // Badges, the current component, the path along the top
    Object.keys(V).forEach(function (id) {
      var r = V[id], isOpenNow = id !== D.root && open.has(id) && (N[id].children || []).length && N[id].kind !== 'frame';
      r.g.classList.toggle('is-open', !!isOpenNow);
      r.g.classList.toggle('here', id === current);
    });
    window.dispatchEvent(new CustomEvent('route', { detail: { path: pathTo(current), current: current, mode: mode } }));
    minimapBounds();
    return t;
  }

  // ---------- What a click does ----------
  function select(id, opts) {
    var n = N[id];
    if (!n) return;
    opts = opts || {};
    if (n.kind === 'frame') { id = n.parent; n = N[id]; }
    mode = 'one'; current = id; userMoved = false;
    open = new Set(pathTo(id).filter(function (x) { return (N[x].children || []).length && N[x].kind !== 'frame'; }));
    hideHint();
    // A page opens before the camera moves, so the camera frames the part of the drawing left showing
    var leaf = !(n.children || []).length, paged = leaf && !opts.quiet && window.openConsole && window.openConsole(id);
    render('focus');
    if (leaf && !opts.quiet && !paged) toast(n.label + ' has no page yet.');
  }
  function fold(id) {
    var drop = Object.keys(N).filter(function (x) { return pathTo(x).indexOf(id) > -1; });
    drop.forEach(function (x) { open.delete(x); });
    if (pathTo(current).indexOf(id) > -1) current = id;
    userMoved = false;
    render('focus');
  }

  // ---------- Camera ----------
  var view = { x: -300, y: 0, w: 1600, h: 1000 }, cam;
  function setView(v) {
    view = v;
    svg.setAttribute('viewBox', [v.x, v.y, v.w, v.h].join(' '));
    var s = svg.getBoundingClientRect().width / v.w;
    svg.style.setProperty('--s', s);
    svg.classList.toggle('far', s < 0.5);
    minimapView();
  }
  function focusRect() {
    var n = N[current], ids = [current];
    if (n.kind === 'comp') ids = [n.parent];
    else {
      var kids = kidsOf(current).filter(function (k) { return G[k] && N[k].kind !== 'comp'; });
      ids = ids.concat(kids);
      // On a phone there is only room for where you are and what just opened: the parent comes in only at a dead end
      if (n.parent && (N[n.parent].kind !== 'account' || !(n.children || []).length) && (!free().phone || !kids.length)) ids.push(n.parent);
    }
    return union(ids.filter(function (id) { return G[id]; }).map(rectOf));
  }
  function fitAllRect() {
    return union(Object.keys(G).map(rectOf));
  }
  function free() {
    var rect = svg.getBoundingClientRect(), phone = rect.width < 700;
    var top = phone ? 48 : 64, bottom = phone ? 150 : 200;
    var panel = document.body.classList.contains('console-open') && !phone ? document.getElementById('console').getBoundingClientRect().width : 0;
    // The tools grow when a search result list is showing: keep clear of them, by the strip or the column that loses less
    var tools = document.querySelector('.tools').getBoundingClientRect(), left = 16;
    var under = rect.bottom - tools.top + 12;
    if (under > bottom) {
      var side = tools.right - rect.left + 12, w = rect.width - 32 - panel;
      if (!phone && (w - side + 16) * (rect.height - top - bottom) > w * (rect.height - top - under)) left = side;
      else bottom = under;
    }
    return { rect: rect, phone: phone, x: left, y: top, w: rect.width - left - 16 - panel, h: rect.height - top - bottom };
  }
  function camera(b, wide, delay) {
    var f = free(), pad = 40;
    var s = Math.min(f.w / (b.w + pad * 2), f.h / (b.h + pad * 2), wide ? 1 : 1.1);
    var cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    if (!wide) {
      var floor = f.phone ? 0.55 : 0.7;
      if (s < floor) {
        s = floor;
        if ((b.w + pad * 2) * s > f.w) cx = b.x - pad + f.w / s / 2;
        if ((b.h + pad * 2) * s > f.h) { var g = G[current]; cy = Math.max(b.y - pad + f.h / s / 2, g.y); }
      }
    }
    goView({ x: cx - (f.x + f.w / 2) / s, y: cy - (f.y + f.h / 2) / s, w: f.rect.width / s, h: f.rect.height / s }, delay || 0, 760);
  }
  function goView(to, delay, ms) {
    var from = null;
    if (cam) cam.finish();
    cam = anim({ delay: delay, ms: ms, start: function () { from = copy(view); }, step: function (t) {
      setView({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, w: from.w + (to.w - from.w) * t, h: from.h + (to.h - from.h) * t });
    } });
  }
  function zoomAt(f, px, py) {
    var w = Math.min(Math.max(view.w * f, 400), 9000), h = w * view.h / view.w;
    return { x: px - (px - view.x) * w / view.w, y: py - (py - view.y) * h / view.h, w: w, h: h };
  }
  function zoomBy(f) { userMoved = true; goView(zoomAt(f, view.x + view.w / 2, view.y + view.h / 2), 0, 260); }
  function fitAll() { userMoved = true; camera(fitAllRect(), true, 0); }

  // Drag to pan, wheel or two fingers to zoom. A drag never counts as a click.
  var pointers = new Map(), drag = null, moved = false, pinch = null;
  svg.addEventListener('pointerdown', function (e) {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (cam) cam.finish();
    moved = false;
    if (pointers.size === 1) drag = { x: e.clientX, y: e.clientY, v: view };
    if (pointers.size === 2) {
      var p = Array.from(pointers.values());
      pinch = { d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y), v: view };
      drag = null;
    }
  });
  svg.addEventListener('pointermove', function (e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    var r = svg.getBoundingClientRect(), k = view.w / r.width;
    if (pinch && pointers.size === 2) {
      var p = Array.from(pointers.values()), d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      var mx = (p[0].x + p[1].x) / 2 - r.left, my = (p[0].y + p[1].y) / 2 - r.top;
      view = pinch.v;
      var to = zoomAt(pinch.d / d, pinch.v.x + mx / r.width * pinch.v.w, pinch.v.y + my / r.height * pinch.v.h);
      setView(to); moved = true; userMoved = true;
      return;
    }
    if (!drag) return;
    // Capture only once it is a drag; capturing on press would steal the click from the component
    if (!moved && Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 5) { moved = true; userMoved = true; svg.classList.add('dragging'); svg.setPointerCapture(e.pointerId); }
    if (moved) setView({ x: drag.v.x - (e.clientX - drag.x) * k, y: drag.v.y - (e.clientY - drag.y) * k, w: view.w, h: view.h });
  });
  function up(e) { pointers.delete(e.pointerId); if (pointers.size < 2) pinch = null; if (!pointers.size) { drag = null; svg.classList.remove('dragging'); } }
  svg.addEventListener('pointerup', up);
  svg.addEventListener('pointercancel', up);
  svg.addEventListener('wheel', function (e) {
    e.preventDefault();
    if (cam) cam.finish();
    userMoved = true;
    var r = svg.getBoundingClientRect();
    setView(zoomAt(Math.exp(e.deltaY * 0.0015), view.x + (e.clientX - r.left) / r.width * view.w, view.y + (e.clientY - r.top) / r.height * view.h));
  }, { passive: false });

  // ---------- Input ----------
  function act(target) {
    var o = target.closest('[data-console]');
    if (o) { window.openConsole(o.getAttribute('data-console')); select(o.getAttribute('data-console'), { quiet: true }); return true; }
    var b = target.closest('[data-fold]');
    if (b) { fold(b.getAttribute('data-fold')); return true; }
    var g = target.closest('[data-id]');
    if (g) { select(g.getAttribute('data-id')); return true; }
    return false;
  }
  svg.addEventListener('click', function (e) { if (!moved) act(e.target); });
  svg.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && act(e.target)) e.preventDefault();
  });
  window.addEventListener('keydown', function (e) {
    if (e.target.closest && e.target.closest('input, textarea')) return;
    if (e.key === '+' || e.key === '=') zoomBy(1 / 1.3);
    else if (e.key === '-') zoomBy(1.3);
    else if (e.key === '0') fitAll();
  });
  window.addEventListener('consoleclose', function () {
    if (!userMoved && current) camera(focusRect(), false, 0);
  });
  window.addEventListener('resize', function () {
    if (!userMoved && current) camera(focusRect(), false, 0);
  });

  // ---------- Toolbar and mini-map ----------
  document.getElementById('t-in').addEventListener('click', function () { zoomBy(1 / 1.3); });
  document.getElementById('t-out').addEventListener('click', function () { zoomBy(1.3); });
  document.getElementById('t-fit').addEventListener('click', fitAll);
  var themeBtn = document.getElementById('t-theme'), root = document.documentElement;
  function showTheme() {
    var blue = root.getAttribute('data-theme') === 'blueprint';
    themeBtn.textContent = blue ? 'Paper' : 'Blueprint';
    themeBtn.setAttribute('aria-pressed', blue);
  }
  themeBtn.addEventListener('click', function () {
    var t = root.getAttribute('data-theme') === 'blueprint' ? 'paper' : 'blueprint';
    root.setAttribute('data-theme', t);
    try { localStorage.setItem('theme', t); } catch (e) {}
    showTheme();
  });
  showTheme();

  // Phones: the detail's own button sits off screen, so the tools carry it
  var openBtn = document.getElementById('t-open'), openFor = null;
  window.addEventListener('route', function (e) {
    openFor = e.detail.path.filter(function (id) { return window.CONSOLE_PROJECTS && window.CONSOLE_PROJECTS[id]; }).pop() || null;
    openBtn.hidden = !openFor;
  });
  openBtn.addEventListener('click', function () { if (openFor) window.openConsole(openFor); });

  var mm = document.getElementById('mm'), mmView = document.getElementById('mm-view');
  function minimapBounds() {
    var box = mm.getBoundingClientRect();
    if (!box.width || !box.height) return;            // hidden on phones
    var b = fitAllRect(), pad = 60, ratio = box.width / box.height;
    var w = b.w + pad * 2, h = b.h + pad * 2;
    if (w / h > ratio) h = w / ratio; else w = h * ratio;
    mm.setAttribute('viewBox', [b.x + b.w / 2 - w / 2, b.y + b.h / 2 - h / 2, w, h].join(' '));
  }
  function minimapView() { mmView.setAttribute('x', view.x); mmView.setAttribute('y', view.y); mmView.setAttribute('width', view.w); mmView.setAttribute('height', view.h); }
  mm.addEventListener('click', function (e) {
    var p = mm.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
    var w = p.matrixTransform(mm.getScreenCTM().inverse());
    userMoved = true;
    goView({ x: w.x - view.w / 2, y: w.y - view.h / 2, w: view.w, h: view.h }, 0, 420);
  });

  window.goTo = select;
  window.reframe = function () { if (!userMoved && current) camera(focusRect(), false, 0); };

  // ---------- Small things around the drawing ----------
  var hint = document.getElementById('hint');
  function hideHint() { hint.classList.add('gone'); }
  var toastEl = document.getElementById('toast'), toastT;
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('on'); }, 2600); }

  // ---------- Start: the pen draws the visitor and the way in ----------
  current = 'you'; open = new Set(['you']);
  layout();
  setView(view);
  camera(union(['you', 'edge'].map(rectOf)), false, 0);
  if (cam) cam.finish();
  var end = render(null);
  setTimeout(function () { if (!hint.classList.contains('gone')) hint.classList.add('on'); }, still ? 0 : end);
})();

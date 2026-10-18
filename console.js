// The console: a page that slides over the drawing for anything you can open,
// laid out the way the AWS console lays out a resource. Content comes from the projects'
// own docs (console-data.js) and from the facts below, which are copied from the CV.
(function () {
  var N = window.DRAWING.nodes, P = window.CONSOLE_PROJECTS;
  var CV = 'assets/Tapuwanashe_Magumise_Resume_Cloud_Engineer.pdf';
  var EMAIL = 'tapiwa.magumise96@gmail.com';
  var LINKEDIN = 'https://www.linkedin.com/in/tapiwanashe-magumise-84bbb232a/';
  var GITHUB = 'https://github.com/tapiwa-magumise';

  // Where each project ran and what it is built with, from its Terraform, compose files and charts
  var FACTS = {
    'landing-zone':     ['eu-west-2, eu-west-1', 'Terraform, four stacks'],
    'hybrid-dr':        ['eu-west-2, eu-west-1', 'Terraform, Docker Compose'],
    'security-review':  ['eu-west-2', 'Python, Terraform'],
    'sales-pipeline':   ['eu-west-2', 'Terraform, GitHub Actions with OIDC'],
    'edge-analytics':   ['Global, eu-west-2, us-east-1', 'Terraform, GitHub Actions with OIDC'],
    'retail-analytics': ['eu-west-2, and a laptop', 'DuckDB, Python, Power BI'],
    'invoicing-api':    ['Local only', 'Docker Compose'],
    'event-orders':     ['Local only', 'kind, Helm'],
    'rag-assistant':    ['eu-west-2, and a laptop', 'Terraform, Docker']
  };
  var CATS = { analytics: 'Analytics', storage: 'Storage', compute: 'Compute', database: 'Database', integration: 'Application integration',
    security: 'Security', networking: 'Networking', management: 'Management', ml: 'Machine learning', external: 'Outside AWS' };
  var CERTS = {
    saa: { name: 'AWS Certified Solutions Architect – Associate', issuer: 'Amazon Web Services', kind: 'Exam', code: 'SAA-C03', date: '25 October 2023', verify: 'https://www.credly.com/badges/743c7281-627a-4a3b-89b8-f0e28ed9ee89/public_url', verifyLabel: 'Verify on Credly' },
    dva: { name: 'AWS Certified Developer – Associate', issuer: 'Amazon Web Services', kind: 'Exam', code: 'DVA-C02', date: '31 August 2024', verify: 'https://www.credly.com/badges/42ec5665-554c-469d-bb39-06506a12aea3/public_url', verifyLabel: 'Verify on Credly' },
    'dip-mad': { name: 'Advanced Diploma in Modern Application Development', issuer: 'Alison, CPD certified', kind: 'Diploma', code: '2646-42809110', date: '24 October 2024', verify: 'https://alison.com/certification/check/5b365f9f76', verifyLabel: 'Verify on Alison' },
    'dip-ld': { name: 'Diploma in Learning and Development (L&D)', issuer: 'Alison, CPD certified', kind: 'Diploma', code: '6881-42809110', date: '22 September 2024', verify: 'https://alison.com/certification/check/109d9d1d0d', verifyLabel: 'Verify on Alison' },
    'an-api': { name: 'Building with the Claude API', issuer: 'Anthropic', kind: 'Course certificate of completion' },
    'an-mcp': { name: 'Model Context Protocol: Advanced Topics', issuer: 'Anthropic', kind: 'Course certificate of completion' },
    'an-code': { name: 'Claude Code in Action', issuer: 'Anthropic', kind: 'Course certificate of completion' }
  };
  var ROLES = {
    'ex-paycanary': { title: 'Founder & Solutions Architect, PayCanary', dates: 'March 2026 to present', place: 'Remote', link: 'https://paycanary.io',
      sub: 'Watches Stripe accounts for risk and helps merchants deal with disputes and frozen payouts',
      bullets: [
        'Built the whole stack: Next.js and TypeScript on Vercel, Supabase Postgres with row-level security, Upstash Redis and 25 scheduled jobs.',
        'The risk engine scores each account, groups related disputes and recommends whether each dispute is worth fighting.',
        'Stripe webhooks feed in account and dispute data. Every signature is checked before anything is stored.',
        'Found that 6 scheduled jobs had never done their work in production: they ran without database privileges, saw zero rows and reported success. Fixed them, and stopped silent write failures across 26 routes.',
        'Uses an LLM to draft case documents, under a spend cap and with prompt injection defences.',
        'Runs at 99.9% uptime, monitored with Sentry and PostHog. Tests check one customer can\'t read another\'s data, across 140 test files in Vitest and Playwright.'
      ] },
    'ex-paperless': { title: 'Cloud Engineer, Paperless Integrated Solutions', dates: 'June 2023 to March 2026', place: 'Bulawayo, Zimbabwe',
      sub: 'Moved 9 hospitals across Zimbabwe from paper records to AWS',
      bullets: [
        'Moved 9 hospitals across Zimbabwe from paper folders to a digital records system, digitising 40,000 to 60,000 patient records. Some had to be scanned; others were digital files that needed cleaning up first.',
        'Each hospital ran its own mix of Windows versions. We moved them to AWS (EC2, S3, IAM).',
        'Consolidated 40,000 to 60,000 records from 9 hospital sources into one MySQL database searchable by national ID, using AWS Glue jobs that merged, de-duplicated and validated them.',
        'Kept 9 servers patched, backed up, monitored and protected at 99.5% availability, provisioned with Terraform and Docker.',
        'Designed the AWS architecture to be cost-conscious from the start, so the whole environment ran on AWS promotional credits and never ran out of budget in my time there.',
        'Patient data falls under Zimbabwe\'s Cyber and Data Protection Act, so access to records was role-based and logged.',
        'Trained 90 nursing staff in 18 workshops across the hospitals to use the system in their daily work.'
      ] }
  };

  var el = document.getElementById('console'), body = el.querySelector('.cs-body'), crumbsEl = el.querySelector('.cs-crumbs');
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var ext = function (href, label, cls) { return '<a class="' + (cls || '') + '" href="' + esc(href) + '" target="_blank" rel="noopener">' + label + '</a>'; };

  function status(kind, text) { return '<span class="cs-status ' + kind + '"><svg viewBox="0 0 16 16" aria-hidden="true"><use href="#cs-' + kind + '"/></svg>' + esc(text) + '</span>'; }
  function copyBtn(value) { return '<button class="cs-copy" data-copy="' + esc(value) + '" aria-label="Copy"><svg viewBox="0 0 16 16" aria-hidden="true"><use href="#cs-copy"/></svg></button>'; }
  function kv(pairs, cols) {
    return '<dl class="cs-kv" style="--cols:' + (cols || 3) + '">' + pairs.map(function (p) { return '<div><dt>' + p[0] + '</dt><dd>' + p[1] + '</dd></div>'; }).join('') + '</dl>';
  }
  function box(title, inner, extra) { return '<section class="cs-box"><header><h2>' + title + '</h2>' + (extra || '') + '</header><div class="cs-box-body">' + inner + '</div></section>'; }
  function crumbsFor(id) {
    var path = [], x = id;
    while (x && x !== 'edge') { path.unshift(x); x = N[x].parent; }
    path = path.filter(function (p) { return N[p].kind !== 'frame' && p !== 'org' && p !== 'certs'; });
    return [{ label: 'Portfolio', go: 'edge' }].concat(path.map(function (p) { return { label: N[p].label, go: p }; }));
  }

  // ---------- Pages ----------
  function projectPage(id, tab, sel) {
    var p = P[id], f = FACTS[id], frame = N[id].children[0], parts = N[frame].children;
    var rows = parts.map(function (c) {
      var n = N[c];
      return '<tr data-part="' + c + '"' + (c === sel ? ' class="sel"' : '') + '><td><span class="cs-radio"></span></td><td><b>' + esc(n.label) + '</b></td><td>' + (n.res ? 'Resource' : 'Service') + '</td><td>' + (CATS[n.cat] || esc(n.cat)) + '</td><td>' + esc(n.sub) + '</td></tr>';
    }).join('');
    var tabs = [
      { id: 'overview', label: 'Overview', html: box('Details', kv([
          ['Status', status(p.status.kind, p.status.text)], ['Regions', esc(f[0])], ['Built with', esc(f[1])],
          ['Repository', ext(p.repo, esc(p.repoName)) + copyBtn(p.repo)], ['Decisions', ext(p.decisionsDoc, 'Read the record')], ['Detail in the drawing', '<button class="cs-link" data-go="' + frame + '">Show</button>']
        ])) + box('Tags <span class="cs-count">(' + N[id].tags.length + ')</span>', '<ul class="cs-tags">' + N[id].tags.map(function (t) {
          return '<li><button class="cs-tag" data-tag="' + esc(t) + '">' + esc(t) + '</button></li>';
        }).join('') + '</ul>', '<span class="cs-hint">Select a tag to see every project that uses it</span>') + box('Summary', '<div class="cs-prose">' + p.overview + '</div>') },
      { id: 'architecture', label: 'Architecture', html: box('Architecture diagram', '<img class="cs-arch" src="' + p.arch + '" alt="Architecture diagram of ' + esc(N[id].label) + '" loading="lazy">', ext(p.archSource, 'Editable source', 'cs-btn')) },
      { id: 'results', label: 'Results', html: p.results ? box(esc(p.resultsTitle), '<div class="cs-prose">' + p.results + '</div>') : box('Results', '<p class="cs-empty">No results section in this repository yet.</p>') },
      { id: 'decisions', label: 'Decisions', html: box('Decisions and trade-offs', '<div class="cs-prose">' + p.decisions + '</div>', ext(p.decisionsDoc, 'Open in GitHub', 'cs-btn')) },
      { id: 'resources', label: 'Resources (' + parts.length + ')', html: box('Resources <span class="cs-count">(' + parts.length + ')</span>',
          '<table class="cs-table"><thead><tr><th></th><th>Name</th><th>Type</th><th>Category</th><th>Role in this project</th></tr></thead><tbody>' + rows + '</tbody></table>',
          '<span class="cs-hint">Select a row to find it in the drawing</span>') },
      { id: 'code', label: 'Code', html: box('Repository', kv([['URL', ext(p.repo, esc(p.repo.replace('https://', ''))) + copyBtn(p.repo)], ['Clone', '<code>git clone ' + esc(p.repo) + '.git</code>' + copyBtn('git clone ' + p.repo + '.git')]], 1))
          + (p.files ? box('Files', '<div class="cs-prose">' + p.files + '</div>') : '')
          + (p.run ? box(esc(p.runTitle), '<div class="cs-prose">' + p.run + '</div>') : '') }
    ];
    var subject = encodeURIComponent('About ' + N[id].label);
    return {
      crumbs: crumbsFor(id), title: esc(N[id].label), info: status(p.status.kind, p.status.text),
      actions: ext(p.repo, 'View repository', 'cs-btn') + '<a class="cs-btn primary" href="mailto:' + EMAIL + '?subject=' + subject + '">Discuss this project</a>',
      tabs: tabs, tab: tab || 'overview'
    };
  }
  function cvPage() {
    var name = CV.split('/').pop();
    return { crumbs: crumbsFor('cv'), title: esc(name), info: '<span class="cs-meta">S3 object</span>',
      actions: '<a class="cs-btn" href="' + CV + '" target="_blank" rel="noopener">Open</a><a class="cs-btn primary" href="' + CV + '" download>Download</a>',
      body: box('Object overview', kv([['Owner', 'Tapiwa Magumise'], ['Type', 'pdf'], ['Size', '92.0 KB'], ['Last modified', '18 October 2026'], ['Key', esc(name) + copyBtn(name)], ['Pages', '2']])) +
        box('What\'s in it', '<div class="cs-prose"><p>Two pages: summary, experience at PayCanary and Paperless, the projects, skills, and certifications and training.</p></div>') };
  }
  function aboutPage() {
    return { crumbs: crumbsFor('about'), title: 'Tapiwa Magumise', info: '<span class="cs-meta">AWS Cloud Engineer</span>',
      actions: '<a class="cs-btn" href="mailto:' + EMAIL + '?subject=Hiring%20enquiry">Email</a><a class="cs-btn primary" href="' + CV + '" download>Download CV</a>',
      body: box('Summary', '<div class="cs-prose"><p>I spent almost three years moving 9 Zimbabwean hospitals off paper records and onto AWS. I now run ' + ext('https://paycanary.io', 'PayCanary') + ', my own SaaS product for Stripe merchants.</p><p>I build on AWS with Terraform and GitHub Actions, and I hold the AWS Solutions Architect and Developer Associate certifications.</p><p>The drawing holds nine AWS projects. Each opens here with its architecture, measured results and the decisions behind it.</p></div>') +
        box('Details', kv([['Role', 'AWS Cloud Engineer'], ['Location', 'Harare, Zimbabwe'], ['Certifications', 'Solutions Architect – Associate<br>Developer – Associate'],
          ['Now', ext('https://paycanary.io', 'PayCanary') + ', founder, since March 2026'], ['Before', 'Paperless Integrated Solutions, cloud engineer, 2023 to 2026'], ['Code', ext(GITHUB, 'github.com/tapiwa-magumise')]])) };
  }
  function contactPage() {
    var rows = [['Email', '<a href="mailto:' + EMAIL + '?subject=Hiring%20enquiry">' + EMAIL + '</a>' + copyBtn(EMAIL)], ['LinkedIn', ext(LINKEDIN, 'tapiwanashe-magumise')], ['GitHub', ext(GITHUB, 'tapiwa-magumise')]];
    return { crumbs: crumbsFor('contact'), title: 'Contact', info: '<span class="cs-meta">SNS topic</span>',
      actions: '<a class="cs-btn primary" href="mailto:' + EMAIL + '?subject=Hiring%20enquiry">Send an email</a>',
      body: box('Subscriptions <span class="cs-count">(' + rows.length + ')</span>', '<table class="cs-table"><thead><tr><th>Protocol</th><th>Endpoint</th><th>Status</th></tr></thead><tbody>' +
        rows.map(function (r) { return '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td><td>' + status('success', 'Confirmed') + '</td></tr>'; }).join('') + '</tbody></table>') };
  }
  function certPage(id) {
    var c = CERTS[id], pairs = [['Issuer', esc(c.issuer)], ['Type', esc(c.kind)]];
    if (c.code) pairs.push([c.kind === 'Exam' ? 'Exam code' : 'Certificate number', esc(c.code) + copyBtn(c.code)]);
    if (c.date) pairs.push([c.kind === 'Exam' ? 'Passed' : 'Awarded', esc(c.date)]);
    return { crumbs: crumbsFor(id), title: esc(c.name), info: '',
      actions: c.verify ? ext(c.verify, c.verifyLabel, 'cs-btn primary') : '',
      body: box('Certificate details', kv(pairs, 2)) };
  }
  function rolePage(id) {
    var r = ROLES[id];
    return { crumbs: crumbsFor(id), title: esc(r.title), info: '<span class="cs-meta">' + esc(r.dates) + '</span>',
      actions: r.link ? ext(r.link, 'Visit site', 'cs-btn') : '',
      body: box('Details', kv([['Dates', esc(r.dates)], ['Where', esc(r.place)], ['In short', esc(r.sub)]])) +
        box('What I did', '<div class="cs-prose"><ul>' + r.bullets.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul></div>') };
  }
  function pageFor(id, tab, sel) {
    if (P[id]) return projectPage(id, tab, sel);
    var n = N[id];
    if (n && n.kind === 'comp' && N[n.parent] && P[N[n.parent].parent]) return projectPage(N[n.parent].parent, 'resources', id);
    if (id === 'cv') return cvPage();
    if (id === 'about') return aboutPage();
    if (id === 'contact') return contactPage();
    if (CERTS[id]) return certPage(id);
    if (ROLES[id]) return rolePage(id);
    return null;
  }

  // ---------- Showing a page ----------
  var state = null, opener = null;
  function render(pg) {
    crumbsEl.innerHTML = pg.crumbs.map(function (c, i, a) {
      return i === a.length - 1 ? '<span aria-current="page">' + esc(c.label) + '</span>' : '<button data-go="' + c.go + '">' + esc(c.label) + '</button><svg viewBox="0 0 16 16" aria-hidden="true"><use href="#cs-chev"/></svg>';
    }).join('');
    var tabs = pg.tabs ? '<div class="cs-tabs" role="tablist">' + pg.tabs.map(function (t) {
      return '<button role="tab" id="tab-' + t.id + '" data-tab="' + t.id + '" aria-controls="cs-panel" aria-selected="' + (t.id === pg.tab) + '" tabindex="' + (t.id === pg.tab ? 0 : -1) + '">' + t.label + '</button>';
    }).join('') + '</div>' : '';
    var content = pg.tabs ? pg.tabs.filter(function (t) { return t.id === pg.tab; })[0].html : pg.body;
    body.innerHTML = '<div class="cs-head"><div><h1>' + pg.title + '</h1>' + (pg.info ? '<div class="cs-info">' + pg.info + '</div>' : '') + '</div><div class="cs-actions">' + pg.actions + '</div></div>' + tabs + '<div class="cs-content"' + (pg.tabs ? ' id="cs-panel" role="tabpanel" aria-labelledby="tab-' + pg.tab + '"' : '') + '>' + content + '</div>';
    var s = body.querySelector('tr.sel');
    if (s) s.scrollIntoView({ block: 'nearest' });
  }
  function open(id, tab, sel, fromHistory) {
    var pg = pageFor(id, tab, sel);
    if (!pg) return false;
    var opening = !state;
    if (opening) opener = document.activeElement;
    var owner = N[id].kind === 'comp' ? N[N[id].parent].parent : null, pid = owner && P[owner] ? owner : id;
    state = { id: pid, tab: pg.tab, sel: sel || (pid !== id ? id : null) };
    render(pg);
    el.classList.add('on'); el.setAttribute('aria-hidden', 'false'); document.body.classList.add('console-open');
    if (!fromHistory) history.pushState({ console: state }, '', '#console/' + pid + (state.tab && P[pid] ? '/' + state.tab : ''));
    body.scrollTop = 0;
    // Keyboard and screen reader users land on the page title, and go back where they were on close
    if (opening) { var h = body.querySelector('h1'); h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    return true;
  }
  function close(fromHistory) {
    if (!state) return;
    state = null;
    el.classList.remove('on'); el.setAttribute('aria-hidden', 'true'); document.body.classList.remove('console-open');
    window.dispatchEvent(new Event('consoleclose'));
    if (!fromHistory) history.pushState({}, '', location.pathname);
    if (opener && document.contains(opener) && el.contains(document.activeElement)) opener.focus({ preventScroll: true });
    opener = null;
  }

  el.addEventListener('click', function (e) {
    var t = e.target.closest('[data-tab]');
    if (t && state) { open(state.id, t.getAttribute('data-tab'), state.sel); return; }
    var r = e.target.closest('tr[data-part]');
    if (r && state) { var part = r.getAttribute('data-part'); state.sel = part; open(state.id, 'resources', part, true); window.goTo(part, { quiet: true }); return; }
    var tg = e.target.closest('[data-tag]');
    if (tg) { close(); window.showTag(tg.getAttribute('data-tag')); return; }
    var g = e.target.closest('[data-go]');
    if (g) { var to = g.getAttribute('data-go'); window.goTo(to, { quiet: true }); if (!pageFor(to)) close(); return; }
    var c = e.target.closest('[data-copy]');
    if (c) {
      navigator.clipboard && navigator.clipboard.writeText(c.getAttribute('data-copy'));
      c.classList.add('done'); setTimeout(function () { c.classList.remove('done'); }, 1200);
      return;
    }
    if (e.target.closest('.cs-close')) close();
  });
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape' && state) close(); });
  window.addEventListener('popstate', function (e) {
    var s = e.state && e.state.console;
    if (s) open(s.sel || s.id, s.tab, s.sel, true); else close(true);
  });

  // Arrow keys move between tabs, as in any tab list
  el.addEventListener('keydown', function (e) {
    var t = e.target.closest('[role=tab]');
    if (!t || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') || !state) return;
    var all = [].slice.call(el.querySelectorAll('[role=tab]')), i = all.indexOf(t) + (e.key === 'ArrowRight' ? 1 : -1);
    var next = all[(i + all.length) % all.length].getAttribute('data-tab');
    open(state.id, next, state.sel);
    el.querySelector('[data-tab="' + next + '"]').focus();
    e.preventDefault();
  });

  window.openConsole = open;
  window.consolePage = pageFor;
  window.closeConsole = close;
  window.consoleHas = function (id) { return !!pageFor(id); };

  // A link straight to a page: draw the route to it, then open it
  var m = location.hash.match(/^#console\/([\w-]+)(?:\/(\w+))?/);
  if (m && N[m[1]]) setTimeout(function () { open(m[1], m[2], null, true); window.goTo(m[1], { quiet: true }); history.replaceState({ console: state }, '', location.hash); }, 600);
})();

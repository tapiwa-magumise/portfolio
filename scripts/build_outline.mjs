// Writes the text version of the portfolio into index.html, between the outline markers.
// It is what search engines, screen reader users and visitors without JavaScript read, and it
// is built from the same data and page builders as the drawing and the console, so it can't drift.
// Run after changing data.js, console.js or console-data.js:  node scripts/build_outline.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (f) => readFileSync(root + f, 'utf8');

// Just enough of a browser for the scripts to load
const stub = () => new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => '' : stub()), apply: () => stub() });
const window = { addEventListener() {}, dispatchEvent() {} };
const sandbox = { window, document: { getElementById: () => stub(), contains: () => false }, location: { hash: '', pathname: '/' }, history: stub(), setTimeout() {} };
vm.createContext(sandbox);
for (const f of ['data.js', 'console-data.js', 'console.js']) vm.runInContext(read(f), sandbox, { filename: f });

const N = window.DRAWING.nodes, P = window.CONSOLE_PROJECTS, page = window.consolePage;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Console markup to plain document markup: boxes become headings, controls that need the script go
function plain(html, level) {
  return html
    .replace(/<h([3-5])>(.*?)<\/h\1>/gs, (m, n, t) => `<h${Math.min(+n + level - 2, 6)}>${t}</h${Math.min(+n + level - 2, 6)}>`)
    .replace(/<button class="cs-tag"[^>]*>(.*?)<\/button>/g, '$1')
    .replace(/<button[^>]*>.*?<\/button>/gs, '')
    .replace(/<svg[^>]*>.*?<\/svg>/gs, '')
    .replace(/<span class="cs-hint">.*?<\/span>/g, '')
    .replace(/<section class="cs-box"><header><h2>(.*?)<\/h2>.*?<\/header><div class="cs-box-body">/gs, `<h${level}>$1</h${level}>`)
    .replace(/<\/div><\/section>/g, '')
    .replace(/<ul class="cs-tags">(.*?)<\/ul>/gs, (m, inner) => '<p>' + inner.replace(/<\/li><li>/g, ' · ').replace(/<\/?li>/g, '') + '</p>')
    .replace(/ class="[^"]*"/g, '')
    .replace(/ style="[^"]*"/g, '')
    .replace(/ (data-[\w-]+|aria-[\w-]+|role|tabindex)="[^"]*"/g, '');
}
function section(id, level) {
  const pg = page(id);
  if (!pg) return '';
  const content = pg.tabs ? pg.tabs.filter((t) => t.id === 'overview' || t.id === 'results').map((t) => t.html).join('') : pg.body;
  return plain(content, level);
}

const out = [];
const person = page('about');
out.push(`<header class="tv-head"><h1 id="tv-title">Tapiwa Magumise, AWS Cloud Engineer</h1>`);
out.push(`<p>Harare, Zimbabwe · <a href="assets/Tapuwanashe_Magumise_Resume_Cloud_Engineer.pdf" download>CV (PDF)</a> · <a href="mailto:tapiwa.magumise96@gmail.com?subject=Hiring%20enquiry">tapiwa.magumise96@gmail.com</a> · <a href="https://www.linkedin.com/in/tapiwanashe-magumise-84bbb232a/">LinkedIn</a> · <a href="https://github.com/tapiwa-magumise">GitHub</a></p></header>`);

for (const acct of N.org.children) {
  const a = N[acct];
  out.push(`<section><h2>${esc(a.label)}</h2><p><i>${esc(a.note.replace(/ [^.]*title block\./, ''))}</i></p>`);
  for (const id of a.children) {
    const n = N[id];
    if (id === 'about') { out.push(`<h3>About</h3>` + plain(person.body, 4)); continue; }
    if (id === 'career') {
      for (const r of N[n.children[0]].children) { const pg = page(r); out.push(`<h3>${pg.title}</h3><p>${pg.info.replace(/<[^>]+>/g, '')}</p>` + plain(pg.body, 4)); }
      continue;
    }
    if (P[id]) {
      const p = P[id];
      out.push(`<article><h3>${esc(n.label)}</h3><p><i>${esc(N[n.children[0]].note || '')}</i></p>` + section(id, 4) +
        `<p><a href="${esc(p.repo)}">Repository</a> · <a href="${esc(p.decisionsDoc)}">Decisions and trade-offs</a> · <a href="${esc(p.arch)}">Architecture diagram</a></p></article>`);
      continue;
    }
    if (id === 'site') {
      const f = N[n.children[0]];
      out.push(`<article><h3>${esc(n.label)}</h3><p>${esc(f.note)}</p><p>${n.tags.map(esc).join(' · ')}</p></article>`);
      continue;
    }
    const pg = page(id);
    if (pg) out.push(`<h3>${esc(n.label)}</h3>` + section(id, 4));
  }
  out.push(`</section>`);
}

out.push(`<section><h2>${esc(N.certs.label)}</h2>`);
for (const g of N.certs.children) {
  out.push(`<h3>${esc(N[g].label)} · ${esc(N[g].sub)}</h3><ul>`);
  for (const c of N[g].children) {
    const pg = page(c), link = pg.actions.match(/href="([^"]+)"/);
    const facts = (pg.body.match(/<dd>(.*?)<\/dd>/g) || []).map((d) => d.replace(/<[^>]+>/g, '')).slice(2).join(', ');
    out.push(`<li>${link ? `<a href="${link[1]}">${pg.title}</a>` : pg.title}${facts ? `, ${facts}` : ''}</li>`);
  }
  out.push(`</ul>`);
}
out.push(`</section>`);

const html = out.join('\n');
const start = '<!-- outline:start -->', end = '<!-- outline:end -->';
let index = read('index.html');
const i = index.indexOf(start), j = index.indexOf(end);
if (i < 0 || j < 0) throw new Error('outline markers missing from index.html');
index = index.slice(0, i + start.length) + '\n' + html + '\n' + index.slice(j);
writeFileSync(root + 'index.html', index);
console.log(`outline: ${html.length} characters`);

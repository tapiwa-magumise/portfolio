"""Build console-data.js from each project's own README and docs.

Nothing here is written by hand: every section is lifted from the repository it describes,
so the console can't drift from the code. Run again after a repo's docs change.
"""
import html, json, os, re, subprocess

ROOT = os.path.expanduser('~/projects')
OUT = os.path.join(ROOT, 'portfolio-v2')
OWNER = 'tapiwa-magumise'

# id in the drawing -> (folder, GitHub repo name, decisions doc, status kind, status text)
PROJECTS = {
    'landing-zone':     ('aws-landing-zone', 'aws-landing-zone', 'docs/decisions.md', 'info', 'Tested with mocks, not applied'),
    'hybrid-dr':        ('aws-hybrid-migration-dr', 'aws-hybrid-migration-dr', 'docs/decisions.md', 'stopped', 'Run, then destroyed'),
    'security-review':  ('aws-security-cost-review', 'aws-security-cost-review', 'docs/02-decisions.md', 'warning', 'Run · summary waiting on AWS'),
    'sales-pipeline':   ('aws-serverless-sales-pipeline', 'aws-serverless-sales-pipeline', 'docs/decisions.md', 'warning', 'Deploys paused · waiting on AWS'),
    'edge-analytics':   ('edge-analytics-platform', 'aws-edge-analytics', 'docs/02-options-and-decisions.md', 'stopped', 'Built, then destroyed'),
    'retail-analytics': ('retail-analysis-case-study', 'retail-analysis-case-study', 'docs/02-decisions.md', 'success', 'Complete'),
    'invoicing-api':    ('invoicing-api', 'invoicing-api', 'docs/decisions.md', 'info', 'Runs locally'),
    'event-orders':     ('event-driven-orders', 'event-driven-orders', 'docs/decisions.md', 'info', 'Runs locally'),
    'rag-assistant':    ('governed-rag-assistant', 'governed-rag-assistant', 'docs/02-decisions.md', 'warning', 'Built · evaluation waiting on AWS'),
}
RESULTS = ['Measured results', 'Results', 'What it found', "What's measured", 'What it checks', 'Testing', 'Tests']
HOW = ['How it works', 'How a payment works', 'How an order flows', 'How an answer is made', 'Structure', 'Architecture']
PROBLEM = ['The problem it solves']
FILES = ["What's in the repository", 'Repository', 'Repository layout', 'Stacks']


def inline(s, repo, base):
    s = html.escape(s, quote=False)
    s = re.sub(r'`([^`]+)`', r'<code>\1</code>', s)
    s = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', s)
    s = re.sub(r'(?<![*\w])\*([^*]+)\*(?!\w)', r'<i>\1</i>', s)

    def link(m):
        text, url = m.group(1), html.unescape(m.group(2))
        if not re.match(r'https?://|mailto:', url):
            path = os.path.normpath(os.path.join(base, url)).lstrip('./')
            url = f'https://github.com/{OWNER}/{repo}/blob/main/{path}'
        return f'<a href="{html.escape(url)}" target="_blank" rel="noopener">{text}</a>'
    return re.sub(r'(?<!!)\[([^\]]+)\]\(([^)]+)\)', link, s)


def md(text, repo, base=''):
    """Enough Markdown for these READMEs: headings, paragraphs, lists, tables, code blocks."""
    out, para, lines, i = [], [], text.split('\n'), 0

    def flush():
        if para:
            out.append('<p>' + inline(' '.join(para), repo, base) + '</p>')
            para.clear()
    while i < len(lines):
        ln = lines[i]
        if ln.startswith('```'):
            flush(); j = i + 1
            while j < len(lines) and not lines[j].startswith('```'):
                j += 1
            out.append('<pre>' + html.escape('\n'.join(lines[i + 1:j])) + '</pre>')
            i = j + 1; continue
        if re.match(r'\s*!\[', ln) or ln.startswith('Editable source') or ln.startswith('[!['):
            i += 1; continue
        m = re.match(r'(#{2,4}) (.*)', ln)
        if m:
            flush(); out.append(f'<h{len(m.group(1)) + 1}>' + inline(m.group(2), repo, base) + f'</h{len(m.group(1)) + 1}>')
            i += 1; continue
        if ln.startswith('|'):
            flush(); rows = []
            while i < len(lines) and lines[i].startswith('|'):
                cells = [c.strip() for c in lines[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r':?-{2,}:?', c) for c in cells if c):
                    rows.append(cells)
                i += 1
            if rows:
                head = ''.join('<th>' + inline(c, repo, base) + '</th>' for c in rows[0])
                body = ''.join('<tr>' + ''.join('<td>' + inline(c, repo, base) + '</td>' for c in r) + '</tr>' for r in rows[1:])
                out.append(f'<table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table>')
            continue
        m = re.match(r'\s*(?:[-*]|(\d+)\.) (.*)', ln)
        if m:
            flush(); tag = 'ol' if m.group(1) else 'ul'; items = []
            while i < len(lines):
                m2 = re.match(r'\s*(?:[-*]|\d+\.) (.*)', lines[i])
                if not m2:
                    if lines[i].startswith('   ') and items:
                        items[-1] += ' ' + lines[i].strip(); i += 1; continue
                    break
                items.append(m2.group(1)); i += 1
            out.append(f'<{tag}>' + ''.join('<li>' + inline(x, repo, base) + '</li>' for x in items) + f'</{tag}>')
            continue
        if not ln.strip():
            flush()
        else:
            para.append(ln.strip())
        i += 1
    flush()
    return '\n'.join(out)


def sections(text):
    parts, cur, buf = {}, '_intro', []
    for ln in text.split('\n'):
        m = re.match(r'## (.*)', ln)
        if m:
            parts[cur] = '\n'.join(buf); cur, buf = m.group(1).strip(), []
        else:
            buf.append(ln)
    parts[cur] = '\n'.join(buf)
    return parts


def first(parts, names):
    for n in names:
        if n in parts and parts[n].strip():
            return n, parts[n]
    return None, ''


data = {}
os.makedirs(os.path.join(OUT, 'assets', 'arch'), exist_ok=True)
for pid, (folder, repo, dec, kind, status) in PROJECTS.items():
    d = os.path.join(ROOT, folder)
    readme = open(os.path.join(d, 'README.md')).read()
    title = re.match(r'# (.*)', readme).group(1)
    parts = sections(readme)
    intro = re.sub(r'^# .*\n', '', parts['_intro'])
    intro = '\n'.join(l for l in intro.split('\n') if not l.startswith('|'))   # drop the docs index table
    hn, how = first(parts, HOW)
    pn, prob = first(parts, PROBLEM)
    rn, res = first(parts, RESULTS)
    fn, files = first(parts, FILES)
    un, run = first(parts, ['Running it', 'Try it', 'Deploying', 'Deploy'])
    status_sec = parts.get('Status', '')
    decisions = open(os.path.join(d, dec)).read()
    decisions = re.sub(r'^# .*\n', '', decisions)
    overview = md(intro, repo)
    if status_sec.strip():
        overview += '<h3>Status</h3>' + md(status_sec, repo)
    if prob:
        overview += f'<h3>{html.escape(pn)}</h3>' + md(prob, repo)
    if how:
        overview += f'<h3>{html.escape(hn)}</h3>' + md(how, repo)
    src = os.path.join(d, 'docs', 'architecture.png')
    dst = os.path.join(OUT, 'assets', 'arch', pid + '.png')
    subprocess.run(['sips', '--resampleWidth', '2000', src, '--out', dst], check=True, capture_output=True)
    data[pid] = {
        'title': title,
        'repo': f'https://github.com/{OWNER}/{repo}',
        'repoName': repo,
        'status': {'kind': kind, 'text': status},
        'overview': overview,
        'results': md(res, repo) if res else '',
        'resultsTitle': rn or '',
        'decisions': md(decisions, repo, os.path.dirname(dec)),
        'decisionsDoc': f'https://github.com/{OWNER}/{repo}/blob/main/{dec}',
        'files': md(files, repo) if files else '',
        'run': md(run, repo) if run else '',
        'runTitle': un or '',
        'arch': f'assets/arch/{pid}.png',
        'archSource': f'https://github.com/{OWNER}/{repo}/blob/main/docs/architecture.drawio',
    }

with open(os.path.join(OUT, 'console-data.js'), 'w') as f:
    f.write('// Generated from each project\'s README and docs by build_console.py. Do not edit by hand.\n')
    f.write('window.CONSOLE_PROJECTS = ' + json.dumps(data, indent=1, ensure_ascii=False) + ';\n')
print({k: (len(v['overview']), len(v['results']), len(v['decisions']), len(v['files'])) for k, v in data.items()})

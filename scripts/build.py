"""Generate index.html from templates/index.html and data/. No dependencies."""
import html
import json
from collections import Counter
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
projects = json.loads((ROOT / 'data/projects.json').read_text(encoding='utf-8'))
contributions = json.loads((ROOT / 'data/contributions.json').read_text(encoding='utf-8'))
escape = html.escape

def icon(paths, fill=False):
    attrs = 'fill="currentColor" stroke="none"' if fill else 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"'
    return f'<svg class="icon" viewBox="0 0 16 16" aria-hidden="true" {attrs}>{paths}</svg>'

ARROW = icon('<path d="M4.5 11.5 11.5 4.5"/><path d="M6 4.5h5.5V10"/>')
SYMBOLS = {
    'Apps': icon('<rect x="3.2" y="3.2" width="9.6" height="9.6" rx="2"/>'),
    'Games': icon('<path d="M8 2.6 13.4 8 8 13.4 2.6 8Z"/>'),
    'Tools': icon('<path d="M6 6h4v4H6Z"/><path d="M6 6V4.6a1.6 1.6 0 1 0-1.6 1.6H6Zm4 0V4.6a1.6 1.6 0 1 1 1.6 1.6H10ZM6 10v1.4a1.6 1.6 0 1 1-1.6-1.6H6Zm4 0v1.4a1.6 1.6 0 1 0 1.6-1.6H10Z"/>'),
    'Web': ARROW,
    'Forks': icon('<circle cx="5" cy="4" r="1.7"/><circle cx="11" cy="4" r="1.7"/><circle cx="8" cy="12.4" r="1.7"/><path d="M5 5.7v1.1c0 1.2 1 2 2 2.3m4-3.4v1.1c0 1.2-1 2-2 2.3"/>'),
    'Experiments': icon('<circle cx="8" cy="4.4" r="1.25"/><circle cx="4.6" cy="11" r="1.25"/><circle cx="11.4" cy="11" r="1.25"/>', fill=True),
    'Creative': icon('<path d="M8 2.8v10.4M3.5 5.4l9 5.2M12.5 5.4l-9 5.2"/>'),
}
assert len(projects) == len({p['name'] for p in projects})

def repository(project):
    p = project
    symbol = SYMBOLS[p['category']]
    badge = '<span class="fork-badge">Fork</span>' if p['fork'] else ''
    return f'''<a class="repo-row" href="{escape(p['url'])}" data-name="{escape(p['name'])}" data-category="{p['category']}">
      <span class="repo-symbol" aria-hidden="true">{symbol}</span><div class="repo-text"><h3>{escape(p['name'])}{badge}</h3><p>{escape(p['description'])}</p></div>
      <span class="repo-language">{escape(p['language'])}</span><time class="repo-date" datetime="{p['created']}" title="Repository created {p['created']}">{date.fromisoformat(p['created']).strftime('%b %Y')}</time><span class="repo-arrow" aria-hidden="true">{ARROW}</span></a>'''

def pull_request(p):
    status_class = '' if p['status'] == 'Merged' else ' other'
    return f'''<a class="pr-row" href="{escape(p['url'])}"><div><strong>{escape(p['repo'])}</strong><p>{escape(p['title'])}</p></div><span class="pr-status{status_class}">{p['status']}</span></a>'''

def creative_links(items, kind):
    return ''.join(f'<a href="https://vgarciaf.com/archive/{path}">{escape(title)}<small>{kind} {ARROW}</small></a>' for title, path in items)

year_counts = Counter(p['created'][:4] for p in projects)
category_counts = Counter(p['category'] for p in projects)
positions = Counter()
dots = []
for p in projects:
    year = p['created'][:4]
    i = positions[year]
    positions[year] += 1
    x = (int(year) - 2022) * 20 + (i % 4) * 3
    y = 14 + (i // 4) * 14
    dots.append(f'<span class="plot-dot" data-name="{escape(p["name"])}" data-fork="{str(p["fork"]).lower()}" style="--x:{x}%;--y:{y}px"></span>')

replacements = {
    'REPOSITORIES': '\n'.join(repository(p) for p in sorted(projects, key=lambda p: (p['score'], p['created']), reverse=True)),
    'PROJECT_DATA': json.dumps(
        [{k: p[k] for k in ('name', 'category', 'created', 'pushed', 'description', 'language', 'score')} for p in projects],
        ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c'),
    'CONTRIBUTIONS': '\n'.join(pull_request(p) for p in contributions),
    'PLOT': ''.join(dots),
    'PLOT_LABELS': ''.join(f'<a href="#archive" data-group="{year}">{year}<small>{year_counts[year]}</small></a>' for year in sorted(year_counts)),
    'FILTERS': ''.join(f'<button type="button" data-filter="{category}" aria-pressed="{str(category == "All").lower()}">{category}<small>{count}</small></button>' for category, count in [('All', len(projects))] + [(c, category_counts[c]) for c in ['Web', 'Apps', 'Tools', 'Games', 'Experiments', 'Forks', 'Creative']]),
    'PHOTOGRAPHY': creative_links([
        ('Cats during the blackout', 'photography/blackout-cats-28-04-2025'),
        ('My car & my girlfriend’s cat', 'photography/c200-22-04-2025'),
        ('Copenhagen', 'photography/copenhagen-2025'),
        ('My bike', 'photography/gsx250r-21-04-2025'),
        ('Street cats', 'photography/street-cats-24-05-2025'),
    ], 'Photography'),
    'WRITING': creative_links([
        ('TP-LINK Archer T2U on Arch Linux', 'blog/arch-tp-link-archer-t2u'),
        ('A coloured message of the day', 'blog/motd'),
        ('My 2024 website', 'blog/new-page-2024'),
        ('Remote work', 'blog/remote-work'),
        ('1984', 'books/1984'),
        ('Animal Farm', 'books/animal-farm'),
        ('The Metamorphosis', 'books/the-metamorphosis'),
        ('The Unix Haters Handbook', 'books/the-unix-haters-handbook'),
        ('Reading wishlist', 'books/wishlist'),
    ], 'Writing & reading'),
}
template = (ROOT / 'templates/index.html').read_text(encoding='utf-8')
for key, value in replacements.items():
    template = template.replace('{{' + key + '}}', value)
assert '{{' not in template, 'Unfilled template field'
(ROOT / 'index.html').write_text(template, encoding='utf-8')

print(f'Built index.html: {len(projects)} repositories, {len(contributions)} PRs.')

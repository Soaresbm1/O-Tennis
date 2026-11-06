"""Build the installable WordPress theme from the restaurant's original pages."""
from html import escape
from html.parser import HTMLParser
from pathlib import Path
import json
import re
import shutil
import zipfile

ROOT = Path(__file__).resolve().parents[2]
THEME = ROOT / 'wordpress' / 'otennis'


class Node:
    def __init__(self, tag='', attrs=(), text=''):
        self.tag, self.attrs, self.text, self.children = tag, dict(attrs), text, []

    def find(self, tag):
        return [c for c in self.children if c.tag == tag]


class Parser(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.root = Node('root')
        self.stack = [self.root]
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs)
        self.stack[-1].children.append(node)
        if tag not in ('img', 'br', 'meta', 'link', 'input', 'hr'):
            self.stack.append(node)

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                self.stack = self.stack[:i]
                break

    def handle_data(self, data):
        self.stack[-1].children.append(Node(text=data))


def block(name, markup, attrs=None):
    data = ' ' + json.dumps(attrs, ensure_ascii=False, separators=(',', ':')) if attrs else ''
    return f'<!-- wp:{name}{data} -->\n{markup}\n<!-- /wp:{name} -->\n'


def url(value):
    if value == 'menu.html':
        return '{{MENU_URL}}'
    if value.startswith('index.html'):
        return '{{HOME_URL}}' + value[len('index.html'):]
    if value.startswith('image/'):
        return '{{MEDIA:' + value + '}}'
    return value


def inline(node):
    if not node.tag:
        return escape(re.sub(r'\s+', ' ', node.text))
    if node.tag in ('noscript', 'script'):
        return ''
    if node.tag == 'a' and 'data-email-user' in node.attrs:
        email = node.attrs['data-email-user'] + '@' + node.attrs['data-email-domaine']
        return f'<a href="mailto:{escape(email)}">{escape(email)}</a>'
    if node.tag == 'br':
        return '<br>'
    attrs = ''
    for key in ('href', 'class'):
        if key in node.attrs:
            attrs += f' {key}="{escape(url(node.attrs[key]), quote=True)}"'
    return f'<{node.tag}{attrs}>' + ''.join(inline(c) for c in node.children) + f'</{node.tag}>'


def paragraph(html, classes=''):
    attrs = {'className': classes} if classes else None
    css = f' class="{escape(classes)}"' if classes else ''
    return block('paragraph', f'<p{css}>{html.strip()}</p>', attrs)


def convert(node):
    tag, a = node.tag, node.attrs
    classes = a.get('class', '')
    if not tag:
        return paragraph(escape(node.text.strip())) if node.text.strip() else ''
    if tag in ('noscript', 'script'):
        return ''
    if tag in ('section', 'div', 'nav'):
        attrs = {'layout': {'type': 'default'}}
        if classes:
            attrs['className'] = classes
        if a.get('id'):
            attrs['anchor'] = a['id']
        wrapper = 'section' if tag == 'section' else 'div'
        if wrapper == 'section':
            attrs['tagName'] = wrapper
        css = 'wp-block-group' + (' ' + classes if classes else '')
        anchor = f' id="{escape(a["id"])}"' if a.get('id') else ''
        # These wrappers contain inline text (address, portion sizes, restaurant highlights).
        if all(not c.tag or c.tag in ('span', 'strong', 'br', 'a', 'noscript') for c in node.children) and not any('btn' in c.attrs.get('class', '').split() for c in node.children):
            body = paragraph(''.join(inline(c) for c in node.children))
        else:
            body = ''.join(convert(c) for c in node.children)
        return block('group', f'<{wrapper}{anchor} class="{css}">\n{body}</{wrapper}>', attrs)
    if tag in ('h1', 'h2', 'h3', 'h4'):
        attrs = {'level': int(tag[1])}
        alignment = re.search(r'text-align\s*:\s*(left|center|right)', a.get('style', ''))
        if alignment:
            attrs['textAlign'] = alignment[1]
            classes = ('has-text-align-' + alignment[1] + ' ' + classes).strip()
        if classes:
            custom = a.get('class', '')
            if custom:
                attrs['className'] = custom
        return block('heading', f'<{tag} class="wp-block-heading' + (' ' + classes if classes else '') + '">' + ''.join(inline(c) for c in node.children).strip() + f'</{tag}>', attrs)
    if tag == 'p':
        alignment = re.search(r'text-align\s*:\s*(left|center|right)', a.get('style', ''))
        if alignment:
            attrs = {'align': alignment[1]}
            if classes:
                attrs['className'] = classes
            css = 'has-text-align-' + alignment[1] + (' ' + classes if classes else '')
            return block('paragraph', f'<p class="{css}">' + ''.join(inline(c) for c in node.children).strip() + '</p>', attrs)
        return paragraph(''.join(inline(c) for c in node.children), classes)
    if tag in ('span', 'strong', 'a'):
        if tag == 'a' and 'btn' in classes.split():
            button = block('button', f'<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="{url(a["href"])}">' + ''.join(inline(c) for c in node.children).strip() + '</a></div>')
            return block('buttons', '<div class="wp-block-buttons">' + button + '</div>')
        return paragraph(''.join(inline(c) for c in node.children), classes) if tag == 'span' else paragraph(inline(node))
    if tag == 'ul':
        items = ''.join(block('list-item', '<li>' + ''.join(inline(c) for c in li.children).strip() + '</li>') for li in node.find('li'))
        return block('list', '<ul class="wp-block-list' + (' ' + classes if classes else '') + '">' + items + '</ul>', {'className': classes} if classes else None)
    if tag == 'img':
        src = url(a['src'])
        alt = a.get('alt', '').replace('Photo du restaurant O\'Tennis (à ajouter)', 'Terrasse du restaurant O\'Tennis')
        return block('image', f'<figure class="wp-block-image size-full"><img src="{src}" alt="{escape(alt, quote=True)}"/></figure>', {'sizeSlug': 'full', 'linkDestination': 'none'})
    if tag == 'table':
        rows = ''.join('<tr>' + ''.join('<td>' + ''.join(inline(c) for c in td.children).strip() + '</td>' for td in tr.find('td')) + '</tr>' for tr in node.find('tr'))
        return block('table', '<figure class="wp-block-table ' + classes + '"><table><tbody>' + rows + '</tbody></table></figure>', {'hasFixedLayout': False, 'className': classes})
    if tag == 'iframe':
        # Address is an editable block attribute; the iframe is rendered server-side.
        return '<!-- wp:otennis/map {"address":"Vie des Crêts 49, 2732 Reconvilier, Suisse"} /-->\n'
    raise ValueError(f'Unsupported tag: {tag}')


def build():
    (THEME / 'content').mkdir(parents=True, exist_ok=True)
    (THEME / 'assets').mkdir(exist_ok=True)
    for filename, output in [('index.html', 'accueil.html'), ('menu.html', 'menu.html')]:
        document = Parser((ROOT / filename).read_text(encoding='utf-8'))
        body = document.root.find('html')[0].find('body')[0]
        sections = body.find('section')
        content = ''.join(convert(section) for section in sections)
        # Assert that the migration preserves every dish name, price, list item and hours cell.
        def collect(node, tag):
            result = []
            if node.tag == tag:
                def text_content(n):
                    return n.text + ''.join(text_content(child) for child in n.children)
                result.append(re.sub(r'\s+', ' ', text_content(node)).strip())
            for child in node.children:
                result.extend(collect(child, tag))
            return result
        converted = Parser(content).root
        for tag in ('h3', 'h4', 'li', 'strong', 'td'):
            expected = [text for section in sections for text in collect(section, tag)]
            assert collect(converted, tag) == expected, f'Migration changed {tag} content in {filename}'
        (THEME / 'content' / output).write_text(content, encoding='utf-8')
    for folder in ('fonts', 'image'):
        shutil.copytree(ROOT / folder, THEME / 'assets' / folder, dirs_exist_ok=True)
    (THEME / 'assets' / 'site.css').write_text((ROOT / 'style.css').read_text(encoding='utf-8'), encoding='utf-8')
    archive = ROOT / 'wordpress' / 'otennis-wordpress.zip'
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as package:
        for path in sorted(THEME.rglob('*')):
            if path.is_file():
                package.write(path, path.relative_to(THEME.parent).as_posix())
    print(f'Theme packaged: {archive} ({archive.stat().st_size:,} bytes)')


if __name__ == '__main__':
    build()

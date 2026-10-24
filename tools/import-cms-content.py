"""One-time migration of the original static content. Never run over manager edits."""
from html.parser import HTMLParser
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]


class Node:
    def __init__(self, tag='', attrs=(), text=''):
        self.tag, self.attrs, self.text, self.children = tag, dict(attrs), text, []

    def all(self, tag=None, css=None):
        results = []
        for child in self.children:
            if (tag is None or child.tag == tag) and (css is None or css in child.attrs.get('class', '').split()):
                results.append(child)
            results.extend(child.all(tag, css))
        return results

    def value(self):
        return re.sub(r'\s+', ' ', self.text + ''.join(c.value() for c in self.children)).strip()


class Parser(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.root = Node('root')
        self.stack = [self.root]
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        n = Node(tag, attrs)
        self.stack[-1].children.append(n)
        if tag not in ('img', 'br', 'meta', 'link', 'input', 'hr'):
            self.stack.append(n)

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                self.stack = self.stack[:i]
                break

    def handle_data(self, value):
        self.stack[-1].children.append(Node(text=value))


def text_without(node, tag):
    return re.sub(r'\s+', ' ', node.text + ''.join(text_without(c, tag) for c in node.children if c.tag != tag)).strip()


def migrate():
    output = ROOT / 'data'
    output.mkdir(exist_ok=True)
    if any(output.glob('*.json')):
        raise SystemExit('Content already exists. Migration stopped to preserve manager edits.')
    home = Parser((ROOT / 'index.html').read_text(encoding='utf-8')).root
    menu = Parser((ROOT / 'menu.html').read_text(encoding='utf-8')).root
    hero = home.all(css='hero')[0]
    presentation = home.all(css='presentation-texte')[0]
    teaser = next(n for n in home.all('section') if n.attrs.get('id') == 'menu')
    home_data = {
        'heroTitle': hero.all('h2')[0].value(),
        'heroText': hero.all('p')[0].value(),
        'heroButton': hero.all('a')[0].value(),
        'welcomeLabel': presentation.all('p')[0].value(),
        'presentationTitle': presentation.all('h2')[0].value(),
        'presentationText': presentation.all('p')[1].value(),
        'highlights': [{'emoji': n.all('span')[0].value(), 'text': text_without(n, 'span')} for n in presentation.all(css='atout')],
        'photo': '/image/terrasse.jpg', 'photoAlt': 'Terrasse du restaurant O’Tennis',
        'menuLabel': teaser.all('p')[0].value(), 'menuTitle': teaser.all('h2')[0].value(),
        'menuText': teaser.all('p')[1].value(), 'menuButton': teaser.all('a')[0].value(),
        'contactLabel': 'On vous attend', 'contactTitle': 'Horaires & Contact',
        'announcement': ''
    }
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    hours = []
    for i, row in enumerate(home.all(css='horaires')[0].all('tr')):
        cells = row.all('td')
        times = re.findall(r'(\d{2})h(\d{2})', cells[1].value())
        hours.append({'day': cells[0].value(), 'schemaDay': days[i], 'closed': not bool(times),
                      'opens': ':'.join(times[0]) if times else '10:00', 'closes': ':'.join(times[1]) if times else '22:00'})
    restaurant = {
        'name': "O'Tennis", 'tagline': 'Restaurant - Buvette chez Kryste', 'logo': '/image/logo.jpeg',
        'street': 'Vie des Crêts 49', 'postalCode': '2732', 'city': 'Reconvilier', 'country': 'Suisse',
        'phone': '032 481 48 31', 'email': 'Krystebitz@hotmail.com',
        'reservation': 'Par téléphone ou directement sur place',
        'mapAddress': 'Vie des Crêts 49, 2732 Reconvilier, Suisse',
        'hours': hours, 'facebook': '', 'instagram': ''
    }
    categories = []
    for category in menu.all(css='categorie-menu'):
        data = {'id': category.attrs['id'], 'title': category.all('h3')[0].value(), 'notes': [], 'groups': []}
        pending_label = ''
        for n in category.children:
            if n.tag == 'h4':
                pending_label = n.value()
            elif n.tag == 'p':
                if data['groups']:
                    data['groups'][-1]['notes'].append(n.value())
                else:
                    data['notes'].append(n.value())
            elif n.tag == 'ul' or 'plats' in n.attrs.get('class', '').split():
                group = {'title': pending_label, 'layout': 'list' if n.tag == 'ul' else 'cards', 'notes': [], 'items': []}
                pending_label = ''
                if n.tag == 'ul':
                    for item in n.all('li'):
                        prices = item.all('strong')
                        group['items'].append({'name': text_without(item, 'strong'), 'price': prices[0].value() if prices else '', 'description': '', 'image': '', 'portions': []})
                else:
                    for item in n.all(css='plat'):
                        prices = item.all(css='plat-prix')
                        descriptions = item.all(css='plat-description')
                        portions = []
                        for size in item.all(css='plat-tailles'):
                            for portion in size.all('span'):
                                amounts = portion.all('strong')
                                portions.append({'label': text_without(portion, 'strong').rstrip(' :'), 'price': amounts[0].value() if amounts else ''})
                        group['items'].append({'name': item.all('h4')[0].value(), 'price': prices[0].value() if prices else '',
                                              'description': descriptions[0].value() if descriptions else '', 'image': '', 'portions': portions})
                data['groups'].append(group)
        categories.append(data)
    menu_data = {'label': 'À table', 'title': 'Notre Menu', 'notice': menu.all(css='categorie-note')[0].value(), 'categories': categories}
    for name, value in [('home', home_data), ('restaurant', restaurant), ('menu', menu_data)]:
        (output / (name + '.json')).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Migrated {len(categories)} categories and {sum(len(g["items"]) for c in categories for g in c["groups"])} dishes/drinks, plus home and opening hours.')


if __name__ == '__main__':
    migrate()

import re

with open('app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('f.years.map(y => `Year ${y - 2015}`)', 'f.years.map(y => `Year ${Number(y) - 2015}`)')
content = content.replace('scenarioF.years.map(y => `Year ${y - 2015}`)', 'scenarioF.years.map(y => `Year ${Number(y) - 2015}`)')
content = content.replace('<td>Year {y - 2015}</td>', '<td>Year {Number(y) - 2015}</td>')

with open('app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

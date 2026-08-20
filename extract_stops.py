import re

with open('app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

matches = re.findall(r'fieldKey="(.*?)"\s+stops=\{\[(.*?)\]\}', content)
print('STOPS FOUND:')
for k, v in matches:
    print(f'{k}: [{v}]')

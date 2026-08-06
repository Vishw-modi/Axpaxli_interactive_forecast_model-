import re

with open('app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

sections = content.split('<AccordionSection ')
for s in sections[1:]:
    idx_match = re.search(r'idx=\{([0-9]+)\}', s)
    if not idx_match:
        continue
    idx = idx_match.group(1)
    print(f'Section {idx}:')
    
    sliders = re.findall(r'<SliderControl[^>]+fieldKey=\"([^\"]+)\"[^>]+stops=\{\[([^\]]+)\]\}', s)
    for k, st in sliders:
        print(f'  {k}: [{st}]')

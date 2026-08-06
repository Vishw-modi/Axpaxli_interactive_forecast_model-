import re

with open('app/page.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Replace the style for the slider input
pattern = r'className="slider-input"\s*\n\s*onChange=\{e => onChange\(stops\[parseInt\(e\.target\.value\)\]\)\}\s*\n\s*style=\{\{\s*accentColor:\s*activeColor\s*\}\}'
repl = r'className="slider-input"\n        onChange={e => onChange(stops[parseInt(e.target.value)])}\n        style={{ background: `linear-gradient(to right, ${activeColor} ${(currentIdx / 4) * 100}%, #ffffff ${(currentIdx / 4) * 100}%, #ffffff 100%)`, accentColor: activeColor }}'

new_c = re.sub(pattern, repl, c, flags=re.DOTALL)
if new_c != c:
    with open('app/page.tsx', 'w', encoding='utf-8') as f:
        f.write(new_c)
    print("Updated slider style")
else:
    print("Could not find the pattern")

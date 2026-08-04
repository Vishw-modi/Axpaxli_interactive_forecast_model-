import re
with open('app/page.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Pattern: <AccordionSection followed by anything up to onToggle={() => toggleSection(X)}>
# Wait, we can just use regex to clean it.
def replacer(m):
    idx = m.group(1)
    # the title and color are in the string, let's extract them.
    # The title might have emojis and quotes. Let's extract them properly.
    full_match = m.group(0)
    title_m = re.search(r'title="([^"]+)"', full_match)
    title = title_m.group(1) if title_m else ""
    color_m = re.search(r'color="([^"]+)"', full_match)
    color = color_m.group(1) if color_m else "#000000"
    
    return f'<AccordionSection idx={{{idx}}} title="{title}" color="{color}" isOpen={{openSections.has({idx})}} onQuickSet={{(level) => handleQuickSet({idx}, level)}} onToggle={{() => toggleSection({idx})}}>'

new_c = re.sub(r'<AccordionSection.*?idx=\{([0-9]+)\}.*?onToggle=\{.*?\}>(?=\n\s*<[A-Za-z/])', replacer, c, flags=re.DOTALL)
# Wait, the closing angle bracket is matched. Let's make it more precise.
new_c = re.sub(r'<AccordionSection idx=\{([0-9]+)\}.*?onToggle=\{\(\) => toggleSection\([0-9]+\)\}>', replacer, c, flags=re.DOTALL)

with open('app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(new_c)

import sys

with open('app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

search_str = """            <div style={{ textAlign: 'right' }}>
              <button className="btn secondary" onClick={() => goPage(6)}"""

panel_usage = """            <ModelArchitecturePanel state={state} />
            <div style={{ marginTop: '24px' }}></div>
"""

inject_idx = content.find(search_str)
if inject_idx != -1:
    content = content[:inject_idx] + panel_usage + content[inject_idx:]
    with open('app/page.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Injected panel usage.")
else:
    print("Could not find insertion point!")

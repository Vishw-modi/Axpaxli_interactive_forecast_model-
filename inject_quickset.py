import re
import json

with open('app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Build the quickSet mapping
mapping = {}
sections = content.split('<AccordionSection ')
for s in sections[1:]:
    idx_match = re.search(r'idx=\{([0-9]+)\}', s)
    if not idx_match:
        continue
    idx = int(idx_match.group(1))
    
    sliders = re.findall(r'<SliderControl[^>]+fieldKey=\"([^\"]+)\"[^>]+stops=\{\[([^\]]+)\]\}', s)
    if idx not in mapping:
        mapping[idx] = {}
    for k, st in sliders:
        # Evaluate the string of array elements to a python list
        mapping[idx][k] = [float(x.strip()) for x in st.split(',')]

mapping_js = "const quickSetStops: Record<number, Record<string, number[]>> = " + json.dumps(mapping, indent=2) + ";"

# Add handleQuickSet in page.tsx
func_js = mapping_js + """
  const handleQuickSet = (sectionIdx: number, level: 0 | 2 | 4) => {
    const sectionMap = quickSetStops[sectionIdx];
    if (!sectionMap) return;
    
    const updates: Partial<ForecastState> = {};
    for (const [key, stops] of Object.entries(sectionMap)) {
      updates[key as keyof ForecastState] = stops[level] as never;
    }
    
    setState(prev => {
      const next = { ...prev, ...updates };
      // Save
      const nextH = history.slice(0, historyIdx + 1);
      nextH.push(next);
      setHistory(nextH);
      setHistoryIdx(nextH.length - 1);
      return next;
    });
  };
"""

# Insert handleQuickSet just before function toggleSection
insert_idx = content.find("function toggleSection(idx: number)")
if insert_idx != -1:
    content = content[:insert_idx] + func_js + "\n  " + content[insert_idx:]

# Inject onQuickSet into AccordionSection tags
content = re.sub(r'(<AccordionSection[^>]+isOpen=\{openSections\.has\([0-9]+\)\})', r'\1 onQuickSet={(level) => handleQuickSet(\g<1>)}', content)
# Wait, I need to capture the idx to pass to handleQuickSet!
# Let's do it manually.
for idx in mapping.keys():
    pattern = f'<AccordionSection idx={{{idx}}}'
    repl = f'<AccordionSection idx={{{idx}}} onQuickSet={{(level) => handleQuickSet({idx}, level)}}'
    content = content.replace(pattern, repl)

# Update AccordionSection component definition to accept onQuickSet and render the buttons
accordion_def = """function AccordionSection({
  idx, title, color, isOpen, onToggle, onQuickSet, children
}: {
  idx: number; title: string; color: string;
  isOpen: boolean; onToggle: () => void;
  onQuickSet?: (level: 0 | 2 | 4) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="accordion-section">
      <button
        className={`accordion-header ${isOpen ? 'open' : ''}`}
        onClick={onToggle}
        style={{ borderLeft: `4px solid ${color}` }}
      >
        <span>{title}</span>
        <span className="accordion-chevron">{isOpen ? '▼' : '▶'}</span>
      </button>
      {isOpen && (
        <div className="accordion-body">
          {onQuickSet && (
            <div className="quickset-row" style={{ display: 'flex', gap: '8px', marginBottom: '8px', background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '12px', color: '#64748b', alignSelf: 'center', marginRight: '8px', fontWeight: 600 }}>QUICK-SET SCENARIO:</span>
              <button className="btn outline" onClick={() => onQuickSet(0)} style={{ fontSize: '12px', padding: '4px 10px', borderColor: '#3b82f6', color: '#3b82f6' }}>Conservative</button>
              <button className="btn outline" onClick={() => onQuickSet(2)} style={{ fontSize: '12px', padding: '4px 10px', borderColor: '#10b981', color: '#10b981' }}>Base Case</button>
              <button className="btn outline" onClick={() => onQuickSet(4)} style={{ fontSize: '12px', padding: '4px 10px', borderColor: '#ea580c', color: '#ea580c' }}>Aggressive</button>
            </div>
          )}
          {children}
        </div>
      )}
    </div>
  );
}"""

# Replace AccordionSection definition
content = re.sub(r'function AccordionSection\(\{[^\}]+\}\s*:\s*\{[^\}]+\}\)\s*\{.*?(?=\n\s*function )', accordion_def + '\n', content, flags=re.DOTALL)

with open('app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

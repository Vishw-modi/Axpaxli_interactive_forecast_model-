import re

with open('app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Define the new SliderControl
slider_new = """function SliderControl({
  label, fieldKey, stops, currentValue, unit, onAskAI,
  onChange
}: {
  label: string;
  fieldKey: string;
  stops: number[];          // exactly 5 values
  currentValue: number;
  unit: string;
  onAskAI: () => void;
  onChange: (val: number) => void;
}) {
  const currentIdx = stops.reduce((best, s, i) =>
    Math.abs(s - currentValue) < Math.abs(stops[best] - currentValue) ? i : best, 0);

  // Gradient colors for 5 stops
  const getStopColor = (idx: number) => {
    switch (idx) {
      case 0: return '#3b82f6'; // Conservative: blue
      case 1: return '#0ea5e9'; // Semi-Con: light blue
      case 2: return '#10b981'; // Centered: green
      case 3: return '#f59e0b'; // Semi-Agg: yellow-amber
      case 4: return '#ea580c'; // Aggressive: amber-orange
      default: return '#5b6abf';
    }
  };

  const activeColor = getStopColor(currentIdx);

  return (
    <div className="slider-control-row">
      <div className="slider-label-row">
        <span className="slider-label">{label}</span>
        <span className="slider-value-chip" style={{ backgroundColor: activeColor + '20', color: activeColor }}>
          {unit === '$'
            ? `$${stops[currentIdx].toLocaleString()}`
            : `${(stops[currentIdx] * (unit === '%' ? 100 : 1)).toLocaleString()}${unit === '$' ? '' : unit}`
          }
        </span>
        <button className="ask-ai-btn" onClick={onAskAI}>✨ Ask AI</button>
      </div>
      <input
        type="range"
        min={0} max={4} step={1}
        value={currentIdx}
        className="slider-input"
        onChange={e => onChange(stops[parseInt(e.target.value)])}
        style={{ accentColor: activeColor }}
      />
      <div className="slider-ticks">
        {['Conservative','Semi-Conservative','Centered','Semi-Aggressive','Aggressive'].map((t,i) => (
          <span key={i} className={`tick-label ${i === currentIdx ? 'active' : ''}`} style={i === currentIdx ? { color: activeColor } : {}}>{t}</span>
        ))}
      </div>
    </div>
  );
}"""

# Use regex to replace the old SliderControl
# It starts at "function SliderControl(" and ends at the closing brace of its return statement block.
# Since it's a bit tricky to match with regex due to nested braces, I'll just match up to "</div>\n    </div>\n  );\n}"
pattern = r'function SliderControl\(.*?<div className="slider-ticks">.*?</div>\n    </div>\n  \);\n\}'

new_content = re.sub(pattern, slider_new, content, flags=re.DOTALL)
if new_content == content:
    print("Failed to replace SliderControl")
else:
    with open('app/page.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully replaced SliderControl")

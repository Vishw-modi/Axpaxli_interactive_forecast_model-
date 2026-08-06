import re

# Update page.tsx
with open('app/page.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Replace the style for the slider input
pattern = r'style=\{\{ background: `linear-gradient\(to right, \$\{activeColor\} \$\{\(currentIdx / 4\) \* 100\}%, #ffffff \$\{\(currentIdx / 4\) \* 100\}%, #ffffff 100%\)`, accentColor: activeColor \}\}'
repl = r'style={{ background: `linear-gradient(to right, ${activeColor} ${(currentIdx / 4) * 100}%, #e2e8f0 ${(currentIdx / 4) * 100}%, #e2e8f0 100%)`, color: activeColor }}'

new_c = re.sub(pattern, repl, c)
with open('app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(new_c)

# Update globals.css
with open('app/globals.css', 'a', encoding='utf-8') as f:
    f.write('''
/* Custom Slider Overrides to allow white/light-gray track */
input[type=range].slider-input {
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 3px;
  outline: none;
}
input[type=range].slider-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: currentColor;
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}
input[type=range].slider-input::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: currentColor;
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}
''')

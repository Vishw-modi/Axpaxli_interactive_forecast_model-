const fs = require('fs');
const path = 'page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix SliderControl
content = content.replace(
  /const \[localInput, setLocalInput\] = React\.useState<string \| null>\(null\);\s*React\.useEffect\(\(\) => \{\s*setLocalInput\(null\);\s*\}, \[currentValue\]\);\s*const onToggleScenarios/g,
  `const [localInput, setLocalInput] = React.useState<string | null>(null);\n\n    const onToggleScenarios`
);

content = content.replace(
  /onChange=\{\(e\) => \{\s*setLocalInput\(e\.target\.value\);\s*if \(e\.target\.value === ''\) return;\s*const val = parseFloat\(e\.target\.value\);\s*if \(\!isNaN\(val\)\) \{\s*const finalVal = unit === '%' \? val \/ 100 : val;\s*onChange\(finalVal\);\s*onSetCustomCenter\(finalVal\);\s*\}\s*\}\}/g,
  `onChange={(e) => {
                setLocalInput(e.target.value);
                if (e.target.value === '') {
                  onChange(0);
                  onSetCustomCenter(0);
                  return;
                }
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) {
                  const finalVal = unit === '%' ? val / 100 : val;
                  onChange(finalVal);
                  onSetCustomCenter(finalVal);
                }
              }}`
);

// Fix NumberControl
content = content.replace(
  /const \[localInput, setLocalInput\] = React\.useState<string \| null>\(null\);\s*React\.useEffect\(\(\) => \{\s*setLocalInput\(null\);\s*\}, \[currentValue\]\);/g,
  `const [localInput, setLocalInput] = React.useState<string | null>(null);`
);

content = content.replace(
  /const handleChange = \(e: React\.ChangeEvent<HTMLInputElement>\) => \{\s*setLocalInput\(e\.target\.value\);\s*if \(e\.target\.value === ''\) return;\s*let val = parseFloat\(e\.target\.value\);\s*if \(\!isNaN\(val\)\) \{\s*if \(unit === '%'\) val = val \/ 100;\s*onChange\(val\);\s*\}\s*\};/g,
  `const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalInput(e.target.value);
      if (e.target.value === '') {
        onChange(0);
        return;
      }
      let val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        if (unit === '%') val = val / 100;
        onChange(val);
      }
    };`
);

fs.writeFileSync(path, content, 'utf8');
console.log("Input handling updated successfully.");

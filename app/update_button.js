const fs = require('fs');
const path = 'c:/Users/deepm/OneDrive/Desktop/demo/Axpaxli_interactive_forecast_model-/app/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `<div style={{ textAlign: 'right' }}>
            <button className="btn secondary" onClick={() => goPage(6)} style={{ marginRight: '8px' }}>Explore scenarios</button>
            <button className="btn" onClick={() => goPage(5)}>View key insights ?</button>
          </div>`;

const replacement = `<div style={{ textAlign: 'right' }}>
            <button className="btn" onClick={() => goPage(6)}>Explore scenarios ?</button>
          </div>`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Success exact match");
} else {
    // Fallback regex
    content = content.replace(/<button className="btn secondary" onClick=\{\(\) => goPage\(6\)\} style=\{\{ marginRight: '8px' \}\}>Explore scenarios<\/button>\s*<button className="btn" onClick=\{\(\) => goPage\(5\)\}>View key insights.*?<\/button>/g, '<button className="btn" onClick={() => goPage(6)}>Explore scenarios ?</button>');
    fs.writeFileSync(path, content, 'utf8');
    console.log("Success regex fallback");
}

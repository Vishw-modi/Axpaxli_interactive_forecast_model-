const fs = require('fs');
const path = 'page.tsx';
let content = fs.readFileSync(path, 'utf8');

const searchStr1 = `            <div style={{ textAlign: 'right' }}>
              <button className="btn secondary" onClick={() => goPage(6)} style={{ marginRight: '8px' }}>Explore scenarios</button>
              <button className="btn" onClick={() => goPage(5)}>View key insights \uFFFD+'</button>
            </div>`;

const searchStr2 = `            <div style={{ textAlign: 'right' }}>
              <button className="btn secondary" onClick={() => goPage(6)} style={{ marginRight: '8px' }}>Explore scenarios</button>
              <button className="btn" onClick={() => goPage(5)}>View key insights +'</button>
            </div>`;

const replaceStr = `            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '16px' }}>
              <button 
                className="btn secondary" 
                onClick={() => setShowInsights(!showInsights)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: showInsights ? 'var(--navy)' : 'white',
                  color: showInsights ? 'white' : 'var(--navy)'
                }}
              >
                <span>{String.fromCodePoint(0x1F4A1)}</span>
                <span>Key Insights</span>
              </button>
              <button className="btn primary" onClick={() => setActiveTab('explore')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                Explore scenarios <span style={{ fontSize: '18px' }}>&rarr;</span>
              </button>
            </div>`;

if (content.includes("View key insights")) {
    // We can do a regex replace to catch any broken character
    content = content.replace(/<div style=\{\{ textAlign: 'right' \}\}>\s*<button className="btn secondary" onClick=\{\(\) => goPage\(6\)\} style=\{\{ marginRight: '8px' \}\}>Explore scenarios<\/button>\s*<button className="btn" onClick=\{\(\) => goPage\(5\)\}>View key insights [^<]+<\/button>\s*<\/div>/g, replaceStr);
}

fs.writeFileSync(path, content, 'utf8');
console.log("Insights updated successfully.");

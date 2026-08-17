const fs = require('fs');
const path = 'page.tsx';
let content = fs.readFileSync(path, 'utf8');

const searchStr = `<div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px', marginBottom: 0 }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--navy)', whiteSpace: 'nowrap' }}>Save scenario:</span>`;

const replaceStr = `<div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-8px' }}>
                    <button className="btn secondary" onClick={() => setScenarioState(JSON.parse(JSON.stringify(state)))}>Have base forecast assumptions populated</button>
                  </div>
                  <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px', marginBottom: 0 }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--navy)', whiteSpace: 'nowrap' }}>Save scenario:</span>`;

content = content.replace(searchStr, replaceStr);

fs.writeFileSync(path, content, 'utf8');
console.log("Layout updated successfully.");

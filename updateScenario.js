const fs = require('fs');

const path = 'app/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Update renderAssumptions signature
content = content.replace(
  'const renderAssumptions = (asDropdown = false) => (',
  'const renderAssumptions = (asDropdown = false, isScenario = false) => {\n    const s = isScenario ? scenarioState : state;\n    const h = isScenario ? handleScenarioChange : handleStateChange;\n    return ('
);

// We need to replace `state.` with `s.` and `handleStateChange` with `h` inside the body of renderAssumptions.
// The body starts at `const renderAssumptions` and ends roughly around line 1917 with `  );`
const startIdx = content.indexOf('const renderAssumptions = (asDropdown = false, isScenario = false) => {');
const endIdx = content.indexOf('  );', startIdx) + 4;

let body = content.substring(startIdx, endIdx);

// Modify body
body = body.replace(/state\./g, 's.');
body = body.replace(/handleStateChange/g, 'h');

// Reinsert body
content = content.substring(0, startIdx) + body + '\n  };' + content.substring(endIdx);

// 2. Modify page-6 layout
const page6Start = content.indexOf('<section className={`page ${activeTab === 6 ? \'active\' : \'\'}`} id="page-6">');
const page6End = content.indexOf('</section>', page6Start) + 10;
let page6Content = content.substring(page6Start, page6End);

// Replace grid2 with the new layout
const grid2Start = page6Content.indexOf('<div className="grid2">');
const grid2End = page6Content.indexOf('<div className="card">\n              <h3>Revenue forecast under current sliders</h3>'); // where the next section starts
const originalGrid2 = page6Content.substring(grid2Start, grid2End);

// We want to completely replace from <div className="grid2"> to the end of the page-6 section, rebuilding it.
const rebuiltPage6 = `        <section className={\`page \${activeTab === 6 ? 'active' : ''}\`} id="page-6">
          <div>
            <h1>Scenario &amp; sensitivity analysis</h1>
            <p className="lead">Drag any assumption and the forecast, peak metrics, and sensitivity ranking recalculate instantly.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '32px', alignItems: 'start', marginTop: '24px' }}>
            <div style={{ position: 'sticky', top: '24px', maxHeight: 'calc(100vh - 48px)', overflowY: 'auto', paddingRight: '8px' }}>
              {renderAssumptions(true, true)}
            </div>
            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px', marginBottom: 0 }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--navy)', whiteSpace: 'nowrap' }}>Save scenario:</span>
                  <input 
                    type="text" 
                    placeholder="E.g., High Price" 
                    value={scenarioNameInput} 
                    onChange={e => setScenarioNameInput(e.target.value)}
                    style={{ padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '4px', outline: 'none', fontSize: '13px', flex: 1 }}
                  />
                  <button className="btn" style={{ padding: '8px 18px', fontSize: '14px', background: 'var(--accent)', color: '#fff', border: 'none' }} disabled={!scenarioNameInput.trim()} onClick={() => {
                    if (scenarioNameInput.trim()) {
                      const tagTypes = ['tag-base', 'tag-down', 'tag-up'];
                      const randomTag = tagTypes[savedScenarios.length % 3];
                      setSavedScenarios([...savedScenarios, { name: scenarioNameInput, tag: randomTag, s: {...scenarioState} }]);
                      setScenarioNameInput('');
                    }
                  }}>Save</button>
                </div>
                
                {savedScenarios.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginTop: '-6px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Saved versions:</span>
                    {savedScenarios.map((sc, i) => (
                      <span key={i} className={\`scenario-tag \${sc.tag}\`}>{sc.name}</span>
                    ))}
                  </div>
                )}
  
                <div className="grid3" style={{ alignContent: 'start' }} id="scenarioMetrics">
                  <div className="metric"><div className="label">Peak-year revenue</div><div className="value">{fmtM(scenarioF.peakRevenue)}</div></div>
                  <div className="metric"><div className="label">Peak patients</div><div className="value">{fmtNum(scenarioF.addressable * scenarioState.peakShare)}</div></div>
                  <div className="metric"><div className="label">Peak market share</div><div className="value">{fmtPct(scenarioState.peakShare * 100)}</div></div>
                  <div className="metric"><div className="label">1-year revenue</div><div className="value">{fmtM(scenarioF.cumulativeRevenue[0])}</div></div>
                  <div className="metric"><div className="label">2-year cumulative revenue</div><div className="value">{fmtM(scenarioF.cumulativeRevenue[1])}</div></div>
                  <div className="metric"><div className="label">3-year cumulative revenue</div><div className="value">{fmtM(scenarioF.cumulativeRevenue[2])}</div></div>
                </div>
              </div>
  
              <div className="card">
                <h3>Revenue forecast under current sliders</h3>
                <div className="canvas-wrap">
                  {activeTab === 6 && <Line 
                    options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => fmtM(Number(v)) } } } }}
                    data={{
                      labels: scenarioF.years.map(y => y.year),
                      datasets: [
                        { label: 'Net Revenue', data: scenarioF.revenue, borderColor: '#0f7696', backgroundColor: 'rgba(15, 118, 150, 0.1)', tension: 0.3, fill: true, pointRadius: 4, pointHoverRadius: 6 }
                      ]
                    }}
                  />}
                </div>
              </div>
  
              <div className="card">
                <h3>Scenario impacts on peak revenue</h3>
                <div className="canvas-wrap">
                  {activeTab === 6 && <Bar 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      indexAxis: 'y',
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            label: (ctx) => {
                              const val = ctx.raw;
                              const sign = val > 0 ? '+' : '';
                              return \`Impact: \${sign}\${fmtM(Number(val))}\`;
                            }
                          }
                        }
                      },
                      scales: {
                        x: {
                          ticks: { callback: v => fmtM(Number(v)) }
                        }
                      }
                    }}
                    data={{
                      labels: impacts.map(i => i.name),
                      datasets: [
                        {
                          label: 'Low Case',
                          data: impacts.map(i => i.low),
                          backgroundColor: '#f87171',
                          borderRadius: 4
                        },
                        {
                          label: 'High Case',
                          data: impacts.map(i => i.high),
                          backgroundColor: '#34d399',
                          borderRadius: 4
                        }
                      ]
                    }}
                  />}
                </div>
              </div>
            </div>
          </div>
        </section>`;

content = content.replace(page6Content, rebuiltPage6);

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated app/page.tsx');

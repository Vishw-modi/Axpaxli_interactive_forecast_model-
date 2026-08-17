const fs = require('fs');
const path = 'c:/Users/deepm/OneDrive/Desktop/demo/Axpaxli_interactive_forecast_model-/app/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `              </tbody>
            </table>
          </div>
                    placeholder="E.g., High Price"`;

const replacement = `              </tbody>
            </table>
          </div>

          <ModelArchitecturePanel state={state} />
          <div style={{ marginTop: '24px' }}></div>

          <div style={{ textAlign: 'right' }}>
            <button className="btn" onClick={() => goPage(6)}>Explore scenarios ?</button>
          </div>
                    </div>
          </div>
        </section>

        {/* PAGE 6 : SCENARIOS */}
                <section className={`page ${activeTab === 6 ? 'active' : ''}`} id="page-6">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ margin: 0, marginBottom: '8px' }}>Scenario &amp; sensitivity analysis</h1>
              <p className="lead" style={{ margin: 0 }}>Drag any assumption and the forecast, peak metrics, and sensitivity ranking recalculate instantly.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '32px', alignItems: 'start', marginTop: '24px' }}>
            <div style={{ position: 'sticky', top: '24px', maxHeight: 'calc(100vh - 48px)', overflowY: 'auto', paddingRight: '8px' }}>
              {renderAssumptions(true, true)}
              {renderForecastingAlgorithm()}
            </div>
            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-8px' }}>
                  <button className="btn secondary" onClick={() => setScenarioState(JSON.parse(JSON.stringify(state)))}>Have base forecast assumptions populated</button>
                </div>
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px', marginBottom: 0 }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--navy)', whiteSpace: 'nowrap' }}>Save scenario:</span>
                  <input 
                    placeholder="E.g., High Price"`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Fixed successfully!");
} else {
    console.log("Target not found!");
}

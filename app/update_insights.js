const fs = require('fs');
const path = 'c:/Users/deepm/OneDrive/Desktop/demo/Axpaxli_interactive_forecast_model-/app/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add isInsightsModalOpen
content = content.replace(
  'const [isAiModalOpen, setIsAiModalOpen] = useState(false);',
  'const [isAiModalOpen, setIsAiModalOpen] = useState(false);\n  const [isInsightsModalOpen, setIsInsightsModalOpen] = useState(false);'
);

// 2. Replace tabs array mapping
content = content.replace(
  /\{\[\s*'Welcome',\s*'AI conversation',\s*'Assumptions',\s*'Forecast',\s*'Key insights',\s*'Scenarios',\s*'Compare',\s*'Export'\s*\]\.map\(\(tab, idx\) => \{[\s\S]*?<\/button>\s*\);\s*\}\)/,
  {[
          { id: 1, label: 'Welcome' },
          { id: 2, label: 'AI conversation' },
          { id: 3, label: 'Assumptions' },
          { id: 4, label: 'Forecast' },
          { id: 6, label: 'Scenarios' },
          { id: 7, label: 'Compare' },
          { id: 8, label: 'Export' }
        ].map((tabObj) => {
          const tabNum = tabObj.id;
          const isClickable = tabNum <= maxTab;
          return (
            <button 
              key={tabNum}
              className={\\\}
              style={{ opacity: isClickable ? 1 : 0.4, cursor: isClickable ? 'pointer' : 'not-allowed' }}
              onClick={() => {
                if (isClickable) goPage(tabNum);
              }}
            >
              {tabObj.label}
            </button>
          );
        })
);

// 3. Add Insights button to Dashboard Metrics
content = content.replace(
  /<div style=\{\{ minWidth: 0 \}\}>\s*<div style=\{\{ display: 'grid', gridTemplateColumns: 'repeat\(6, 1fr\)', gap: '12px', marginBottom: '24px' \}\} id="dashMetrics">/,
  <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, color: 'var(--navy)' }}>Forecast Dashboard</h2>
              <button 
                onClick={() => setIsInsightsModalOpen(true)} 
                style={{ background: '#fef3c7', border: '1px solid #fde68a', color: '#b45309', padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '14px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.08)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)'; }}
              >
                ?? Key Insights
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '24px' }} id="dashMetrics">
);

// 4. Remove View key insights button
content = content.replace(
  /<div style=\{\{ textAlign: 'right' \}\}>\s*<button className="btn secondary" onClick=\{\(\) => goPage\(6\)\} style=\{\{ marginRight: '8px' \}\}>Explore scenarios<\/button>\s*<button className="btn" onClick=\{\(\) => goPage\(5\)\}>View key insights ?<\/button>\s*<\/div>/,
  <div style={{ textAlign: 'right' }}>
            <button className="btn" onClick={() => goPage(6)}>Explore scenarios ?</button>
          </div>
);

// 5. Remove PAGE 5 section
content = content.replace(
  /\{\/\*\s*PAGE 5 : KEY INSIGHTS\s*\*\/\}.*?\{\/\*\s*PAGE 6 : SCENARIOS\s*\*\/\}/s,
  {/* PAGE 6 : SCENARIOS */}
);

// 6. Add Insights Modal JSX right before </main>
const modalContent = \
        {isInsightsModalOpen && (
          <div onClick={() => setIsInsightsModalOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: '800px', maxWidth: '90%', maxHeight: '85vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', position: 'relative', padding: '32px', borderRadius: '16px', background: '#ffffff', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '24px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>?? Key Insights</h2>
                  <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '15px' }}>AI-generated read on what's driving the forecast, and where it could break.</p>
                </div>
                <button onClick={() => setIsInsightsModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '24px', padding: '4px' }}>?</button>
              </div>

              <div style={{ display: 'grid', gap: '24px' }}>
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#0f172a' }}>What's driving this forecast</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[
                      \Peak share of <b>\</b> is reached around year <b>\</b>, driven primarily by the durability differentiator versus the current standard of care.\,
                      \The addressable pool is <b>\</b> patients — <b>\</b> of treated patients — reflecting naive starts plus switch-eligible patients on shorter dosing intervals.\,
                      \At <b>\</b> net per injection and <b>\</b> injections per year, peak-year net revenue reaches <b>\</b>.\
                    ].map((d, i) => (
                      <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{ width: '6px', height: '6px', background: '#0ea5e9', borderRadius: '50%', marginTop: '8px', flexShrink: 0 }}></div>
                        <div style={{ fontSize: '14.5px', lineHeight: '1.6', color: '#334155' }} dangerouslySetInnerHTML={{ __html: d }} />
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <div style={{ background: '#fff1f2', padding: '20px', borderRadius: '12px', border: '1px solid #ffe4e6' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#9f1239' }}>Risks to watch</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {[
                        { title: 'Biosimilar price pressure', text: 'Biosimilar entrants are compressing net pricing across the class — a 15% further price erosion would cut peak revenue meaningfully.' },
                        { title: 'Competitive response', text: 'Competitors could extend their own dosing intervals in response, narrowing your durability advantage.' },
                        { title: 'Diagnosis funnel slippage', text: 'If diagnosis or treatment-initiation rates come in below plan, the addressable pool shrinks and every downstream number moves with it.' }
                      ].map((r, i) => (
                        <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                          <div style={{ width: '6px', height: '6px', background: '#e11d48', borderRadius: '50%', marginTop: '8px', flexShrink: 0 }}></div>
                          <div>
                            <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', background: '#ffe4e6', color: '#be123c', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>Risk</span><br />
                            <b style={{ color: '#0f172a', fontSize: '14.5px' }}>{r.title}</b>
                            <div style={{ fontSize: '13.5px', color: '#475569', marginTop: '4px', lineHeight: '1.5' }}>{r.text}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '12px', border: '1px solid #dcfce7' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#166534' }}>Upside levers</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {[
                        { title: 'Faster payer access', text: 'Favorable formulary placement could pull the uptake curve forward by a year, front-loading revenue.' },
                        { title: 'Broader label or indication', text: 'Expansion beyond initial targets would grow the addressable pool independent of share gains.' },
                        { title: 'Switch-driven share gains', text: 'A stronger-than-modeled switch rate from shorter-interval therapies could push peak share above the current assumption.' }
                      ].map((r, i) => (
                        <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                          <div style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%', marginTop: '8px', flexShrink: 0 }}></div>
                          <div>
                            <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>Upside</span><br />
                            <b style={{ color: '#0f172a', fontSize: '14.5px' }}>{r.title}</b>
                            <div style={{ fontSize: '13.5px', color: '#475569', marginTop: '4px', lineHeight: '1.5' }}>{r.text}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#0f172a' }}>How this compares to recent analogues</h3>
                  <p style={{ fontSize: '14.5px', lineHeight: '1.6', color: '#334155', margin: 0 }}>
                    Recent analogues reached blockbuster status (&gt;) within roughly two years of launch, aided by a differentiated story. Your asset\\'s <b>{fmtPct(state.peakShare * 100)}</b> peak share assumption over <b>{Math.ceil(state.yearsToPeak)}</b> years is <b style={{ color: state.yearsToPeak <= 3 ? '#e11d48' : (state.yearsToPeak >= 5 ? '#0ea5e9' : '#0f172a') }}>{state.yearsToPeak <= 3 ? 'more aggressive' : (state.yearsToPeak >= 5 ? 'more conservative' : 'broadly comparable')}</b> relative to that trajectory — worth stress-testing against a faster or slower competitive response on the scenarios page.
                  </p>
                </div>

              </div>
            </div>
          </div>
        )}
      </main>\;
content = content.replace('</main>', modalContent);

fs.writeFileSync(path, content, 'utf8');
console.log('Update script executed.');

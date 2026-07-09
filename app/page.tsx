"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  defaultState, 
  ForecastState, 
  computeForecast, 
  fmtNum, 
  fmtM, 
  fmtPct, 
  addressablePatients 
} from '../utils/forecast';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function ForecastApp() {
  const [activeTab, setActiveTab] = useState(1);
  const [state, setState] = useState<ForecastState>(defaultState);
  
  // Chat state
  const [chatStarted, setChatStarted] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [assumptions, setAssumptions] = useState<any[]>([]);
  const chatRef = useRef<HTMLDivElement>(null);
  const assumpRef = useRef<HTMLDivElement>(null);

  const chatScript = [
    {who:'ai', text:"Let's build your wet AMD forecast together. First — scope: US only, neovascular AMD, all lines of therapy?"},
    {who:'user', text:'Yes, US only, all lines of therapy.', assump:[{k:'Scope', v:'US, wet AMD, all lines'}]},
    {who:'ai', text:'Got it. For epidemiology I\'ll anchor on a US diagnosed wet AMD prevalence of about 1.75M patients, based on published claims and NHANES-derived estimates. Does that align with your internal numbers?'},
    {who:'user', text:'That matches what we use internally.', assump:[{k:'Diagnosed prevalence (US)', v:'1,750,000 patients'}]},
    {who:'ai', text:'How should we handle the diagnosis and treatment funnel? Default: 85% of prevalent patients are diagnosed, and 92% of diagnosed patients initiate anti-VEGF therapy.'},
    {who:'user', text:'Sounds right, keep those.', assump:[{k:'Diagnosis rate', v:'85%'},{k:'Treatment initiation rate', v:'92%'}]},
    {who:'ai', text:'Noted. Now the competitive set — your asset launches against Eylea, Eylea HD, Vabysmo, Susvimo, Lucentis/Cimerli, and the aflibercept biosimilars (Yesafili, Opuviz). What\'s the core differentiator for your product: efficacy, durability, or delivery?'},
    {who:'user', text:'Durability — we\'re targeting q16-week maintenance dosing after a loading phase, longer than Vabysmo.', assump:[{k:'Key differentiator', v:'Extended durability, q16-week dosing'}]},
    {who:'ai', text:'That\'s a meaningful differentiator against today\'s q8-week standard of care. I\'ll set the addressable segment at 65% of treated patients — naive starts plus patients likely to switch off a shorter-interval therapy. Reasonable?'},
    {who:'user', text:'Yes, 65% addressable works.', assump:[{k:'Addressable share', v:'65% of treated patients'}]},
    {who:'ai', text:'For uptake, I\'d default to 25% peak share of treated patients within 4 years, similar to how Vabysmo scaled post-launch. Want to keep that pace, or adjust?'},
    {who:'user', text:'Keep 25% peak share, but slow the ramp — 5 years to peak, not 4. Payer friction will be real given how crowded this class is.', assump:[{k:'Peak share', v:'25%'},{k:'Years to peak', v:'5 years'}]},
    {who:'ai', text:'Updated to 25% peak share over 5 years. Last question: where should we anchor net price per injection, after rebates? Eylea HD lists around $2,625 WAC — do you want to price in line with that, or discount to drive share?'},
    {who:'user', text:'Net price of $2,200 per injection after rebates, roughly a 15% discount to Eylea HD WAC.', assump:[{k:'Net price per injection', v:'$2,200'}]},
    {who:'ai', text:'Got it — $2,200 net per injection, and I\'ll assume 6 injections per patient per year and 85% twelve-month persistency, consistent with recent anti-VEGF launches. I have everything I need. Generating your forecast now.', assump:[{k:'Injections / year', v:'6'},{k:'12-month persistency', v:'85%'}]}
  ];

  const runChat = () => {
    setChatMessages([]);
    setAssumptions([]);
    setChatStarted(true);
    
    chatScript.forEach((msg, i) => {
      setTimeout(() => {
        setChatMessages(prev => [...prev, msg]);
        if (msg.assump) {
          setAssumptions(prev => [...prev, ...msg.assump!]);
        }
      }, i * 260);
    });
  };

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const goPage = (n: number) => {
    setActiveTab(n);
    if (n === 2 && !chatStarted) runChat();
    window.scrollTo(0, 0);
  };

  const handleStateChange = (key: keyof ForecastState, value: number) => {
    setState(prev => ({ ...prev, [key]: value }));
  };

  const resetAssumptions = () => {
    setState(defaultState);
  };

  const exportCSV = () => {
    const f = computeForecast(state);
    const lines = ['Year,Patients,Share (%),Net Revenue ($)'];
    f.years.forEach((y, i) => {
      lines.push([y, Math.round(f.patients[i]), (Math.round(f.share[i] * 10) / 10), Math.round(f.revenue[i])].join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'wet_amd_forecast.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Funnel calculations
  const diagnosed = state.prevalence * state.diagnosisRate;
  const treated = diagnosed * state.treatmentRate;
  const addressable = treated * state.addressableShare;
  const peakPatients = addressable * state.peakShare;
  const funnelRows = [
    { name: 'Diagnosed wet AMD prevalence', val: state.prevalence, max: state.prevalence },
    { name: 'Diagnosed and under ophthalmic care', val: diagnosed, max: state.prevalence },
    { name: 'On anti-VEGF therapy', val: treated, max: state.prevalence },
    { name: 'Addressable (naive + switch-eligible)', val: addressable, max: state.prevalence },
    { name: 'Peak patients on your product', val: peakPatients, max: state.prevalence }
  ];

  // Forecast calculations
  const f = computeForecast(state);
  
  // Scenario variations
  const drivers = [
    { name: 'Peak share', key: 'peakShare' as keyof ForecastState },
    { name: 'Net price', key: 'netPrice' as keyof ForecastState },
    { name: 'Diagnosis rate', key: 'diagnosisRate' as keyof ForecastState },
    { name: 'Addressable share', key: 'addressableShare' as keyof ForecastState },
    { name: 'Persistency', key: 'persistency' as keyof ForecastState }
  ];
  const impacts = drivers.map(d => {
    const low = { ...state, [d.key]: state[d.key] * 0.8 };
    const high = { ...state, [d.key]: state[d.key] * 1.2 };
    const lowPeak = computeForecast(low).peakRevenue;
    const highPeak = computeForecast(high).peakRevenue;
    return { name: d.name, low: lowPeak - f.peakRevenue, high: highPeak - f.peakRevenue, spread: Math.abs(highPeak - lowPeak) };
  }).sort((a, b) => b.spread - a.spread);

  // Compare scenarios
  const down = { ...state, peakShare: state.peakShare * 0.6, netPrice: state.netPrice * 0.85, yearsToPeak: state.yearsToPeak + 1 };
  const up = { ...state, peakShare: Math.min(0.6, state.peakShare * 1.4), netPrice: state.netPrice * 1.1, yearsToPeak: Math.max(2, state.yearsToPeak - 1) };
  const scenarios = [
    { name: 'Downside', tag: 'tag-down', s: down },
    { name: 'Base', tag: 'tag-base', s: state },
    { name: 'Upside', tag: 'tag-up', s: up }
  ];

  return (
    <>
      <header className="topbar" style={{ backgroundColor: '#ffffff', borderBottom: '1px solid var(--border)', padding: '6px 24px' }}>
        <div className="brand" style={{ gap: '24px', alignItems: 'center' }}>
          <img src="/Tredence_KMK_Logo-removebg-preview.png" alt="Tredence KMK Logo" style={{ height: '88px', objectFit: 'contain', marginTop: '-22px', marginBottom: '-22px' }} />
          <div>
            <div className="name" style={{ color: 'var(--navy)' }}>Forecast.ai</div>
            <div className="tag" style={{ color: 'var(--text-muted)' }}>Wet AMD forecasting demo — illustrative data</div>
          </div>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Prototype for client demo</div>
      </header>

      <nav className="tabs" id="tabnav">
        {[
          '1 · Welcome',
          '2 · AI conversation',
          '3 · Assumptions',
          '4 · Forecast',
          '5 · Key insights',
          '6 · Scenarios',
          '7 · Compare',
          '8 · Export'
        ].map((tab, idx) => (
          <button 
            key={idx + 1}
            className={activeTab === idx + 1 ? 'active' : ''}
            onClick={() => goPage(idx + 1)}
          >
            {tab}
          </button>
        ))}
      </nav>

      <main>
        {/* PAGE 1 : WELCOME */}
        <section className={`page ${activeTab === 1 ? 'active' : ''}`} id="page-1">
          <h1>Forecast wet AMD launches through conversation, not spreadsheets</h1>
          <p className="lead">Forecast.ai asks the questions a senior forecasting analyst would ask, builds a patient-flow model from your answers, and lets you stress-test every assumption in real time.</p>

          <div className="grid3">
            <div className="card">
              <h3>Conversational inputs</h3>
              <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', margin: 0 }}>An AI assistant with wet AMD domain knowledge proactively asks about epidemiology, competitive dynamics, product profile, and pricing — no blank templates.</p>
            </div>
            <div className="card">
              <h3>AI-generated forecast</h3>
              <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', margin: 0 }}>Your answers become a patient-flow model and a 7-year revenue and share forecast, with a narrative on what's driving it.</p>
            </div>
            <div className="card">
              <h3>Live scenario play</h3>
              <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', margin: 0 }}>Move sliders on peak share, price, or uptake speed and watch the forecast, insights, and risk profile update instantly.</p>
            </div>
          </div>

          <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
            <h2 style={{ marginBottom: '8px' }}>Start a new forecast</h2>
            <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: '18px' }}>Indication: neovascular (wet) age-related macular degeneration &middot; Geography: United States</p>
            <button className="btn" onClick={() => goPage(2)}>Start conversation →</button>
            <div className="hint">Or jump straight to a <a href="#" onClick={(e) => { e.preventDefault(); goPage(4); }} style={{ color: 'var(--teal)' }}>sample forecast</a> built from default assumptions.</div>
          </div>

          <p className="footer-note">Demo prototype. All epidemiology, market, and pricing figures are illustrative placeholders for walkthrough purposes, not client or real-world data.</p>
        </section>

        {/* PAGE 2 : AI CONVERSATION */}
        <section className={`page ${activeTab === 2 ? 'active' : ''}`} id="page-2">
          <h1>Build your forecast in conversation</h1>
          <p className="lead">The assistant asks targeted questions, one topic at a time, and captures every answer as a structured assumption on the right.</p>

          <div className="chat-wrap">
            <div className="card chat-thread" id="chatThread" ref={chatRef}>
              {chatMessages.map((msg, i) => (
                <div key={i} className={`bubble ${msg.who === 'ai' ? 'ai' : 'user'}`} style={{ animationDelay: '0s' }}>
                  <span className="who">{msg.who === 'ai' ? 'Forecast.ai' : 'You'}</span>
                  {msg.text}
                </div>
              ))}
            </div>
            <div className="card assump-list" id="liveAssumptions" ref={assumpRef}>
              <h3>Assumptions captured</h3>
              <div id="liveAssumptionsBody" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {assumptions.length === 0 ? 'Waiting for conversation to start…' : (
                  assumptions.map((a, i) => (
                    <div key={i} className="assump-item">
                      <span className="k">{a.k}</span>
                      <span className="v">{a.v}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '16px', textAlign: 'right' }}>
            <button className="btn secondary" onClick={() => runChat()} style={{ marginRight: '8px' }}>Replay conversation</button>
            <button className="btn" onClick={() => goPage(3)}>Review assumptions →</button>
          </div>
        </section>

        {/* PAGE 3 : ASSUMPTIONS REVIEW */}
        <section className={`page ${activeTab === 3 ? 'active' : ''}`} id="page-3">
          <h1>Assumptions review</h1>
          <p className="lead">Everything the assistant captured, now editable directly. Adjust any field and the patient funnel updates immediately.</p>

          <div className="grid2">
            <div className="card">
              <h3>Epidemiology &amp; treatment funnel (US)</h3>
              <div className="field-group">
                <label className="field">Diagnosed wet AMD prevalence</label>
                <input type="number" value={state.prevalence} step="10000" onChange={(e) => handleStateChange('prevalence', parseFloat(e.target.value))} />
              </div>
              <div className="field-group">
                <label className="field">Diagnosis rate (% of prevalence diagnosed)</label>
                <input type="number" value={Math.round(state.diagnosisRate * 100)} step="1" onChange={(e) => handleStateChange('diagnosisRate', parseFloat(e.target.value) / 100)} />
              </div>
              <div className="field-group">
                <label className="field">Treatment initiation rate (% of diagnosed treated with anti-VEGF)</label>
                <input type="number" value={Math.round(state.treatmentRate * 100)} step="1" onChange={(e) => handleStateChange('treatmentRate', parseFloat(e.target.value) / 100)} />
              </div>
              <div className="field-group" style={{ marginBottom: 0 }}>
                <label className="field">Addressable share (naive + switch-eligible, % of treated)</label>
                <input type="number" value={Math.round(state.addressableShare * 100)} step="1" onChange={(e) => handleStateChange('addressableShare', parseFloat(e.target.value) / 100)} />
              </div>
            </div>

            <div className="card">
              <h3>Competitive landscape</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 10px' }}>Current standard of care your asset launches against:</p>
              <span className="pill">Eylea (aflibercept 2mg)</span>
              <span className="pill">Eylea HD (aflibercept 8mg)</span>
              <span className="pill">Vabysmo (faricimab)</span>
              <span className="pill">Susvimo (PDS)</span>
              <span className="pill">Lucentis / Cimerli</span>
              <span className="pill">Aflibercept biosimilars (Yesafili, Opuviz)</span>
              <span className="pill">Off-label Avastin</span>
              <h3 style={{ marginTop: '18px' }}>Product profile</h3>
              <div className="field-group">
                <label className="field">Key differentiator</label>
                <input type="text" defaultValue="Extended durability — q16-week maintenance dosing after loading phase" />
              </div>
            </div>
          </div>

          <div className="grid2">
            <div className="card">
              <h3>Uptake &amp; share</h3>
              <div className="field-group">
                <label className="field">Peak market share of treated patients (%)</label>
                <input type="number" value={Math.round(state.peakShare * 100)} step="1" onChange={(e) => handleStateChange('peakShare', parseFloat(e.target.value) / 100)} />
              </div>
              <div className="field-group" style={{ marginBottom: 0 }}>
                <label className="field">Years to reach peak share</label>
                <input type="number" value={state.yearsToPeak} step="1" onChange={(e) => handleStateChange('yearsToPeak', parseFloat(e.target.value))} />
              </div>
            </div>
            <div className="card">
              <h3>Pricing &amp; persistency</h3>
              <div className="field-group">
                <label className="field">Net price per injection, post-rebate (USD)</label>
                <input type="number" value={state.netPrice} step="50" onChange={(e) => handleStateChange('netPrice', parseFloat(e.target.value))} />
              </div>
              <div className="field-group">
                <label className="field">Injections per patient per year</label>
                <input type="number" value={state.injectionsPerYear} step="0.5" onChange={(e) => handleStateChange('injectionsPerYear', parseFloat(e.target.value))} />
              </div>
              <div className="field-group" style={{ marginBottom: 0 }}>
                <label className="field">12-month persistency rate (%)</label>
                <input type="number" value={Math.round(state.persistency * 100)} step="1" onChange={(e) => handleStateChange('persistency', parseFloat(e.target.value) / 100)} />
              </div>
            </div>
          </div>

          <div className="card">
            <h3>Patient flow funnel</h3>
            <div className="funnel" id="funnelBody">
              {funnelRows.map((r, i) => {
                const pct = Math.max(2, (r.val / r.max) * 100);
                return (
                  <div key={i} className="funnel-row">
                    <div className="flabel">
                      <span className="fname">{r.name}</span>
                      <span className="fval">{fmtNum(r.val)}</span>
                    </div>
                    <div className="funnel-bar-bg">
                      <div className="funnel-bar-fill" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <button className="btn secondary" onClick={resetAssumptions} style={{ marginRight: '8px' }}>Reset to conversation defaults</button>
            <button className="btn" onClick={() => goPage(4)}>Generate forecast →</button>
          </div>
        </section>

        {/* PAGE 4 : FORECAST DASHBOARD */}
        <section className={`page ${activeTab === 4 ? 'active' : ''}`} id="page-4">
          <h1>Forecast dashboard</h1>
          <p className="lead">Seven-year revenue and patient forecast based on your current assumptions.</p>

          <div className="grid4" id="dashMetrics">
            <div className="metric">
              <div className="label">Peak-year net revenue</div>
              <div className="value">{fmtM(f.peakRevenue)}</div>
              <div className="sub">By year {Math.ceil(state.yearsToPeak)}</div>
            </div>
            <div className="metric">
              <div className="label">Peak market share</div>
              <div className="value">{fmtPct(state.peakShare * 100)}</div>
              <div className="sub">Of treated patients</div>
            </div>
            <div className="metric">
              <div className="label">Peak patients on therapy</div>
              <div className="value">{fmtNum(f.addressable * state.peakShare)}</div>
              <div className="sub">At steady state</div>
            </div>
            <div className="metric">
              <div className="label">7-year cumulative revenue</div>
              <div className="value">{fmtM(f.cumulative)}</div>
              <div className="sub">Undiscounted</div>
            </div>
          </div>

          <div className="card">
            <h3>Revenue forecast, US ($)</h3>
            <div className="legend-row">
              <span><span className="legend-dot" style={{ background: '#2a78d6' }}></span>Net revenue</span>
            </div>
            <div className="canvas-wrap">
              {activeTab === 4 && <Line 
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => fmtM(Number(v)) } } } }}
                data={{ labels: f.years, datasets: [{ label: 'Net revenue', data: f.revenue, borderColor: '#2a78d6', backgroundColor: 'rgba(42,120,214,0.1)', fill: true, tension: 0.3, pointRadius: 3 }] }} 
              />}
            </div>
          </div>

          <div className="grid2">
            <div className="card">
              <h3>Patients on therapy</h3>
              <div className="canvas-wrap" style={{ height: '240px' }}>
                {activeTab === 4 && <Bar 
                  options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => fmtNum(Number(v)) } } } }}
                  data={{ labels: f.years, datasets: [{ label: 'Patients', data: f.patients.map(Math.round), backgroundColor: '#00b2a9', borderRadius: 4 }] }} 
                />}
              </div>
            </div>
            <div className="card">
              <h3>Market share of treated patients (%)</h3>
              <div className="canvas-wrap" style={{ height: '240px' }}>
                {activeTab === 4 && <Line 
                  options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => `${v}%` } } } }}
                  data={{ labels: f.years, datasets: [{ label: 'Share %', data: f.share.map(v => Math.round(v * 10) / 10), borderColor: '#F25621', backgroundColor: 'rgba(242,86,33,0.1)', fill: true, tension: 0.3, pointRadius: 3 }] }} 
                />}
              </div>
            </div>
          </div>

          <div className="card">
            <h3>Year-by-year detail</h3>
            <table id="forecastTable">
              <thead>
                <tr><th>Year</th><th>Patients</th><th>Share</th><th>Net revenue</th></tr>
              </thead>
              <tbody>
                {f.years.map((y, i) => (
                  <tr key={i}>
                    <td>{y}</td>
                    <td>{fmtNum(f.patients[i])}</td>
                    <td>{fmtPct(f.share[i])}</td>
                    <td>{fmtM(f.revenue[i])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ textAlign: 'right' }}>
            <button className="btn secondary" onClick={() => goPage(6)} style={{ marginRight: '8px' }}>Explore scenarios</button>
            <button className="btn" onClick={() => goPage(5)}>View key insights →</button>
          </div>
        </section>

        {/* PAGE 5 : KEY INSIGHTS */}
        <section className={`page ${activeTab === 5 ? 'active' : ''}`} id="page-5">
          <h1>Key insights</h1>
          <p className="lead">AI-generated read on what's driving the forecast, and where it could break.</p>

          <div className="card">
            <h3>What's driving this forecast</h3>
            <div id="insightsDrivers">
              {[
                `Peak share of <b>${fmtPct(state.peakShare * 100)}</b> is reached around year <b>${Math.ceil(state.yearsToPeak)}</b>, driven primarily by the durability differentiator versus the current q8-week standard of care.`,
                `The addressable pool is <b>${fmtNum(f.addressable)}</b> patients — <b>${fmtPct(state.addressableShare * 100)}</b> of treated patients — reflecting naive starts plus switch-eligible patients on shorter dosing intervals.`,
                `At <b>${fmtM(state.netPrice)}</b> net per injection and <b>${state.injectionsPerYear}</b> injections per year, peak-year net revenue reaches <b>${fmtM(f.peakRevenue)}</b>.`
              ].map((d, i) => (
                <div key={i} className="insight-item">
                  <div className="insight-dot"></div>
                  <div className="body" style={{ fontSize: '13.5px', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: d }} />
                </div>
              ))}
            </div>
          </div>

          <div className="grid2">
            <div className="card">
              <h3>Risks to watch</h3>
              <div id="insightsRisks">
                {[
                  { title: 'Biosimilar price pressure', text: 'Aflibercept biosimilars (Yesafili, Opuviz) and ranibizumab biosimilars (Cimerli) are compressing net pricing across the class — a 15% further price erosion would cut peak revenue meaningfully.' },
                  { title: 'Competitive response', text: 'Vabysmo and Eylea HD could extend their own dosing intervals in response, narrowing your durability advantage before you reach peak share.' },
                  { title: 'Diagnosis funnel slippage', text: 'If diagnosis or treatment-initiation rates come in below plan, the addressable pool shrinks and every downstream number moves with it.' }
                ].map((r, i) => (
                  <div key={i} className="insight-item">
                    <div className="insight-dot risk"></div>
                    <div className="body">
                      <span className="risk-badge">Risk</span><br />
                      <b>{r.title}</b>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '3px' }}>{r.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <h3>Upside levers</h3>
              <div id="insightsUpside">
                {[
                  { title: 'Faster payer access', text: 'Favorable formulary placement could pull the uptake curve forward by a year, front-loading revenue.' },
                  { title: 'Broader label or indication', text: 'Expansion beyond wet AMD (e.g., diabetic macular edema) would grow the addressable pool independent of share gains.' },
                  { title: 'Switch-driven share gains', text: 'A stronger-than-modeled switch rate from shorter-interval therapies could push peak share above the current assumption.' }
                ].map((r, i) => (
                  <div key={i} className="insight-item">
                    <div className="insight-dot"></div>
                    <div className="body">
                      <span className="opp-badge">Upside</span><br />
                      <b>{r.title}</b>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '3px' }}>{r.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <h3>How this compares to recent anti-VEGF launches</h3>
            <p style={{ fontSize: '13.5px', lineHeight: '1.6', color: 'var(--text-muted)', margin: 0 }}>
              Vabysmo reached blockbuster status (&gt;$1B) within roughly two years of its January 2022 launch, aided by a differentiated durability story versus Eylea. Your asset's <span id="cmpShare">{fmtPct(state.peakShare * 100)}</span> peak share assumption over <span id="cmpYears">{Math.ceil(state.yearsToPeak)}</span> years is <span id="cmpPace">{state.yearsToPeak <= 3 ? 'more aggressive' : (state.yearsToPeak >= 5 ? 'more conservative' : 'broadly comparable')}</span> relative to that trajectory — worth stress-testing against a faster or slower competitive response on the scenarios page.
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <button className="btn" onClick={() => goPage(6)}>Run sensitivity analysis →</button>
          </div>
        </section>

        {/* PAGE 6 : SCENARIOS */}
        <section className={`page ${activeTab === 6 ? 'active' : ''}`} id="page-6">
          <h1>Scenario &amp; sensitivity analysis</h1>
          <p className="lead">Drag any assumption and the forecast, peak metrics, and sensitivity ranking recalculate instantly.</p>

          <div className="grid2">
            <div className="card">
              <div className="field-group">
                <div className="row-flex"><label className="field" style={{ margin: 0 }}>Peak market share</label><span className="val">{fmtPct(state.peakShare * 100)}</span></div>
                <input type="range" min="5" max="45" step="1" value={Math.round(state.peakShare * 100)} onChange={e => handleStateChange('peakShare', parseFloat(e.target.value) / 100)} />
              </div>
              <div className="field-group">
                <div className="row-flex"><label className="field" style={{ margin: 0 }}>Net price per injection</label><span className="val">{fmtM(state.netPrice)}</span></div>
                <input type="range" min="1200" max="3000" step="50" value={state.netPrice} onChange={e => handleStateChange('netPrice', parseFloat(e.target.value))} />
              </div>
              <div className="field-group">
                <div className="row-flex"><label className="field" style={{ margin: 0 }}>Years to peak share</label><span className="val">{state.yearsToPeak} yrs</span></div>
                <input type="range" min="2" max="7" step="1" value={state.yearsToPeak} onChange={e => handleStateChange('yearsToPeak', parseFloat(e.target.value))} />
              </div>
              <div className="field-group" style={{ marginBottom: 0 }}>
                <div className="row-flex"><label className="field" style={{ margin: 0 }}>12-month persistency</label><span className="val">{fmtPct(state.persistency * 100)}</span></div>
                <input type="range" min="60" max="98" step="1" value={Math.round(state.persistency * 100)} onChange={e => handleStateChange('persistency', parseFloat(e.target.value) / 100)} />
              </div>
            </div>
            <div className="grid4" style={{ gridTemplateColumns: '1fr 1fr', alignContent: 'start' }} id="scenarioMetrics">
              <div className="metric"><div className="label">Peak-year revenue</div><div className="value">{fmtM(f.peakRevenue)}</div></div>
              <div className="metric"><div className="label">7-yr cumulative revenue</div><div className="value">{fmtM(f.cumulative)}</div></div>
              <div className="metric"><div className="label">Peak patients</div><div className="value">{fmtNum(f.addressable * state.peakShare)}</div></div>
              <div className="metric"><div className="label">Addressable pool</div><div className="value">{fmtNum(f.addressable)}</div></div>
            </div>
          </div>

          <div className="card">
            <h3>Revenue forecast under current sliders</h3>
            <div className="canvas-wrap">
              {activeTab === 6 && <Line 
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => fmtM(Number(v)) } } } }}
                data={{ labels: f.years, datasets: [{ label: 'Net revenue', data: f.revenue, borderColor: '#F25621', backgroundColor: 'rgba(242,86,33,0.12)', fill: true, tension: 0.3, pointRadius: 3 }] }} 
              />}
            </div>
          </div>

          <div className="card">
            <h3>Sensitivity — impact on peak revenue from a ±20% swing in each driver</h3>
            <div className="legend-row">
              <span><span className="legend-dot" style={{ background: '#e34948' }}></span>-20% change</span>
              <span><span className="legend-dot" style={{ background: '#00b2a9' }}></span>+20% change</span>
            </div>
            <div className="canvas-wrap" style={{ height: '260px' }}>
              {activeTab === 6 && <Bar 
                options={{ indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { callback: v => (Number(v) < 0 ? '-' : '') + fmtM(Math.abs(Number(v))) } } } }}
                data={{
                  labels: impacts.map(i => i.name),
                  datasets: [
                    { label: '-20%', data: impacts.map(i => i.low), backgroundColor: '#e34948' },
                    { label: '+20%', data: impacts.map(i => i.high), backgroundColor: '#00b2a9' }
                  ]
                }} 
              />}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <button className="btn secondary" onClick={resetAssumptions}>Reset sliders to base case</button>
          </div>
        </section>

        {/* PAGE 7 : COMPARE */}
        <section className={`page ${activeTab === 7 ? 'active' : ''}`} id="page-7">
          <h1>Scenario comparison</h1>
          <p className="lead">Downside and upside cases, derived from your base assumptions, side by side.</p>

          <div className="card">
            <h3>Summary</h3>
            <table id="compareTable">
              <thead>
                <tr><th>Scenario</th><th>Peak share</th><th>Net price</th><th>Years to peak</th><th>Peak revenue</th><th>7-yr cumulative</th></tr>
              </thead>
              <tbody>
                {scenarios.map((sc, i) => {
                  const fc = computeForecast(sc.s);
                  return (
                    <tr key={i}>
                      <td><span className={`scenario-tag ${sc.tag}`}>{sc.name}</span></td>
                      <td>{fmtPct(sc.s.peakShare * 100)}</td>
                      <td>{fmtM(sc.s.netPrice)}</td>
                      <td>{Math.ceil(sc.s.yearsToPeak)}</td>
                      <td>{fmtM(fc.peakRevenue)}</td>
                      <td>{fmtM(fc.cumulative)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3>Peak-year net revenue by scenario</h3>
            <div className="canvas-wrap">
              {activeTab === 7 && <Bar 
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => fmtM(Number(v)) } } } }}
                data={{ labels: scenarios.map(s => s.name), datasets: [{ label: 'Peak revenue', data: scenarios.map(sc => computeForecast(sc.s).peakRevenue), backgroundColor: ['#e34948', '#898781', '#00b2a9'], borderRadius: 4 }] }} 
              />}
            </div>
          </div>

          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Downside case: 60% of base peak share, 15% lower net price, one year slower to peak. Upside case: 140% of base peak share, 10% higher net price, one year faster to peak.</p>

          <div style={{ textAlign: 'right' }}>
            <button className="btn" onClick={() => goPage(8)}>Export forecast →</button>
          </div>
        </section>

        {/* PAGE 8 : EXPORT */}
        <section className={`page ${activeTab === 8 ? 'active' : ''}`} id="page-8">
          <h1>Export &amp; share</h1>
          <p className="lead">Send the current forecast out to the tools your team already works in.</p>

          <div className="card export-card">
            <div>
              <div className="etitle">Export forecast to CSV</div>
              <div className="edesc">Year-by-year patients, share, and revenue for the current assumptions.</div>
            </div>
            <button className="btn" onClick={exportCSV}>Download CSV</button>
          </div>

          <div className="card export-card">
            <div>
              <div className="etitle">Export to PowerPoint</div>
              <div className="edesc">Forecast dashboard and key insights as a client-ready slide deck.</div>
            </div>
            <button className="btn secondary" disabled>Coming soon in full build</button>
          </div>

          <div className="card export-card">
            <div>
              <div className="etitle">Share a live link</div>
              <div className="edesc">Colleagues open the same conversation and assumptions, not a static file.</div>
            </div>
            <button className="btn secondary" disabled>Coming soon in full build</button>
          </div>

          <div className="card export-card">
            <div>
              <div className="etitle">Schedule a refresh</div>
              <div className="edesc">Re-run the forecast monthly as epidemiology or pricing benchmarks update.</div>
            </div>
            <button className="btn secondary" disabled>Coming soon in full build</button>
          </div>

          <p className="footer-note">End of prototype walkthrough. Use the tabs above to revisit any page.</p>
        </section>
      </main>
    </>
  );
}

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

  // AI Modal state
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [activeAiMetric, setActiveAiMetric] = useState<string | null>(null);
  const [aiChatMessages, setAiChatMessages] = useState<{who: string, text: string, suggestion?: number}[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [hasUploaded, setHasUploaded] = useState(false);
  const [aiInputValue, setAiInputValue] = useState('');

  const chatScript = [
    {who:'ai', text:"Let's build your wet AMD forecast together. What is the scope of the project - add country of study, drug in question, lines of therapy involved?"},
    {who:'user', text:"US only, our new anti-VEGF asset, all lines of therapy.", assump:[{k:'Scope', v:'US, new asset, all lines'}]},
    {who:'ai', text:"Got it. For epidemiology I'll anchor on a US diagnosed wet AMD prevalence of about 1.75M patients, based on published claims and NHANES-derived estimates. Does that align with your internal numbers?"},
    {who:'user', text:"Yes, that aligns with our internal numbers.", assump:[{k:'Diagnosed prevalence (US)', v:'1,750,000 patients'}]},
    {who:'ai', text:"How should we handle the diagnosis and treatment funnel? Default: 85% of prevalent patients are diagnosed, and 92% of diagnosed patients initiate anti-VEGF therapy. I'll utilize this for starters does this align to your expectations?"},
    {who:'user', text:"Yes, that aligns to our expectations.", assump:[{k:'Diagnosis rate', v:'85%'},{k:'Treatment initiation rate', v:'92%'}]},
    {who:'ai', text:"To arrive at the addressable pool were there any prior tests involved? if yes then what % patients are over expressing the biomarker. If no I'll not apply filter."},
    {who:'user', text:"No prior tests involved. Do not apply a filter.", assump:[]},
    {who:'ai', text:"Are there any other filters to be applied to arrive at the addressable pool?"},
    {who:'user', text:"No.", assump:[]},
    {who:'ai', text:"Noted. Now the competitive set — your asset launches against Eylea, Eylea HD, Vabysmo, Susvimo, Lucentis/Cimerli, and the aflibercept biosimilars (Yesafili, Opuviz). What's the core differentiator for your product: efficacy, durability, or delivery?"},
    {who:'user', text:"Durability.", assump:[{k:'Key differentiator', v:'Durability'}]},
    {who:'ai', text:"That's a meaningful differentiator against today's q8-week standard of care. I'll set the addressable segment at 65% of treated patients — naive starts plus patients likely to switch off a shorter-interval therapy. Reasonable?"},
    {who:'user', text:"Yes, that's reasonable.", assump:[{k:'Addressable share', v:'65% of treated patients'}]},
    {who:'ai', text:"For uptake, I'd default to 25% peak share of treated patients within 4 years, similar to how Vabysmo scaled post-launch. Want to keep that pace, or adjust?"},
    {who:'user', text:"Keep that pace.", assump:[{k:'Peak share', v:'25%'},{k:'Years to peak', v:'4 years'}]},
    {who:'ai', text:"What is the dosing of your product?"},
    {who:'user', text:"q16-week maintenance dosing after a loading phase.", assump:[]},
    {who:'ai', text:"Eylea HD lists around $2,625 WAC — do you want to price in line with that, or discount to drive share?"},
    {who:'user', text:"Price in line with that at $2,625.", assump:[{k:'Net price per injection', v:'$2,625'}]},
    {who:'ai', text:"What is the average patient compliance you expect on your drug, also what is the average time on treatment for a patient on your product (this, along with dosing, will be utilized to understand how many drug units a patients utilizes in a year)."},
    {who:'user', text:"We expect 6 injections per year with 85% persistency over twelve months.", assump:[{k:'Injections / year', v:'6'},{k:'12-month persistency', v:'85%'}]}
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
      }, i * 2000);
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

  const openAiModal = (metricKey: string) => {
    setActiveAiMetric(metricKey);
    setIsAiModalOpen(true);
    setHasUploaded(false);
    
    // Set initial chat message based on metric
    let initMsg = "";
    if (metricKey === 'prevalence') initMsg = "The diagnosed wet AMD prevalence is set to 1.75M based on recent US claims data and NHANES-derived population estimates.";
    else if (metricKey === 'diagnosisRate') initMsg = "The diagnosis rate of 85% reflects a high degree of symptomatic presentation in neovascular AMD compared to other retinal diseases.";
    else if (metricKey === 'treatmentRate') initMsg = "The 92% treatment initiation rate is standard; most diagnosed wet AMD patients immediately begin anti-VEGF therapy to prevent vision loss.";
    else if (metricKey === 'addressableShare') initMsg = "The 65% addressable share accounts for naive starts and patients willing to switch off their current short-interval therapy for a more durable option.";
    else if (metricKey === 'peakShare') initMsg = "A 25% peak share is aggressive but attainable for a highly differentiated asset, mirroring the recent trajectory of Vabysmo.";
    else if (metricKey === 'yearsToPeak') initMsg = "5 years to peak reflects typical access friction and contracting delays in this highly competitive, mature market.";
    else if (metricKey === 'netPrice') initMsg = "A net price of $2,625 positions your asset at parity with Eylea HD, assuming no deep discounting is required to drive initial uptake.";
    else if (metricKey === 'injectionsPerYear') initMsg = "6 injections per year reflects real-world clinical practice for a durable agent, assuming an initial loading phase followed by q16-week maintenance.";
    else if (metricKey === 'persistency') initMsg = "85% twelve-month persistency is consistent with established anti-VEGF therapies, accounting for real-world drop-offs and switching.";
    else initMsg = "Let's review this assumption.";

    setAiChatMessages([
      { who: 'ai', text: initMsg }
    ]);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setHasUploaded(true);
      
      let newMsg = "I've analyzed the uploaded document. ";
      let suggestionValue = 0;
      
      if (activeAiMetric === 'prevalence') { newMsg += "Based on the new claims analysis in the deck, the prevalence is closer to 1.9M."; suggestionValue = 1900000; }
      else if (activeAiMetric === 'diagnosisRate') { newMsg += "The market research indicates diagnosis rates are improving due to AI screening tools. Suggesting 88%."; suggestionValue = 0.88; }
      else if (activeAiMetric === 'treatmentRate') { newMsg += "New guidelines pushed the treatment rate to 95% in your target clinics."; suggestionValue = 0.95; }
      else if (activeAiMetric === 'addressableShare') { newMsg += "Physician surveys in the deck show 70% of treated patients are considered switch-eligible."; suggestionValue = 0.70; }
      else if (activeAiMetric === 'peakShare') { newMsg += "Given the highly competitive contracting landscape detailed in the report, a 20% peak share is more realistic."; suggestionValue = 0.20; }
      else if (activeAiMetric === 'yearsToPeak') { newMsg += "The payer access timeline suggests it will take 6 years to reach peak share."; suggestionValue = 6; }
      else if (activeAiMetric === 'netPrice') { newMsg += "The pricing strategy deck recommends a launch net price of $2,400 to secure early formulary placement."; suggestionValue = 2400; }
      else if (activeAiMetric === 'injectionsPerYear') { newMsg += "KOL feedback indicates real-world undertreatment; average injections will likely be 5 per year."; suggestionValue = 5; }
      else if (activeAiMetric === 'persistency') { newMsg += "The analog data shows a 12-month persistency of 80% for similar intervals."; suggestionValue = 0.80; }
      
      setAiChatMessages(prev => [...prev, { who: 'ai', text: newMsg, suggestion: suggestionValue }]);
    }, 2000);
  };

  const acceptSuggestion = (val: number) => {
    if (activeAiMetric) {
      handleStateChange(activeAiMetric as keyof ForecastState, val);
      setAiChatMessages(prev => {
        const withoutButtons = prev.map(m => ({ ...m, suggestion: undefined }));
        return [...withoutButtons, { who: 'user', text: "I'll use that suggestion." }, { who: 'ai', text: "Great, I've updated the model with this new assumption."}];
      });
    }
  };

  const rejectSuggestion = () => {
    setAiChatMessages(prev => {
      const withoutButtons = prev.map(m => ({ ...m, suggestion: undefined }));
      return [...withoutButtons, { who: 'user', text: "I'll keep the current number." }, { who: 'ai', text: "Understood. The current assumption remains in place."}];
    });
  };

  const handleAiSubmit = (e?: React.KeyboardEvent<HTMLInputElement>) => {
    if (e && e.key !== 'Enter') return;
    if (!aiInputValue.trim()) return;

    const userText = aiInputValue.trim();
    setAiInputValue('');
    
    setAiChatMessages(prev => [...prev, { who: 'user', text: userText }]);
    
    setTimeout(() => {
      setAiChatMessages(prev => [...prev, { who: 'ai', text: "I am a prototype assistant! In the full version, I will analyze your request against your custom data and update the forecast dynamically." }]);
    }, 1000);
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
                <label className="field" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  Diagnosed wet AMD prevalence
                  <button onClick={() => openAiModal('prevalence')} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'var(--teal-light)', color: 'var(--teal)', border: 'none', cursor: 'pointer' }}>✨ Ask AI</button>
                </label>
                <input type="number" value={state.prevalence} step="10000" onChange={(e) => handleStateChange('prevalence', parseFloat(e.target.value))} />
              </div>
              <div className="field-group">
                <label className="field" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  Diagnosis rate (% of prevalence diagnosed)
                  <button onClick={() => openAiModal('diagnosisRate')} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'var(--teal-light)', color: 'var(--teal)', border: 'none', cursor: 'pointer' }}>✨ Ask AI</button>
                </label>
                <input type="number" value={Math.round(state.diagnosisRate * 100)} step="1" onChange={(e) => handleStateChange('diagnosisRate', parseFloat(e.target.value) / 100)} />
              </div>
              <div className="field-group">
                <label className="field" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  Treatment initiation rate (% of diagnosed treated with anti-VEGF)
                  <button onClick={() => openAiModal('treatmentRate')} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'var(--teal-light)', color: 'var(--teal)', border: 'none', cursor: 'pointer' }}>✨ Ask AI</button>
                </label>
                <input type="number" value={Math.round(state.treatmentRate * 100)} step="1" onChange={(e) => handleStateChange('treatmentRate', parseFloat(e.target.value) / 100)} />
              </div>
              <div className="field-group" style={{ marginBottom: 0 }}>
                <label className="field" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  Addressable share (naive + switch-eligible, % of treated)
                  <button onClick={() => openAiModal('addressableShare')} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'var(--teal-light)', color: 'var(--teal)', border: 'none', cursor: 'pointer' }}>✨ Ask AI</button>
                </label>
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
                <label className="field" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  Peak market share of treated patients (%)
                  <button onClick={() => openAiModal('peakShare')} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'var(--teal-light)', color: 'var(--teal)', border: 'none', cursor: 'pointer' }}>✨ Ask AI</button>
                </label>
                <input type="number" value={Math.round(state.peakShare * 100)} step="1" onChange={(e) => handleStateChange('peakShare', parseFloat(e.target.value) / 100)} />
              </div>
              <div className="field-group" style={{ marginBottom: 0 }}>
                <label className="field" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  Years to reach peak share
                  <button onClick={() => openAiModal('yearsToPeak')} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'var(--teal-light)', color: 'var(--teal)', border: 'none', cursor: 'pointer' }}>✨ Ask AI</button>
                </label>
                <input type="number" value={state.yearsToPeak} step="1" onChange={(e) => handleStateChange('yearsToPeak', parseFloat(e.target.value))} />
              </div>
            </div>
            <div className="card">
              <h3>Pricing &amp; persistency</h3>
              <div className="field-group">
                <label className="field" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  Net price per injection, post-rebate (USD)
                  <button onClick={() => openAiModal('netPrice')} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'var(--teal-light)', color: 'var(--teal)', border: 'none', cursor: 'pointer' }}>✨ Ask AI</button>
                </label>
                <input type="number" value={state.netPrice} step="50" onChange={(e) => handleStateChange('netPrice', parseFloat(e.target.value))} />
              </div>
              <div className="field-group">
                <label className="field" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  Injections per patient per year
                  <button onClick={() => openAiModal('injectionsPerYear')} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'var(--teal-light)', color: 'var(--teal)', border: 'none', cursor: 'pointer' }}>✨ Ask AI</button>
                </label>
                <input type="number" value={state.injectionsPerYear} step="0.5" onChange={(e) => handleStateChange('injectionsPerYear', parseFloat(e.target.value))} />
              </div>
              <div className="field-group" style={{ marginBottom: 0 }}>
                <label className="field" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  12-month persistency rate (%)
                  <button onClick={() => openAiModal('persistency')} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'var(--teal-light)', color: 'var(--teal)', border: 'none', cursor: 'pointer' }}>✨ Ask AI</button>
                </label>
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

        {isAiModalOpen && (
          <div onClick={() => setIsAiModalOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: '500px', maxWidth: '90%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', position: 'relative', padding: 0 }}>
              <div style={{ background: 'var(--navy)', color: 'white', padding: '16px', borderTopLeftRadius: '10px', borderTopRightRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: 'white' }}>Forecast.ai Assistant</h3>
                <button onClick={() => setIsAiModalOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '18px' }}>✕</button>
              </div>
              
              <div style={{ padding: '16px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {aiChatMessages.map((msg, i) => (
                  <div key={i} style={{ 
                    alignSelf: msg.who === 'user' ? 'flex-end' : 'flex-start',
                    background: msg.who === 'user' ? 'var(--teal)' : 'var(--bg)',
                    color: msg.who === 'user' ? 'white' : 'var(--text)',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    maxWidth: '85%'
                  }}>
                    <div style={{ fontSize: '13px', lineHeight: '1.5' }}>{msg.text}</div>
                    {msg.suggestion && (
                      <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                        <button className="btn" style={{ padding: '4px 10px', fontSize: '12px', minWidth: '0' }} onClick={() => acceptSuggestion(msg.suggestion!)}>Use this instead</button>
                        <button className="btn secondary" style={{ padding: '4px 10px', fontSize: '12px', minWidth: '0' }} onClick={rejectSuggestion}>Reject</button>
                      </div>
                    )}
                  </div>
                ))}
                
                {isUploading && (
                  <div style={{ alignSelf: 'flex-start', background: 'var(--bg)', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>
                    <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Analyzing document...</span>
                  </div>
                )}
              </div>
              
              <div style={{ padding: '16px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
                {!hasUploaded && (
                  <label className="btn secondary" style={{ flex: 1, textAlign: 'center', cursor: 'pointer', margin: 0 }}>
                    Upload Market Research
                    <input type="file" style={{ display: 'none' }} onChange={handleUpload} />
                  </label>
                )}
                <input 
                  type="text" 
                  placeholder="Type a message..." 
                  value={aiInputValue}
                  onChange={(e) => setAiInputValue(e.target.value)}
                  onKeyDown={handleAiSubmit}
                  style={{ flex: 2, padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border)' }} 
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

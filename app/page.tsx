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
  const [maxTab, setMaxTab] = useState(1);
  const [state, setState] = useState<ForecastState>(defaultState);
  const [scenarioState, setScenarioState] = useState<ForecastState>(defaultState);
  const [selectedModel, setSelectedModel] = useState('ARIMA');
  const [savedScenarios, setSavedScenarios] = useState<{name: string, tag: string, s: ForecastState}[]>([]);
  const [scenarioNameInput, setScenarioNameInput] = useState('');
  const [sensitivityLevel, setSensitivityLevel] = useState<5 | 10>(5);
  
  // Chat state
  const [chatStarted, setChatStarted] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [assumptions, setAssumptions] = useState<any[]>([]);
  const [scriptStep, setScriptStep] = useState(0);
  const [demoInput, setDemoInput] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);
  const assumpRef = useRef<HTMLDivElement>(null);

  // AI Modal state
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [activeAiMetric, setActiveAiMetric] = useState<string | null>(null);
  const [aiChatMessages, setAiChatMessages] = useState<{who: string, text: string, suggestion?: number, customAction?: string}[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingModel, setIsUploadingModel] = useState(false);
  const [hasUploaded, setHasUploaded] = useState(false);
  const [aiInputValue, setAiInputValue] = useState('');

  const chatScript = [
    {who:'ai', text:"Let's build your forecast together. What is the scope of the project - add country of study, drug in question, lines of therapy involved?"},
    {who:'user', text:"US only, our new anti-VEGF (AXPAXLI), all lines of therapy.", assump:[{k:'Scope', v:'US, (AXPAXLI), all lines'}]},
    {who:'ai', text:"Got it. For epidemiology I'll anchor on a US diagnosed prevalence of about 1.75M patients, based on published claims and NHANES-derived estimates. Does that align with your internal numbers?"},
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
    {who:'ai', text:"What is the dosing of your product? (injections per year)"},
    {who:'user', text:"2.", assump:[]},
    {who:'ai', text:"Eylea HD lists around $2,645 WAC Considering the dosing of AXPAXLI, would you want to price it around $5,000 WAC?"},
    {who:'user', text:"Price in line with that at $5,125.", assump:[{k:'Net price per injection, post-rebate (USD)', v:'$5,125'}]},
    {who:'ai', text:"What is the average patient adherence boost you expect on your drug."},
    {who:'user', text:"20%", assump:[]},
    {who:'ai', text:"Is there anything else you'd like to add or adjust?"},
    {who:'user', text:"No.", assump:[]},
    {who:'ai', text:"Thanks for all your unputs let's review the assumptions in the next sections"}
  ];

  const runChat = () => {
    setChatMessages([chatScript[0]]);
    setAssumptions([]);
    setChatStarted(true);
    setScriptStep(1); // Point to the first user response
  };

  const handleDemoSubmit = (e?: React.KeyboardEvent<HTMLInputElement>) => {
    if (e && e.key !== 'Enter') return;
    if (!demoInput.trim()) return;

    const currentInput = demoInput.trim();
    setDemoInput('');
    setChatMessages(prev => [...prev, { who: 'user', text: currentInput }]);

    const expectedUserStep = chatScript[scriptStep];
    if (expectedUserStep && expectedUserStep.who === 'user') {
      let finalAssumps = expectedUserStep.assump ? [...expectedUserStep.assump] : [];
      
      const prevAiMessage = chatScript[scriptStep - 1];
      if (prevAiMessage) {
        if (prevAiMessage.text.includes("prior tests involved")) {
          finalAssumps = finalAssumps.filter(a => a.k !== 'Test Positivity');
          finalAssumps.push({ k: 'Test Positivity', v: '80%' });
        } else if (prevAiMessage.text.includes("dosing of your product")) {
          finalAssumps = finalAssumps.filter(a => a.k !== 'Injections / year');
          finalAssumps.push({ k: 'Injections / year', v: '2' });
        } else if (prevAiMessage.text.includes("patient adherence boost")) {
          finalAssumps = finalAssumps.filter(a => a.k !== 'Patient adherence boost');
          finalAssumps.push({ k: 'Patient adherence boost', v: '20%' });
        }
      }

      if (finalAssumps.length > 0) {
        setAssumptions(prev => {
          const newKeys = finalAssumps.map(a => a.k);
          const filtered = prev.filter(a => !newKeys.includes(a.k));
          return [...filtered, ...finalAssumps];
        });
      }
    }

    const nextAiIndex = scriptStep + 1;
    if (nextAiIndex < chatScript.length) {
      setTimeout(() => {
        setChatMessages(prev => [...prev, chatScript[nextAiIndex]]);
        setScriptStep(nextAiIndex + 1);
      }, 800);
    }
  };

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const goPage = (n: number) => {
    if (n > maxTab) {
      setMaxTab(n);
    }
    setActiveTab(n);
    if (n === 2 && !chatStarted) runChat();
    window.scrollTo(0, 0);
  };

  const handleStateChange = (key: keyof ForecastState, value: number) => {
    setState(prev => ({ ...prev, [key]: value }));
    setScenarioState(prev => ({ ...prev, [key]: value }));
  };

  const handleScenarioChange = (key: keyof ForecastState, value: number) => {
    setScenarioState(prev => ({ ...prev, [key]: value }));
  };

  const resetAssumptions = () => {
    setScenarioState(state);
  };

  const openAiModal = (metricKey: string) => {
    setActiveAiMetric(metricKey);
    setIsAiModalOpen(true);
    setHasUploaded(false);
    
    // Set initial chat message based on metric
    let initMsg = "";
    if (metricKey === 'prevalence') initMsg = "The diagnosed prevalence is set to 1.75M based on recent US claims data and NHANES-derived population estimates.";
    else if (metricKey === 'diagnosisRate') initMsg = "The diagnosis rate of 85% reflects a high degree of symptomatic presentation compared to other diseases.";
    else if (metricKey === 'treatmentRate') initMsg = "The 92% treatment initiation rate is standard; most diagnosed patients immediately begin therapy.";
    else if (metricKey === 'addressableShare') initMsg = "The 65% addressable share accounts for naive starts and patients willing to switch off their current short-interval therapy for a more durable option.";
    else if (metricKey === 'peakShare') initMsg = "A 25% peak share is aggressive but attainable for a highly differentiated asset, mirroring the recent trajectory of Vabysmo.";
    else if (metricKey === 'yearsToPeak') initMsg = "5 years to peak reflects typical access friction and contracting delays in this highly competitive, mature market.";
    else if (metricKey === 'netPrice') initMsg = "A net price of $5,125 positions your asset at parity with Eylea HD, assuming no deep discounting is required to drive initial uptake.";
    else if (metricKey === 'injectionsPerYear') initMsg = "2 injections per year reflects real-world clinical practice for a durable agent, assuming an initial loading phase followed by q16-week maintenance.";
    else if (metricKey === 'compliance') initMsg = "A 20% patient adherence boost is consistent with established therapies, accounting for real-world enhancements and switching.";
    else initMsg = "Let's review this assumption.";

    setAiChatMessages([
      { who: 'ai', text: initMsg }
    ]);
  };

  const handleModelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploadingModel(true);
    setTimeout(() => {
      setIsUploadingModel(false);
      goPage(4);
    }, 2000);
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
      else if (activeAiMetric === 'diagnosisRate') { newMsg += "The market research indicates diagnosis rates are improving. Suggesting 88%."; suggestionValue = 0.88; }
      else if (activeAiMetric === 'treatmentRate') { newMsg += "New guidelines pushed the treatment rate to 95% in your target clinics."; suggestionValue = 0.95; }
      else if (activeAiMetric === 'addressableShare') { newMsg += "Physician surveys in the deck show 70% of treated patients are considered switch-eligible."; suggestionValue = 0.70; }
      else if (activeAiMetric === 'peakShare') { newMsg += "Given the highly competitive contracting landscape detailed in the report, a 20% peak share is more realistic."; suggestionValue = 0.20; }
      else if (activeAiMetric === 'yearsToPeak') { newMsg += "The payer access timeline suggests it will take 6 years to reach peak share."; suggestionValue = 6; }
      else if (activeAiMetric === 'netPrice') { newMsg += "The pricing strategy deck recommends a launch net price of $2,400 to secure early formulary placement."; suggestionValue = 2400; }
      else if (activeAiMetric === 'injectionsPerYear') { newMsg += "KOL feedback indicates real-world undertreatment; average injections will likely be 5 per year."; suggestionValue = 5; }
      else if (activeAiMetric === 'compliance') { newMsg += "The analog data shows a patient adherence boost of 15% for similar intervals."; suggestionValue = 0.15; }
      
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

  const acceptCustomAction = (action: string) => {
    if (action === 'add_diag_code') {
      setAssumptions(prev => {
        const hasIt = prev.some(a => a.k === 'Diagnosis Code');
        if (hasIt) return prev;
        return [...prev, { k: 'Diagnosis Code', v: 'L40.9' }];
      });
      setAiChatMessages(prev => {
        const withoutButtons = prev.map(m => ({ ...m, customAction: undefined, suggestion: undefined }));
        return [...withoutButtons, { who: 'user', text: "Add it." }, { who: 'ai', text: "Done. I've added diagnosis code L40.9 to the business rules."}];
      });
    }
  };

  const rejectCustomAction = () => {
    setAiChatMessages(prev => {
      const withoutButtons = prev.map(m => ({ ...m, customAction: undefined, suggestion: undefined }));
      return [...withoutButtons, { who: 'user', text: "Reject." }, { who: 'ai', text: "Understood. I will not add it."}];
    });
  };

  const handleAiSubmit = (e?: React.KeyboardEvent<HTMLInputElement>) => {
    if (e && e.key !== 'Enter') return;
    if (!aiInputValue.trim()) return;

    const userText = aiInputValue.trim();
    setAiInputValue('');
    
    setAiChatMessages(prev => [...prev, { who: 'user', text: userText }]);
    
    setTimeout(() => {
      const textLower = userText.toLowerCase();
      if (textLower.includes("diagnosis code") && textLower.includes("l40.9")) {
        setAiChatMessages(prev => [...prev, { 
          who: 'ai', 
          text: "I can add the diagnosis code L40.9 (Psoriasis, unspecified) to your business rules. Do you want to proceed?", 
          customAction: 'add_diag_code'
        }]);
      } else {
        setAiChatMessages(prev => [...prev, { who: 'ai', text: "I am a prototype assistant! In the full version, I will analyze your request against your custom data and update the forecast dynamically." }]);
      }
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
    a.download = 'forecast.csv';
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
    { name: 'Diagnosed prevalence', val: state.prevalence, max: state.prevalence },
    { name: 'Diagnosed and under ophthalmic care', val: diagnosed, max: state.prevalence },
    { name: 'On active therapy', val: treated, max: state.prevalence },
    { name: 'Addressable (naive + switch-eligible)', val: addressable, max: state.prevalence },
    { name: 'Peak patients on your product', val: peakPatients, max: state.prevalence }
  ];

  // Forecast calculations
  const f = computeForecast(state);
  const scenarioF = computeForecast(scenarioState);
  
  // Scenario variations (hardcoded based on peak revenue)
  const basePeak = scenarioF.peakRevenue;
  const impacts = [
    { name: 'Net price (direct)', low: -(sensitivityLevel === 5 ? 0.05 : 0.10) * basePeak, high: (sensitivityLevel === 5 ? 0.05 : 0.10) * basePeak },
    { name: 'Adherence boost', low: -(sensitivityLevel === 5 ? 0.05 : 0.10) * basePeak, high: (sensitivityLevel === 5 ? 0.05 : 0.10) * basePeak },
    { name: 'Peak share', low: -(sensitivityLevel === 5 ? 0.042 : 0.09) * basePeak, high: (sensitivityLevel === 5 ? 0.042 : 0.09) * basePeak },
    { name: 'Addressable share', low: -(sensitivityLevel === 5 ? 0.04 : 0.085) * basePeak, high: (sensitivityLevel === 5 ? 0.04 : 0.085) * basePeak },
    { name: 'Diagnosis rate', low: -(sensitivityLevel === 5 ? 0.037 : 0.08) * basePeak, high: (sensitivityLevel === 5 ? 0.037 : 0.08) * basePeak }
  ];

  // Compare scenarios
  const down = { ...state, peakShare: state.peakShare * 0.6, netPrice: state.netPrice * 0.85, yearsToPeak: state.yearsToPeak + 1 };
  const up = { ...state, peakShare: Math.min(0.6, state.peakShare * 1.4), netPrice: state.netPrice * 1.1, yearsToPeak: Math.max(2, state.yearsToPeak - 1) };
  const defaultScenarios = [
    { name: 'Base', tag: 'tag-base', s: state }
  ];
  const scenarios = [...defaultScenarios, ...savedScenarios];

  return (
    <>
      <header className="topbar" style={{ backgroundColor: '#ffffff', borderBottom: '1px solid var(--border)', padding: '6px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="brand" style={{ alignItems: 'center' }}>
          <div>
            <div className="name" style={{ color: 'var(--navy)' }}>Forecast.ai</div>
            <div className="tag" style={{ color: 'var(--text-muted)' }}>Forecasting demo</div>
          </div>
        </div>
        <img src="/Tredence_KMK_Logo-removebg-preview.png" alt="Tredence KMK Logo" style={{ height: '88px', objectFit: 'contain', marginTop: '-22px', marginBottom: '-22px' }} />
      </header>

      <nav className="tabs" id="tabnav">
        {[
          'Welcome',
          'AI conversation',
          'Assumptions',
          'Forecast',
          'Key insights',
          'Scenarios',
          'Compare',
          'Export'
        ].map((tab, idx) => {
          const tabNum = idx + 1;
          const isClickable = tabNum <= maxTab;
          return (
            <button 
              key={tabNum}
              className={`${activeTab === tabNum ? 'active' : ''}`}
              style={{ opacity: isClickable ? 1 : 0.4, cursor: isClickable ? 'pointer' : 'not-allowed' }}
              onClick={() => {
                if (isClickable) goPage(tabNum);
              }}
            >
              {tab}
            </button>
          );
        })}
      </nav>

      <main>
        {/* PAGE 1 : WELCOME */}
        <section className={`page ${activeTab === 1 ? 'active' : ''}`} id="page-1">
          <h1>Forecast through conversation, not spreadsheets</h1>
          <p className="lead">Forecast.ai asks the questions a senior forecasting analyst would ask, builds a patient-flow model from your answers, and lets you stress-test every assumption in real time.</p>

          <div className="grid3">
            <div className="card">
              <h3>Conversational inputs</h3>
              <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', margin: 0 }}>An AI assistant with deep domain knowledge proactively asks about epidemiology, competitive dynamics, product profile, and pricing — no blank templates.</p>
            </div>
            <div className="card">
              <h3>AI-generated forecast</h3>
              <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', margin: 0 }}>Your answers become a patient-flow model and a 5-year revenue and share forecast, with a narrative on what's driving it.</p>
            </div>
            <div className="card">
              <h3>Live scenario play</h3>
              <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', margin: 0 }}>Move sliders on peak share, price, or uptake speed and watch the forecast, insights, and risk profile update instantly.</p>
            </div>
          </div>

          <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
            {isUploadingModel ? (
              <div style={{ padding: '40px 0' }}>
                <div style={{ 
                  width: '40px', height: '40px', border: '3px solid #e0f2f1', 
                  borderTopColor: '#00b2a9', borderRadius: '50%', 
                  animation: 'spin 1s linear infinite', margin: '0 auto 16px' 
                }}></div>
                <h3 style={{ margin: '0 0 8px' }}>Parsing Excel model...</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Extracting drivers and structure.</p>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
              </div>
            ) : (
              <>
                <h2 style={{ marginBottom: '8px' }}>Select a forecasting model</h2>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '12px' }}>
                  <button className="btn" onClick={() => goPage(2)}>Start a new forecast →</button>
                  <label className="btn" style={{ background: '#ffffff', color: 'var(--navy)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', margin: 0 }}>
                    Upload existing model (.xlsx)
                    <input type="file" accept=".xlsx, .xls, .csv" style={{ display: 'none' }} onChange={handleModelUpload} />
                  </label>
                </div>
              </>
            )}

          </div>

        </section>

        {/* PAGE 2 : AI CONVERSATION */}
        <section className={`page ${activeTab === 2 ? 'active' : ''}`} id="page-2">
          <h1>Build your forecast in conversation</h1>
          <p className="lead">The assistant asks targeted questions, one topic at a time, and captures every answer as a structured assumption on the right.</p>

          <div className="chat-wrap">
            <div className="card chat-thread" id="chatThread" ref={chatRef} style={{ background: '#f9fafb' }}>
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', justifyContent: msg.who === 'user' ? 'flex-end' : 'flex-start', marginBottom: '16px' }}>
                  <div className={`bubble ${msg.who === 'ai' ? 'ai' : 'user'}`} style={{ 
                    animationDelay: '0s', 
                    margin: 0, 
                    border: msg.who === 'ai' ? '1px solid #e5e7eb' : 'none', 
                    background: msg.who === 'ai' ? '#ffffff' : '#0f7696', 
                    color: msg.who === 'ai' ? '#374151' : '#ffffff',
                    boxShadow: msg.who === 'ai' ? '0 1px 2px rgba(0,0,0,0.02)' : 'none',
                    borderRadius: '12px',
                    borderTopRightRadius: msg.who === 'user' ? '2px' : '12px',
                    borderTopLeftRadius: msg.who === 'ai' ? '2px' : '12px'
                  }}>
                    {msg.text}
                  </div>
                  {msg.who === 'user' && (
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#fef0e7', color: '#e78c52', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    </div>
                  )}
                </div>
              ))}
              <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  value={demoInput}
                  onChange={e => setDemoInput(e.target.value)}
                  onKeyDown={handleDemoSubmit}
                  placeholder={scriptStep >= chatScript.length ? "Conversation complete" : "Type your answer..."}
                  style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }}
                  disabled={scriptStep >= chatScript.length || !chatStarted}
                />
                <button 
                  className="btn" 
                  onClick={() => handleDemoSubmit()}
                  disabled={scriptStep >= chatScript.length || !chatStarted}
                >Send</button>
              </div>
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
          
          <div style={{ background: 'var(--teal-light)', borderLeft: '4px solid var(--teal)', padding: '12px 16px', borderRadius: '4px', marginBottom: '24px', fontSize: '13.5px', color: 'var(--navy)', lineHeight: '1.5' }}>
            <strong>What is ✨ Ask AI?</strong> Click this button next to any assumption to open the AI assistant. You can use it to validate your inputs against market research, ask for suggested values based on recent data, or even upload documents to automatically extract the right number.
          </div>

          <div className="grid2">
            <div className="card">
              <h3>Epidemiology &amp; treatment funnel (US)</h3>
              <div className="field-group">
                <label className="field" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  Diagnosed prevalence
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
                  Treatment initiation rate (% of diagnosed treated)
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
             
              <h3 style={{ marginTop: '18px' }}>Product profile</h3>
              <div className="field-group">
                <label className="field">Key differentiator</label>
                <input type="text" defaultValue="Extended durability — q16-week maintenance dosing after loading phase" />
              </div>
              <div className="field-group">
                <label className="field">Test Positivity</label>
                <input 
                  type="text" 
                  value={assumptions.find(a => a.k === 'Test Positivity')?.v || ''}
                  onChange={(e) => {
                    const newVal = e.target.value;
                    setAssumptions(prev => {
                      if (prev.find(a => a.k === 'Test Positivity')) {
                        return prev.map(a => a.k === 'Test Positivity' ? { ...a, v: newVal } : a);
                      }
                      return [...prev, { k: 'Test Positivity', v: newVal }];
                    });
                  }} 
                />
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
              <h3>Pricing &amp; adherence</h3>
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
                <div className="flex-between" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  Patient adherence boost (%)
                  <button onClick={() => openAiModal('compliance')} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'var(--teal-light)', color: 'var(--teal)', border: 'none', cursor: 'pointer' }}>✨ Ask AI</button>
                </div>
                <input type="number" value={Math.round(state.compliance * 100)} step="1" onChange={(e) => handleStateChange('compliance', parseFloat(e.target.value) / 100)} />
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

          <div className="card">
            <h3>Forecasting algorithm</h3>
            <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: '12px' }}>Select the algorithm to be used for generating the forecast.</p>
            <div className="field-group" style={{ marginBottom: 0 }}>
              <select 
                value={selectedModel} 
                onChange={e => setSelectedModel(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '14px', outline: 'none', width: '100%', maxWidth: '400px', background: '#fff' }}
              >
                <option value="SMA">SMA</option>
                <option value="Exponential Smoothing">Exponential Smoothing</option>
                <option value="ARIMA">ARIMA</option>
              </select>
            </div>
          </div>

          <div style={{ textAlign: 'right', marginTop: '24px' }}>
            <button className="btn secondary" onClick={resetAssumptions} style={{ marginRight: '8px' }}>Reset to conversation defaults</button>
            <button className="btn" onClick={() => goPage(4)}>Generate forecast →</button>
          </div>
        </section>

        {/* PAGE 4 : FORECAST DASHBOARD */}
        <section className={`page ${activeTab === 4 ? 'active' : ''}`} id="page-4">
          <h1>Forecast dashboard</h1>
          <p className="lead">Seven-year revenue and patient forecast based on your current assumptions.</p>

          <div className="grid3" id="dashMetrics">
            <div className="metric">
              <div className="label">Peak-year net revenue</div>
              <div className="value">{fmtM(f.peakRevenue)}</div>
            </div>
            <div className="metric">
              <div className="label">Peak market share</div>
              <div className="value">{fmtPct(state.peakShare * 100)}</div>
            </div>
            <div className="metric">
              <div className="label">Peak patients on therapy</div>
              <div className="value">{fmtNum(f.addressable * state.peakShare)}</div>
            </div>
            <div className="metric">
              <div className="label">1-year revenue</div>
              <div className="value">{fmtM(f.cumulativeRevenue[0])}</div>
            </div>
            <div className="metric">
              <div className="label">2-year cumulative revenue</div>
              <div className="value">{fmtM(f.cumulativeRevenue[1])}</div>
            </div>
            <div className="metric">
              <div className="label">3-year cumulative revenue</div>
              <div className="value">{fmtM(f.cumulativeRevenue[2])}</div>
            </div>
          </div>

          <div className="card">
            <h3>Cumulative revenue forecast, US ($)</h3>
            <div className="legend-row">
              <span><span className="legend-dot" style={{ background: '#2a78d6' }}></span>Cumulative net revenue</span>
            </div>
            <div className="canvas-wrap">
              {activeTab === 4 && <Line 
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => fmtM(Number(v)) } } } }}
                data={{ labels: f.years, datasets: [{ label: 'Cumulative revenue', data: f.cumulativeRevenue, borderColor: '#2a78d6', backgroundColor: 'rgba(42,120,214,0.1)', fill: true, tension: 0.3, pointRadius: 3 }] }} 
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
                <tr><th>Year</th><th>Patients</th><th>Share</th><th>Net year revenue</th></tr>
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
                `Peak share of <b>${fmtPct(state.peakShare * 100)}</b> is reached around year <b>${Math.ceil(state.yearsToPeak)}</b>, driven primarily by the durability differentiator versus the current standard of care.`,
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
                  { title: 'Biosimilar price pressure', text: 'Biosimilar entrants are compressing net pricing across the class — a 15% further price erosion would cut peak revenue meaningfully.' },
                  { title: 'Competitive response', text: 'Competitors could extend their own dosing intervals in response, narrowing your durability advantage.' },
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
                  { title: 'Broader label or indication', text: 'Expansion beyond initial targets would grow the addressable pool independent of share gains.' },
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
            <h3>How this compares to recent analogues</h3>
            <p style={{ fontSize: '13.5px', lineHeight: '1.6', color: 'var(--text-muted)', margin: 0 }}>
              Recent analogues reached blockbuster status (&gt;$1B) within roughly two years of launch, aided by a differentiated story. Your asset's <span id="cmpShare">{fmtPct(state.peakShare * 100)}</span> peak share assumption over <span id="cmpYears">{Math.ceil(state.yearsToPeak)}</span> years is <span id="cmpPace">{state.yearsToPeak <= 3 ? 'more aggressive' : (state.yearsToPeak >= 5 ? 'more conservative' : 'broadly comparable')}</span> relative to that trajectory — worth stress-testing against a faster or slower competitive response on the scenarios page.
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <button className="btn" onClick={() => goPage(6)}>Run sensitivity analysis →</button>
          </div>
        </section>

        {/* PAGE 6 : SCENARIOS */}
        <section className={`page ${activeTab === 6 ? 'active' : ''}`} id="page-6">
          <div>
            <h1>Scenario &amp; sensitivity analysis</h1>
            <p className="lead">Drag any assumption and the forecast, peak metrics, and sensitivity ranking recalculate instantly.</p>
          </div>

            <div className="grid2">
              <div className="card">
                <div className="field-group">
                  <div className="row-flex"><label className="field" style={{ margin: 0 }}>Peak market share</label><span className="val">{fmtPct(scenarioState.peakShare * 100)}</span></div>
                  <input type="range" min="0" max="100" step="1" value={Math.round(scenarioState.peakShare * 100)} onChange={e => handleScenarioChange('peakShare', parseFloat(e.target.value) / 100)} />
                </div>
                <div className="field-group">
                  <div className="row-flex"><label className="field" style={{ margin: 0 }}>Net price per injection</label><span className="val">{fmtM(scenarioState.netPrice)}</span></div>
                  <input type="range" min="1200" max="10000" step="50" value={scenarioState.netPrice} onChange={e => handleScenarioChange('netPrice', parseFloat(e.target.value))} />
                </div>
                <div className="field-group">
                  <div className="row-flex"><label className="field" style={{ margin: 0 }}>Years to peak share</label><span className="val">{scenarioState.yearsToPeak} yrs</span></div>
                  <input type="range" min="2" max="7" step="1" value={scenarioState.yearsToPeak} onChange={e => handleScenarioChange('yearsToPeak', parseFloat(e.target.value))} />
                </div>
                <div className="field-group" style={{ marginBottom: 0 }}>
                  <div className="row-flex"><label className="field" style={{ margin: 0 }}>Patient Adherence Boost</label><span className="val">{fmtPct(scenarioState.compliance * 100)}</span></div>
                  <input type="range" min="0" max="100" step="1" value={Math.round(scenarioState.compliance * 100)} onChange={e => handleScenarioChange('compliance', parseFloat(e.target.value) / 100)} />
                </div>
              </div>
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
                      <span key={i} className={`scenario-tag ${sc.tag}`}>{sc.name}</span>
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
            </div>
  
            <div className="card">
              <h3>Revenue forecast under current sliders</h3>
              <div className="canvas-wrap">
                {activeTab === 6 && <Line 
                  options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => fmtM(Number(v)) } } } }}
                  data={{ labels: scenarioF.years, datasets: [{ label: 'Net revenue', data: scenarioF.revenue, borderColor: '#F25621', backgroundColor: 'rgba(242,86,33,0.12)', fill: true, tension: 0.3, pointRadius: 3 }] }} 
                />}
              </div>
            </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>Sensitivity — impact on peak revenue from plausible swings in key drivers</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <em style={{ fontSize: '13px', color: 'var(--text-muted)' }}>use drop down to select the sensitivity</em>
                <select 
                  value={sensitivityLevel} 
                  onChange={e => setSensitivityLevel(Number(e.target.value) as 5 | 10)}
                  style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '13px', outline: 'none' }}
                >
                  <option value={5}>±5% swing</option>
                  <option value={10}>±10% swing</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '10px', height: '10px', background: '#de5252' }}></div> Negative swing
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '10px', height: '10px', background: '#0eb59a' }}></div> Positive swing
              </div>
            </div>
            <div className="canvas-wrap" style={{ height: '260px' }}>
              {activeTab === 6 && <Bar 
                options={{ indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { min: -100000000, max: 100000000, ticks: { callback: v => (Number(v) < 0 ? '-' : '') + fmtM(Math.abs(Number(v))) } } } }}
                data={{
                  labels: impacts.map(i => i.name),
                  datasets: [
                    { label: `-${sensitivityLevel}%`, data: impacts.map(i => i.low), backgroundColor: '#e34948' },
                    { label: `+${sensitivityLevel}%`, data: impacts.map(i => i.high), backgroundColor: '#00b2a9' }
                  ]
                }} 
              />}
            </div>
          </div>

          <div style={{ textAlign: 'right', marginTop: '16px' }}>
            <button className="btn secondary" onClick={resetAssumptions} style={{ marginRight: '12px' }}>Reset sliders to base case</button>
            <button className="btn" onClick={() => goPage(7)}>Compare scenarios →</button>
          </div>
        </section>

        {/* PAGE 7 : COMPARE */}
        <section className={`page ${activeTab === 7 ? 'active' : ''}`} id="page-7">
          <h1>Scenario comparison</h1>
          <p className="lead">The base case alongside any custom scenarios you've saved.</p>

          <div className="card">
            <h3>Summary</h3>
            <div style={{ overflowX: 'auto' }}>
              <table id="compareTable" style={{ whiteSpace: 'nowrap', width: '100%' }}>
                <thead>
                  <tr><th>Scenario</th><th>Peak share</th><th>Net price</th><th>Years to peak</th><th>Peak revenue</th><th>Year 1 net</th><th>Year 2 net</th><th>Year 3 net</th><th>Year 4 net</th><th>Year 5 net</th></tr>
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
                      <td>{fmtM(fc.revenue[0])}</td>
                      <td>{fmtM(fc.revenue[1])}</td>
                      <td>{fmtM(fc.revenue[2])}</td>
                      <td>{fmtM(fc.revenue[3])}</td>
                      <td>{fmtM(fc.revenue[4])}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>

          <div className="card">
            <h3>Year-by-year net revenue comparison</h3>
            <div className="canvas-wrap">
              {activeTab === 7 && <Bar 
                options={{ 
                  responsive: true, 
                  maintainAspectRatio: false, 
                  plugins: { legend: { position: 'bottom' } }, 
                  scales: { y: { ticks: { callback: v => fmtM(Number(v)) } } } 
                }}
                data={{ 
                  labels: ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'], 
                  datasets: scenarios.map((sc, i) => ({ 
                    label: sc.name, 
                    data: computeForecast(sc.s).revenue.slice(0, 5), 
                    backgroundColor: ['#e34948', '#898781', '#00b2a9', '#f25621', '#3b82f6'][i % 5], 
                    borderRadius: 4 
                  })) 
                }} 
              />}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <button className="btn" onClick={() => goPage(8)}>Export forecast →</button>
          </div>
        </section>

        {/* PAGE 8 : EXPORT */}
        <section className={`page ${activeTab === 8 ? 'active' : ''}`} id="page-8">
          <h1>Export &amp; share</h1>
          <p className="lead">Send the current forecast out to the tools your team already works in.</p>

          <div className="card export-card" style={{ display: 'block' }}>
            <div style={{ marginBottom: '16px' }}>
              <div className="etitle" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--navy)', marginBottom: '4px' }}>Export results</div>
              <div className="edesc">Download the current scenario's outputs. Excel includes annual, quarterly, and monthly sheets plus the assumptions.</div>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button className="btn" onClick={() => {}}>Download Excel workbook</button>
              <button className="btn secondary" onClick={exportCSV}>Annual CSV</button>
              <button className="btn secondary" onClick={() => {}}>Quarterly CSV</button>
              <button className="btn secondary" onClick={() => {}}>Monthly CSV</button>
            </div>
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

        </section>

        {isAiModalOpen && (
          <div onClick={() => setIsAiModalOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: '550px', maxWidth: '90%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', position: 'relative', padding: 0, borderRadius: '12px', background: '#ffffff', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
              
              <div style={{ background: '#ffffff', color: '#1f2937', padding: '16px 20px', borderBottom: '1px solid var(--border)', borderTopLeftRadius: '12px', borderTopRightRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#00b2a9' }}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '600' }}>Analysis Assistant</h3>
                </div>
                <button onClick={() => setIsAiModalOpen(false)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '20px', display: 'flex', alignItems: 'center' }}>✕</button>
              </div>
              
              <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', background: '#fafafa' }}>
                {aiChatMessages.map((msg, i) => (
                  <div key={i} style={{ display: 'flex', gap: '12px', alignSelf: msg.who === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                    {msg.who === 'ai' && (
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#e0f2f1', color: '#00b2a9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                      </div>
                    )}
                    <div style={{ 
                      background: msg.who === 'user' ? 'var(--teal)' : '#ffffff',
                      color: msg.who === 'user' ? 'white' : '#374151',
                      border: msg.who === 'user' ? 'none' : '1px solid #e5e7eb',
                      padding: '14px 16px',
                      borderRadius: '12px',
                      boxShadow: msg.who === 'user' ? 'none' : '0 1px 2px rgba(0,0,0,0.02)'
                    }}>
                      <div style={{ fontSize: '13.5px', lineHeight: '1.6' }}>{msg.text}</div>
                      {msg.suggestion !== undefined && (
                        <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                          <button className="btn" style={{ padding: '6px 12px', fontSize: '12px', minWidth: '0' }} onClick={() => acceptSuggestion(msg.suggestion!)}>Use this instead</button>
                          <button className="btn secondary" style={{ padding: '6px 12px', fontSize: '12px', minWidth: '0' }} onClick={rejectSuggestion}>Reject</button>
                        </div>
                      )}
                      {msg.customAction === 'add_diag_code' && (
                        <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                          <button className="btn" style={{ padding: '6px 12px', fontSize: '12px', minWidth: '0' }} onClick={() => acceptCustomAction('add_diag_code')}>Add (Diagnosis Code: L40.9)</button>
                          <button className="btn secondary" style={{ padding: '6px 12px', fontSize: '12px', minWidth: '0' }} onClick={rejectCustomAction}>Reject</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {isUploading && (
                  <div style={{ display: 'flex', gap: '12px', alignSelf: 'flex-start' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#e0f2f1', color: '#00b2a9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                    </div>
                    <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', padding: '14px 16px', borderRadius: '12px', fontSize: '13.5px', color: '#6b7280', fontStyle: 'italic' }}>
                      Analyzing document...
                    </div>
                  </div>
                )}
              </div>
              
              <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', background: '#ffffff', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {!hasUploaded && (
                  <label style={{ fontSize: '12px', color: '#00b2a9', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                    Upload Market Research Document
                    <input type="file" style={{ display: 'none' }} onChange={handleUpload} />
                  </label>
                )}
                <div style={{ display: 'flex', alignItems: 'center', background: '#f3f4f6', borderRadius: '24px', padding: '4px 6px 4px 16px' }}>
                  <input 
                    type="text" 
                    placeholder="Describe the analysis you want to perform..." 
                    value={aiInputValue}
                    onChange={(e) => setAiInputValue(e.target.value)}
                    onKeyDown={handleAiSubmit}
                    style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '14px', color: '#1f2937' }} 
                  />
                  <button onClick={() => { if (aiInputValue.trim()) handleAiSubmit({key: 'Enter'} as any); }} style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#7cb5c8', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

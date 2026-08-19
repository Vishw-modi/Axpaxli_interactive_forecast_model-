import sys
import re

with open('app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# REPLACEMENT 1: Chat Types and Script
old_chat_script_start = "const chatScript = ["
old_chat_script_end = "];"
# find the block
start_idx = content.find(old_chat_script_start)
end_idx = content.find(old_chat_script_end, start_idx) + len(old_chat_script_end)

new_chat_script = '''type ChatControl = 
  | { type: 'slider', key: keyof ForecastState, label: string, stops: number[], unit: string }
  | { type: 'toggle', key: keyof ForecastState, label: string }
  | { type: 'select', key: keyof ForecastState, label: string, options: {value:string, label:string}[] }
  | { type: 'dateOrNever', key: keyof ForecastState, label: string };

type ChatStepDef = {
  id: string;
  who: 'ai' | 'user';
  text: string;
  controls?: ChatControl[];
  getAssumptions?: (s: ForecastState) => {k:string, v:string}[];
  getUserReply?: (s: ForecastState) => string;
};

const formatStop = (v: number, unit: string) => unit === '$' ? `$${v.toLocaleString()}` : `${(v * (unit === '%' ? 100 : 1)).toLocaleString()}${unit === '$' ? '' : unit}`;

const chatScript: ChatStepDef[] = [
  {
    id: 'stage0_q',
    who: 'ai',
    text: "Let's build your forecast together. What is the scope — country of study, drug in question, indication, and lines of therapy?"
  },
  {
    id: 'stage0_a',
    who: 'user',
    text: "US only, AXPAXLI, wet AMD, all lines of therapy.",
    getAssumptions: () => [{k:'Scope', v:'US / AXPAXLI / wet AMD / All LoT'}]
  },
  {
    id: 'stage2_q',
    who: 'ai',
    text: "For the patient universe, I'll anchor on a US diagnosed prevalence of ~1.75M based on claims and NHANES estimates. Claims data supports a 4.8–5.3% base diagnosis rate. Where should we set it?",
    controls: [
      { type: 'slider', key: 'diagnosisRate', label: 'Diagnosis rate (base year)', stops: [0.048, 0.049, 0.051, 0.052, 0.053], unit: '%' },
      { type: 'slider', key: 'diagnosisAnnualGrowthRate', label: 'Diagnosis annual growth rate', stops: [0.019, 0.025, 0.032, 0.045, 0.055], unit: '%' }
    ],
    getUserReply: (s) => `${(s.diagnosisRate*100).toFixed(1)}% base diagnosis rate.`,
    getAssumptions: (s) => [
      {k:'Diagnosis Rate (2016 base)', v: `${(s.diagnosisRate*100).toFixed(1)}%`},
      {k:'Diagnosis Annual Growth', v: `${(s.diagnosisAnnualGrowthRate*100).toFixed(1)}%`}
    ]
  },
  {
    id: 'stage3_q',
    who: 'ai',
    text: "What % of diagnosed patients get an IAS injection in the base year? Claims support 24–32%. Also, how fast should IAS treatment rates grow annually, and what ratio of HA use to IAS should we build in?",
    controls: [
      { type: 'slider', key: 'iasTreatedPctOfDiagnosed', label: 'IAS treated % of diagnosed (base yr)', stops: [0.244, 0.264, 0.284, 0.304, 0.324], unit: '%' },
      { type: 'slider', key: 'iasTreatedGrowthRate', label: 'IAS treated annual growth rate', stops: [0.01, 0.02, 0.03, 0.035, 0.04], unit: '%' },
      { type: 'slider', key: 'haRatioToIAS', label: 'HA-to-IAS ratio', stops: [0.30, 0.40, 0.45, 0.50, 0.55], unit: '%' }
    ],
    getUserReply: (s) => `${(s.iasTreatedPctOfDiagnosed*100).toFixed(1)}% treated.`,
    getAssumptions: (s) => [
      {k:'IAS Treated % of Diagnosed', v:`${(s.iasTreatedPctOfDiagnosed*100).toFixed(1)}%`},
      {k:'IAS Growth Rate', v:`${(s.iasTreatedGrowthRate*100).toFixed(1)}%`},
      {k:'HA-to-IAS Ratio', v:`${(s.haRatioToIAS*100).toFixed(0)}%`}
    ]
  },
  {
    id: 'stage5_q',
    who: 'ai',
    text: "Stated preference typically overstates real adoption. How much should we discount it? Also let's set the clinical data profile and WAC price.",
    controls: [
      { type: 'slider', key: 'overstatementAdjFactor', label: 'Overstatement adjustment factor', stops: [0.10, 0.16, 0.22, 0.25, 0.30], unit: '%' },
      { type: 'toggle', key: 'womacScoreAvailable', label: 'WOMAC pain-score data available?' },
      { type: 'toggle', key: 'diabetesGlycemicDataAvailable', label: 'Diabetes/glycemic data available?' },
      { type: 'slider', key: 'wacPrice', label: 'WAC price per injection', stops: [400, 500, 575, 800, 1000], unit: '$' }
    ],
    getUserReply: (s) => `WAC $${s.wacPrice.toLocaleString()} with ${(s.overstatementAdjFactor*100).toFixed(0)}% adj.`,
    getAssumptions: (s) => [
      {k:'Overstatement Adj.', v:`${(s.overstatementAdjFactor*100).toFixed(0)}%`},
      {k:'WOMAC Data', v: s.womacScoreAvailable ? 'Yes' : 'No'},
      {k:'WAC Price', v: `$${s.wacPrice.toLocaleString()}`}
    ]
  },
  {
    id: 'stage6_q',
    who: 'ai',
    text: "What access hurdle applies — none, prior auth only, Pre-Cert, Pre-Cert + Step Edit, or Prior Auth + Step Edit? How much share survives that hurdle?",
    controls: [
      { type: 'select', key: 'payerAccessRequirement', label: 'Payer access requirement', options: [{value: 'none', label: 'None'}, {value: 'prior_auth_only', label: 'Prior Auth'}, {value: 'pre_cert', label: 'Pre-Cert'}, {value: 'pre_cert_step_edit', label: 'Pre-Cert + Step Edit'}, {value: 'prior_auth_plus_step_edit', label: 'PA + Step Edit'}] },
      { type: 'slider', key: 'pricingAdjFactorAccessImpact', label: 'Pricing adj. — access impact (% surviving)', stops: [0.90, 0.92, 0.96, 0.97, 0.98], unit: '%' },
      { type: 'toggle', key: 'patientAssistanceProgramInPlace', label: 'Patient assistance program in place?' }
    ],
    getUserReply: (s) => `${s.payerAccessRequirement.replace(/_/g, ' ')} (${(s.pricingAdjFactorAccessImpact*100).toFixed(0)}% survive).`,
    getAssumptions: (s) => [
      {k:'Payer Access Requirement', v: s.payerAccessRequirement},
      {k:'Access Survival Rate', v: `${(s.pricingAdjFactorAccessImpact*100).toFixed(0)}%`}
    ]
  },
  {
    id: 'stage7_q',
    who: 'ai',
    text: "How many years until the product hits peak share? And what % of Ortho/Rheum are reached over time?",
    controls: [
      { type: 'slider', key: 'yearsToPeak', label: 'Years to peak share', stops: [7, 6, 5, 4, 3], unit: ' yrs' },
      { type: 'slider', key: 'pctORSReachedByMonth12', label: 'Ortho/Rheum reached by month 12', stops: [0.60, 0.65, 0.70, 0.75, 0.80], unit: '%' },
      { type: 'slider', key: 'pctORSReachedByYear2', label: 'Ortho/Rheum reached by year 2', stops: [0.70, 0.75, 0.80, 0.85, 0.90], unit: '%' },
      { type: 'slider', key: 'pctORSReachedByYear3Plus', label: 'Ortho/Rheum reached by year 3+', stops: [0.75, 0.80, 0.85, 0.90, 0.95], unit: '%' }
    ],
    getUserReply: (s) => `Peak in ${s.yearsToPeak} years.`,
    getAssumptions: (s) => [
      {k:'Years to Peak', v: `${s.yearsToPeak}`},
      {k:'ORS Reach M12/Y2/Y3+', v: `${(s.pctORSReachedByMonth12*100).toFixed(0)}% / ${(s.pctORSReachedByYear2*100).toFixed(0)}% / ${(s.pctORSReachedByYear3Plus*100).toFixed(0)}%`}
    ]
  },
  {
    id: 'stage8_q',
    who: 'ai',
    text: "How long does the cold-chain refrigeration requirement remain an operational friction, and what % of Ortho share survives it?",
    controls: [
      { type: 'slider', key: 'refrigerationDurationMonths', label: 'Refrigeration requirement duration', stops: [12, 15, 18, 24, 120], unit: ' mo' },
      { type: 'slider', key: 'refrigerationRetentionORS', label: 'Refrigeration retention — Ortho/Surgical', stops: [0.70, 0.80, 0.88, 0.92, 0.95], unit: '%' }
    ],
    getUserReply: (s) => `${s.refrigerationDurationMonths} months.`,
    getAssumptions: (s) => [
      {k:'Refrigeration Duration', v: `${s.refrigerationDurationMonths} months`},
      {k:'Refrigeration Retention (ORS)', v: `${(s.refrigerationRetentionORS*100).toFixed(0)}%`}
    ]
  },
  {
    id: 'stage11_q0',
    who: 'ai',
    text: "Before modeling competitive launches — what market events or competitor launches should we factor into the share curve? Based on primary research, we'd typically flag: Product Y (HA+steroid combo), Product Z (biologic), and the Product W class. Do those three cover it for now?"
  },
  {
    id: 'stage11_a0',
    who: 'user',
    text: "Yes."
  },
  {
    id: 'stage11_q1',
    who: 'ai',
    text: "Starting with Product Y — when, if ever, does it launch? And what % of share do we retain once it does?",
    controls: [
      { type: 'dateOrNever', key: 'cingalLaunchDate', label: 'Product Y Launch Date' },
      { type: 'slider', key: 'cingalRetentionOrtho', label: 'Retention Ortho', stops: [0.70, 0.72, 0.74, 0.78, 0.90], unit: '%' },
      { type: 'slider', key: 'cingalRetentionPCP', label: 'Retention PCP', stops: [0.80, 0.82, 0.85, 0.90, 1.00], unit: '%' }
    ],
    getUserReply: (s) => `${s.cingalLaunchDate === 'does_not_launch' ? 'Does Not Launch' : s.cingalLaunchDate}`,
    getAssumptions: (s) => [
      {k:'Product Y Launch', v: s.cingalLaunchDate === 'does_not_launch' ? 'Never' : s.cingalLaunchDate},
      {k:'Product Y Retention ORS', v: `${(s.cingalRetentionOrtho*100).toFixed(0)}%`}
    ]
  },
  {
    id: 'stage11_q2',
    who: 'ai',
    text: "Next, Product Z (biologic) — base case is typically Does Not Launch.",
    controls: [
      { type: 'dateOrNever', key: 'ampionLaunchDate', label: 'Product Z Launch Date' },
      { type: 'slider', key: 'ampionRetentionOrtho', label: 'Retention Ortho', stops: [0.75, 0.80, 0.865, 0.90, 0.95], unit: '%' },
      { type: 'slider', key: 'ampionRetentionPCP', label: 'Retention PCP', stops: [0.75, 0.80, 0.84, 0.90, 0.95], unit: '%' }
    ],
    getUserReply: (s) => `${s.ampionLaunchDate === 'does_not_launch' ? 'Does Not Launch' : s.ampionLaunchDate}`,
    getAssumptions: (s) => [
      {k:'Product Z Launch', v: s.ampionLaunchDate === 'does_not_launch' ? 'Never' : s.ampionLaunchDate}
    ]
  },
  {
    id: 'stage11_q3',
    who: 'ai',
    text: "Finally, the Anti-NGF class.",
    controls: [
      { type: 'dateOrNever', key: 'antiNGFLaunchDate', label: 'Anti-NGF Launch Date' },
      { type: 'slider', key: 'antiNGFRetentionOrtho', label: 'Retention Ortho', stops: [0.80, 0.85, 0.90, 0.95, 1.00], unit: '%' },
      { type: 'slider', key: 'antiNGFRetentionPCP', label: 'Retention PCP', stops: [0.90, 0.92, 0.95, 0.97, 1.00], unit: '%' }
    ],
    getUserReply: (s) => `${s.antiNGFLaunchDate === 'does_not_launch' ? 'Does Not Launch' : s.antiNGFLaunchDate}`,
    getAssumptions: (s) => [
      {k:'Anti-NGF Launch', v: s.antiNGFLaunchDate === 'does_not_launch' ? 'Never' : s.antiNGFLaunchDate}
    ]
  },
  {
    id: 'stage14_q',
    who: 'ai',
    text: "How many injections per patient per year should we model?",
    controls: [
      { type: 'slider', key: 'frequencyOfInjectionsYearly', label: 'Injection frequency (per patient/year)', stops: [1.0, 1.3, 1.5, 1.7, 2.0], unit: '/yr' }
    ],
    getUserReply: (s) => `${s.frequencyOfInjectionsYearly}/year.`,
    getAssumptions: (s) => [
      {k:'Injection Frequency', v: `${s.frequencyOfInjectionsYearly}/year`}
    ]
  },
  {
    id: 'final',
    who: 'ai',
    text: "Thanks — I've captured all assumptions across the 16 model stages. Let's review them in the Model tab before running the full forecast."
  }
];'''

content = content[:start_idx] + new_chat_script + content[end_idx:]


# REPLACEMENT 2: Chat State Logic
# Replace runChat and handleDemoSubmit
old_logic_start = "const runChat = () => {"
old_logic_end = "}, [chatMessages]);"

start_idx = content.find(old_logic_start)
end_idx = content.find(old_logic_end, start_idx) + len(old_logic_end)

new_logic = '''const runChat = () => {
    setChatMessages([chatScript[0]]);
    setAssumptions([]);
    setChatStarted(true);
    setScriptStep(0); 
  };

  const advanceScript = (currentStepIdx: number) => {
    const nextIdx = currentStepIdx + 1;
    if (nextIdx < chatScript.length) {
      const nextStep = chatScript[nextIdx];
      
      // If the next step is a pre-written user text (no controls, just text), 
      // we don't automatically show it yet, we wait for user to type. 
      // Unless it's an AI message, then we show it automatically.
      if (nextStep.who === 'ai') {
        setTimeout(() => {
          setChatMessages(prev => [...prev, nextStep]);
          setScriptStep(nextIdx);
        }, 600);
      }
    }
  };

  const handleDemoSubmit = (e?: React.KeyboardEvent<HTMLInputElement>) => {
    if (e && e.key !== 'Enter') return;
    if (!demoInput.trim()) return;

    const currentInput = demoInput.trim();
    setDemoInput('');
    setChatMessages(prev => [...prev, { who: 'user', text: currentInput }]);

    const nextIdx = scriptStep + 1;
    const expectedStep = chatScript[nextIdx];
    
    if (expectedStep && expectedStep.who === 'user') {
      if (expectedStep.getAssumptions) {
        setAssumptions(prev => [...prev, ...expectedStep.getAssumptions!(state)]);
      }
      setScriptStep(nextIdx);
      advanceScript(nextIdx); // triggers next AI message
    }
  };

  const handleControlConfirm = () => {
    const currentStep = chatScript[scriptStep];
    
    if (currentStep.getAssumptions) {
      setAssumptions(prev => [...prev, ...currentStep.getAssumptions!(state)]);
    }
    
    const userReplyText = currentStep.getUserReply ? currentStep.getUserReply(state) : 'Confirmed.';
    setChatMessages(prev => [...prev, { who: 'user', text: userReplyText }]);
    
    advanceScript(scriptStep); // advances to the next AI message
  };

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [chatMessages, state]);'''

content = content[:start_idx] + new_logic + content[end_idx:]


# REPLACEMENT 3: Render .chat-thread
old_render_start = "{chatMessages.map((msg, i) => ("
old_render_end = "</div>\n                ))} " # wait, let's just find the exact block
start_idx = content.find("<div className=\"card chat-thread\" id=\"chatThread\"")
end_idx = content.find("<div className=\"card assump-list\"", start_idx)

new_render = '''<div className="card chat-thread" id="chatThread" ref={chatRef} style={{ background: '#f9fafb' }}>
                {chatMessages.map((msg, i) => {
                  const isLast = i === chatMessages.length - 1;
                  const isAiControlStep = msg.who === 'ai' && msg.controls && isLast;
                  
                  return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.who === 'user' ? 'flex-end' : 'flex-start', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: msg.who === 'user' ? 'flex-end' : 'flex-start', width: '100%' }}>
                      <div className={`bubble ${msg.who === 'ai' ? 'ai' : 'user'}`} style={{ 
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
                        
                        {isAiControlStep && (
                          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #eee', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {msg.controls.map((ctrl: any, idx: number) => {
                              if (ctrl.type === 'slider') return <SliderControl key={idx} label={ctrl.label} fieldKey={ctrl.key} stops={ctrl.stops} currentValue={state[ctrl.key as keyof ForecastState] as number} unit={ctrl.unit} onAskAI={() => openAiModal(ctrl.key)} onChange={v => handleStateChange(ctrl.key as keyof ForecastState, v)} />;
                              if (ctrl.type === 'toggle') return <ToggleControl key={idx} label={ctrl.label} fieldKey={ctrl.key} value={state[ctrl.key as keyof ForecastState] as boolean} onChange={v => handleStateChange(ctrl.key as keyof ForecastState, v)} />;
                              if (ctrl.type === 'select') return <SelectControl key={idx} label={ctrl.label} fieldKey={ctrl.key} options={ctrl.options} value={state[ctrl.key as keyof ForecastState] as string} onAskAI={() => openAiModal(ctrl.key)} onChange={v => handleStateChange(ctrl.key as keyof ForecastState, v)} />;
                              if (ctrl.type === 'dateOrNever') return <DateOrNeverControl key={idx} label={ctrl.label} fieldKey={ctrl.key} value={state[ctrl.key as keyof ForecastState] as string} onChange={v => handleStateChange(ctrl.key as keyof ForecastState, v)} />;
                              return null;
                            })}
                            <button className="btn" onClick={handleControlConfirm} style={{ alignSelf: 'flex-end', marginTop: '8px' }}>Confirm</button>
                          </div>
                        )}
                      </div>
                      {msg.who === 'user' && (
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#fef0e7', color: '#e78c52', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        </div>
                      )}
                    </div>
                  </div>
                )})}
                
                {(!chatMessages.length || (chatMessages[chatMessages.length-1].who === 'ai' && !chatMessages[chatMessages.length-1].controls && chatScript[scriptStep+1]?.who === 'user')) && (
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
                )}
              </div>
              '''

content = content[:start_idx] + new_render + content[end_idx:]

with open('app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

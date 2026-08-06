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


function AccordionSection({
  idx, title, color, isOpen, onToggle, onQuickSet, children
}: {
  idx: number; title: string; color: string;
  isOpen: boolean; onToggle: () => void;
  onQuickSet?: (level: 0 | 2 | 4) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="accordion-section">
      <button
        className={`accordion-header ${isOpen ? 'open' : ''}`}
        onClick={onToggle}
        style={{ borderLeft: `4px solid ${color}` }}
      >
        <span>{title}</span>
        <span className="accordion-chevron">{isOpen ? '▼' : '▶'}</span>
      </button>
      {isOpen && (
        <div className="accordion-body">
          {children}
        </div>
      )}
    </div>
  );
}


function SliderControl({
  label, fieldKey, stops, currentValue, unit, onAskAI,
  onChange,
  asDropdown
}: {
  asDropdown?: boolean;
  label: string;
  fieldKey: string;
  stops: number[];          // exactly 5 values
  currentValue: number;
  unit: string;
  onAskAI: () => void;
  onChange: (val: number) => void;
}) {
  const currentIdx = stops.reduce((best, s, i) =>
    Math.abs(s - currentValue) < Math.abs(stops[best] - currentValue) ? i : best, 0);

  // Gradient colors for 5 stops
  const getStopColor = (idx: number) => {
    switch (idx) {
      case 0: return '#3b82f6'; // Conservative: blue
      case 1: return '#0ea5e9'; // Semi-Con: light blue
      case 2: return '#10b981'; // Centered: green
      case 3: return '#f59e0b'; // Semi-Agg: yellow-amber
      case 4: return '#ea580c'; // Aggressive: amber-orange
      default: return '#5b6abf';
    }
  };

  const activeColor = getStopColor(currentIdx);

  if (asDropdown) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <span style={{ fontSize: '13px', color: '#374151', flex: '1 1 auto', minWidth: 0 }}>{label}</span>
        <select
          value={currentIdx}
          onChange={e => onChange(stops[parseInt(e.target.value)])}
          style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', fontSize: '13px', outline: 'none', minWidth: '180px', flexShrink: 0 }}
        >
          {['Conservative','Semi-Cons.','Centered','Semi-Agg.','Aggressive'].map((t,i) => {
            const valStr = unit === '$' ? '$' + stops[i].toLocaleString('en-US') : (stops[i] * (unit === '%' ? 100 : 1)).toLocaleString('en-US') + (unit === '$' ? '' : unit);
            return <option key={i} value={i}>{t} ({valStr})</option>;
          })}
        </select>
      </div>
    );
  }

  return (
    <div className="slider-control-row">
      <div className="slider-label-row">
        <span className="slider-label">{label}</span>
        <span className="slider-value-chip" style={{ backgroundColor: activeColor + '20', color: activeColor }}>
          {unit === '$'
            ? `$${stops[currentIdx].toLocaleString('en-US')}`
            : `${(stops[currentIdx] * (unit === '%' ? 100 : 1)).toLocaleString('en-US')}${unit === '$' ? '' : unit}`
          }
        </span>
        <button className="ask-ai-btn" onClick={onAskAI}>✨ Ask AI</button>
      </div>
      <input
        type="range"
        min={0} max={4} step={1}
        value={currentIdx}
        className="slider-input"
        onChange={e => onChange(stops[parseInt(e.target.value)])}
        style={{ background: `linear-gradient(to right, ${activeColor} ${(currentIdx / 4) * 100}%, #ffffff ${(currentIdx / 4) * 100}%, #ffffff 100%)`, color: activeColor }}
      />
      <div className="slider-ticks">
        {['Conservative','Semi-Conservative','Centered','Semi-Aggressive','Aggressive'].map((t,i) => (
          <span key={i} className={`tick-label ${i === currentIdx ? 'active' : ''}`} style={i === currentIdx ? { color: activeColor } : {}}>{t}</span>
        ))}
      </div>
    </div>
  );
}

function ToggleControl({
  label, fieldKey, value, onChange
}: {
  label: string; fieldKey: string;
  value: boolean; onChange: (val: boolean) => void;
}) {
  return (
    <div className="toggle-row">
      <span className="toggle-label">{label}</span>
      <label className="toggle-switch">
        <input
          type="checkbox"
          checked={value}
          onChange={e => onChange(e.target.checked)}
        />
        <span className="toggle-track">
          <span className="toggle-thumb" />
        </span>
      </label>
    </div>
  );
}

function SelectControl({
  label, fieldKey, options, value, onAskAI, onChange
}: {
  label: string; fieldKey: string;
  options: { value: string; label: string }[];
  value: string; onAskAI: () => void;
  onChange: (val: string) => void;
}) {
  return (
    <div className="select-control-row">
      <div className="slider-label-row">
        <span className="slider-label">{label}</span>
        <button className="ask-ai-btn" onClick={onAskAI}>✨ Ask AI</button>
      </div>
      <div className="segmented-control">
        {options.map(opt => (
          <button
            key={opt.value}
            className={`segment-btn ${value === opt.value ? 'active' : ''}`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function DateOrNeverControl({
  label, fieldKey, value, onChange
}: {
  label: string; fieldKey: string;
  value: string; onChange: (val: string) => void;
}) {
  const isNever = value === 'does_not_launch';
  return (
    <div className="date-or-never-row">
      <span className="slider-label">{label}</span>
      <div className="date-never-controls">
        <label className="never-checkbox-label">
          <input
            type="checkbox"
            checked={isNever}
            onChange={e => onChange(e.target.checked ? 'does_not_launch' : new Date().getFullYear() + '-01')}
          />
          Does Not Launch
        </label>
        <input
          type="month"
          value={isNever ? '' : value}
          disabled={isNever}
          className={`month-input ${isNever ? 'disabled' : ''}`}
          onChange={e => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}


function ModelArchitecturePanel({ state }: { state: ForecastState }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const LAUNCH_YEAR = 2025;
  const year = 2029; // Show peak year (Year 5)
  const t = 4;
  
  // STAGE 1
  const patientUniverse = state.prevalence;
  
  // STAGE 2
  const diagnosed = patientUniverse * state.diagnosisRate * Math.pow(1 + state.diagnosisAnnualGrowthRate, year - 2016);
  
  // STAGE 3
  const iasTreated = diagnosed * state.iasTreatedPctOfDiagnosed * Math.pow(1 + state.iasTreatedGrowthRate, t);
  const promoLift = state.initialAdditionalMarketGrowth * Math.pow(1 - state.annualDecayRateOfAdditionalGrowth, t);
  const treatedWithPromo = iasTreated * (1 + promoLift);
  
  // STAGE 5
  const peakShare = state.peakShare;
  
  // STAGE 6
  const papMultiplier = state.patientAssistanceProgramInPlace ? state.pricingAdjPatientAssistanceImpact : 1.0;
  const accessAdjustedPeakShare = peakShare * state.pricingAdjFactorAccessImpact * papMultiplier;
  
  // STAGE 7
  const reachFactor = (0.70 * state.pctORSReachedByYear3Plus) + (0.30 * state.pctPCPReachedByYear3Plus);
  const rawX = Math.min((t + 1) / state.yearsToPeak, 1.0);
  const uptakeCurve = rawX * rawX * (3 - 2 * rawX);
  let monthlyShare = accessAdjustedPeakShare * uptakeCurve * reachFactor;
  
  // STAGE 8 & 9
  if (t < state.jCodeWindowMonths / 12) monthlyShare *= state.jCodeRetentionRate;
  if (t <= state.refrigerationDurationMonths / 12) monthlyShare *= state.refrigerationRetentionORS;
  
  // STAGE 11-13
  if (state.cingalLaunchDate !== 'does_not_launch' && year >= parseInt(state.cingalLaunchDate.split('-')[0])) monthlyShare *= state.cingalRetentionOrtho;
  if (state.ampionLaunchDate !== 'does_not_launch' && year >= parseInt(state.ampionLaunchDate.split('-')[0])) monthlyShare *= state.ampionRetentionOrtho;
  if (state.antiNGFLaunchDate !== 'does_not_launch' && year >= parseInt(state.antiNGFLaunchDate.split('-')[0])) monthlyShare *= state.antiNGFRetentionOrtho;
  
  // STAGE 14-16
  const patientsOnTherapy = treatedWithPromo * monthlyShare;
  const rev = patientsOnTherapy * state.frequencyOfInjectionsYearly * state.wacPrice;

  const getStyle = (colorStr: string) => ({ background: colorStr + '15', borderLeft: `4px solid ${colorStr}`, padding: '16px', borderRadius: '4px', marginBottom: '16px' });
  
  const stages = [
    {
      name: "Stage 1 — Patient Universe",
      formula: "Universe = Base Prevalence",
      inputs: `Base: ${fmtNum(state.prevalence)}`,
      output: fmtNum(patientUniverse),
      color: "#00b2a9" // teal
    },
    {
      name: "Stage 2 — Diagnosis",
      formula: "Diagnosed = Universe × BaseRate × (1 + CAGR)^(Year - 2016)",
      inputs: `Rate: ${fmtPct(state.diagnosisRate * 100)}, CAGR: ${fmtPct(state.diagnosisAnnualGrowthRate * 100)}`,
      output: fmtNum(diagnosed),
      color: "#1a9e75" // green
    },
    {
      name: "Stage 3 — Treatment Split",
      formula: "Treated = Diagnosed × IASTreated% × (1 + PromoLift)",
      inputs: `IAS Rate: ${fmtPct(state.iasTreatedPctOfDiagnosed * 100)}, Lift: ${fmtPct(promoLift * 100)}`,
      output: fmtNum(treatedWithPromo),
      color: "#e07b2a" // orange
    },
    {
      name: "Stage 5 — Peak Share Preference",
      formula: "PeakShare = Base Preference × OverstatementAdj",
      inputs: `Stated: ${fmtPct(state.peakShare * 100)}`,
      output: fmtPct(peakShare * 100),
      color: "#e07b2a" // orange
    },
    {
      name: "Stage 6 — Payer Access Adjustment",
      formula: "AccessAdjShare = PeakShare × AccessRetention × PatAssistUplift",
      inputs: `Retention: ${fmtPct(state.pricingAdjFactorAccessImpact * 100)}, PAP: ${state.patientAssistanceProgramInPlace ? 'Yes' : 'No'}`,
      output: fmtPct(accessAdjustedPeakShare * 100),
      color: "#F25621" // salmon/pink
    },
    {
      name: "Stage 7 — Time to Peak & Reach",
      formula: "MonthlyShare = AccessAdjShare × UptakeCurve × ReachFactor",
      inputs: `Years to Peak: ${state.yearsToPeak}, Reach: ${fmtPct(reachFactor * 100)}`,
      output: fmtPct((accessAdjustedPeakShare * uptakeCurve * reachFactor) * 100),
      color: "#F25621" // salmon/pink
    },
    {
      name: "Stage 8-13 — Access & Competitive Friction",
      formula: "Share = MonthlyShare × JCodeRet × RefrigRet × CompRet",
      inputs: `J-Code: ${fmtPct(state.jCodeRetentionRate * 100)}, Refrig: ${fmtPct(state.refrigerationRetentionORS * 100)}`,
      output: fmtPct(monthlyShare * 100),
      color: "#F25621" // salmon/pink
    },
    {
      name: "Stage 14-16 — Volume & Revenue Output",
      formula: "Revenue = Treated × Share × Injections/Yr × WAC",
      inputs: `Freq: ${state.frequencyOfInjectionsYearly}, WAC: $${state.wacPrice.toLocaleString()}`,
      output: `$${fmtM(rev)}M`,
      color: "#8b5cf6" // purple
    }
  ];

  return (
    <div style={{ marginTop: '32px', borderTop: '1px solid #e5e7eb', paddingTop: '24px' }}>
      <button className="btn secondary" onClick={() => setIsOpen(!isOpen)} style={{ width: '100%', justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}>
        <span>{isOpen ? '▼' : '▶'} Show Model Architecture</span>
      </button>
      
      {isOpen && (
        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: '16px' }}>Showing calculation pipeline for Peak Year (Year 5).</p>
          {stages.map((stg, i) => (
            <div key={i} style={getStyle(stg.color)}>
              <h4 style={{ margin: '0 0 8px 0', color: stg.color, fontSize: '14px' }}>{stg.name}</h4>
              <div style={{ fontSize: '13px', fontFamily: 'monospace', color: 'var(--navy)', marginBottom: '8px' }}>{stg.formula}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Inputs: {stg.inputs}</span>
                <strong style={{ color: 'var(--navy)' }}>Output: {stg.output}</strong>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
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
  const [viewFileModal, setViewFileModal] = useState<{filename: string, content: string[][]} | null>(null);

  const handleViewFile = async (filename: string) => {
    try {
      const res = await fetch(`/${filename}`);
      if (res.ok) {
        const text = await res.text();
        const rows = text.split('\n').map(line => line.split(','));
        setViewFileModal({ filename, content: rows });
      } else {
        setViewFileModal({ filename, content: [['Error loading file']] });
      }
    } catch(e) {
      setViewFileModal({ filename, content: [['Error loading file']] });
    }
  };
  const [aiInputValue, setAiInputValue] = useState('');

  type ChatControl = 
  | { type: 'slider', key: keyof ForecastState, label: string, stops: number[], unit: string }
  | { type: 'toggle', key: keyof ForecastState, label: string }
  | { type: 'select', key: keyof ForecastState, label: string, options: {value:string, label:string}[] }
  | { type: 'dateOrNever', key: keyof ForecastState, label: string };

type ChatStepDef = {
  id: string;
  who: 'ai' | 'user';
  text: string;
  controls?: ChatControl[];
  dataSnippet?: { headers: string[], rows: string[][] };
  hasUpload?: boolean;
  viewFile?: string;
  getAssumptions?: (s: ForecastState) => {k:string, v:string}[];
  getUserReply?: (s: ForecastState) => string;
};

const formatStop = (v: number, unit: string) => unit === '$' ? `$${v.toLocaleString()}` : `${(v * (unit === '%' ? 100 : 1)).toLocaleString()}${unit === '$' ? '' : unit}`;

const chatScript: ChatStepDef[] = [
  {
    id: 'stage0_q1',
    who: 'ai',
    text: "Before I pull any data, let's align on scope. Which product are we forecasting?"
  },
  {
    id: 'stage0_a1',
    who: 'user',
    text: "Zilretta — triamcinolone acetonide extended-release for osteoarthritis knee pain.",
    getAssumptions: () => [{k:'Product', v:'Zilretta (triamcinolone acetonide ER)'}]
  },
  {
    id: 'stage0_q2',
    who: 'ai',
    text: "Got it. Should this cover Knee only, or do you want Hip/Shoulder layered in as well?"
  },
  {
    id: 'stage0_a2',
    who: 'user',
    text: "Knee only for now.",
    getAssumptions: () => [{k:'Indication', v:'OA Knee only'}]
  },
  {
    id: 'stage0_q3',
    who: 'ai',
    text: "And geography — US only, or do you also need an ex-US view?"
  },
  {
    id: 'stage0_a3',
    who: 'user',
    text: "US only.",
    getAssumptions: () => [{k:'Geography', v:'US only'}]
  },
  {
    id: 'stage0_q4',
    who: 'ai',
    text: "What forecast horizon should we build to — typically teams run from launch year through 5–7 years post-launch?"
  },
  {
    id: 'stage0_a4',
    who: 'user',
    text: "Launch through Year 7.",
    getAssumptions: () => [{k:'Forecast Horizon', v:'7 years post-launch'}]
  },
  {
    id: 'stage0_q5',
    who: 'ai',
    text: "1A. When does the product gain approval — which also sets the start of promotion?",
    controls: [
      { type: 'dateOrNever', key: 'launchDate', label: 'Product Approval / Promotion Start Date' }
    ],
    getUserReply: (s) => s.launchDate === 'does_not_launch' ? 'TBD' : s.launchDate,
    getAssumptions: (s) => [{k:'Launch Date (1A)', v: s.launchDate === 'does_not_launch' ? 'TBD' : s.launchDate}]
  },
  {
    id: 'stage0_q6',
    who: 'ai',
    text: "1B. And does availability start that same month, or later?",
    controls: [
      { type: 'dateOrNever', key: 'availabilityDate', label: 'Product Availability Start Date' }
    ],
    getUserReply: (s) => s.availabilityDate === 'does_not_launch' ? 'TBD' : `Same month — ${s.availabilityDate}`,
    getAssumptions: (s) => [{k:'Availability Date (1B)', v: s.availabilityDate === 'does_not_launch' ? 'TBD' : s.availabilityDate}]
  },
  {
    id: 'stage0_summary',
    who: 'ai',
    text: "Perfect — Zilretta, OA Knee, US, 7-year post-launch horizon, launch date December 2017. That date anchors the J-code transition window and everything downstream. Let's move into building the patient funnel, starting with the population base."
  },
  {
    id: 'stage1_q1',
    who: 'ai',
    text: "For the patient universe, our base input is US Census population projections by age bracket — 0-24, 25-44, 45-64, 65+ — running 2014 through 2027 and interpolated monthly. That's the default we hold this at unless told otherwise.",
    dataSnippet: {
      headers: ['AGE BUCKET', '2014', '2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026', '2027'],
      rows: [
        ['0–24 yrs', '105,038,867', '104,849,632', '104,649,904', '104,527,711', '104,515,765', '104,560,451', '104,683,424', '104,891,881', '105,124,160', '105,360,138', '105,592,075', '105,751,263', '105,968,336', '106,279,887'],
        ['25–44 yrs', '83,977,415', '84,656,925', '85,442,042', '86,419,998', '87,495,098', '88,596,533', '89,517,706', '90,489,007', '91,332,345', '92,140,654', '92,878,502', '93,429,132', '94,003,461', '94,432,778'],
        ['45–64 yrs', '83,476,514', '84,032,062', '84,483,199', '84,623,030', '84,479,136', '84,170,088', '83,861,301', '83,435,982', '83,020,199', '82,639,565', '82,355,850', '82,234,965', '82,105,687', '82,113,212'],
        ['65+ yrs', '46,255,221', '47,830,245', '49,420,383', '51,055,052', '52,766,466', '54,556,914', '56,441,027', '58,292,098', '60,221,375', '62,126,945', '63,987,872', '65,919,552', '67,748,101', '69,455,598'],
        ['All ages', '318,748,017', '321,368,864', '323,995,528', '326,625,791', '329,256,465', '331,883,986', '334,503,458', '337,108,968', '339,698,079', '342,267,302', '344,814,299', '347,334,912', '349,825,585', '352,281,475']
      ]
    }
  },
  {
    id: 'stage1_q2',
    who: 'ai',
    text: "Do you have a more recent Census projection release, or an updated population estimate for OA Knee, that you'd like me to upload and use instead?",
    hasUpload: true
  },
  {
    id: 'stage1_a1',
    who: 'user',
    text: "The existing Census projections are fine for now.",
    getAssumptions: () => [{k:'Base Population Data', v:'2014 US Census projections (Default)'}]
  },
  {
    id: 'stage1_summary',
    who: 'ai',
    text: "Good — locking in the Census projections as the base input. I'll apply the diagnosis rate next to size the diagnosed population."
  },
  {
    id: 'stage2_q1',
    who: 'ai',
    text: "Before we set a diagnosis rate, let's validate the underlying data. Here's the 2016 IMS PharMetrics count of insured OA Knee diagnosed patients by age bracket, plus our uninsured estimate.",
    dataSnippet: {
      headers: ['IMS 2016 Data', 'OAK patients insured', 'OAK patients w/o insured'],
      rows: [
        ['0-24 years', '1,925,340', '2,133,967'],
        ['25-44 years', '2,570,888', '2,849,466'],
        ['45-64 years', '6,368,404', '7,058,476'],
        ['65+ years', '4,661,570', '5,166,692'],
        ['All ages', '15,526,202', '17,208,601']
      ]
    }
  },
  {
    id: 'stage2_q2',
    who: 'ai',
    text: "The Conservative—Aggressive range comes directly from this: Conservative assumes 0% of uninsured patients are diagnosed. Aggressive assumes uninsured patients are diagnosed at the same rate as insured ones."
  },
  {
    id: 'stage2_q3',
    who: 'ai',
    text: "Do you have a newer insured/uninsured IMS cut you'd like me to use to refresh that range?",
    hasUpload: true
  },
  {
    id: 'stage2_a1',
    who: 'user',
    text: "Not right now — use what's on file.",
    getAssumptions: () => [{k:'Diagnosis Data Source', v:'2016 IMS PharMetrics (Default)'}]
  },
  {
    id: 'stage2_q4',
    who: 'ai',
    text: "2A. Given that range, where should we set the base diagnosis rate — Conservative, Centered, or Aggressive?",
    controls: [
      { type: 'slider', key: 'diagnosisRate', label: 'Diagnosis rate (base year)', stops: [0.048, 0.049, 0.051, 0.052, 0.053], unit: '%' }
    ],
    getUserReply: (s) => `${(s.diagnosisRate*100).toFixed(1)}% base diagnosis rate.`,
    getAssumptions: (s) => [
      {k:'Diagnosis Rate (2016 base)', v: `${(s.diagnosisRate*100).toFixed(1)}%`}
    ]
  },
  {
    id: 'stage2_q5',
    who: 'ai',
    text: "2B. And how fast should diagnosis rates climb each year as campaign awareness broadens?",
    controls: [
      { type: 'slider', key: 'diagnosisAnnualGrowthRate', label: 'Diagnosis annual growth rate', stops: [0.019, 0.025, 0.032, 0.045, 0.055], unit: '%' }
    ],
    getUserReply: (s) => `${(s.diagnosisAnnualGrowthRate*100).toFixed(1)}% annual growth.`,
    getAssumptions: (s) => [
      {k:'Diagnosis Annual Growth', v: `${(s.diagnosisAnnualGrowthRate*100).toFixed(1)}%`}
    ]
  },
  {
    id: 'stage3_q1',
    who: 'ai',
    text: "These seven inputs are set from our existing primary market research. Is any new market research available I should factor in — you can upload an Excel and I'll refresh the ranges?",
    hasUpload: true,
    viewFile: '3rd_excel.csv'
  },
  {
    id: 'stage3_a1',
    who: 'user',
    text: "No, use the existing research.",
    getAssumptions: () => [{k:'Market Research Source', v:'Existing primary market research (Default)'}]
  },
  {
    id: 'stage3_q4A',
    who: 'ai',
    text: "4A: What % of diagnosed patients get an IAS injection in the base year?",
    controls: [
      { type: 'slider', key: 'iasTreatedPctOfDiagnosed', label: 'IAS treated % of diagnosed (base yr)', stops: [0.244, 0.264, 0.284, 0.304, 0.324], unit: '%' }
    ],
    getUserReply: (s) => `${(s.iasTreatedPctOfDiagnosed*100).toFixed(1)}% treated.`,
    getAssumptions: (s) => [{k:'IAS Treated % of Diagnosed', v:`${(s.iasTreatedPctOfDiagnosed*100).toFixed(1)}%`}]
  },
  {
    id: 'stage3_q4B',
    who: 'ai',
    text: "4B: How fast should IAS treatment rates grow?",
    controls: [
      { type: 'slider', key: 'iasTreatedGrowthRate', label: 'IAS treated annual growth rate', stops: [0.01, 0.02, 0.03, 0.035, 0.04], unit: '%' }
    ],
    getUserReply: (s) => `${(s.iasTreatedGrowthRate*100).toFixed(1)}% annual growth.`,
    getAssumptions: (s) => [{k:'IAS Growth Rate', v:`${(s.iasTreatedGrowthRate*100).toFixed(1)}%`}]
  },
  {
    id: 'stage3_q4C',
    who: 'ai',
    text: "4C: What ratio of HA use to IAS use should we build in?",
    controls: [
      { type: 'slider', key: 'haRatioToIAS', label: 'HA-to-IAS ratio', stops: [0.30, 0.40, 0.45, 0.50, 0.55], unit: '%' }
    ],
    getUserReply: (s) => `${(s.haRatioToIAS*100).toFixed(0)}% HA-to-IAS ratio.`,
    getAssumptions: (s) => [{k:'HA-to-IAS Ratio', v:`${(s.haRatioToIAS*100).toFixed(0)}%`}]
  },
  {
    id: 'stage3_q4D',
    who: 'ai',
    text: "4D: Is HA share shrinking or holding flat relative to IAS over time?",
    controls: [
      { type: 'slider', key: 'haRatioGrowthRate', label: 'HA share growth relative to IAS', stops: [-0.02, -0.01, 0, 0.01, 0.02], unit: '%' }
    ],
    getUserReply: (s) => `${(s.haRatioGrowthRate*100).toFixed(1)}% HA share growth.`,
    getAssumptions: (s) => [{k:'HA Share Growth Rate', v:`${(s.haRatioGrowthRate*100).toFixed(1)}%`}]
  },
  {
    id: 'stage3_q4E',
    who: 'ai',
    text: "4E: What share of treated patients use both HA and IAS?",
    controls: [
      { type: 'slider', key: 'iasAndHATreatedBoth', label: 'Share using both HA and IAS', stops: [0.05, 0.10, 0.15, 0.20, 0.25], unit: '%' }
    ],
    getUserReply: (s) => `${(s.iasAndHATreatedBoth*100).toFixed(1)}% using both.`,
    getAssumptions: (s) => [{k:'Share using both HA & IAS', v:`${(s.iasAndHATreatedBoth*100).toFixed(1)}%`}]
  },
  {
    id: 'stage3_q4F',
    who: 'ai',
    text: "4F: How much market growth should we credit to added promotional spend at launch?",
    controls: [
      { type: 'slider', key: 'initialAdditionalMarketGrowth', label: 'Promo market growth at launch', stops: [0, 0.01, 0.02, 0.03, 0.05], unit: '%' }
    ],
    getUserReply: (s) => `${(s.initialAdditionalMarketGrowth*100).toFixed(1)}% initial promo lift.`,
    getAssumptions: (s) => [{k:'Initial Promo Market Growth', v:`${(s.initialAdditionalMarketGrowth*100).toFixed(1)}%`}]
  },
  {
    id: 'stage3_q4G',
    who: 'ai',
    text: "4G: How quickly does that promotional lift fade each year?",
    controls: [
      { type: 'slider', key: 'annualDecayRateOfAdditionalGrowth', label: 'Annual promo lift decay', stops: [-0.30, -0.25, -0.20, -0.15, -0.10], unit: '%' }
    ],
    getUserReply: (s) => `${(s.annualDecayRateOfAdditionalGrowth*100).toFixed(1)}% decay rate.`,
    getAssumptions: (s) => [{k:'Promo Lift Decay Rate', v:`${(s.annualDecayRateOfAdditionalGrowth*100).toFixed(1)}%`}]
  },
  {
    id: 'stage4_q1',
    who: 'ai',
    text: "Here's the current Rx-based physician split — IAS/HA/Both share by Ortho Surgeon, Rheumatologist, and PCP/Other, from claims analysis.",
    dataSnippet: {
      headers: ['Physician Type', 'IAS Share', 'HA Share', 'Both Share'],
      rows: [
        ['Ortho Surgeon', '55%', '60%', '50%'],
        ['Rheumatologist', '20%', '15%', '25%'],
        ['PCP / Other', '25%', '25%', '25%']
      ]
    }
  },
  {
    id: 'stage4_q2',
    who: 'ai',
    text: "This step itself is a fixed calculation, but the split can shift year to year — do you have a more recent Rx cut you'd like me to upload and apply instead?",
    hasUpload: true
  },
  {
    id: 'stage4_a1',
    who: 'user',
    text: "The current split is fine.",
    getAssumptions: () => [{k:'Physician Type Split Source', v:'Current Rx Claims Analysis (Default)'}]
  },
  {
    id: 'stage4_summary',
    who: 'ai',
    text: "Good — applying the existing physician split. Next, let's talk product profile and physician preference."
  },
  {
    id: 'stage5_q1',
    who: 'ai',
    text: "Stated preference typically overstates real adoption — how much should we discount it?",
    controls: [
      { type: 'slider', key: 'overstatementAdjFactor', label: 'Overstatement discount', stops: [0.30, 0.40, 0.50, 0.60, 0.70], unit: '%' }
    ],
    getUserReply: (s) => `${(s.overstatementAdjFactor*100).toFixed(0)}% discount.`,
    getAssumptions: (s) => [{k:'Overstatement Discount', v:`${(s.overstatementAdjFactor*100).toFixed(0)}%`}]
  },
  {
    id: 'stage5_q2',
    who: 'ai',
    text: "Do we have WOMAC pain-score data to support the clinical value story?",
    controls: [
      { type: 'toggle', key: 'womacScoreAvailable', label: 'WOMAC score data available' }
    ],
    getUserReply: (s) => s.womacScoreAvailable ? 'Yes' : 'No',
    getAssumptions: (s) => [{k:'WOMAC Data', v: s.womacScoreAvailable ? 'Yes' : 'No'}]
  },
  {
    id: 'stage5_q3',
    who: 'ai',
    text: "Do we have diabetes/blood-sugar safety data to differentiate on?",
    controls: [
      { type: 'toggle', key: 'diabetesGlycemicDataAvailable', label: 'Diabetes data available' }
    ],
    getUserReply: (s) => s.diabetesGlycemicDataAvailable ? 'Yes' : 'No',
    getAssumptions: (s) => [{k:'Diabetes Data', v: s.diabetesGlycemicDataAvailable ? 'Yes' : 'No'}]
  },
  {
    id: 'stage5_q4',
    who: 'ai',
    text: "What list price should we model?",
    controls: [
      { type: 'slider', key: 'wacPrice', label: 'WAC Price', stops: [400, 500, 570, 600, 700], unit: '$' }
    ],
    getUserReply: (s) => `$${s.wacPrice.toLocaleString()}`,
    getAssumptions: (s) => [{k:'WAC Price', v:`$${s.wacPrice.toLocaleString()}`}]
  },
  {
    id: 'stage5_q5',
    who: 'ai',
    text: "If newer peak-share market research is available — in the same format as our Knee Preference Share lookup — upload it and I'll refresh the matrix.",
    hasUpload: true
  },
  {
    id: 'stage5_a1',
    who: 'user',
    text: "Use the existing research.",
    getAssumptions: () => [{k:'Preference Share Matrix', v:'Existing Primary Market Research'}]
  },
  {
    id: 'stage5_q6',
    who: 'ai',
    text: "How should the newest market research shift Ortho Surgeon preference?",
    controls: [
      { type: 'slider', key: 'newMarketResearchAdjOrtho', label: 'Ortho Surgeon Preference Shift', stops: [-0.05, 0, 0.05, 0.1, 0.15], unit: '%' }
    ],
    getUserReply: (s) => `${(s.newMarketResearchAdjOrtho > 0 ? '+' : '')}${(s.newMarketResearchAdjOrtho*100).toFixed(1)}% shift.`,
    getAssumptions: (s) => [{k:'Ortho Preference Shift', v:`${(s.newMarketResearchAdjOrtho > 0 ? '+' : '')}${(s.newMarketResearchAdjOrtho*100).toFixed(1)}%`}]
  },
  {
    id: 'stage5_q7',
    who: 'ai',
    text: "Same question for Rheumatologists and PCPs — shift up or down?",
    controls: [
      { type: 'slider', key: 'newMarketResearchAdjRheum', label: 'Rheum/PCP Preference Shift', stops: [-0.05, 0, 0.05, 0.1, 0.15], unit: '%' }
    ],
    getUserReply: (s) => `${(s.newMarketResearchAdjRheum > 0 ? '+' : '')}${(s.newMarketResearchAdjRheum*100).toFixed(1)}% shift.`,
    getAssumptions: (s) => [{k:'Rheum/PCP Preference Shift', v:`${(s.newMarketResearchAdjRheum > 0 ? '+' : '')}${(s.newMarketResearchAdjRheum*100).toFixed(1)}%`}]
  },
  {
    id: 'stage6_q1',
    who: 'ai',
    text: "What access hurdle applies — none, prior auth only, or prior auth plus step edit?",
    controls: [
      { type: 'select', key: 'payerAccessRequirement', label: 'Payer access requirement', options: [{value: 'none', label: 'None'}, {value: 'prior_auth_only', label: 'Prior Auth'}, {value: 'pre_cert', label: 'Pre-Cert'}, {value: 'pre_cert_step_edit', label: 'Pre-Cert + Step Edit'}, {value: 'prior_auth_plus_step_edit', label: 'PA + Step Edit'}] }
    ],
    getUserReply: (s) => `${s.payerAccessRequirement.replace(/_/g, ' ')}.`,
    getAssumptions: (s) => [{k:'Payer Access Requirement', v: s.payerAccessRequirement}]
  },
  {
    id: 'stage6_q2',
    who: 'ai',
    text: "How much share survives that access hurdle?",
    controls: [
      { type: 'slider', key: 'pricingAdjFactorAccessImpact', label: 'Access survival rate', stops: [0.90, 0.92, 0.95, 0.97, 1.00], unit: '%' }
    ],
    getUserReply: (s) => `${(s.pricingAdjFactorAccessImpact*100).toFixed(0)}% survive.`,
    getAssumptions: (s) => [{k:'Access Survival Rate', v: `${(s.pricingAdjFactorAccessImpact*100).toFixed(0)}%`}]
  },
  {
    id: 'stage6_q3',
    who: 'ai',
    text: "Is a patient assistance / copay program in place to offset access friction?",
    controls: [
      { type: 'toggle', key: 'patientAssistanceProgramInPlace', label: 'Patient assistance program in place' }
    ],
    getUserReply: (s) => s.patientAssistanceProgramInPlace ? 'Yes' : 'No',
    getAssumptions: (s) => [{k:'Patient Assistance Program', v: s.patientAssistanceProgramInPlace ? 'Yes' : 'No'}]
  },
  {
    id: 'stage6_q4',
    who: 'ai',
    text: "How much lift does that assistance program add back, if any?",
    controls: [
      { type: 'slider', key: 'pricingAdjPatientAssistanceImpact', label: 'Patient assistance lift', stops: [0, 0.05, 0.10, 0.15, 0.20], unit: '%' }
    ],
    getUserReply: (s) => `+${(s.pricingAdjPatientAssistanceImpact*100).toFixed(0)}% lift.`,
    getAssumptions: (s) => [{k:'Patient Assistance Lift', v: `+${(s.pricingAdjPatientAssistanceImpact*100).toFixed(0)}%`}]
  },
  {
    id: 'stage7_q1',
    who: 'ai',
    text: "How many years until the product hits peak share?",
    controls: [
      { type: 'slider', key: 'yearsToPeak', label: 'Years to peak share', stops: [3, 4, 5, 6, 7], unit: ' yrs' }
    ],
    getUserReply: (s) => `${s.yearsToPeak} years.`,
    getAssumptions: (s) => [{k:'Years to Peak', v: `${s.yearsToPeak} years`}]
  },
  {
    id: 'stage7_q2',
    who: 'ai',
    text: "Per the launch plan, what % of Ortho/Rheum are reached by month 12, within 2 yrs, within 3+?",
    controls: [
      { type: 'slider', key: 'pctORSReachedByMonth12', label: 'Ortho/Rheum reached by month 12', stops: [0.60, 0.65, 0.70, 0.75, 0.80], unit: '%' },
      { type: 'slider', key: 'pctORSReachedByYear2', label: 'Ortho/Rheum reached by year 2', stops: [0.70, 0.75, 0.80, 0.85, 0.90], unit: '%' },
      { type: 'slider', key: 'pctORSReachedByYear3Plus', label: 'Ortho/Rheum reached by year 3+', stops: [0.75, 0.80, 0.85, 0.90, 0.95], unit: '%' }
    ],
    getUserReply: (s) => `Month 12: ${(s.pctORSReachedByMonth12*100).toFixed(0)}%, Year 2: ${(s.pctORSReachedByYear2*100).toFixed(0)}%, Year 3+: ${(s.pctORSReachedByYear3Plus*100).toFixed(0)}%.`,
    getAssumptions: (s) => [{k:'Ortho/Rheum Reach', v: `${(s.pctORSReachedByMonth12*100).toFixed(0)}% / ${(s.pctORSReachedByYear2*100).toFixed(0)}% / ${(s.pctORSReachedByYear3Plus*100).toFixed(0)}%`}]
  },
  {
    id: 'stage7_q3',
    who: 'ai',
    text: "Same reach question for PCP/Other prescribers.",
    controls: [
      { type: 'slider', key: 'pctPCPReachedByMonth12', label: 'PCP reached by month 12', stops: [0.30, 0.40, 0.50, 0.60, 0.70], unit: '%' },
      { type: 'slider', key: 'pctPCPReachedByYear2', label: 'PCP reached by year 2', stops: [0.50, 0.60, 0.70, 0.80, 0.90], unit: '%' },
      { type: 'slider', key: 'pctPCPReachedByYear3Plus', label: 'PCP reached by year 3+', stops: [0.60, 0.70, 0.80, 0.90, 1.00], unit: '%' }
    ],
    getUserReply: (s) => `Month 12: ${(s.pctPCPReachedByMonth12*100).toFixed(0)}%, Year 2: ${(s.pctPCPReachedByYear2*100).toFixed(0)}%, Year 3+: ${(s.pctPCPReachedByYear3Plus*100).toFixed(0)}%.`,
    getAssumptions: (s) => [{k:'PCP Reach', v: `${(s.pctPCPReachedByMonth12*100).toFixed(0)}% / ${(s.pctPCPReachedByYear2*100).toFixed(0)}% / ${(s.pctPCPReachedByYear3Plus*100).toFixed(0)}%`}]
  },
  {
    id: 'stage8_q1',
    who: 'ai',
    text: "This is auto-derived from your launch date — no separate input needed."
  },
  {
    id: 'stage8_a1',
    who: 'user',
    text: "Okay, understood."
  },
  {
    id: 'stage8_q2',
    who: 'ai',
    text: "What % of share is retained while billing under the temporary J-code?",
    controls: [
      { type: 'slider', key: 'jCodeRetentionRate', label: 'J-Code retention rate', stops: [0.60, 0.70, 0.80, 0.90, 1.00], unit: '%' }
    ],
    getUserReply: (s) => `${(s.jCodeRetentionRate*100).toFixed(0)}% retention.`,
    getAssumptions: (s) => [{k:'J-Code Retention', v: `${(s.jCodeRetentionRate*100).toFixed(0)}%`}]
  },
  {
    id: 'stage9_q1',
    who: 'ai',
    text: "How long does the cold-chain requirement remain an operational friction?",
    controls: [
      { type: 'slider', key: 'refrigerationDurationMonths', label: 'Refrigeration friction duration', stops: [6, 12, 18, 24, 36], unit: ' mo' }
    ],
    getUserReply: (s) => `${s.refrigerationDurationMonths} months.`,
    getAssumptions: (s) => [{k:'Refrigeration Duration', v: `${s.refrigerationDurationMonths} months`}]
  },
  {
    id: 'stage9_q2',
    who: 'ai',
    text: "What % of Ortho share survives the refrigeration friction?",
    controls: [
      { type: 'slider', key: 'refrigerationRetentionORS', label: 'Ortho/Surgical retention', stops: [0.70, 0.80, 0.90, 0.95, 1.00], unit: '%' }
    ],
    getUserReply: (s) => `${(s.refrigerationRetentionORS*100).toFixed(0)}% survive.`,
    getAssumptions: (s) => [{k:'Ortho Refrigeration Retention', v: `${(s.refrigerationRetentionORS*100).toFixed(0)}%`}]
  },
  {
    id: 'stage9_q3',
    who: 'ai',
    text: "Same question for Rheum/Other channels.",
    controls: [
      { type: 'slider', key: 'refrigerationRetentionRheumOther', label: 'Rheum/Other retention', stops: [0.60, 0.70, 0.80, 0.90, 1.00], unit: '%' }
    ],
    getUserReply: (s) => `${(s.refrigerationRetentionRheumOther*100).toFixed(0)}% survive.`,
    getAssumptions: (s) => [{k:'Rheum/Other Refrigeration Retention', v: `${(s.refrigerationRetentionRheumOther*100).toFixed(0)}%`}]
  },
  {
    id: 'stage11_q0',
    who: 'ai',
    text: "Before we model specific competitive launches, what market events or competitor launches should we factor into the share curve?"
  },
  {
    id: 'stage11_summary1',
    who: 'ai',
    text: "Based on primary research and competitive intelligence, we'd typically flag three: Cingal (HA+steroid combo), Ampion (biologic), and the anti-NGF class (e.g., tanezumab-type agents)."
  },
  {
    id: 'stage11_summary2',
    who: 'ai',
    text: "Are there any other market events you'd like considered — a new generic entrant, a guideline change, another pipeline asset? We can model up to three additional competitors alongside these."
  },
  {
    id: 'stage11_a0',
    who: 'user',
    text: "Those three cover it for now."
  },
  {
    id: 'stage11_summary3',
    who: 'ai',
    text: "Good — I'll model Cingal, Ampion, and the anti-NGF class. Starting with Cingal..."
  },
  {
    id: 'stage11_q1a',
    who: 'ai',
    text: "When — if ever — does Cingal launch?",
    controls: [
      { type: 'dateOrNever', key: 'cingalLaunchDate', label: 'Cingal Launch Date' }
    ],
    getUserReply: (s) => `${s.cingalLaunchDate === 'does_not_launch' ? 'Does Not Launch' : s.cingalLaunchDate}`,
    getAssumptions: (s) => [
      {k:'Cingal Launch', v: s.cingalLaunchDate === 'does_not_launch' ? 'Never' : s.cingalLaunchDate}
    ]
  },
  {
    id: 'stage11_q1b',
    who: 'ai',
    text: "Once Cingal launches, what % of Ortho/Rheum share do we retain?",
    controls: [
      { type: 'slider', key: 'cingalRetentionOrtho', label: 'Retention Ortho', stops: [0.70, 0.72, 0.74, 0.78, 0.90], unit: '%' }
    ],
    getUserReply: (s) => `${(s.cingalRetentionOrtho*100).toFixed(0)}% retention.`,
    getAssumptions: (s) => [
      {k:'Cingal Retention ORS', v: `${(s.cingalRetentionOrtho*100).toFixed(0)}%`}
    ]
  },
  {
    id: 'stage11_q1c',
    who: 'ai',
    text: "Same question for PCP/Other channels.",
    controls: [
      { type: 'slider', key: 'cingalRetentionPCP', label: 'Retention PCP', stops: [0.80, 0.82, 0.85, 0.90, 1.00], unit: '%' }
    ],
    getUserReply: (s) => `${(s.cingalRetentionPCP*100).toFixed(0)}% retention.`,
    getAssumptions: (s) => [
      {k:'Cingal Retention PCP', v: `${(s.cingalRetentionPCP*100).toFixed(0)}%`}
    ]
  },
  {
    id: 'stage11_q2',
    who: 'ai',
    text: "Next, Ampion (biologic) — base case is typically Does Not Launch.",
    controls: [
      { type: 'dateOrNever', key: 'ampionLaunchDate', label: 'Ampion Launch Date' },
      { type: 'slider', key: 'ampionRetentionOrtho', label: 'Retention Ortho', stops: [0.75, 0.80, 0.865, 0.90, 0.95], unit: '%' },
      { type: 'slider', key: 'ampionRetentionPCP', label: 'Retention PCP', stops: [0.75, 0.80, 0.84, 0.90, 0.95], unit: '%' }
    ],
    getUserReply: (s) => `${s.ampionLaunchDate === 'does_not_launch' ? 'Does Not Launch' : s.ampionLaunchDate}`,
    getAssumptions: (s) => [
      {k:'Ampion Launch', v: s.ampionLaunchDate === 'does_not_launch' ? 'Never' : s.ampionLaunchDate}
    ]
  },
  {
    id: 'stage13_intro',
    who: 'ai',
    text: "Continuing the competitive landscape scoped in Step 11 — last one, the anti-NGF class."
  },
  {
    id: 'stage13_q1a',
    who: 'ai',
    text: "When — if ever — does an anti-NGF competitor launch?",
    controls: [
      { type: 'dateOrNever', key: 'antiNGFLaunchDate', label: 'Anti-NGF Launch Date' }
    ],
    getUserReply: (s) => `${s.antiNGFLaunchDate === 'does_not_launch' ? 'Does Not Launch' : s.antiNGFLaunchDate}`,
    getAssumptions: (s) => [
      {k:'Anti-NGF Launch', v: s.antiNGFLaunchDate === 'does_not_launch' ? 'Never' : s.antiNGFLaunchDate}
    ]
  },
  {
    id: 'stage13_q1b',
    who: 'ai',
    text: "What % share retained by Ortho/Rheum once the anti-NGF class is live?",
    controls: [
      { type: 'slider', key: 'antiNGFRetentionOrtho', label: 'Retention Ortho', stops: [0.80, 0.85, 0.90, 0.95, 1.00], unit: '%' }
    ],
    getUserReply: (s) => `${(s.antiNGFRetentionOrtho*100).toFixed(0)}% retention.`,
    getAssumptions: (s) => [
      {k:'Anti-NGF Retention ORS', v: `${(s.antiNGFRetentionOrtho*100).toFixed(0)}%`}
    ]
  },
  {
    id: 'stage13_q1c',
    who: 'ai',
    text: "Same question for PCP/Other channels.",
    controls: [
      { type: 'slider', key: 'antiNGFRetentionPCP', label: 'Retention PCP', stops: [0.90, 0.92, 0.95, 0.97, 1.00], unit: '%' }
    ],
    getUserReply: (s) => `${(s.antiNGFRetentionPCP*100).toFixed(0)}% retention.`,
    getAssumptions: (s) => [
      {k:'Anti-NGF Retention PCP', v: `${(s.antiNGFRetentionPCP*100).toFixed(0)}%`}
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
    id: 'stage15_q1a',
    who: 'ai',
    text: "What starting peak sampling intensity should we assume right after launch?",
    controls: [
      { type: 'slider', key: 'peakSamplingIntensity', label: 'Peak sampling intensity', stops: [0.05, 0.10, 0.15, 0.20, 0.25], unit: '%' }
    ],
    getUserReply: (s) => `${(s.peakSamplingIntensity*100).toFixed(0)}%.`,
    getAssumptions: (s) => [
      {k:'Peak Sampling Intensity', v: `${(s.peakSamplingIntensity*100).toFixed(0)}%`}
    ]
  },
  {
    id: 'stage15_q1b',
    who: 'ai',
    text: "What long-run steady-state sample rate should the curve settle to?",
    controls: [
      { type: 'slider', key: 'steadyStateSampleRate', label: 'Steady-state sample rate', stops: [0.01, 0.03, 0.05, 0.08, 0.10], unit: '%' }
    ],
    getUserReply: (s) => `${(s.steadyStateSampleRate*100).toFixed(0)}%.`,
    getAssumptions: (s) => [
      {k:'Steady-State Sample Rate', v: `${(s.steadyStateSampleRate*100).toFixed(0)}%`}
    ]
  },
  {
    id: 'stage16_intro',
    who: 'ai',
    text: "For seasonality, the default pattern is modeled on Synvisc's actual 2013-15 monthly volumes, since Zileria has no launch history of its own yet."
  },
  {
    id: 'stage16_q1',
    who: 'ai',
    text: "Is there a more relevant analog product, or actual observed Zileria data, you'd like me to upload and use instead?",
    hasUpload: true
  },
  {
    id: 'stage16_a1',
    who: 'user',
    text: "Use the Synvisc pattern for now."
  },
  {
    id: 'stage16_summary',
    who: 'ai',
    text: "Good — applying the Synvisc-based seasonality index across all months."
  },
  {
    id: 'stage17_summary',
    who: 'ai',
    text: "This step corrects for the actual number of selling days in each specific month — it's a fixed calendar calculation, no input needed unless your business day assumptions change."
  },
  {
    id: 'stage18_intro',
    who: 'ai',
    text: "Are there specific quarters — especially the first few post-launch — where you have actuals or updated guidance that should override the model's raw output?"
  },
  {
    id: 'stage18_a1',
    who: 'user',
    text: "Yes, the first five quarters have actuals."
  },
  {
    id: 'stage18_q1',
    who: 'ai',
    text: "Got it — what % adjustment should I apply to each of those quarters, and I'll reconcile the monthly detail underneath automatically.",
    controls: [
      { type: 'slider', key: 'q1OverrideAdj', label: 'Q1 Override Adjustment', stops: [-0.5, -0.25, 0.0, 0.25, 0.5], unit: '%' },
      { type: 'slider', key: 'q2OverrideAdj', label: 'Q2 Override Adjustment', stops: [-0.5, -0.25, 0.0, 0.25, 0.5], unit: '%' },
      { type: 'slider', key: 'q3OverrideAdj', label: 'Q3 Override Adjustment', stops: [-0.5, -0.25, 0.0, 0.25, 0.5], unit: '%' },
      { type: 'slider', key: 'q4OverrideAdj', label: 'Q4 Override Adjustment', stops: [-0.5, -0.25, 0.0, 0.25, 0.5], unit: '%' },
      { type: 'slider', key: 'q5OverrideAdj', label: 'Q5 Override Adjustment', stops: [-0.5, -0.25, 0.0, 0.25, 0.5], unit: '%' }
    ],
    getUserReply: (s) => `Applied adjustments: Q1 (${(s.q1OverrideAdj*100).toFixed(0)}%), Q2 (${(s.q2OverrideAdj*100).toFixed(0)}%), Q3 (${(s.q3OverrideAdj*100).toFixed(0)}%), Q4 (${(s.q4OverrideAdj*100).toFixed(0)}%), Q5 (${(s.q5OverrideAdj*100).toFixed(0)}%)`,
    getAssumptions: (s) => [
      {k:'Q1 Override', v: `${(s.q1OverrideAdj*100).toFixed(0)}%`},
      {k:'Q2 Override', v: `${(s.q2OverrideAdj*100).toFixed(0)}%`},
      {k:'Q3 Override', v: `${(s.q3OverrideAdj*100).toFixed(0)}%`},
      {k:'Q4 Override', v: `${(s.q4OverrideAdj*100).toFixed(0)}%`},
      {k:'Q5 Override', v: `${(s.q5OverrideAdj*100).toFixed(0)}%`}
    ]
  },
  {
    id: 'stage19_summary',
    who: 'ai',
    text: "This step is a fixed calculation — no new assumption needed from you here."
  },
  {
    id: 'stage20_summary',
    who: 'ai',
    text: "Revenue = annual volume × the price we already set — no new input here."
  },
  {
    id: 'final',
    who: 'ai',
    text: "Thanks — I've captured all assumptions across the 20 model stages. Let's review them in the Model tab before running the full forecast."
  }
];

  const runChat = () => {
    setChatMessages([chatScript[0]]);
    setAssumptions([]);
    setChatStarted(true);
    setScriptStep(0); 
  };

  const advanceScript = (currentStepIdx: number) => {
    const nextIdx = currentStepIdx + 1;
    if (nextIdx < chatScript.length) {
      const nextStep = chatScript[nextIdx];
      
      if (nextStep.who === 'ai') {
        setTimeout(() => {
          setChatMessages(prev => [...prev, nextStep]);
          setScriptStep(nextIdx);
          // If this AI message has no controls, keep advancing
          // (handles summary messages followed by another AI question)
          if (!nextStep.controls) {
            advanceScript(nextIdx);
          }
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
  }, [chatMessages, state]);

  const goPage = (n: number) => {
    if (n > maxTab) {
      setMaxTab(n);
    }
    setActiveTab(n);
    if (n === 2 && !chatStarted) runChat();
    window.scrollTo(0, 0);
  };

  const [openSections, setOpenSections] = useState<Set<number>>(new Set([1]));
  const [openMainGroups, setOpenMainGroups] = useState<Set<string>>(new Set(['Core Demand Modeling', 'Access & Competitive Friction Adjustment', 'Volume & Revenue Output']));
  const toggleMainGroup = (groupName: string) => {
    setOpenMainGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupName)) next.delete(groupName);
      else next.add(groupName);
      return next;
    });
  };

  const quickSetStops: Record<number, Record<string, number[]>> = {
  "1": {
    "diagnosisRate": [
      0.048,
      0.049,
      0.051,
      0.052,
      0.053
    ],
    "diagnosisAnnualGrowthRate": [
      0.019,
      0.025,
      0.032,
      0.045,
      0.055
    ]
  },
  "2": {
    "iasTreatedPctOfDiagnosed": [
      0.244,
      0.264,
      0.284,
      0.304,
      0.324
    ],
    "iasTreatedGrowthRate": [
      0.01,
      0.02,
      0.03,
      0.035,
      0.04
    ],
    "haRatioToIAS": [
      0.3,
      0.4,
      0.45,
      0.5,
      0.55
    ],
    "haRatioGrowthRate": [
      -0.02,
      -0.015,
      -0.01,
      -0.005,
      0.0
    ],
    "iasAndHATreatedBoth": [
      0.1,
      0.125,
      0.15,
      0.175,
      0.2
    ],
    "initialAdditionalMarketGrowth": [
      0.025,
      0.035,
      0.045,
      0.055,
      0.065
    ],
    "annualDecayRateOfAdditionalGrowth": [
      0.15,
      0.175,
      0.2,
      0.225,
      0.25
    ]
  },
  "3": {
    "overstatementAdjFactor": [
      0.1,
      0.16,
      0.22,
      0.25,
      0.3
    ],
    "wacPrice": [
      400.0,
      500.0,
      575.0,
      800.0,
      1000.0
    ],
    "newMarketResearchAdjOrtho": [
      0.95,
      1.1,
      1.25,
      1.4,
      1.55
    ],
    "newMarketResearchAdjRheum": [
      0.9,
      0.95,
      1.0,
      1.05,
      1.1
    ]
  },
  "4": {
    "pricingAdjFactorAccessImpact": [
      0.9,
      0.92,
      0.96,
      0.97,
      0.98
    ],
    "pricingAdjPatientAssistanceImpact": [
      1.0,
      1.05,
      1.1,
      1.15,
      1.2
    ]
  },
  "5": {
    "yearsToPeak": [
      7.0,
      6.0,
      5.0,
      4.0,
      3.0
    ],
    "pctORSReachedByMonth12": [
      0.6,
      0.65,
      0.7,
      0.75,
      0.8
    ],
    "pctORSReachedByYear2": [
      0.7,
      0.75,
      0.8,
      0.85,
      0.9
    ],
    "pctORSReachedByYear3Plus": [
      0.75,
      0.8,
      0.85,
      0.9,
      0.95
    ],
    "pctPCPReachedByMonth12": [
      0.4,
      0.46,
      0.524,
      0.58,
      0.64
    ],
    "pctPCPReachedByYear2": [
      0.52,
      0.56,
      0.6,
      0.64,
      0.68
    ],
    "pctPCPReachedByYear3Plus": [
      0.56,
      0.6,
      0.65,
      0.7,
      0.75
    ]
  },
  "6": {
    "jCodeWindowMonths": [
      6.0,
      9.0,
      12.0,
      15.0,
      18.0
    ],
    "jCodeRetentionRate": [
      0.8,
      0.84,
      0.88,
      0.91,
      0.94
    ],
    "refrigerationDurationMonths": [
      12.0,
      15.0,
      18.0,
      24.0,
      120.0
    ],
    "refrigerationRetentionORS": [
      0.7,
      0.8,
      0.88,
      0.92,
      0.95
    ],
    "refrigerationRetentionRheumOther": [
      0.7,
      0.8,
      0.88,
      0.92,
      0.95
    ]
  },
  "7": {
    "cingalRetentionOrtho": [
      0.7,
      0.72,
      0.74,
      0.78,
      0.9
    ],
    "cingalRetentionPCP": [
      0.8,
      0.82,
      0.85,
      0.9,
      1.0
    ],
    "ampionRetentionOrtho": [
      0.75,
      0.8,
      0.865,
      0.9,
      0.95
    ],
    "ampionRetentionPCP": [
      0.75,
      0.8,
      0.84,
      0.9,
      0.95
    ],
    "antiNGFRetentionOrtho": [
      0.8,
      0.85,
      0.9,
      0.95,
      1.0
    ],
    "antiNGFRetentionPCP": [
      0.9,
      0.92,
      0.95,
      0.97,
      1.0
    ]
  },
  "8": {
    "frequencyOfInjectionsYearly": [
      1.0,
      1.3,
      1.5,
      1.7,
      2.0
    ]
  }
};
  const handleQuickSet = (sectionIdx: number, level: 0 | 2 | 4) => {
    const sectionMap = quickSetStops[sectionIdx];
    if (!sectionMap) return;
    
    const updates: Partial<ForecastState> = {};
    for (const [key, stops] of Object.entries(sectionMap)) {
      updates[key as keyof ForecastState] = stops[level] as never;
    }
    
    setState(prev => ({ ...prev, ...updates }));
    setScenarioState(prev => ({ ...prev, ...updates }));
  };

  function toggleSection(idx: number) {
    setOpenSections(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  const handleStateChange = (key: keyof ForecastState, value: number | string | boolean) => {
    setState(prev => ({ ...prev, [key]: value as never }));
    setScenarioState(prev => ({ ...prev, [key]: value as never }));
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

  const maxImpact = Math.max(...impacts.map(i => Math.max(Math.abs(i.low), Math.abs(i.high))));
  const maxTornadoAxis = Math.max(100000000, Math.ceil(maxImpact / 100000000) * 100000000);

  // Compare scenarios
  const down = { ...state, peakShare: state.peakShare * 0.6, netPrice: state.netPrice * 0.85, yearsToPeak: state.yearsToPeak + 1 };
  const up = { ...state, peakShare: Math.min(0.6, state.peakShare * 1.4), netPrice: state.netPrice * 1.1, yearsToPeak: Math.max(2, state.yearsToPeak - 1) };
  const defaultScenarios = [
    { name: 'Base', tag: 'tag-base', s: state }
  ];
  const scenarios = [...defaultScenarios, ...savedScenarios];
  const CollapsibleMainGroup = ({ title, isOpen, onToggle, children }: { title: string, isOpen: boolean, onToggle: () => void, children: React.ReactNode }) => (
    <div style={{ marginBottom: '24px' }}>
      <div 
        onClick={onToggle}
        style={{ 
          marginTop: '32px', marginBottom: '16px', color: 'var(--navy)', 
          fontSize: '18px', paddingBottom: '8px', borderBottom: '2px solid var(--border)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}
      >
        <span>{title}</span>
        <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{isOpen ? '▼' : '▶'}</span>
      </div>
      {isOpen && <div>{children}</div>}
    </div>
  );

  const renderAssumptions = (asDropdown = false) => (
    <>
      <CollapsibleMainGroup title="Core Demand Modeling" isOpen={openMainGroups.has('Core Demand Modeling')} onToggle={() => toggleMainGroup('Core Demand Modeling')}>
        <AccordionSection idx={1} title="Patient Universe & Diagnosis" color="#1a9e75" isOpen={openSections.has(1)} onQuickSet={(level) => handleQuickSet(1, level)} onToggle={() => toggleSection(1)}>
              <SliderControl asDropdown={asDropdown} label="Diagnosis rate (base year)" fieldKey="diagnosisRate" stops={[0.048, 0.049, 0.051, 0.052, 0.053]} currentValue={state.diagnosisRate} unit="%" onAskAI={() => openAiModal('diagnosisRate')} onChange={v => handleStateChange('diagnosisRate', v)} />
              <SliderControl asDropdown={asDropdown} label="Diagnosis annual growth rate" fieldKey="diagnosisAnnualGrowthRate" stops={[0.019, 0.025, 0.032, 0.045, 0.055]} currentValue={state.diagnosisAnnualGrowthRate} unit="%" onAskAI={() => openAiModal('diagnosisAnnualGrowthRate')} onChange={v => handleStateChange('diagnosisAnnualGrowthRate', v)} />
            </AccordionSection>

            <AccordionSection idx={2} title="Treatment Split" color="#e07b2a" isOpen={openSections.has(2)} onQuickSet={(level) => handleQuickSet(2, level)} onToggle={() => toggleSection(2)}>
              <SliderControl asDropdown={asDropdown} label="IAS treated % of diagnosed (base yr)" fieldKey="iasTreatedPctOfDiagnosed" stops={[0.244, 0.264, 0.284, 0.304, 0.324]} currentValue={state.iasTreatedPctOfDiagnosed} unit="%" onAskAI={() => openAiModal('iasTreatedPctOfDiagnosed')} onChange={v => handleStateChange('iasTreatedPctOfDiagnosed', v)} />
              <SliderControl asDropdown={asDropdown} label="IAS treated annual growth rate" fieldKey="iasTreatedGrowthRate" stops={[0.01, 0.02, 0.03, 0.035, 0.04]} currentValue={state.iasTreatedGrowthRate} unit="%" onAskAI={() => openAiModal('iasTreatedGrowthRate')} onChange={v => handleStateChange('iasTreatedGrowthRate', v)} />
              <SliderControl asDropdown={asDropdown} label="HA-to-IAS ratio" fieldKey="haRatioToIAS" stops={[0.30, 0.40, 0.45, 0.50, 0.55]} currentValue={state.haRatioToIAS} unit="%" onAskAI={() => openAiModal('haRatioToIAS')} onChange={v => handleStateChange('haRatioToIAS', v)} />
              <SliderControl asDropdown={asDropdown} label="HA ratio annual growth rate" fieldKey="haRatioGrowthRate" stops={[-0.02, -0.015, -0.01, -0.005, 0.0]} currentValue={state.haRatioGrowthRate} unit="%" onAskAI={() => openAiModal('haRatioGrowthRate')} onChange={v => handleStateChange('haRatioGrowthRate', v)} />
              <SliderControl asDropdown={asDropdown} label="IAS+HA treated (both) %" fieldKey="iasAndHATreatedBoth" stops={[0.10, 0.125, 0.15, 0.175, 0.20]} currentValue={state.iasAndHATreatedBoth} unit="%" onAskAI={() => openAiModal('iasAndHATreatedBoth')} onChange={v => handleStateChange('iasAndHATreatedBoth', v)} />
              <SliderControl asDropdown={asDropdown} label="Initial promotional market lift" fieldKey="initialAdditionalMarketGrowth" stops={[0.025, 0.035, 0.045, 0.055, 0.065]} currentValue={state.initialAdditionalMarketGrowth} unit="%" onAskAI={() => openAiModal('initialAdditionalMarketGrowth')} onChange={v => handleStateChange('initialAdditionalMarketGrowth', v)} />
              <SliderControl asDropdown={asDropdown} label="Annual decay of promo lift" fieldKey="annualDecayRateOfAdditionalGrowth" stops={[0.15, 0.175, 0.20, 0.225, 0.25]} currentValue={state.annualDecayRateOfAdditionalGrowth} unit="%" onAskAI={() => openAiModal('annualDecayRateOfAdditionalGrowth')} onChange={v => handleStateChange('annualDecayRateOfAdditionalGrowth', v)} />
            </AccordionSection>

            <AccordionSection idx={3} title="Product Profile & Preference" color="#e07b2a" isOpen={openSections.has(3)} onQuickSet={(level) => handleQuickSet(3, level)} onToggle={() => toggleSection(3)}>
              <SliderControl asDropdown={asDropdown} label="Overstatement adjustment factor" fieldKey="overstatementAdjFactor" stops={[0.10, 0.16, 0.22, 0.25, 0.30]} currentValue={state.overstatementAdjFactor} unit="%" onAskAI={() => openAiModal('overstatementAdjFactor')} onChange={v => handleStateChange('overstatementAdjFactor', v)} />
              <ToggleControl label="WOMAC pain-score data available?" fieldKey="womacScoreAvailable" value={state.womacScoreAvailable} onChange={v => handleStateChange('womacScoreAvailable', v)} />
              <ToggleControl label="Diabetes/glycemic data available?" fieldKey="diabetesGlycemicDataAvailable" value={state.diabetesGlycemicDataAvailable} onChange={v => handleStateChange('diabetesGlycemicDataAvailable', v)} />
              <SliderControl asDropdown={asDropdown} label="WAC price per injection" fieldKey="wacPrice" stops={[400, 500, 575, 800, 1000]} currentValue={state.wacPrice} unit="$" onAskAI={() => openAiModal('wacPrice')} onChange={v => handleStateChange('wacPrice', v)} />
              <SliderControl asDropdown={asDropdown} label="Market research adj. — Ortho" fieldKey="newMarketResearchAdjOrtho" stops={[0.95, 1.10, 1.25, 1.40, 1.55]} currentValue={state.newMarketResearchAdjOrtho} unit="%" onAskAI={() => openAiModal('newMarketResearchAdjOrtho')} onChange={v => handleStateChange('newMarketResearchAdjOrtho', v)} />
              <SliderControl asDropdown={asDropdown} label="Market research adj. — Rheum/PCP" fieldKey="newMarketResearchAdjRheum" stops={[0.90, 0.95, 1.00, 1.05, 1.10]} currentValue={state.newMarketResearchAdjRheum} unit="%" onAskAI={() => openAiModal('newMarketResearchAdjRheum')} onChange={v => handleStateChange('newMarketResearchAdjRheum', v)} />
            </AccordionSection>

            <AccordionSection idx={4} title="Payer Access" color="#d9534f" isOpen={openSections.has(4)} onQuickSet={(level) => handleQuickSet(4, level)} onToggle={() => toggleSection(4)}>
              <SelectControl label="Payer access requirement" fieldKey="payerAccessRequirement" options={[{value: 'none', label: 'None'}, {value: 'prior_auth_only', label: 'Prior Auth'}, {value: 'pre_cert', label: 'Pre-Cert'}, {value: 'pre_cert_step_edit', label: 'Pre-Cert + Step Edit'}, {value: 'prior_auth_plus_step_edit', label: 'PA + Step Edit'}]} value={state.payerAccessRequirement} onAskAI={() => openAiModal('payerAccessRequirement')} onChange={v => handleStateChange('payerAccessRequirement', v)} />
              <SliderControl asDropdown={asDropdown} label="Pricing adj. — access impact (% surviving)" fieldKey="pricingAdjFactorAccessImpact" stops={[0.90, 0.92, 0.96, 0.97, 0.98]} currentValue={state.pricingAdjFactorAccessImpact} unit="%" onAskAI={() => openAiModal('pricingAdjFactorAccessImpact')} onChange={v => handleStateChange('pricingAdjFactorAccessImpact', v)} />
              <ToggleControl label="Patient assistance program in place?" fieldKey="patientAssistanceProgramInPlace" value={state.patientAssistanceProgramInPlace} onChange={v => handleStateChange('patientAssistanceProgramInPlace', v)} />
              <SliderControl asDropdown={asDropdown} label="Pricing adj. — PAP lift" fieldKey="pricingAdjPatientAssistanceImpact" stops={[1.00, 1.05, 1.10, 1.15, 1.20]} currentValue={state.pricingAdjPatientAssistanceImpact} unit="%" onAskAI={() => openAiModal('pricingAdjPatientAssistanceImpact')} onChange={v => handleStateChange('pricingAdjPatientAssistanceImpact', v)} />
            </AccordionSection>
      </CollapsibleMainGroup>

      <CollapsibleMainGroup title="Access & Competitive Friction Adjustment" isOpen={openMainGroups.has('Access & Competitive Friction Adjustment')} onToggle={() => toggleMainGroup('Access & Competitive Friction Adjustment')}>
            <AccordionSection idx={5} title="Market Uptake & Reach" color="#5b6abf" isOpen={openSections.has(5)} onQuickSet={(level) => handleQuickSet(5, level)} onToggle={() => toggleSection(5)}>
              <SliderControl asDropdown={asDropdown} label="Years to peak share" fieldKey="yearsToPeak" stops={[7, 6, 5, 4, 3]} currentValue={state.yearsToPeak} unit=" yrs" onAskAI={() => openAiModal('yearsToPeak')} onChange={v => handleStateChange('yearsToPeak', v)} />
              <SliderControl asDropdown={asDropdown} label="Ortho/Rheum reached by month 12" fieldKey="pctORSReachedByMonth12" stops={[0.60, 0.65, 0.70, 0.75, 0.80]} currentValue={state.pctORSReachedByMonth12} unit="%" onAskAI={() => openAiModal('pctORSReachedByMonth12')} onChange={v => handleStateChange('pctORSReachedByMonth12', v)} />
              <SliderControl asDropdown={asDropdown} label="Ortho/Rheum reached by year 2" fieldKey="pctORSReachedByYear2" stops={[0.70, 0.75, 0.80, 0.85, 0.90]} currentValue={state.pctORSReachedByYear2} unit="%" onAskAI={() => openAiModal('pctORSReachedByYear2')} onChange={v => handleStateChange('pctORSReachedByYear2', v)} />
              <SliderControl asDropdown={asDropdown} label="Ortho/Rheum reached by year 3+" fieldKey="pctORSReachedByYear3Plus" stops={[0.75, 0.80, 0.85, 0.90, 0.95]} currentValue={state.pctORSReachedByYear3Plus} unit="%" onAskAI={() => openAiModal('pctORSReachedByYear3Plus')} onChange={v => handleStateChange('pctORSReachedByYear3Plus', v)} />
              <SliderControl asDropdown={asDropdown} label="PCP/Other reached by month 12" fieldKey="pctPCPReachedByMonth12" stops={[0.40, 0.46, 0.524, 0.58, 0.64]} currentValue={state.pctPCPReachedByMonth12} unit="%" onAskAI={() => openAiModal('pctPCPReachedByMonth12')} onChange={v => handleStateChange('pctPCPReachedByMonth12', v)} />
              <SliderControl asDropdown={asDropdown} label="PCP/Other reached by year 2" fieldKey="pctPCPReachedByYear2" stops={[0.52, 0.56, 0.60, 0.64, 0.68]} currentValue={state.pctPCPReachedByYear2} unit="%" onAskAI={() => openAiModal('pctPCPReachedByYear2')} onChange={v => handleStateChange('pctPCPReachedByYear2', v)} />
              <SliderControl asDropdown={asDropdown} label="PCP/Other reached by year 3+" fieldKey="pctPCPReachedByYear3Plus" stops={[0.56, 0.60, 0.65, 0.70, 0.75]} currentValue={state.pctPCPReachedByYear3Plus} unit="%" onAskAI={() => openAiModal('pctPCPReachedByYear3Plus')} onChange={v => handleStateChange('pctPCPReachedByYear3Plus', v)} />
            </AccordionSection>

            <AccordionSection idx={6} title="Access Friction" color="#d9534f" isOpen={openSections.has(6)} onQuickSet={(level) => handleQuickSet(6, level)} onToggle={() => toggleSection(6)}>
              <SliderControl asDropdown={asDropdown} label="J-Code window duration" fieldKey="jCodeWindowMonths" stops={[6, 9, 12, 15, 18]} currentValue={state.jCodeWindowMonths} unit=" mo" onAskAI={() => openAiModal('jCodeWindowMonths')} onChange={v => handleStateChange('jCodeWindowMonths', v)} />
              <SliderControl asDropdown={asDropdown} label="J-Code retention rate (misc code)" fieldKey="jCodeRetentionRate" stops={[0.80, 0.84, 0.88, 0.91, 0.94]} currentValue={state.jCodeRetentionRate} unit="%" onAskAI={() => openAiModal('jCodeRetentionRate')} onChange={v => handleStateChange('jCodeRetentionRate', v)} />
              <SliderControl asDropdown={asDropdown} label="Refrigeration requirement duration" fieldKey="refrigerationDurationMonths" stops={[12, 15, 18, 24, 120]} currentValue={state.refrigerationDurationMonths} unit=" mo" onAskAI={() => openAiModal('refrigerationDurationMonths')} onChange={v => handleStateChange('refrigerationDurationMonths', v)} />
              <SliderControl asDropdown={asDropdown} label="Refrigeration retention — Ortho/Surgical" fieldKey="refrigerationRetentionORS" stops={[0.70, 0.80, 0.88, 0.92, 0.95]} currentValue={state.refrigerationRetentionORS} unit="%" onAskAI={() => openAiModal('refrigerationRetentionORS')} onChange={v => handleStateChange('refrigerationRetentionORS', v)} />
              <SliderControl asDropdown={asDropdown} label="Refrigeration retention — Rheum/Other" fieldKey="refrigerationRetentionRheumOther" stops={[0.70, 0.80, 0.88, 0.92, 0.95]} currentValue={state.refrigerationRetentionRheumOther} unit="%" onAskAI={() => openAiModal('refrigerationRetentionRheumOther')} onChange={v => handleStateChange('refrigerationRetentionRheumOther', v)} />
            </AccordionSection>

            <AccordionSection idx={7} title="Competitive Events" color="#c0392b" isOpen={openSections.has(7)} onQuickSet={(level) => handleQuickSet(7, level)} onToggle={() => toggleSection(7)}>
              <div className="competitor-card">
                <div className="competitor-card-title">Cingal (HA+steroid combo)</div>
                <DateOrNeverControl label="Launch Date" fieldKey="cingalLaunchDate" value={state.cingalLaunchDate} onChange={v => handleStateChange('cingalLaunchDate', v)} />
                <SliderControl asDropdown={asDropdown} label="Retention Ortho" fieldKey="cingalRetentionOrtho" stops={[0.70, 0.72, 0.74, 0.78, 0.90]} currentValue={state.cingalRetentionOrtho} unit="%" onAskAI={() => openAiModal('cingalRetentionOrtho')} onChange={v => handleStateChange('cingalRetentionOrtho', v)} />
                <SliderControl asDropdown={asDropdown} label="Retention PCP" fieldKey="cingalRetentionPCP" stops={[0.80, 0.82, 0.85, 0.90, 1.00]} currentValue={state.cingalRetentionPCP} unit="%" onAskAI={() => openAiModal('cingalRetentionPCP')} onChange={v => handleStateChange('cingalRetentionPCP', v)} />
              </div>
              
              <div className="competitor-card">
                <div className="competitor-card-title">Ampion (biologic) — base case: Does Not Launch</div>
                <DateOrNeverControl label="Launch Date" fieldKey="ampionLaunchDate" value={state.ampionLaunchDate} onChange={v => handleStateChange('ampionLaunchDate', v)} />
                <SliderControl asDropdown={asDropdown} label="Retention Ortho" fieldKey="ampionRetentionOrtho" stops={[0.75, 0.80, 0.865, 0.90, 0.95]} currentValue={state.ampionRetentionOrtho} unit="%" onAskAI={() => openAiModal('ampionRetentionOrtho')} onChange={v => handleStateChange('ampionRetentionOrtho', v)} />
                <SliderControl asDropdown={asDropdown} label="Retention PCP" fieldKey="ampionRetentionPCP" stops={[0.75, 0.80, 0.84, 0.90, 0.95]} currentValue={state.ampionRetentionPCP} unit="%" onAskAI={() => openAiModal('ampionRetentionPCP')} onChange={v => handleStateChange('ampionRetentionPCP', v)} />
              </div>

              <div className="competitor-card">
                <div className="competitor-card-title">Anti-NGF class</div>
                <DateOrNeverControl label="Launch Date" fieldKey="antiNGFLaunchDate" value={state.antiNGFLaunchDate} onChange={v => handleStateChange('antiNGFLaunchDate', v)} />
                <SliderControl asDropdown={asDropdown} label="Retention Ortho" fieldKey="antiNGFRetentionOrtho" stops={[0.80, 0.85, 0.90, 0.95, 1.00]} currentValue={state.antiNGFRetentionOrtho} unit="%" onAskAI={() => openAiModal('antiNGFRetentionOrtho')} onChange={v => handleStateChange('antiNGFRetentionOrtho', v)} />
                <SliderControl asDropdown={asDropdown} label="Retention PCP" fieldKey="antiNGFRetentionPCP" stops={[0.90, 0.92, 0.95, 0.97, 1.00]} currentValue={state.antiNGFRetentionPCP} unit="%" onAskAI={() => openAiModal('antiNGFRetentionPCP')} onChange={v => handleStateChange('antiNGFRetentionPCP', v)} />
              </div>
            </AccordionSection>
      </CollapsibleMainGroup>

      <CollapsibleMainGroup title="Volume & Revenue Output" isOpen={openMainGroups.has('Volume & Revenue Output')} onToggle={() => toggleMainGroup('Volume & Revenue Output')}>
            <AccordionSection idx={8} title="Volume & Sampling" color="#7b3fa0" isOpen={openSections.has(8)} onQuickSet={(level) => handleQuickSet(8, level)} onToggle={() => toggleSection(8)}>
              <SliderControl asDropdown={asDropdown} label="Injection frequency (per patient/year)" fieldKey="frequencyOfInjectionsYearly" stops={[1.0, 1.3, 1.5, 1.7, 2.0]} currentValue={state.frequencyOfInjectionsYearly} unit="/yr" onAskAI={() => openAiModal('frequencyOfInjectionsYearly')} onChange={v => handleStateChange('frequencyOfInjectionsYearly', v)} />
              <SliderControl asDropdown={asDropdown} label="Peak sampling intensity" fieldKey="peakSamplingIntensity" stops={[0.05, 0.10, 0.15, 0.20, 0.25]} currentValue={state.peakSamplingIntensity} unit="%" onAskAI={() => openAiModal('peakSamplingIntensity')} onChange={v => handleStateChange('peakSamplingIntensity', v)} />
              <SliderControl asDropdown={asDropdown} label="Steady-state sample rate" fieldKey="steadyStateSampleRate" stops={[0.01, 0.03, 0.05, 0.08, 0.10]} currentValue={state.steadyStateSampleRate} unit="%" onAskAI={() => openAiModal('steadyStateSampleRate')} onChange={v => handleStateChange('steadyStateSampleRate', v)} />
            </AccordionSection>

            <AccordionSection idx={9} title="Quarterly Overrides" color="#e07b2a" isOpen={openSections.has(9)} onQuickSet={(level) => handleQuickSet(9, level)} onToggle={() => toggleSection(9)}>
              <SliderControl asDropdown={asDropdown} label="Q1 Override Adjustment" fieldKey="q1OverrideAdj" stops={[-0.5, -0.25, 0.0, 0.25, 0.5]} currentValue={state.q1OverrideAdj} unit="%" onAskAI={() => openAiModal('q1OverrideAdj')} onChange={v => handleStateChange('q1OverrideAdj', v)} />
              <SliderControl asDropdown={asDropdown} label="Q2 Override Adjustment" fieldKey="q2OverrideAdj" stops={[-0.5, -0.25, 0.0, 0.25, 0.5]} currentValue={state.q2OverrideAdj} unit="%" onAskAI={() => openAiModal('q2OverrideAdj')} onChange={v => handleStateChange('q2OverrideAdj', v)} />
              <SliderControl asDropdown={asDropdown} label="Q3 Override Adjustment" fieldKey="q3OverrideAdj" stops={[-0.5, -0.25, 0.0, 0.25, 0.5]} currentValue={state.q3OverrideAdj} unit="%" onAskAI={() => openAiModal('q3OverrideAdj')} onChange={v => handleStateChange('q3OverrideAdj', v)} />
              <SliderControl asDropdown={asDropdown} label="Q4 Override Adjustment" fieldKey="q4OverrideAdj" stops={[-0.5, -0.25, 0.0, 0.25, 0.5]} currentValue={state.q4OverrideAdj} unit="%" onAskAI={() => openAiModal('q4OverrideAdj')} onChange={v => handleStateChange('q4OverrideAdj', v)} />
              <SliderControl asDropdown={asDropdown} label="Q5 Override Adjustment" fieldKey="q5OverrideAdj" stops={[-0.5, -0.25, 0.0, 0.25, 0.5]} currentValue={state.q5OverrideAdj} unit="%" onAskAI={() => openAiModal('q5OverrideAdj')} onChange={v => handleStateChange('q5OverrideAdj', v)} />
            </AccordionSection>
      </CollapsibleMainGroup>

          <div className="card">
            <h3>Patient flow funnel</h3>
            <div className="funnel funnelBody">
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
    </>
  );


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

      <main style={{ maxWidth: activeTab === 4 ? '100%' : '1080px', transition: 'max-width 0.3s ease', padding: activeTab === 4 ? '28px' : '28px 24px 80px' }}>
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
                        {msg.dataSnippet && (
                          <div style={{ marginBottom: '12px', overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', lineHeight: '1.4' }}>
                              <thead>
                                <tr>
                                  {msg.dataSnippet.headers.map((h: string, hi: number) => (
                                    <th key={hi} style={{ padding: '6px 8px', background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', textAlign: 'left', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {msg.dataSnippet.rows.map((row: string[], ri: number) => (
                                  <tr key={ri} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    {row.map((cell: string, ci: number) => (
                                      <td key={ci} style={{ padding: '5px 8px', color: ci === 0 ? '#0f7696' : '#374151', fontWeight: ci === 0 ? 600 : 400, whiteSpace: ci <= 1 ? 'nowrap' : 'normal' }}>{cell}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        {msg.text}
                        
                        {(msg.hasUpload || msg.viewFile) && (
                          <div style={{ marginTop: '12px', marginBottom: '4px', display: 'flex', gap: '8px' }}>
                            {msg.hasUpload && (
                              <>
                                <button className="btn secondary" onClick={() => document.getElementById(`dummy-upload-${msg.id}`)?.click()}>
                                  <span style={{ marginRight: '6px' }}>📎</span>
                                  Upload File (.xlsx, .csv)
                                </button>
                                <input type="file" id={`dummy-upload-${msg.id}`} accept=".xlsx, .xls, .csv" style={{ display: 'none' }} onChange={(e) => { e.target.value = ''; }} />
                              </>
                            )}
                            {msg.viewFile && (
                              <button className="btn secondary" onClick={() => handleViewFile(msg.viewFile!)}>
                                <span style={{ marginRight: '6px' }}>👁️</span>
                                View current data
                              </button>
                            )}
                          </div>
                        )}

                        {isAiControlStep && (
                          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #eee', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {msg.controls.map((ctrl: any, idx: number) => {
                              if (ctrl.type === 'slider') return <SliderControl asDropdown={false} key={idx} label={ctrl.label} fieldKey={ctrl.key} stops={ctrl.stops} currentValue={state[ctrl.key as keyof ForecastState] as number} unit={ctrl.unit} onAskAI={() => openAiModal(ctrl.key)} onChange={v => handleStateChange(ctrl.key as keyof ForecastState, v)} />;
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
                
                {(() => {
                  // Show input if: last message is AI without controls AND there's a user step coming
                  const lastMsg = chatMessages[chatMessages.length - 1];
                  const isLastAiNoControls = lastMsg?.who === 'ai' && !lastMsg?.controls;
                  // Look ahead from current scriptStep to find next user step
                  let hasUpcomingUserStep = false;
                  for (let i = scriptStep + 1; i < chatScript.length; i++) {
                    if (chatScript[i].who === 'user') { hasUpcomingUserStep = true; break; }
                    if (chatScript[i].who === 'ai' && chatScript[i].controls) break;
                  }
                  return (!chatMessages.length || (isLastAiNoControls && hasUpcomingUserStep));
                })() && (
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

          {renderAssumptions(false)}

          <div style={{ textAlign: 'right', marginTop: '24px' }}>
            <button className="btn secondary" onClick={resetAssumptions} style={{ marginRight: '8px' }}>Reset to conversation defaults</button>
            <button className="btn" onClick={() => goPage(4)}>Generate forecast →</button>
          </div>
        </section>

        {/* PAGE 4 : FORECAST DASHBOARD */}
        <section className={`page ${activeTab === 4 ? 'active' : ''}`} id="page-4">
          <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '32px', alignItems: 'start' }}>
            <div style={{ position: 'sticky', top: '24px', maxHeight: 'calc(100vh - 48px)', overflowY: 'auto', paddingRight: '8px' }}>
              {renderAssumptions(true)}
            </div>
            <div style={{ minWidth: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '24px' }} id="dashMetrics">
              <div className="metric" style={{ padding: '12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <div className="label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Net Rev - Peak</div>
                <div className="value" style={{ fontSize: '18px' }}>{fmtM(f.peakRevenue)}</div>
              </div>
              <div className="metric" style={{ padding: '12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <div className="label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Peak Share</div>
                <div className="value" style={{ fontSize: '18px' }}>{fmtPct(state.peakShare * 100)}</div>
              </div>
              <div className="metric" style={{ padding: '12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <div className="label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Peak Patients</div>
                <div className="value" style={{ fontSize: '18px' }}>{fmtNum(f.addressable * state.peakShare)}</div>
              </div>
              <div className="metric" style={{ padding: '12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <div className="label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Net Rev - Yr 1</div>
                <div className="value" style={{ fontSize: '18px' }}>{fmtM(f.cumulativeRevenue[0])}</div>
              </div>
              <div className="metric" style={{ padding: '12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <div className="label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Net Rev - Yr 2</div>
                <div className="value" style={{ fontSize: '18px' }}>{fmtM(f.cumulativeRevenue[1])}</div>
              </div>
              <div className="metric" style={{ padding: '12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <div className="label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Net Rev - Yr 3</div>
                <div className="value" style={{ fontSize: '18px' }}>{fmtM(f.cumulativeRevenue[2])}</div>
              </div>
            </div>

          <div className="card">
            <h3>Net year revenue forecast, US ($)</h3>
            <div className="legend-row">
              <span><span className="legend-dot" style={{ background: '#2a78d6' }}></span>Net year revenue</span>
            </div>
            <div className="canvas-wrap">
              {activeTab === 4 && <Line 
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => fmtM(Number(v)) } } } }}
                data={{ labels: f.years, datasets: [{ label: 'Net year revenue', data: f.revenue, borderColor: '#2a78d6', backgroundColor: 'rgba(42,120,214,0.1)', fill: true, tension: 0.3, pointRadius: 3 }] }} 
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

          <ModelArchitecturePanel state={state} />
          <div style={{ marginTop: '24px' }}></div>

          <div style={{ textAlign: 'right' }}>
            <button className="btn secondary" onClick={() => goPage(6)} style={{ marginRight: '8px' }}>Explore scenarios</button>
            <button className="btn" onClick={() => goPage(5)}>View key insights →</button>
          </div>
                    </div>
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
                options={{ indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { min: -maxTornadoAxis, max: maxTornadoAxis, ticks: { callback: v => (Number(v) < 0 ? '-' : '') + fmtM(Math.abs(Number(v))) } } } }}
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
              <div className="etitle">Export Interactive Business Model</div>
              <div className="edesc">A dynamic, high-level summary designed for executive and leadership review.</div>
            </div>
            <button className="btn" onClick={() => {}}>Open the model</button>
          </div>



        </section>

        {viewFileModal && (
          <div onClick={() => setViewFileModal(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '900px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1e293b' }}>Viewing current data</h3>
                <button onClick={() => setViewFileModal(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
              </div>
              <div style={{ overflow: 'auto', flex: 1, border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <tbody>
                    {viewFileModal.content.map((row, ri) => (
                      <tr key={ri} style={{ borderBottom: '1px solid #e2e8f0', background: ri === 0 ? '#f8fafc' : '#fff' }}>
                        {row.map((cell, ci) => (
                          <td key={ci} style={{ padding: '8px 12px', fontWeight: ri === 0 ? 600 : 400, color: '#334155', whiteSpace: 'nowrap' }}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

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

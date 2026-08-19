"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  defaultState, 
  ForecastState, 
  computeForecast, 
  fmtNum, 
  fmtM, 
  fmtPct, 
  addressablePatients,
  buildSequentialLabels,
  buildInterpolatedSeries
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
  idx: number; title: React.ReactNode; color: string;
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

const SliderContext = React.createContext<any>(null);

function SliderControl({
  label, fieldKey, stops: defaultStops, currentValue, unit, onAskAI,
  onChange,
  asDropdown,
  hideSlider
}: {
  asDropdown?: boolean;
  hideSlider?: boolean;
  label: string;
  fieldKey: string;
  stops: number[];          // exactly 5 values
  currentValue: number;
  unit: string;
  onAskAI: () => void;
  onChange: (val: number) => void;
}) {
  const ctx = React.useContext(SliderContext);
  const isScenariosEnabled = ctx?.scenariosEnabledMap?.[fieldKey] || false;
  const [localInput, setLocalInput] = React.useState<string | null>(null);

    const onToggleScenarios = (val: boolean) => ctx?.setScenariosEnabledMap((p: any) => ({...p, [fieldKey]: val}));
  const customCenter = ctx?.customCentersMap?.[fieldKey];
  const onSetCustomCenter = (val: number) => ctx?.setCustomCentersMap((p: any) => ({...p, [fieldKey]: val}));

  const center = customCenter !== undefined && customCenter !== null ? customCenter : defaultStops[2];
  const deltas = defaultStops.map(s => s - defaultStops[2]);
  const dynamicStops = deltas.map(d => center + d);

  const currentIdx = dynamicStops.reduce((best, s, i) =>
    Math.abs(s - currentValue) < Math.abs(dynamicStops[best] - currentValue) ? i : best, 0);

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
          onChange={e => onChange(dynamicStops[parseInt(e.target.value)])}
          style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', fontSize: '13px', outline: 'none', minWidth: '180px', flexShrink: 0 }}
        >
          {['Conservative','Semi-Cons.','Centered','Semi-Agg.','Aggressive'].map((t,i) => {
            const valStr = unit === '$' ? '$' + dynamicStops[i].toLocaleString('en-US') : (dynamicStops[i] * (unit === '%' ? 100 : 1)).toLocaleString('en-US', {maximumFractionDigits: 2}) + (unit === '$' ? '' : unit);
            return <option key={i} value={i}>{t} ({valStr})</option>;
          })}
        </select>
      </div>
    );
  }

  // hideSlider mode: keep input + checkbox but suppress the range slider when scenarios is enabled
  // diagnosisRate gets a slider directly instead of textbox
  if (hideSlider) {
    const showSliderForThis = fieldKey === 'diagnosisRate';
    return (
      <div className="slider-control-row" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div className="slider-label-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '0' }}>
          <span className="slider-label" style={{ marginBottom: 0 }}>{label}</span>
          <button className="ask-ai-btn" onClick={onAskAI}>✨ Ask AI</button>
        </div>
        
        {showSliderForThis ? (
          <div style={{ padding: '0 0 8px 0', position: 'relative' }}>
            <span className="slider-value-chip" style={{ position: 'absolute', top: '-18px', right: '0', backgroundColor: activeColor + '20', color: activeColor, padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
              {`${(currentValue * 100).toLocaleString('en-US', {maximumFractionDigits: 2})}%`}
            </span>
            <input
              type="range"
              min={0} max={4} step={1}
              value={currentIdx}
              className="slider-input"
              onChange={e => onChange(dynamicStops[parseInt(e.target.value)])}
              style={{ background: `linear-gradient(to right, ${activeColor} ${(currentIdx / 4) * 100}%, #e2e8f0 ${(currentIdx / 4) * 100}%, #e2e8f0 100%)`, color: activeColor, width: '100%' }}
            />
            <div className="slider-ticks" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px', color: '#9ca3af' }}>
              {['Conservative','Semi-Conservative','Centered','Semi-Aggressive','Aggressive'].map((t,i) => (
                <span key={i} className={`tick-label ${i === currentIdx ? 'active' : ''}`} style={{ color: i === currentIdx ? activeColor : undefined, flex: 1, textAlign: i === 0 ? 'left' : i === 4 ? 'right' : 'center', fontWeight: i === currentIdx ? 600 : 400 }}>{t}</span>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input 
              type="number" 
              value={localInput !== null ? localInput : (unit === '%' ? Math.round(currentValue * 10000)/100 : currentValue)}
              onChange={(e) => {
                  setLocalInput(e.target.value);
                  if (e.target.value === '') {
                    onChange(0);
                    onSetCustomCenter(0);
                    return;
                  }
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    const finalVal = unit === '%' ? val / 100 : val;
                    onChange(finalVal);
                    onSetCustomCenter(finalVal);
                  }
                }}
              onBlur={() => setLocalInput(null)}
              style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: '6px', width: '100px', fontSize: '13px' }}
            />
            <span style={{ fontSize: '13px', color: '#4b5563' }}>{unit === '$' ? '' : unit}</span>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#4b5563', cursor: 'pointer', marginLeft: 'auto' }}>
              <input type="checkbox" checked={isScenariosEnabled} onChange={(e) => {
                if (onToggleScenarios) onToggleScenarios(e.target.checked);
              }} />
              Enable Scenarios
            </label>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="slider-control-row" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className="slider-label-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '0' }}>
        <span className="slider-label" style={{ marginBottom: 0 }}>{label}</span>
        <button className="ask-ai-btn" onClick={onAskAI}>✨ Ask AI</button>
      </div>
      
      {!isScenariosEnabled ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input 
            type="number" 
            value={localInput !== null ? localInput : (unit === '%' ? Math.round(currentValue * 10000)/100 : currentValue)}
            onChange={(e) => {
                setLocalInput(e.target.value);
                if (e.target.value === '') {
                  onChange(0);
                  onSetCustomCenter(0);
                  return;
                }
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) {
                  const finalVal = unit === '%' ? val / 100 : val;
                  onChange(finalVal);
                  onSetCustomCenter(finalVal);
                }
              }}
            onBlur={() => setLocalInput(null)}
            style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: '6px', width: '100px', fontSize: '13px' }}
          />
          <span style={{ fontSize: '13px', color: '#4b5563' }}>{unit === '$' ? '' : unit}</span>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#4b5563', cursor: 'pointer', marginLeft: 'auto' }}>
            <input type="checkbox" checked={false} onChange={(e) => {
              if (e.target.checked && onToggleScenarios) onToggleScenarios(true);
            }} />
            Enable Scenarios
          </label>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-12px', marginBottom: '-10px' }}>
             <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#4b5563', cursor: 'pointer' }}>
               <input type="checkbox" checked={true} onChange={(e) => {
                 if (!e.target.checked && onToggleScenarios) onToggleScenarios(false);
               }} />
               Enable Scenarios
             </label>
          </div>
          <div style={{ padding: '16px 0 8px 0', position: 'relative', marginTop: '16px' }}>
            <span className="slider-value-chip" style={{ position: 'absolute', top: '-18px', right: '0', backgroundColor: activeColor + '20', color: activeColor, padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
              {unit === '$'
                ? `$${dynamicStops[currentIdx].toLocaleString('en-US')}`
                : `${(dynamicStops[currentIdx] * (unit === '%' ? 100 : 1)).toLocaleString('en-US', {maximumFractionDigits: 2})}${unit === '$' ? '' : unit}`
              }
            </span>
            <input
              type="range"
              min={0} max={4} step={1}
              value={currentIdx}
              className="slider-input"
              onChange={e => onChange(dynamicStops[parseInt(e.target.value)])}
              style={{ background: `linear-gradient(to right, ${activeColor} ${(currentIdx / 4) * 100}%, #e2e8f0 ${(currentIdx / 4) * 100}%, #e2e8f0 100%)`, color: activeColor, width: '100%' }}
            />
            <div className="slider-ticks" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px', color: '#9ca3af' }}>
              {['Conservative','Semi-Conservative','Centered','Semi-Aggressive','Aggressive'].map((t,i) => (
                <span key={i} className={`tick-label ${i === currentIdx ? 'active' : ''}`} style={{ color: i === currentIdx ? activeColor : undefined, flex: 1, textAlign: i === 0 ? 'left' : i === 4 ? 'right' : 'center', fontWeight: i === currentIdx ? 600 : 400 }}>{t}</span>
              ))}
            </div>
          </div>
        </>
      )}
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

function NumberControl({
  label, fieldKey, currentValue, unit, onChange, asDropdown
}: {
  label: string;
  fieldKey: string;
  currentValue: number;
  unit: string;
  onChange: (val: number) => void;
  asDropdown?: boolean;
}) {
  const [localInput, setLocalInput] = React.useState<string | null>(null);

  const displayVal = unit === '%' ? Math.round(currentValue * 10000) / 100 : currentValue;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalInput(e.target.value);
      if (e.target.value === '') {
        onChange(0);
        return;
      }
      let val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        if (unit === '%') val = val / 100;
        onChange(val);
      }
    };

  return (
    <div className={asDropdown ? "slider-control-row" : ""} style={!asDropdown ? { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' } : { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
      <span style={{ fontSize: '13px', color: '#374151', flex: '1 1 auto', minWidth: 0 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <input 
          type="number" 
          value={localInput !== null ? localInput : displayVal} 
          onChange={handleChange}
          onBlur={() => setLocalInput(null)}
          style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: '6px', width: '100px', fontSize: '13px' }}
        />
        <span style={{ fontSize: '13px', color: '#4b5563' }}>{unit === '$' ? '' : unit}</span>
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
  const reachFactor = (0.70 * 0.85) + (0.30 * 0.65);
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

const InfoTooltip = ({ text }: { text: string }) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <span 
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'help', color: '#888', fontSize: '15px' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      ⓘ
      {isHovered && (
        <span style={{
          position: 'absolute',
          bottom: '125%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'max-content',
          maxWidth: '300px',
          backgroundColor: '#333',
          color: '#fff',
          textAlign: 'center',
          borderRadius: '6px',
          padding: '8px 12px',
          fontSize: '13px',
          lineHeight: '1.4',
          pointerEvents: 'none',
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 1000
        }}>
          {text}
          <span style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            marginLeft: '-5px',
            borderWidth: '5px',
            borderStyle: 'solid',
            borderColor: '#333 transparent transparent transparent'
          }} />
        </span>
      )}
    </span>
  );
};

const CollapsibleMainGroup = ({ title, isOpen, onToggle, children }: { title: React.ReactNode, isOpen: boolean, onToggle: () => void, children: React.ReactNode }) => (
  <div style={{ marginBottom: '32px', background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.03)', border: '1px solid var(--border)' }}>
    <div 
      onClick={onToggle}
      style={{ 
        background: isOpen ? '#fff' : 'var(--surface-1, #f8f8f6)',
        color: 'var(--navy)', 
        fontSize: '17px', padding: '16px 20px', borderBottom: isOpen ? '1px solid var(--border)' : 'none',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontWeight: '600', transition: 'background 0.2s ease',
        borderTopLeftRadius: '11px', borderTopRightRadius: '11px',
        borderBottomLeftRadius: isOpen ? '0' : '11px', borderBottomRightRadius: isOpen ? '0' : '11px'
      }}
    >
      <span>{title}</span>
      <span style={{ fontSize: '13px', color: 'var(--text-muted)', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease', display: 'inline-block' }}>▼</span>
    </div>
    {isOpen && <div style={{ padding: '20px 24px', background: '#fafafa', borderBottomLeftRadius: '11px', borderBottomRightRadius: '11px' }}>{children}</div>}
  </div>
);


const MONTH_LABELS_60 = buildSequentialLabels('Mon', 60);

export default function ForecastApp() {
  const [activeTab, setActiveTab] = useState(1);
  const [showInsights, setShowInsights] = useState(false);
  const [maxTab, setMaxTab] = useState(1);
  const [state, setState] = useState<ForecastState>(defaultState);
  const [scenarioState, setScenarioState] = useState<ForecastState>(defaultState);
  const [scenariosEnabledMap, setScenariosEnabledMap] = useState<Record<string, boolean>>({});
  const [customCentersMap, setCustomCentersMap] = useState<Record<string, number>>({});
  const [selectedModel, setSelectedModel] = useState('ARIMA');
  const [savedScenarios, setSavedScenarios] = useState<{name: string, tag: string, s: ForecastState}[]>([]);
  const [scenarioNameInput, setScenarioNameInput] = useState('');
  const [sensitivityLevel, setSensitivityLevel] = useState<5 | 10>(5);
  
  // Resource Gathering state
  const [uploadedSheets, setUploadedSheets] = useState<Record<number, boolean>>({});
  const [previewSheet, setPreviewSheet] = useState<number | null>(null);
  // Chat state
  const [chatStarted, setChatStarted] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [assumptions, setAssumptions] = useState<any[]>([]);
  const [scriptStep, setScriptStep] = useState(0);
  const [demoInput, setDemoInput] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);
  const assumpRef = useRef<HTMLDivElement>(null);


  const [newFlowStep, setNewFlowStep] = useState(0);
  const [newFlowInput, setNewFlowInput] = useState('');
  const [newFlowUserInputs, setNewFlowUserInputs] = useState<Record<number, string>>({});
  const [isAiTyping, setIsAiTyping] = useState(false);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [newFlowStep, isAiTyping]);

  const advanceNewFlow = () => {
    if (newFlowInput.trim() === '') return;
    
    // First, show the user's message
    let nextStep = newFlowStep + 1;
    setNewFlowUserInputs(prev => ({ ...prev, [nextStep]: newFlowInput }));
    setNewFlowStep(nextStep);
    setNewFlowInput('');
    setIsAiTyping(true);

    // Then, show the AI message after a brief delay
    setTimeout(() => {
      let finalStep = nextStep;
      while (finalStep < newFlowScript.length - 1 && newFlowScript[finalStep + 1].who !== 'user') {
        finalStep++;
      }
      setNewFlowStep(finalStep);
      setIsAiTyping(false);
    }, 600);
  };

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
  | { type: 'number', key: keyof ForecastState, label: string, unit: string }
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

type ResourceSheet = {
  id: number;
  title: string;
  subtitle: string;
};

type ResourceStage = {
  id: number;
  title: string;
  description: string;
  color: string;
  iconBg: string;
  icon: React.ReactNode;
  lockedBy?: string;
  sheets: ResourceSheet[];
};

const resourcePreviewData: Record<number, { title: string; headers: string[]; rows: string[][] }> = {
  1: {
    title: 'Epidemiology / Population Base',
    headers: ['Age Band', '2024', '2025', '2026', '2027'],
    rows: [
      ['0–24 years', '103.2M', '103.6M', '103.9M', '104.1M'],
      ['25–44 years', '88.4M', '88.9M', '89.3M', '89.8M'],
      ['45–64 years', '84.1M', '83.7M', '83.4M', '83.0M'],
      ['65+ years', '61.5M', '63.2M', '64.8M', '66.3M']
    ]
  },
  2: {
    title: 'Diagnosed Patients (2016 IMS data)',
    headers: ['Age Band', 'Diagnosed - Insured', '% of Total Pop.', 'Diagnosed - Uninsured (Est.)'],
    rows: [
      ['0–24 years', '1.9M', '1.9%', '0.3M'],
      ['25–44 years', '2.6M', '2.9%', '0.4M'],
      ['45–64 years', '6.4M', '7.6%', '1.0M'],
      ['65+ years', '4.7M', '7.6%', '0.7M']
    ]
  },
  3: {
    title: 'Treated Patients (rate, growth & specialty split)',
    headers: ['Metric', 'Value'],
    rows: [
      ['IAS Treated % of Diagnosed', '28.4%'],
      ['IAS Treated % - Annual Growth', '3.5%'],
      ['HA Ratio to IAS Treated', '30%'],
      ['HA Ratio - Annual Growth', '-1.0%'],
      ['Treated with Both (IAS + HA)', '15.0%'],
      ['Additional Market Growth - Promotion (Initial)', '5.5%'],
      ['Additional Market Growth - Annual Decay', '20.0%']
    ]
  },
  4: {
    title: 'Preference Share Research (incl. WAC Price)',
    headers: ['Specialty', 'Preference Share', 'WAC Price', 'Sample Size'],
    rows: [
      ['Orthopedics', '24%', '$760', '145'],
      ['Rheumatology', '19%', '$760', '82'],
      ['PCP / Other', '11%', '$760', '96']
    ]
  },
  6: {
    title: 'Other Adjustments Summary',
    headers: ['Factor / Event', 'Timing', 'Ortho / Rheum Retained', 'PCP / Other Retained'],
    rows: [
      ['Payer access requirement', 'Ongoing', '96%', '94%'],
      ['Patient assistance program', 'Ongoing', '100%', '100%'],
      ['Reimbursement / coding transition', 'Auto-linked to launch', '60%', '60%'],
      ['Regulatory / guideline change', 'Year 1', '95%', '95%'],
      ['Competitive launch - Event 1', 'Year 2', '85%', '88%'],
      ['Competitive launch - Event 2', 'Year 3', '90%', '92%']
    ]
  },
  7: {
    title: 'Existing Forecast Model',
    headers: ['Metric', 'Base Case', 'Low Case', 'High Case'],
    rows: [
      ['Peak Share', '21%', '16%', '26%'],
      ['Years to Peak', '5', '6', '4'],
      ['Peak Revenue', '$238M', '$174M', '$312M']
    ]
  }
};

const resourceStages: ResourceStage[] = [
  {
    id: 1,
    title: 'Demand',
    description: 'Population base and diagnosed/treated-patient counts',
    color: '#2f78bd',
    iconBg: '#e4f1fb',
    icon: 'D',
    sheets: [
      { id: 1, title: 'Epidemiology / Population Base', subtitle: 'Pending upload' },
      { id: 2, title: 'Diagnosed Patients (IMS Data)', subtitle: 'Pending upload' },
      { id: 3, title: 'Treated Patients (rate, growth & specialty split)', subtitle: 'Pending upload' }
    ]
  },
  {
    id: 2,
    title: 'Share & Pricing',
    description: 'Preference share research',
    color: '#b187d7',
    iconBg: '#f1e9fb',
    icon: 'S',
    lockedBy: 'Demand',
    sheets: [
      { id: 4, title: 'Preference Share Research', subtitle: 'Pending upload' }
    ]
  },
  {
    id: 3,
    title: 'Other Adjustments',
    description: 'One consolidated file capturing payers/competitive/market factors relevant to the forecast',
    color: '#e7aa7f',
    iconBg: '#fff0e8',
    icon: 'C',
    lockedBy: 'Share & Pricing',
    sheets: [
      { id: 6, title: 'Other Adjustments Summary', subtitle: 'Pending upload' }
    ]
  }
];

const newFlowScript = [
  { who: 'ai', text: "Hello! I'm your forecasting assistant. How can I help you today?", step: 1 },
  { who: 'user', text: "I want to build a forecast for Product X.", step: 1 },
  { who: 'ai', text: `Happy to help build this out. We'll work through three steps before you move into Assumptions to fine-tune the numbers:
<div style="border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; margin-top: 12px; font-size: 13px;">
  <div style="background: #f8fafc; padding: 8px 12px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">HOW THIS WILL GO</div>
  <table style="width: 100%; border-collapse: collapse;">
    <thead style="background: #ffffff; text-align: left; font-size: 11px; color: #64748b; text-transform: uppercase;">
      <tr>
        <th style="padding: 10px 12px; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Step</th>
        <th style="padding: 10px 12px; font-weight: 600; border-bottom: 1px solid #e2e8f0;">What we'll do</th>
        <th style="padding: 10px 12px; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Expected outcomes</th>
      </tr>
    </thead>
    <tbody style="background: #ffffff;">
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #334155; vertical-align: top;">1. Setup</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #334155; vertical-align: top;">Align on the basics</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #334155; vertical-align: top;">
          <ul style="margin: 0; padding-left: 16px; line-height: 1.5;">
            <li>Brand & indication</li>
            <li>Geography</li>
            <li>Launch timing</li>
            <li>Forecast horizon</li>
          </ul>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #334155; vertical-align: top;">2. Approach</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #334155; vertical-align: top;">Agree on methodology</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #334155; vertical-align: top;">
          <ul style="margin: 0; padding-left: 16px; line-height: 1.5;">
            <li>Recommended forecasting approach</li>
            <li>Segmentation level (e.g., specialty, treatment type, age, gender)</li>
          </ul>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px; color: #334155; vertical-align: top;">3. Input Alignment</td>
        <td style="padding: 12px; color: #334155; vertical-align: top;">Confirm data needs</td>
        <td style="padding: 12px; color: #334155; vertical-align: top;">
          <ul style="margin: 0; padding-left: 16px; line-height: 1.5;">
            <li>Must-have vs. good-to-have inputs</li>
            <li>Recommended data source per input</li>
          </ul>
        </td>
      </tr>
    </tbody>
  </table>
</div>`, step: 1 },
  { who: 'ai', text: `<div style="background: #fdfaf0; border: 1px solid #f5e6b3; border-radius: 8px; border-left: 4px solid #d4af37; padding: 16px; font-size: 14px; color: #334155;">
  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; color: #9c8022; font-weight: 700; font-size: 12px; letter-spacing: 0.5px; text-transform: uppercase;">
    <span>✦</span> AI RECOMMENDATION
  </div>
  <p style="margin-top: 0; margin-bottom: 12px;">Let's start with Setup. A few things to confirm:</p>
  <ul style="margin: 0 0 12px 0; padding-left: 20px; line-height: 1.6;">
    <li style="margin-bottom: 4px;"><strong>Indication</strong> → Product X is approved for osteoarthritis (OA) knee pain, so I'll set that as the indication.</li>
    <li style="margin-bottom: 4px;"><strong>Geography</strong> → given the primary market is US, I'll scope this as <strong>US-only</strong> unless another market needs covering.</li>
    <li style="margin-bottom: 4px;"><strong>Launch Date</strong> → based on drug approval records, launch looks to be around <strong>October 2017</strong>, so I'll anchor to that.</li>
    <li style="margin-bottom: 4px;"><strong>Forecast Horizon</strong> → OA Knee is a mature, stable category, so a <strong>5-year horizon</strong> is typical.</li>
  </ul>
  <p style="margin: 0;">Does all of that look right, or should any of these change?</p>
</div>`, step: 1 },
  { who: 'user', text: "That all works.", step: 1 },
  { who: 'ai', sectionHeader: '2 - APPROACH', sectionSub: 'Model structure recommendation', text: `<div style="background: #fdfaf0; border: 1px solid #f5e6b3; border-radius: 8px; border-left: 4px solid #d4af37; padding: 16px; font-size: 14px; color: #334155;">
  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; color: #9c8022; font-weight: 700; font-size: 12px; letter-spacing: 0.5px; text-transform: uppercase;">
    <span>✦</span> AI RECOMMENDATION
  </div>
  <p style="margin-top: 0; margin-bottom: 12px;">Two ways to structure this: <strong>Patient-Based</strong> — a snapshot of the diagnosed/treated market by specialty — or <strong>Patient-Flow</strong> — tracking patients through treatment states over time. Patient-Flow fits conditions with complex journeys: lines of therapy, drug-class switching, remission cycles.</p>
  <p style="margin: 0;">OA Knee is chronic, but Product X itself is a periodic-injection therapy with no line-of-therapy progression or drug-class switching. For chronic conditions without that kind of complex treatment journey, <strong>Patient-Based</strong> is the better fit — simpler, faster to stand up, and won't sacrifice accuracy here. That's what I'd recommend.</p>
</div>`, step: 2 },
  { who: 'user', text: "Agreed, let's go with Patient-Based.", step: 2 },
  { who: 'ai', text: "Good. Beyond the core inputs — epidemiology, treatment rates, and so on, which we'll cover in input alignment — accurate Patient-Based forecasts are usually built around one or two grains. Common ones are treatment type, specialty, patient age, or gender. Which of these do you want this built around?", step: 2 },
  { who: 'user', text: "Let's go with specialty and treatment type.", step: 2 },
  { who: 'ai', text: `<div style="background: #fdfaf0; border: 1px solid #f5e6b3; border-radius: 8px; border-left: 4px solid #d4af37; padding: 16px; font-size: 14px; color: #334155;">
  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; color: #9c8022; font-weight: 700; font-size: 12px; letter-spacing: 0.5px; text-transform: uppercase;">
    <span>✦</span> AI RECOMMENDATION
  </div>
  Looking at OA Knee specifically — the primary specialties treating this are <strong>orthopedic surgeons and rheumatologists</strong>, with PCPs picking up a smaller share. And based on Product X's patient eligibility, the treatment side splits into <strong>intra-articular steroid (IAS)</strong>, which is where Product X sits, and <strong>hyaluronic acid (HA)</strong>, a different injectable class. Shall we track the model along those lines?
</div>`, step: 2 },
  { who: 'user', text: "Yes.", step: 2 },
  { who: 'ai', sectionHeader: '3 - INPUT ALIGNMENT', sectionSub: 'Must-have inputs and recommended data sources', sectionColor: '#1f7a6c', text: `With Patient-Based confirmed at the specialty × IAS/HA grain, here's the input framework I'll work through with you — what's must-have to get a credible forecast running, versus good-to-have refinement:
<div style="border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; margin-top: 12px; margin-bottom: 12px; font-size: 13px;">
  <div style="background: #f8fafc; padding: 8px 12px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">MUST-HAVE vs. GOOD-TO-HAVE</div>
  <table style="width: 100%; border-collapse: collapse;">
    <thead style="background: #ffffff; text-align: left; font-size: 11px; color: #64748b; text-transform: uppercase;">
      <tr>
        <th style="padding: 10px 12px; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Category</th>
        <th style="padding: 10px 12px; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Must-Have</th>
        <th style="padding: 10px 12px; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Good-to-Have</th>
      </tr>
    </thead>
    <tbody style="background: #ffffff;">
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #334155; vertical-align: top;">Demand</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #334155; vertical-align: top;">Epi, diagnosed & treated (IAS/HA)</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #334155; vertical-align: top;">Regional splits</td>
      </tr>
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #334155; vertical-align: top;">Share</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #334155; vertical-align: top;">Peak Share, Time to Peak</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #334155; vertical-align: top;">Uptake curve, analogs</td>
      </tr>
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #334155; vertical-align: top;">Finance</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #334155; vertical-align: top;">WAC Price</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #334155; vertical-align: top;">Rebates, GTN %</td>
      </tr>
      <tr>
        <td style="padding: 12px; color: #334155; vertical-align: top;">Other<br/>Adjustments</td>
        <td style="padding: 12px; color: #334155; vertical-align: top;">—</td>
        <td style="padding: 12px; color: #334155; vertical-align: top;">Payer access, competitive events, broader market events</td>
      </tr>
    </tbody>
  </table>
</div>`, step: 3 },
  { who: 'ai', text: `Starting with <strong>Demand</strong> — I'll need epidemiology, diagnosed, and treated-patient counts.
<br><br>
<span style="font-size: 12px; color: #6b7280; font-style: italic;">Diagnosed patients = the pool already identified with OA Knee and eligible for treatment — this becomes the base I multiply by treatment rates to size the market.</span>
<br><br>
For epi and diagnosis, a few options: Census, DRG claims, IMS/IQVIA, or Kantar.<br/>
For treated-patient splits by specialty and treatment type, primary market research tends to be more reliable than claims. Do you have access to any of these directly?`, step: 3 },
  { who: 'user', text: "We have Year 1 IMS Data on diagnosed OA Knee patients, and proprietary market research for treated-patient splits.", step: 3 },
  { who: 'ai', text: "Good — <strong>Census</strong> for the population base, your <strong>Year 1 IMS Data</strong> for diagnosis (both by age band, since patterns shift quite a bit across age groups here), and your <strong>proprietary research</strong> for treated-patient splits. I'd use that same research for <strong>Share</strong> — Peak Share and Time to Peak — supplemented with <strong>brand planning</strong>, and for <strong>Finance</strong>, WAC price from brand planning too.", step: 3 },
  { who: 'ai', text: "Last category — <strong>Other Adjustments</strong>. Usual factors for a forecast like this: payer access/reimbursement friction, competitive launches, and broader market events. Anything relevant, and would that be research-driven too?", step: 3 },
  { who: 'user', text: "Yes — access and competitive launches, same proprietary research.", step: 3 },
  { who: 'ai', text: "That covers everything. Let's move to uploading the inputs from Census, IMS diagnosed, and market research data sources before finalizing the parameters and assumptions.", step: 4 }
];

const chatScript: ChatStepDef[] = [
  {
    id: 'stage0_q1',
    who: 'ai',
    text: "Before I pull any data, let's align on scope. Which product are we forecasting?"
  },
  {
    id: 'stage0_a1',
    who: 'user',
    text: "Product X — masked brand name for osteoarthritis knee pain.",
    getAssumptions: () => [{k:'Product', v:'Product X'}]
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
    text: "Launch through Year 6.",
    getAssumptions: () => [{k:'Forecast Horizon', v:'6 years post-launch'}]
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
    text: "Perfect — Product X, OA Knee, US, 7-year post-launch horizon, launch date December 2017. That date anchors the J-code transition window and everything downstream. Let's move into building the patient funnel, starting with the population base."
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
    text: "Before we set a diagnosis rate, let's validate the underlying data. Here's the Year 1 IMS PharMetrics count of insured OA Knee diagnosed patients by age bracket, plus our uninsured estimate.",
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
    getAssumptions: () => [{k:'Diagnosis Data Source', v:'Year 1 IMS PharMetrics (Default)'}]
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
    id: 'stage3_q4_intro',
    who: 'ai',
    text: "These seven inputs (IAS Treated % of Diagnosed, IAS Treated % Growth Rate, HA Ratio to IAS Treated, HA Ratio Growth Rate, IAS and HA Treated (Both), Initial Additional Market Growth, and Annual Decay Rate of Additional Market Growth) are set from our existing primary market research, you can use the slider below to adjust the values as per your requirement"
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
    viewFile: 'step 5.csv'
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
    text: "Good — applying the existing physician split."
  },
  {
    id: 'stage5_intro',
    who: 'ai',
    text: "Peak preference share is pulled from a primary-research lookup matrix keyed on the full product profile — whether WOMAC pain-score and diabetes/glycemic data exist, whether refrigeration is required, and the WAC price point — then reweighted using newer market research (separately for Ortho vs. Rheum/PCP) and discounted for typical survey overstatement bias. Price isn't a simple multiplier here: a different price selects an entirely different row of the preference-share matrix. If you have your own data then you can upload it as well.",
    hasUpload: true,
    viewFile: '3rd_excel.csv'
  },
  {
    id: 'stage5_intro_a',
    who: 'user',
    text: "No, use the existing research.",
    getAssumptions: () => [{k:'Peak Preference Share Data', v:'Existing primary-research lookup matrix (Default)'}]
  },
  {
    id: 'stage5_intro_summary',
    who: 'ai',
    text: "Got it. Next, let's talk product profile and physician preference."
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
    text: "Based on primary research and competitive intelligence, we'd typically flag three: Product Y, Product Z, and the Product W class."
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
    text: "Good — I'll model Product Y, Product Z, and the Product W class. Starting with Product Y..."
  },
  {
    id: 'stage11_q1a',
    who: 'ai',
    text: "When — if ever — does Product Y launch?",
    controls: [
      { type: 'dateOrNever', key: 'cingalLaunchDate', label: 'Product Y Launch Date' }
    ],
    getUserReply: (s) => `${s.cingalLaunchDate === 'does_not_launch' ? 'Does Not Launch' : s.cingalLaunchDate}`,
    getAssumptions: (s) => [
      {k:'Product Y Launch', v: s.cingalLaunchDate === 'does_not_launch' ? 'Never' : s.cingalLaunchDate}
    ]
  },
  {
    id: 'stage11_q1b',
    who: 'ai',
    text: "Once Product Y launches, what % of Ortho/Rheum share do we retain?",
    controls: [
      { type: 'slider', key: 'cingalRetentionOrtho', label: 'Retention Ortho', stops: [0.70, 0.72, 0.74, 0.78, 0.90], unit: '%' }
    ],
    getUserReply: (s) => `${(s.cingalRetentionOrtho*100).toFixed(0)}% retention.`,
    getAssumptions: (s) => [
      {k:'Product Y Retention ORS', v: `${(s.cingalRetentionOrtho*100).toFixed(0)}%`}
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
      {k:'Product Y Retention PCP', v: `${(s.cingalRetentionPCP*100).toFixed(0)}%`}
    ]
  },
  {
    id: 'stage11_q2',
    who: 'ai',
    text: "Next, Product Z — base case is typically Does Not Launch.",
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
    id: 'stage13_intro',
    who: 'ai',
    text: "Continuing the competitive landscape scoped in Step 11 — last one, the Product W class."
  },
  {
    id: 'stage13_q1a',
    who: 'ai',
    text: "When — if ever — does Product W launch?",
    controls: [
      { type: 'dateOrNever', key: 'antiNGFLaunchDate', label: 'Product W Launch Date' }
    ],
    getUserReply: (s) => `${s.antiNGFLaunchDate === 'does_not_launch' ? 'Does Not Launch' : s.antiNGFLaunchDate}`,
    getAssumptions: (s) => [
      {k:'Product W Launch', v: s.antiNGFLaunchDate === 'does_not_launch' ? 'Never' : s.antiNGFLaunchDate}
    ]
  },
  {
    id: 'stage13_q1b',
    who: 'ai',
    text: "What % share retained by Ortho/Rheum once the Product W class is live?",
    controls: [
      { type: 'slider', key: 'antiNGFRetentionOrtho', label: 'Retention Ortho', stops: [0.80, 0.85, 0.90, 0.95, 1.00], unit: '%' }
    ],
    getUserReply: (s) => `${(s.antiNGFRetentionOrtho*100).toFixed(0)}% retention.`,
    getAssumptions: (s) => [
      {k:'Product W Retention ORS', v: `${(s.antiNGFRetentionOrtho*100).toFixed(0)}%`}
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
      {k:'Product W Retention PCP', v: `${(s.antiNGFRetentionPCP*100).toFixed(0)}%`}
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
    id: 'stage16_intro',
    who: 'ai',
    text: "For seasonality, the default pattern is modeled on Product V's actual 2013-15 monthly volumes, since Product X has no launch history of its own yet."
  },
  {
    id: 'stage16_q1',
    who: 'ai',
    text: "Is there a more relevant analog product, or actual observed Product X data, you'd like me to upload and use instead?",
    hasUpload: true
  },
  {
    id: 'stage16_a1',
    who: 'user',
    text: "Use the Product V pattern for now."
  },
  {
    id: 'stage16_summary',
    who: 'ai',
    text: "Good — applying the Product V-based seasonality index across all months."
  },
  {
    id: 'stage17_summary',
    who: 'ai',
    text: "This step corrects for the actual number of selling days in each specific month — it's a fixed calendar calculation, no input needed unless your business day assumptions change."
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

  const [openSections, setOpenSections] = useState<Set<number>>(new Set([0, 1]));
  const [openMainGroups, setOpenMainGroups] = useState<Set<string>>(new Set(['Forecast Setup & Market Alignment', 'Foundation / Data', 'Core Demand Modeling', 'Access & Competitive Friction Adjustments', 'Volume & Revenue Output']));
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

  const handleScenarioChange = (key: keyof ForecastState, value: number | string | boolean) => {
    setScenarioState(prev => ({ ...prev, [key]: value as never }));
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
      goPage(5);
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
  const baseF = computeForecast(defaultState);

  const getRebasedForecast = (customState: ForecastState) => {
    const rawF = computeForecast(customState);
    const rebasedRev = rawF.years.map((y, i) => {
      const baseModeled = baseF.revenue[i] || 1;
      const currentModeled = rawF.revenue[i] || 0;
      const actual = (rawF as any).zilrettaActuals[i] || 0;
      const ratio = currentModeled / baseModeled;
      return actual * ratio;
    });
    rawF.revenue = rebasedRev;
    rawF.peakRevenue = Math.max(...rebasedRev);
    let _cum = 0;
    rawF.cumulativeRevenue = rebasedRev.map(r => { _cum += r; return _cum; });
    return rawF;
  };

  const f = getRebasedForecast(state);
  const scenarioF = getRebasedForecast(scenarioState);
  const fAnnual = {
    labels: buildSequentialLabels('Year ', Math.max(f.revenue.length - 1, 0)),
    revenue: f.revenue.slice(1),
    cumulativeRevenue: f.cumulativeRevenue.slice(1),
    share: f.share.slice(1),
    treatments: (f as any).zilrettaTreatments?.slice(1) ?? [],
    actuals: (f as any).zilrettaActuals?.slice(1) ?? []
  };
  const scenarioAnnual = {
    labels: buildSequentialLabels('Year ', Math.max(scenarioF.revenue.length - 1, 0)),
    revenue: scenarioF.revenue.slice(1),
    cumulativeRevenue: scenarioF.cumulativeRevenue.slice(1),
    share: scenarioF.share.slice(1),
    treatments: (scenarioF as any).zilrettaTreatments?.slice(1) ?? [],
    actuals: (scenarioF as any).zilrettaActuals?.slice(1) ?? []
  };

  const monthlyTreatmentSeries = buildInterpolatedSeries(
    fAnnual.treatments.map((v: number) => Number(v)),
    MONTH_LABELS_60.length
  ).map((v: number) => Math.round(v));
  const monthlyShareSeries = buildInterpolatedSeries(fAnnual.share, MONTH_LABELS_60.length);
  const peakYearIndex = f.revenue.reduce((bestIdx, value, idx, arr) => (
    value > arr[bestIdx] ? idx : bestIdx
  ), 0);
  const launchYear = state.launchDate === 'does_not_launch' ? null : Number(state.launchDate.slice(0, 4));
  const peakCalendarYear = launchYear !== null && !Number.isNaN(launchYear)
    ? launchYear + Math.ceil(state.yearsToPeak)
    : null;
  const peakTreatedPatients = f.patients[peakYearIndex] ?? f.adjustedPeakPatients ?? 0;
  const peakAnnualInjections = peakTreatedPatients * state.injectionsPerYear;
  const peakGrossRevenue = peakAnnualInjections * state.wacPrice;
  const payerAccessLabels: Record<ForecastState['payerAccessRequirement'], string> = {
    none: 'no formal access hurdle',
    prior_auth_only: 'prior auth only',
    pre_cert: 'pre-cert',
    pre_cert_step_edit: 'pre-cert + step edit',
    prior_auth_plus_step_edit: 'prior auth + step edit'
  };
  const modeledCompetitorLaunches = [
    { name: 'Product Y', launchDate: state.cingalLaunchDate, orthoRetention: state.cingalRetentionOrtho, pcpRetention: state.cingalRetentionPCP },
    { name: 'Product Z', launchDate: state.ampionLaunchDate, orthoRetention: state.ampionRetentionOrtho, pcpRetention: state.ampionRetentionPCP },
    { name: 'Product W', launchDate: state.antiNGFLaunchDate, orthoRetention: state.antiNGFRetentionOrtho, pcpRetention: state.antiNGFRetentionPCP }
  ].reduce<Array<{ name: string; launchDate: string; launchYear: number; orthoRetention: number; pcpRetention: number }>>((acc, item) => {
    if (item.launchDate === 'does_not_launch') return acc;
    const launchYearValue = Number(item.launchDate.slice(0, 4));
    if (Number.isNaN(launchYearValue)) return acc;
    acc.push({ ...item, launchDate: item.launchDate, launchYear: launchYearValue });
    return acc;
  }, []).sort((a, b) => a.launchYear - b.launchYear);
  const earliestCompetitorLaunch = modeledCompetitorLaunches[0] ?? null;



  // Compare scenarios
  const down = { ...state, peakShare: state.peakShare * 0.6, netPrice: state.netPrice * 0.85, yearsToPeak: state.yearsToPeak + 1 };
  const up = { ...state, peakShare: Math.min(0.6, state.peakShare * 1.4), netPrice: state.netPrice * 1.1, yearsToPeak: Math.max(2, state.yearsToPeak - 1) };
  const defaultScenarios = [
    { name: 'Base', tag: 'tag-base', s: state }
  ];
  const scenarios = [...defaultScenarios, ...savedScenarios];

  const renderAssumptions = (asDropdown = false, isScenario = false, hideSlider = false) => {
    const s = isScenario ? scenarioState : state;
    const h = isScenario ? handleScenarioChange : handleStateChange;
    let sn = 1;
    const l = (lbl: string) => asDropdown ? lbl : `${sn++}. ${lbl}`;
    return (
    <SliderContext.Provider value={{ scenariosEnabledMap, setScenariosEnabledMap, customCentersMap, setCustomCentersMap }}>
      <CollapsibleMainGroup title="1. Forecast setup" isOpen={openMainGroups.has('1. Forecast setup')} onToggle={() => toggleMainGroup('1. Forecast setup')}>
        <div style={{ padding: '12px 16px', backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)', fontSize: '13.5px', color: 'var(--text)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px' }}>
            <strong>Product:</strong> <span>Product X</span>
            <strong>Indication:</strong> <span>OA Knee only</span>
            <strong>Geography:</strong> <span>US only</span>
          </div>
        </div>
        <AccordionSection idx={0} title="1A. Key Dates" color="#34495e" isOpen={openSections.has(0)} onQuickSet={(level) => handleQuickSet(0, level)} onToggle={() => toggleSection(0)}>
          <DateOrNeverControl label={l("Product Approval Date (Start of Promotion)")} fieldKey="launchDate" value={s.launchDate} onChange={v => h('launchDate', v)} />
          <DateOrNeverControl label={l("Availability Date (must be ≥ 1A)")} fieldKey="availabilityDate" value={s.availabilityDate} onChange={v => h('availabilityDate', v)} />
        </AccordionSection>
      </CollapsibleMainGroup>

      <CollapsibleMainGroup title="2. Demand" isOpen={openMainGroups.has('2. Demand')} onToggle={() => toggleMainGroup('2. Demand')}>
        {!asDropdown && (
          <AccordionSection idx={101} title="2A. US Population Census" color="#2980b9" isOpen={openSections.has(101)} onQuickSet={(level) => handleQuickSet(101, level)} onToggle={() => toggleSection(101)}>
            <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--text)' }}>
                US Population Census (by Year & Age Bucket)
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn secondary" onClick={() => document.getElementById('upload-census')?.click()} style={{ padding: '6px 12px', fontSize: '13px' }}>
                  <span style={{ marginRight: '6px' }}>📎</span> Upload File
                </button>
                <input type="file" id="upload-census" accept=".xlsx, .csv" style={{ display: 'none' }} onChange={(e) => { e.target.value = ''; }} />
                <button className="btn secondary" onClick={() => handleViewFile('Book1.csv')} style={{ padding: '6px 12px', fontSize: '13px' }}>
                  <span style={{ marginRight: '6px' }}>👁️</span> View current data
                </button>
              </div>
            </div>
          </AccordionSection>
        )}

        <AccordionSection idx={1} title="2B. Patient Universe & Diagnosis" color="#1a9e75" isOpen={openSections.has(1)} onQuickSet={(level) => handleQuickSet(1, level)} onToggle={() => toggleSection(1)}>
          <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid var(--border)', marginBottom: '8px', paddingBottom: '12px' }}>
            <div style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--text)' }}>
              Year 1 IMS OA Knee Diagnosed Patients — Insured & Uninsured (by Age) <InfoTooltip text="Conservative = 0% of uninsured diagnosed; Aggressive = uninsured diagnosed at the same rate as insured — this is what sets the 2A range" />
            </div>
            {!asDropdown && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn secondary" onClick={() => document.getElementById('upload-ims')?.click()} style={{ padding: '6px 12px', fontSize: '13px' }}>
                  <span style={{ marginRight: '6px' }}>📎</span> Upload File
                </button>
                <input type="file" id="upload-ims" accept=".xlsx, .csv" style={{ display: 'none' }} onChange={(e) => { e.target.value = ''; }} />
                <button className="btn secondary" onClick={() => handleViewFile('insured and uninsured patients.csv')} style={{ padding: '6px 12px', fontSize: '13px' }}>
                  <span style={{ marginRight: '6px' }}>👁️</span> View current data
                </button>
              </div>
            )}
          </div>
          <SliderControl asDropdown={asDropdown} hideSlider={hideSlider} label={l("Diagnosis rate (base year)")} fieldKey="diagnosisRate" stops={[0.048, 0.049, 0.051, 0.052, 0.053]} currentValue={s.diagnosisRate} unit="%" onAskAI={() => openAiModal('diagnosisRate')} onChange={v => h('diagnosisRate', v)} />
          <SliderControl asDropdown={asDropdown} hideSlider={hideSlider} label={l("Diagnosis annual growth rate")} fieldKey="diagnosisAnnualGrowthRate" stops={[0.019, 0.025, 0.032, 0.045, 0.055]} currentValue={s.diagnosisAnnualGrowthRate} unit="%" onAskAI={() => openAiModal('diagnosisAnnualGrowthRate')} onChange={v => h('diagnosisAnnualGrowthRate', v)} />
        </AccordionSection>

        <AccordionSection idx={2} title="2C. Treatment Split" color="#e07b2a" isOpen={openSections.has(2)} onQuickSet={(level) => handleQuickSet(2, level)} onToggle={() => toggleSection(2)}>
          <SliderControl asDropdown={asDropdown} hideSlider={hideSlider} label={l("IAS treated % of diagnosed (base yr)")} fieldKey="iasTreatedPctOfDiagnosed" stops={[0.244, 0.264, 0.284, 0.304, 0.324]} currentValue={s.iasTreatedPctOfDiagnosed} unit="%" onAskAI={() => openAiModal('iasTreatedPctOfDiagnosed')} onChange={v => h('iasTreatedPctOfDiagnosed', v)} />
          <SliderControl asDropdown={asDropdown} hideSlider={hideSlider} label={l("IAS treated annual growth rate")} fieldKey="iasTreatedGrowthRate" stops={[0.01, 0.02, 0.03, 0.035, 0.04]} currentValue={s.iasTreatedGrowthRate} unit="%" onAskAI={() => openAiModal('iasTreatedGrowthRate')} onChange={v => h('iasTreatedGrowthRate', v)} />
          <SliderControl asDropdown={asDropdown} hideSlider={hideSlider} label={l("HA-to-IAS ratio")} fieldKey="haRatioToIAS" stops={[0.30, 0.40, 0.45, 0.50, 0.55]} currentValue={s.haRatioToIAS} unit="%" onAskAI={() => openAiModal('haRatioToIAS')} onChange={v => h('haRatioToIAS', v)} />
          <SliderControl asDropdown={asDropdown} hideSlider={hideSlider} label={l("HA ratio annual growth rate")} fieldKey="haRatioGrowthRate" stops={[-0.02, -0.015, -0.01, -0.005, 0.0]} currentValue={s.haRatioGrowthRate} unit="%" onAskAI={() => openAiModal('haRatioGrowthRate')} onChange={v => h('haRatioGrowthRate', v)} />
          <SliderControl asDropdown={asDropdown} hideSlider={hideSlider} label={l("IAS+HA treated (both) %")} fieldKey="iasAndHATreatedBoth" stops={[0.10, 0.125, 0.15, 0.175, 0.20]} currentValue={s.iasAndHATreatedBoth} unit="%" onAskAI={() => openAiModal('iasAndHATreatedBoth')} onChange={v => h('iasAndHATreatedBoth', v)} />
          <SliderControl asDropdown={asDropdown} hideSlider={hideSlider} label={l("Initial promotional market lift")} fieldKey="initialAdditionalMarketGrowth" stops={[0.025, 0.035, 0.045, 0.055, 0.065]} currentValue={s.initialAdditionalMarketGrowth} unit="%" onAskAI={() => openAiModal('initialAdditionalMarketGrowth')} onChange={v => h('initialAdditionalMarketGrowth', v)} />
          <SliderControl asDropdown={asDropdown} hideSlider={hideSlider} label={l("Annual decay of promo lift")} fieldKey="annualDecayRateOfAdditionalGrowth" stops={[0.15, 0.175, 0.20, 0.225, 0.25]} currentValue={s.annualDecayRateOfAdditionalGrowth} unit="%" onAskAI={() => openAiModal('annualDecayRateOfAdditionalGrowth')} onChange={v => h('annualDecayRateOfAdditionalGrowth', v)} />
          <div style={{ padding: '12px 0 8px 0', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border)', marginTop: '8px' }}>
            <div style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--text)' }}>
              Rx Analysis — Treatment Share × Physician Type
            </div>
            {!asDropdown && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn secondary" onClick={() => document.getElementById('upload-rx')?.click()} style={{ padding: '6px 12px', fontSize: '13px' }}>
                  <span style={{ marginRight: '6px' }}>📎</span> Upload File
                </button>
                <input type="file" id="upload-rx" accept=".xlsx, .csv" style={{ display: 'none' }} onChange={(e) => { e.target.value = ''; }} />
                <button className="btn secondary" onClick={() => handleViewFile('step 5.csv')} style={{ padding: '6px 12px', fontSize: '13px' }}>
                  <span style={{ marginRight: '6px' }}>👁️</span> View current data
                </button>
              </div>
            )}
          </div>
        </AccordionSection>
      </CollapsibleMainGroup>

      <CollapsibleMainGroup title="3. Share" isOpen={openMainGroups.has('3. Share')} onToggle={() => toggleMainGroup('3. Share')}>
        <AccordionSection idx={3} title="3A. Product Profile & Preference" color="#e07b2a" isOpen={openSections.has(3)} onQuickSet={(level) => handleQuickSet(3, level)} onToggle={() => toggleSection(3)}>
          <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid var(--border)', marginBottom: '8px', paddingBottom: '12px' }}>
            <div style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--text)' }}>
              Primary market research for peak share
            </div>
            {!asDropdown && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn secondary" onClick={() => document.getElementById('upload-pmr')?.click()} style={{ padding: '6px 12px', fontSize: '13px' }}>
                  <span style={{ marginRight: '6px' }}>📎</span> Upload File
                </button>
                <input type="file" id="upload-pmr" accept=".xlsx, .csv" style={{ display: 'none' }} onChange={(e) => { e.target.value = ''; }} />
                <button className="btn secondary" onClick={() => handleViewFile('3rd_excel.csv')} style={{ padding: '6px 12px', fontSize: '13px' }}>
                  <span style={{ marginRight: '6px' }}>👁️</span> View current data
                </button>
              </div>
            )}
          </div>
          <SliderControl asDropdown={asDropdown} hideSlider={hideSlider} label={l("Overstatement adjustment factor")} fieldKey="overstatementAdjFactor" stops={[0.10, 0.16, 0.22, 0.25, 0.30]} currentValue={s.overstatementAdjFactor} unit="%" onAskAI={() => openAiModal('overstatementAdjFactor')} onChange={v => h('overstatementAdjFactor', v)} />
          <ToggleControl label={l("WOMAC pain-score data available?")} fieldKey="womacScoreAvailable" value={s.womacScoreAvailable} onChange={v => h('womacScoreAvailable', v)} />
          <ToggleControl label={l("Diabetes/glycemic data available?")} fieldKey="diabetesGlycemicDataAvailable" value={s.diabetesGlycemicDataAvailable} onChange={v => h('diabetesGlycemicDataAvailable', v)} />
          <SliderControl asDropdown={asDropdown} hideSlider={hideSlider} label={l("WAC price per injection")} fieldKey="wacPrice" stops={[400, 500, 575, 800, 1000]} currentValue={s.wacPrice} unit="$" onAskAI={() => openAiModal('wacPrice')} onChange={v => h('wacPrice', v)} />
          <SliderControl asDropdown={asDropdown} hideSlider={hideSlider} label={l("Market research adj. — Ortho")} fieldKey="newMarketResearchAdjOrtho" stops={[0.95, 1.10, 1.25, 1.40, 1.55]} currentValue={s.newMarketResearchAdjOrtho} unit="%" onAskAI={() => openAiModal('newMarketResearchAdjOrtho')} onChange={v => h('newMarketResearchAdjOrtho', v)} />
          <SliderControl asDropdown={asDropdown} hideSlider={hideSlider} label={l("Market research adj. — Rheum/PCP")} fieldKey="newMarketResearchAdjRheum" stops={[0.90, 0.95, 1.00, 1.05, 1.10]} currentValue={s.newMarketResearchAdjRheum} unit="%" onAskAI={() => openAiModal('newMarketResearchAdjRheum')} onChange={v => h('newMarketResearchAdjRheum', v)} />
        </AccordionSection>
      </CollapsibleMainGroup>

      <CollapsibleMainGroup title="4. Adjustments (Competitive and Payer Friction)" isOpen={openMainGroups.has('4. Adjustments (Competitive and Payer Friction)')} onToggle={() => toggleMainGroup('4. Adjustments (Competitive and Payer Friction)')}>
        <AccordionSection idx={4} title="4A. Payer Access" color="#d9534f" isOpen={openSections.has(4)} onQuickSet={(level) => handleQuickSet(4, level)} onToggle={() => toggleSection(4)}>
          <SelectControl label={l("Payer access requirement")} fieldKey="payerAccessRequirement" options={[{value: 'none', label: 'None'}, {value: 'prior_auth_only', label: 'Prior Auth'}, {value: 'pre_cert', label: 'Pre-Cert'}, {value: 'pre_cert_step_edit', label: 'Pre-Cert + Step Edit'}, {value: 'prior_auth_plus_step_edit', label: 'PA + Step Edit'}]} value={s.payerAccessRequirement} onAskAI={() => openAiModal('payerAccessRequirement')} onChange={v => h('payerAccessRequirement', v)} />
          <SliderControl asDropdown={asDropdown} hideSlider={hideSlider} label={l("Pricing adj. — access impact (% surviving)")} fieldKey="pricingAdjFactorAccessImpact" stops={[0.90, 0.92, 0.96, 0.97, 0.98]} currentValue={s.pricingAdjFactorAccessImpact} unit="%" onAskAI={() => openAiModal('pricingAdjFactorAccessImpact')} onChange={v => h('pricingAdjFactorAccessImpact', v)} />
          <ToggleControl label={l("Patient assistance program in place?")} fieldKey="patientAssistanceProgramInPlace" value={s.patientAssistanceProgramInPlace} onChange={v => h('patientAssistanceProgramInPlace', v)} />
          <SliderControl asDropdown={asDropdown} hideSlider={hideSlider} label={l("Pricing adj. — PAP lift")} fieldKey="pricingAdjPatientAssistanceImpact" stops={[1.00, 1.05, 1.10, 1.15, 1.20]} currentValue={s.pricingAdjPatientAssistanceImpact} unit="%" onAskAI={() => openAiModal('pricingAdjPatientAssistanceImpact')} onChange={v => h('pricingAdjPatientAssistanceImpact', v)} />
        </AccordionSection>

        <AccordionSection idx={5} title="4B. Market Uptake & Reach" color="#5b6abf" isOpen={openSections.has(5)} onQuickSet={(level) => handleQuickSet(5, level)} onToggle={() => toggleSection(5)}>
          <SliderControl asDropdown={asDropdown} hideSlider={hideSlider} label={l("Years to peak share")} fieldKey="yearsToPeak" stops={[7, 6, 5, 4, 3]} currentValue={s.yearsToPeak} unit=" yrs" onAskAI={() => openAiModal('yearsToPeak')} onChange={v => h('yearsToPeak', v)} />
        </AccordionSection>

        <AccordionSection idx={6} title="4C. Access Friction" color="#d9534f" isOpen={openSections.has(6)} onQuickSet={(level) => handleQuickSet(6, level)} onToggle={() => toggleSection(6)}>
          <SliderControl asDropdown={asDropdown} hideSlider={hideSlider} label={l("J-Code window duration")} fieldKey="jCodeWindowMonths" stops={[6, 9, 12, 15, 18]} currentValue={s.jCodeWindowMonths} unit=" mo" onAskAI={() => openAiModal('jCodeWindowMonths')} onChange={v => h('jCodeWindowMonths', v)} />
          <SliderControl asDropdown={asDropdown} hideSlider={hideSlider} label={l("J-Code retention rate (misc code)")} fieldKey="jCodeRetentionRate" stops={[0.80, 0.84, 0.88, 0.91, 0.94]} currentValue={s.jCodeRetentionRate} unit="%" onAskAI={() => openAiModal('jCodeRetentionRate')} onChange={v => h('jCodeRetentionRate', v)} />
          <SliderControl asDropdown={asDropdown} hideSlider={hideSlider} label={l("Refrigeration requirement duration")} fieldKey="refrigerationDurationMonths" stops={[12, 15, 18, 24, 120]} currentValue={s.refrigerationDurationMonths} unit=" mo" onAskAI={() => openAiModal('refrigerationDurationMonths')} onChange={v => h('refrigerationDurationMonths', v)} />
          <SliderControl asDropdown={asDropdown} hideSlider={hideSlider} label={l("Refrigeration retention — Ortho/Surgical")} fieldKey="refrigerationRetentionORS" stops={[0.70, 0.80, 0.88, 0.92, 0.95]} currentValue={s.refrigerationRetentionORS} unit="%" onAskAI={() => openAiModal('refrigerationRetentionORS')} onChange={v => h('refrigerationRetentionORS', v)} />
          <SliderControl asDropdown={asDropdown} hideSlider={hideSlider} label={l("Refrigeration retention — Rheum/Other")} fieldKey="refrigerationRetentionRheumOther" stops={[0.70, 0.80, 0.88, 0.92, 0.95]} currentValue={s.refrigerationRetentionRheumOther} unit="%" onAskAI={() => openAiModal('refrigerationRetentionRheumOther')} onChange={v => h('refrigerationRetentionRheumOther', v)} />
        </AccordionSection>

        <AccordionSection idx={7} title="4D. Competitive Events" color="#c0392b" isOpen={openSections.has(7)} onQuickSet={(level) => handleQuickSet(7, level)} onToggle={() => toggleSection(7)}>
          <div className="competitor-card">
            <div className="competitor-card-title">Product Y</div>
            <DateOrNeverControl label={l("Launch Date")} fieldKey="cingalLaunchDate" value={s.cingalLaunchDate} onChange={v => h('cingalLaunchDate', v)} />
            <SliderControl asDropdown={asDropdown} hideSlider={hideSlider} label={l("Retention Ortho")} fieldKey="cingalRetentionOrtho" stops={[0.70, 0.72, 0.74, 0.78, 0.90]} currentValue={s.cingalRetentionOrtho} unit="%" onAskAI={() => openAiModal('cingalRetentionOrtho')} onChange={v => h('cingalRetentionOrtho', v)} />
            <SliderControl asDropdown={asDropdown} hideSlider={hideSlider} label={l("Retention PCP")} fieldKey="cingalRetentionPCP" stops={[0.80, 0.82, 0.85, 0.90, 1.00]} currentValue={s.cingalRetentionPCP} unit="%" onAskAI={() => openAiModal('cingalRetentionPCP')} onChange={v => h('cingalRetentionPCP', v)} />
          </div>
          
          <div className="competitor-card">
            <div className="competitor-card-title">Product Z — base case: Does Not Launch</div>
            <DateOrNeverControl label={l("Launch Date")} fieldKey="ampionLaunchDate" value={s.ampionLaunchDate} onChange={v => h('ampionLaunchDate', v)} />
            <SliderControl asDropdown={asDropdown} hideSlider={hideSlider} label={l("Retention Ortho")} fieldKey="ampionRetentionOrtho" stops={[0.75, 0.80, 0.865, 0.90, 0.95]} currentValue={s.ampionRetentionOrtho} unit="%" onAskAI={() => openAiModal('ampionRetentionOrtho')} onChange={v => h('ampionRetentionOrtho', v)} />
            <SliderControl asDropdown={asDropdown} hideSlider={hideSlider} label={l("Retention PCP")} fieldKey="ampionRetentionPCP" stops={[0.75, 0.80, 0.84, 0.90, 0.95]} currentValue={s.ampionRetentionPCP} unit="%" onAskAI={() => openAiModal('ampionRetentionPCP')} onChange={v => h('ampionRetentionPCP', v)} />
          </div>

          <div className="competitor-card">
            <div className="competitor-card-title">Anti-NGF class</div>
            <DateOrNeverControl label={l("Launch Date")} fieldKey="antiNGFLaunchDate" value={s.antiNGFLaunchDate} onChange={v => h('antiNGFLaunchDate', v)} />
            <SliderControl asDropdown={asDropdown} hideSlider={hideSlider} label={l("Retention Ortho")} fieldKey="antiNGFRetentionOrtho" stops={[0.80, 0.85, 0.90, 0.95, 1.00]} currentValue={s.antiNGFRetentionOrtho} unit="%" onAskAI={() => openAiModal('antiNGFRetentionOrtho')} onChange={v => h('antiNGFRetentionOrtho', v)} />
            <SliderControl asDropdown={asDropdown} hideSlider={hideSlider} label={l("Retention PCP")} fieldKey="antiNGFRetentionPCP" stops={[0.90, 0.92, 0.95, 0.97, 1.00]} currentValue={s.antiNGFRetentionPCP} unit="%" onAskAI={() => openAiModal('antiNGFRetentionPCP')} onChange={v => h('antiNGFRetentionPCP', v)} />
          </div>
        </AccordionSection>
      </CollapsibleMainGroup>

      <CollapsibleMainGroup title="5. Volume & Revenue Output" isOpen={openMainGroups.has('5. Volume & Revenue Output')} onToggle={() => toggleMainGroup('5. Volume & Revenue Output')}>
        <AccordionSection idx={8} title="5A. Volume & Sampling" color="#7b3fa0" isOpen={openSections.has(8)} onQuickSet={(level) => handleQuickSet(8, level)} onToggle={() => toggleSection(8)}>
          <SliderControl asDropdown={asDropdown} hideSlider={hideSlider} label={l("Injection frequency (per patient/year)")} fieldKey="frequencyOfInjectionsYearly" stops={[1.0, 1.3, 1.5, 1.7, 2.0]} currentValue={s.frequencyOfInjectionsYearly} unit="/yr" onAskAI={() => openAiModal('frequencyOfInjectionsYearly')} onChange={v => h('frequencyOfInjectionsYearly', v)} />
        </AccordionSection>
      </CollapsibleMainGroup>
    </SliderContext.Provider>
  );
  };

  const renderForecastingAlgorithm = () => (
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
  );

  const renderTornadoChart = (isScenario: boolean) => {
    const currentBasePeak = isScenario ? scenarioF.peakRevenue : f.peakRevenue;
    const currentImpacts = [
      { name: 'Net price (direct)', low: -(sensitivityLevel === 5 ? 0.05 : 0.10) * currentBasePeak, high: (sensitivityLevel === 5 ? 0.05 : 0.10) * currentBasePeak },
      { name: 'Adherence boost', low: -(sensitivityLevel === 5 ? 0.05 : 0.10) * currentBasePeak, high: (sensitivityLevel === 5 ? 0.05 : 0.10) * currentBasePeak },
      { name: 'Peak share', low: -(sensitivityLevel === 5 ? 0.042 : 0.09) * currentBasePeak, high: (sensitivityLevel === 5 ? 0.042 : 0.09) * currentBasePeak },
      { name: 'Addressable share', low: -(sensitivityLevel === 5 ? 0.04 : 0.085) * currentBasePeak, high: (sensitivityLevel === 5 ? 0.04 : 0.085) * currentBasePeak },
      { name: 'Diagnosis rate', low: -(sensitivityLevel === 5 ? 0.037 : 0.08) * currentBasePeak, high: (sensitivityLevel === 5 ? 0.037 : 0.08) * currentBasePeak }
    ];
    const tabCheck = isScenario ? 6 : 5;

    return (
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0 }}>Scenario impacts on peak revenue</h3>
          <select 
            value={sensitivityLevel} 
            onChange={e => setSensitivityLevel(Number(e.target.value) as 5 | 10)}
            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }}
          >
            <option value={5}>±5% Sensitivity</option>
            <option value={10}>±10% Sensitivity</option>
          </select>
        </div>
        <div className="canvas-wrap">
          {activeTab === tabCheck && <Bar 
            options={{
              responsive: true,
              maintainAspectRatio: false,
              indexAxis: 'y',
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (ctx: any) => {
                      const val = ctx.raw as number;
                      const sign = val > 0 ? '+' : '';
                      return `Impact: ${sign}${fmtM(Number(val))}`;
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
              labels: currentImpacts.map(i => i.name),
              datasets: [
                {
                  label: 'Low Case',
                  data: currentImpacts.map(i => i.low),
                  backgroundColor: '#f87171',
                  borderRadius: 4
                },
                {
                  label: 'High Case',
                  data: currentImpacts.map(i => i.high),
                  backgroundColor: '#34d399',
                  borderRadius: 4
                }
              ]
            }}
          />}
        </div>
      </div>
    );
  };

// =============================================================================
// DROP-IN REPLACEMENT for `exportScenariosHTML`
// -----------------------------------------------------------------------------
// Replace the ENTIRE existing function (find markers below in your page.tsx).
// The button in the Export tab already calls onClick={exportScenariosHTML}
// so no button change is needed. The function is async but onClick handles that fine.
// =============================================================================

const exportScenariosHTML = async () => {
  // ----- Control schema (drives the live sidebar in the exported HTML) -----
  const exportControlSchema = [
    { mainGroup: '2. Demand', subGroup: '2B. Patient Universe & Diagnosis', type: 'range', key: 'diagnosisRate', label: 'Diagnosis rate', min: 0.03, max: 0.08, step: 0.001, unit: '%' },
    { mainGroup: '2. Demand', subGroup: '2B. Patient Universe & Diagnosis', type: 'range', key: 'diagnosisAnnualGrowthRate', label: 'Diagnosis annual growth', min: 0.01, max: 0.06, step: 0.001, unit: '%' },
    { mainGroup: '2. Demand', subGroup: '2B. Patient Universe & Diagnosis', type: 'range', key: 'treatmentRate', label: 'Treatment rate', min: 0.80, max: 0.98, step: 0.005, unit: '%' },
    { mainGroup: '2. Demand', subGroup: '2B. Patient Universe & Diagnosis', type: 'range', key: 'addressableShare', label: 'Addressable share', min: 0.40, max: 0.80, step: 0.01, unit: '%' },
    { mainGroup: '2. Demand', subGroup: '2C. Treatment Split', type: 'range', key: 'iasTreatedPctOfDiagnosed', label: 'IAS treated % of diagnosed', min: 0.20, max: 0.40, step: 0.005, unit: '%' },
    { mainGroup: '2. Demand', subGroup: '2C. Treatment Split', type: 'range', key: 'iasTreatedGrowthRate', label: 'IAS treated annual growth', min: 0.00, max: 0.05, step: 0.005, unit: '%' },
    { mainGroup: '2. Demand', subGroup: '2C. Treatment Split', type: 'range', key: 'haRatioToIAS', label: 'HA ratio to IAS', min: 0.25, max: 0.60, step: 0.01, unit: '%' },
    { mainGroup: '2. Demand', subGroup: '2C. Treatment Split', type: 'range', key: 'haRatioGrowthRate', label: 'HA ratio annual growth', min: -0.02, max: 0.02, step: 0.005, unit: '%' },
    { mainGroup: '2. Demand', subGroup: '2C. Treatment Split', type: 'range', key: 'iasAndHATreatedBoth', label: 'Both IAS + HA', min: 0.05, max: 0.25, step: 0.005, unit: '%' },
    { mainGroup: '2. Demand', subGroup: '2C. Treatment Split', type: 'range', key: 'initialAdditionalMarketGrowth', label: 'Promotion lift', min: 0.00, max: 0.10, step: 0.005, unit: '%' },
    { mainGroup: '2. Demand', subGroup: '2C. Treatment Split', type: 'range', key: 'annualDecayRateOfAdditionalGrowth', label: 'Promotion decay', min: 0.10, max: 0.30, step: 0.005, unit: '%' },
    { mainGroup: '3. Share', subGroup: '3A. Product Profile & Preference', type: 'range', key: 'peakShare', label: 'Peak share', min: 0.10, max: 0.40, step: 0.005, unit: '%' },
    { mainGroup: '3. Share', subGroup: '3A. Product Profile & Preference', type: 'range', key: 'overstatementAdjFactor', label: 'Overstatement discount', min: 0.05, max: 0.40, step: 0.01, unit: '%' },
    { mainGroup: '3. Share', subGroup: '3A. Product Profile & Preference', type: 'toggle', key: 'womacScoreAvailable', label: 'WOMAC score data available' },
    { mainGroup: '3. Share', subGroup: '3A. Product Profile & Preference', type: 'toggle', key: 'diabetesGlycemicDataAvailable', label: 'Diabetes/glycemic data available' },
    { mainGroup: '3. Share', subGroup: '3A. Product Profile & Preference', type: 'range', key: 'wacPrice', label: 'WAC price', min: 400, max: 1000, step: 25, unit: '$' },
    { mainGroup: '3. Share', subGroup: '3A. Product Profile & Preference', type: 'range', key: 'newMarketResearchAdjOrtho', label: 'Ortho research shift', min: -0.05, max: 0.15, step: 0.01, unit: '%' },
    { mainGroup: '3. Share', subGroup: '3A. Product Profile & Preference', type: 'range', key: 'newMarketResearchAdjRheum', label: 'Rheum/PCP research shift', min: -0.05, max: 0.15, step: 0.01, unit: '%' },
    { mainGroup: '4. Adjustments (Competitive and Payer Friction)', subGroup: '4A. Payer Access', type: 'select', key: 'payerAccessRequirement', label: 'Payer access requirement', options: [
      { value: 'none', label: 'None' },
      { value: 'prior_auth_only', label: 'Prior Auth' },
      { value: 'pre_cert', label: 'Pre-Cert' },
      { value: 'pre_cert_step_edit', label: 'Pre-Cert + Step Edit' },
      { value: 'prior_auth_plus_step_edit', label: 'PA + Step Edit' }
    ] },
    { mainGroup: '4. Adjustments (Competitive and Payer Friction)', subGroup: '4A. Payer Access', type: 'range', key: 'pricingAdjFactorAccessImpact', label: 'Access survival rate', min: 0.90, max: 1.00, step: 0.01, unit: '%' },
    { mainGroup: '4. Adjustments (Competitive and Payer Friction)', subGroup: '4A. Payer Access', type: 'toggle', key: 'patientAssistanceProgramInPlace', label: 'Patient assistance program' },
    { mainGroup: '4. Adjustments (Competitive and Payer Friction)', subGroup: '4A. Payer Access', type: 'range', key: 'pricingAdjPatientAssistanceImpact', label: 'Patient assistance lift', min: 0.00, max: 0.20, step: 0.01, unit: '%' },
    { mainGroup: '4. Adjustments (Competitive and Payer Friction)', subGroup: '4B. Market Uptake & Reach', type: 'range', key: 'yearsToPeak', label: 'Years to peak', min: 3, max: 7, step: 1, unit: ' yrs' },
    { mainGroup: '4. Adjustments (Competitive and Payer Friction)', subGroup: '4C. Access Friction', type: 'range', key: 'jCodeWindowMonths', label: 'J-code transition window', min: 0, max: 24, step: 1, unit: ' mo' },
    { mainGroup: '4. Adjustments (Competitive and Payer Friction)', subGroup: '4C. Access Friction', type: 'range', key: 'jCodeRetentionRate', label: 'J-code retention rate', min: 0.60, max: 1.00, step: 0.01, unit: '%' },
    { mainGroup: '4. Adjustments (Competitive and Payer Friction)', subGroup: '4C. Access Friction', type: 'range', key: 'refrigerationDurationMonths', label: 'Refrigeration duration', min: 0, max: 36, step: 3, unit: ' mo' },
    { mainGroup: '4. Adjustments (Competitive and Payer Friction)', subGroup: '4C. Access Friction', type: 'range', key: 'refrigerationRetentionORS', label: 'Refrigeration retention - Ortho', min: 0.70, max: 1.00, step: 0.01, unit: '%' },
    { mainGroup: '4. Adjustments (Competitive and Payer Friction)', subGroup: '4C. Access Friction', type: 'range', key: 'refrigerationRetentionRheumOther', label: 'Refrigeration retention - Rheum/Other', min: 0.70, max: 1.00, step: 0.01, unit: '%' },
    { mainGroup: '4. Adjustments (Competitive and Payer Friction)', subGroup: '4D. Competitive Events', type: 'monthOrNever', key: 'cingalLaunchDate', label: 'Product Y launch date' },
    { mainGroup: '4. Adjustments (Competitive and Payer Friction)', subGroup: '4D. Competitive Events', type: 'range', key: 'cingalRetentionOrtho', label: 'Product Y retention - Ortho', min: 0.60, max: 1.00, step: 0.01, unit: '%' },
    { mainGroup: '4. Adjustments (Competitive and Payer Friction)', subGroup: '4D. Competitive Events', type: 'range', key: 'cingalRetentionPCP', label: 'Product Y retention - PCP', min: 0.60, max: 1.00, step: 0.01, unit: '%' },
    { mainGroup: '4. Adjustments (Competitive and Payer Friction)', subGroup: '4D. Competitive Events', type: 'monthOrNever', key: 'ampionLaunchDate', label: 'Product Z launch date' },
    { mainGroup: '4. Adjustments (Competitive and Payer Friction)', subGroup: '4D. Competitive Events', type: 'range', key: 'ampionRetentionOrtho', label: 'Product Z retention - Ortho', min: 0.60, max: 1.00, step: 0.01, unit: '%' },
    { mainGroup: '4. Adjustments (Competitive and Payer Friction)', subGroup: '4D. Competitive Events', type: 'range', key: 'ampionRetentionPCP', label: 'Product Z retention - PCP', min: 0.60, max: 1.00, step: 0.01, unit: '%' },
    { mainGroup: '4. Adjustments (Competitive and Payer Friction)', subGroup: '4D. Competitive Events', type: 'monthOrNever', key: 'antiNGFLaunchDate', label: 'Product W launch date' },
    { mainGroup: '4. Adjustments (Competitive and Payer Friction)', subGroup: '4D. Competitive Events', type: 'range', key: 'antiNGFRetentionOrtho', label: 'Product W retention - Ortho', min: 0.60, max: 1.00, step: 0.01, unit: '%' },
    { mainGroup: '4. Adjustments (Competitive and Payer Friction)', subGroup: '4D. Competitive Events', type: 'range', key: 'antiNGFRetentionPCP', label: 'Product W retention - PCP', min: 0.60, max: 1.00, step: 0.01, unit: '%' },
    { mainGroup: '5. Volume & Revenue Output', subGroup: '5A. Volume & Sampling', type: 'range', key: 'frequencyOfInjectionsYearly', label: 'Frequency of injections', min: 1.0, max: 3.0, step: 0.1, unit: ' /yr' }
  ];

  const exportAssumptions: Array<{ key: keyof ForecastState; name: string }> = [
    { key: 'diagnosisRate', name: 'Diagnosis rate' },
    { key: 'treatmentRate', name: 'Treatment rate' },
    { key: 'addressableShare', name: 'Addressable share' },
    { key: 'peakShare', name: 'Peak share' },
    { key: 'yearsToPeak', name: 'Years to peak share' },
    { key: 'netPrice', name: 'Net price' },
    { key: 'injectionsPerYear', name: 'Injections per year' },
    { key: 'compliance', name: 'Compliance' },
    { key: 'launchDate', name: 'Launch date' },
    { key: 'availabilityDate', name: 'Availability date' },
    { key: 'forecastHorizonYears', name: 'Forecast horizon' },
    { key: 'diagnosisAnnualGrowthRate', name: 'Diagnosis annual growth rate' },
    { key: 'iasTreatedPctOfDiagnosed', name: 'IAS treated % of diagnosed' },
    { key: 'iasTreatedGrowthRate', name: 'IAS treated annual growth' },
    { key: 'haRatioToIAS', name: 'HA ratio to IAS' },
    { key: 'haRatioGrowthRate', name: 'HA ratio annual growth' },
    { key: 'iasAndHATreatedBoth', name: 'Treated with both (IAS + HA)' },
    { key: 'initialAdditionalMarketGrowth', name: 'Additional market growth' },
    { key: 'annualDecayRateOfAdditionalGrowth', name: 'Additional growth annual decay' },
    { key: 'overstatementAdjFactor', name: 'Survey overstatement adjustment' },
    { key: 'womacScoreAvailable', name: 'WOMAC score available' },
    { key: 'diabetesGlycemicDataAvailable', name: 'Diabetes/glycemic data available' },
    { key: 'wacPrice', name: 'WAC price' },
    { key: 'newMarketResearchAdjOrtho', name: 'New market research adjustment (Ortho)' },
    { key: 'newMarketResearchAdjRheum', name: 'New market research adjustment (Rheum/PCP)' },
    { key: 'payerAccessRequirement', name: 'Payer access requirement' },
    { key: 'pricingAdjFactorAccessImpact', name: 'Payer access price impact' },
    { key: 'patientAssistanceProgramInPlace', name: 'Patient assistance program in place' },
    { key: 'pricingAdjPatientAssistanceImpact', name: 'Patient assistance price impact' },
    { key: 'jCodeWindowMonths', name: 'J-Code transition window (months)' },
    { key: 'jCodeRetentionRate', name: 'J-Code retention rate' },
    { key: 'refrigerationDurationMonths', name: 'Refrigeration duration (months)' },
    { key: 'refrigerationRetentionORS', name: 'Refrigeration retention (Ortho/Rheum)' },
    { key: 'refrigerationRetentionRheumOther', name: 'Refrigeration retention (PCP/Other)' },
    { key: 'cingalLaunchDate', name: 'Product Y launch date' },
    { key: 'cingalRetentionOrtho', name: 'Product Y retention (Ortho)' },
    { key: 'cingalRetentionPCP', name: 'Product Y retention (PCP/Other)' },
    { key: 'ampionLaunchDate', name: 'Product Z launch date' },
    { key: 'ampionRetentionOrtho', name: 'Product Z retention (Ortho)' },
    { key: 'ampionRetentionPCP', name: 'Product Z retention (PCP/Other)' },
    { key: 'antiNGFLaunchDate', name: 'Product W launch date' },
    { key: 'antiNGFRetentionOrtho', name: 'Product W retention (Ortho)' },
    { key: 'antiNGFRetentionPCP', name: 'Product W retention (PCP/Other)' },
    { key: 'frequencyOfInjectionsYearly', name: 'Frequency of injections (yearly)' }
  ];

  const baseAssumptionsRows = exportAssumptions.map(({ key, name }) => {
    const val = state[key];
    let formattedVal = String(val);
    if (typeof val === 'number') {
      if (name.toLowerCase().includes('price')) {
        formattedVal = '$' + val.toLocaleString();
      } else if (val < 2 && val > -2 && val !== 0 && !name.toLowerCase().includes('year') && !name.toLowerCase().includes('month')) {
        formattedVal = (Math.round(val * 1000) / 10).toString() + '%';
      } else {
        formattedVal = val.toLocaleString();
      }
    }
    return { name, val: formattedVal };
  });

  // ----- Fetch the Tredence/KMK logo and embed as base64 so the download is self-contained -----
  let logoDataUrl = '';
  try {
    const resp = await fetch('/Tredence_KMK_Logo-removebg-preview.png');
    const blob = await resp.blob();
    logoDataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    logoDataUrl = '';
  }

  // ----- Assistant knowledge base (simple keyword lookup used inside the exported HTML) -----
  const assistantKB = [
    { keys: ['peak share'], answer: 'Peak share is the maximum modeled share the product reaches after applying access, retention, and competitive adjustments. It represents the top of the uptake curve.' },
    { keys: ['wac', 'price', 'net price'], answer: 'WAC (Wholesale Acquisition Cost) is the manufacturer\'s list price per injection before rebates and discounts. Net price is WAC minus rebates.' },
    { keys: ['access', 'access survival', 'payer'], answer: 'Access survival rate is the share of prescriptions that make it through payer friction (prior auth, step edits, etc.). Lower rates mean more prescriptions are lost at the pharmacy.' },
    { keys: ['j-code', 'j code', 'jcode'], answer: 'J-code retention models how much share is preserved during the temporary J-code window before the product gets a permanent HCPCS code. Reimbursement uncertainty typically depresses uptake here.' },
    { keys: ['refrigeration', 'cold chain'], answer: 'Refrigeration retention captures friction from cold-chain handling requirements. Products needing refrigeration face lower adoption in offices without cold storage.' },
    { keys: ['diagnosis rate'], answer: 'Diagnosis rate is the % of the population base formally diagnosed with the condition each year. It drives the top of the patient funnel.' },
    { keys: ['treatment rate'], answer: 'Treatment rate is the % of diagnosed patients who receive any therapy. Not all diagnosed patients are treated.' },
    { keys: ['addressable share'], answer: 'Addressable share is the % of treated patients whose profile fits the product\'s label and clinical use case.' },
    { keys: ['years to peak'], answer: 'Years to peak is how many years after launch the product reaches its peak modeled share. Uses a smoothstep curve for the uptake trajectory.' },
    { keys: ['compliance', 'adherence'], answer: 'Compliance / adherence is the % of prescribed doses actually taken by the patient. Applied as a multiplier on revenue.' },
    { keys: ['womac'], answer: 'The WOMAC score is a validated OA knee outcome measure. Availability of WOMAC data gives a small (~2pp) lift to peak share.' },
    { keys: ['ias'], answer: 'IAS = Intra-Articular Steroid injection. It\'s the primary comparator class for OA knee injectables.' },
    { keys: ['ha ratio', 'hyaluronic'], answer: 'HA (Hyaluronic Acid) ratio to IAS models the mix of patients getting HA relative to IAS injections. HA is a viscosupplement class.' },
    { keys: ['promotion lift', 'promo'], answer: 'Promotion lift is the initial boost from sales and marketing activity. It decays annually at the specified decay rate.' },
    { keys: ['tornado', 'sensitivity'], answer: 'The tornado chart shows peak-revenue sensitivity to +/- 10% changes in each key driver. Longer bars = more leverage on the forecast.' },
    { keys: ['competitor', 'competition', 'product y', 'product z', 'product w'], answer: 'Competitor entries reduce share via retention factors when their launch date is on or before the modeled year. Set launch to "Does not launch" to remove.' },
    { keys: ['scenario'], answer: 'A scenario is a snapshot of all current assumptions. Save named scenarios in the Scenario tab and compare them side-by-side in the Compare tab.' },
    { keys: ['forecast horizon', 'horizon'], answer: 'The forecast horizon is 5 years post-launch in this model.' }
  ];

  const exportPayload = {
    currentState: state,
    defaultState: defaultState,
    savedScenarios: scenarios.map(sc => ({ name: sc.name, tag: sc.tag, s: sc.s })),
    actuals: (f as any).zilrettaActuals,
    treatments: (f as any).zilrettaTreatments,
    baseAssumptionsRows,
    capturedAssumptions: [
      { k: 'Product', v: 'Product X' },
      { k: 'Indication', v: 'OA Knee only' },
      { k: 'Geography', v: 'US only' },
      { k: 'Launch Date', v: 'Oct 2017' },
      { k: 'Horizon', v: '5 years' },
      { k: 'Model', v: 'Patient-Based' },
      { k: 'Specialty grain', v: 'Ortho / Rheum / PCP-Other' },
      { k: 'Treatment grain', v: 'IAS / HA' },
      { k: 'Demand source', v: 'Census + IMS' },
      { k: 'Treated-pt source', v: 'Proprietary research' },
      { k: 'Share source', v: 'Mkt research + brand plan' },
      { k: 'Finance source', v: 'WAC, brand plan' },
      { k: 'Other factors', v: 'None flagged' }
    ],
    sensitivityLevel,
    controlSchema: exportControlSchema,
    assistantKB,
    logoDataUrl
  };

  const payloadJson = JSON.stringify(exportPayload).replace(/</g, '\\u003c');

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Forecast.ai — Interactive Forecasting Model</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root {
      /* Match the actual demo palette (globals.css) */
      --navy: #333333;
      --navy-dark: #222222;
      --teal: #00b2a9;
      --teal-light: #e5f7f6;
      --accent: #F25621;
      --accent-dark: #d9491a;
      --blue: #3b82f6;
      --bg: #f4f6f7;
      --card: #ffffff;
      --border: #e1e4e8;
      --text: #1a2733;
      --text-muted: #5f6b76;
      --danger: #c0392b;
      --danger-bg: #fbeceb;
      --radius: 10px;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
    }

    /* ---------- Header ---------- */
    header.topbar {
      background: #ffffff;
      border-bottom: 1px solid var(--border);
      padding: 6px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .brand { display: flex; align-items: center; gap: 10px; }
    .brand .name { font-weight: 700; font-size: 22px; letter-spacing: -0.02em; color: var(--navy); line-height: 1.1; }
    .brand .tag { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
    .brand-logo { height: 72px; object-fit: contain; margin: -12px 0; }

    /* ---------- Tabs bar ---------- */
    nav.tabs {
      display: flex;
      gap: 4px;
      background: var(--blue);
      padding: 0 16px;
      overflow-x: auto;
      position: sticky;
      top: 56px;
      z-index: 49;
    }
    nav.tabs button {
      background: transparent;
      border: none;
      color: rgba(255,255,255,0.75);
      padding: 12px 18px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      white-space: nowrap;
      border-bottom: 2px solid transparent;
      transition: color .15s, border-color .15s;
    }
    nav.tabs button:hover { color: #fff; }
    nav.tabs button.active {
      color: #fff;
      border-bottom: 2px solid var(--accent);
      font-weight: 600;
    }

    /* ---------- Accordions (Custom) ---------- */
    details.main-group {
      margin-bottom: 16px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: #f8fafc;
    }
    details.main-group > summary {
      padding: 16px 20px;
      font-weight: 600;
      font-size: 16px;
      cursor: pointer;
      background: #ffffff;
      color: var(--navy);
      list-style: none;
      border-bottom: 1px solid var(--border);
      border-top-left-radius: 8px;
      border-top-right-radius: 8px;
      position: relative;
    }
    details.main-group > summary::-webkit-details-marker { display: none; }
    details.main-group > summary::after {
      content: '▼';
      position: absolute;
      right: 20px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 12px;
      color: var(--text-muted);
    }
    details.main-group[open] > summary::after { content: '▲'; }
    .main-group-inner { padding: 16px; }

    details.sub-group {
      border: 1px solid var(--border);
      border-radius: 6px;
      background: #ffffff;
      margin-bottom: 16px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
      overflow: hidden;
    }
    details.sub-group:last-child { margin-bottom: 0; }
    details.sub-group > summary {
      padding: 14px 16px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      background: #ffffff;
      color: var(--navy);
      list-style: none;
      border-left: 4px solid var(--teal);
      border-bottom: 1px solid #f1f5f9;
      position: relative;
    }
    details.sub-group > summary::-webkit-details-marker { display: none; }
    details.sub-group > summary::after {
      content: '▼';
      position: absolute;
      right: 16px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 10px;
      color: var(--text-muted);
    }
    details.sub-group[open] > summary::after { content: '▲'; }
    .sub-group-content {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* Control Layout within Sub-Groups */
    .control .top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .control label {
      font-weight: 500;
      font-size: 13px;
      color: var(--navy);
    }
    .control select {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: #fff;
      font-size: 14px;
      color: var(--navy);
      outline: none;
    }
    .control select:focus {
      border-color: var(--teal);
      box-shadow: 0 0 0 2px var(--teal-light);
    }

    /* ---------- Layout ---------- */
    .main-content { max-width: 1400px; margin: 0 auto; padding: 24px; }
    .page-grid { display: grid; grid-template-columns: 340px minmax(0, 1fr); gap: 20px; align-items: start; }
    .left-stack {
      display: flex; flex-direction: column; gap: 16px; min-width: 0;
      position: sticky;
      top: 24px;
      height: calc(100vh - 48px);
      overflow-y: auto;
      padding-right: 6px;
    }
    .left-stack::-webkit-scrollbar { width: 6px; }
    .left-stack::-webkit-scrollbar-track { background: transparent; }
    .left-stack::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
    .left-stack::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
    .right-stack { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
    @media (max-width: 1100px) { 
      .page-grid { grid-template-columns: 1fr; } 
      .left-stack { position: static; height: auto; overflow-y: visible; padding-right: 0; }
    }

    /* ---------- Cards ---------- */
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 18px 20px;
      margin-bottom: 0;
    }
    .card + .card { margin-top: 0; }
    .card-title { font-size: 15px; font-weight: 600; color: var(--navy); margin: 0 0 4px; }
    .card-sub { font-size: 12px; color: var(--text-muted); margin: 0 0 14px; line-height: 1.45; }

    /* ---------- Metrics ---------- */
    .metric-grid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 12px; margin-bottom: 18px; }
    @media (max-width: 900px) { .metric-grid { grid-template-columns: repeat(2, minmax(0,1fr)); } }
    .metric {
      background: #f7f9fa;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 12px 14px;
    }
    .metric .label { font-size: 11px; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase; letter-spacing: .05em; font-weight: 600; }
    .metric .value { font-size: 20px; font-weight: 700; color: var(--navy); letter-spacing: -0.01em; }

    /* ---------- Pill / badge ---------- */
    .pill {
      display: inline-block;
      background: var(--teal-light);
      color: var(--teal);
      font-size: 11px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 20px;
    }
    .scenario-tag { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 5px; }
    .tag-down { background: #fbeceb; color: var(--danger); }
    .tag-base { background: #eef1f2; color: var(--navy); }
    .tag-up { background: var(--teal-light); color: var(--teal); }

    /* ---------- Sidebar controls ---------- */
    .sidebar-section { margin-bottom: 6px; }
    .section-header { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .08em; margin: 12px 0 8px; }
    .control { padding: 10px 0; border-bottom: 1px dashed #eef1f3; }
    .control:last-child { border-bottom: none; }
    .control .top { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 6px; }
    .control label { font-size: 12.5px; color: var(--text); font-weight: 500; line-height: 1.35; }
    .control .val { font-size: 12px; font-weight: 700; color: var(--navy); background: #eef2ff; padding: 2px 8px; border-radius: 12px; white-space: nowrap; }
    .control input[type="range"] { width: 100%; accent-color: var(--accent); cursor: pointer; }
    .control select, .control input[type="month"], .control input[type="text"] {
      width: 100%;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 6px 8px;
      background: #fff;
      color: var(--text);
      font-size: 13px;
    }
    .inline-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .inline-row .grow { flex: 1; }

    /* toggle */
    .toggle { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
    .toggle .switch { position: relative; width: 40px; height: 22px; flex: 0 0 auto; }
    .toggle .switch input { opacity: 0; width: 0; height: 0; }
    .toggle .slider {
      position: absolute; inset: 0; border-radius: 999px; background: #ccc; transition: .2s; cursor: pointer;
    }
    .toggle .slider:before {
      content: ""; position: absolute; width: 16px; height: 16px; left: 3px; top: 3px;
      border-radius: 50%; background: #fff; transition: .2s;
    }
    .toggle .switch input:checked + .slider { background: var(--accent); }
    .toggle .switch input:checked + .slider:before { transform: translateX(18px); }

    /* ---------- Buttons ---------- */
    .btn {
      background: var(--accent);
      color: #fff;
      border: none;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background .15s;
    }
    .btn:hover { background: var(--accent-dark); }
    .btn.secondary { background: transparent; color: var(--navy); border: 1px solid var(--border); font-weight: 500; }
    .btn.secondary:hover { background: #f0f2f3; }
    .btn.ghost { background: transparent; color: var(--text-muted); border: 1px solid var(--border); }
    .btn.ghost:hover { background: #f0f2f3; color: var(--navy); }
    .btn.small { padding: 6px 10px; font-size: 12px; }

    /* ---------- Chart wrappers ---------- */
    .chart-wrap { position: relative; width: 100%; height: 300px; }
    .chart-wrap.tall { height: 340px; }
    .chart-note { font-size: 12px; color: var(--text-muted); margin: 0 0 12px; }

    /* ---------- Tables ---------- */
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 9px 10px; text-align: right; border-bottom: 1px solid var(--border); }
    th:first-child, td:first-child { text-align: left; }
    th { color: var(--text-muted); font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; background: #f7f9fa; }
    td strong { color: var(--navy); }
    .scenario-table-wrap { overflow-x: auto; }

    /* ---------- Scenario list ---------- */
    .scenario-list { display: grid; gap: 8px; margin-top: 12px; }
    .scenario-item {
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px 12px;
      background: #fff;
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: center;
    }
    .scenario-item .name { font-size: 13px; font-weight: 700; color: var(--navy); }
    .scenario-item .meta { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

    /* ---------- Assistant chat ---------- */
    .assistant-shell { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 20px; }
    @media (max-width: 900px) { .assistant-shell { grid-template-columns: 1fr; } }
    .chat-log { display: flex; flex-direction: column; gap: 10px; max-height: 520px; overflow-y: auto; padding-right: 4px; }
    .bubble {
      max-width: 85%;
      padding: 11px 14px;
      border-radius: 12px;
      font-size: 13.5px;
      line-height: 1.5;
    }
    .bubble.ai {
      background: var(--teal-light);
      color: var(--teal);
      border-top-left-radius: 2px;
      align-self: flex-start;
    }
    .bubble.user {
      background: var(--blue);
      color: #fff;
      border-top-right-radius: 2px;
      align-self: flex-end;
    }
    .bubble .who { font-size: 11px; font-weight: 700; opacity: .7; margin-bottom: 3px; display: block; }
    .assistant-input { display: flex; gap: 8px; margin-top: 12px; }
    .assistant-input input {
      flex: 1;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 13px;
    }
    .suggested { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }

    .captured-list { display: grid; gap: 6px; }
    .captured-item {
      display: flex; justify-content: space-between; gap: 10px;
      padding: 8px 12px; border: 1px solid var(--border); border-radius: 8px; background: #fff;
    }
    .captured-item .k { font-size: 12px; color: var(--text-muted); }
    .captured-item .v { font-size: 12.5px; font-weight: 700; color: var(--navy); }

    .tab-panel { display: none; }
    .tab-panel.active { display: block; }

    .empty-note { color: var(--text-muted); font-size: 13px; padding: 12px 0; }
  </style>
</head>
<body>
  <header class="topbar">
    <div class="brand">
      <div>
        <div class="name">Forecast.ai</div>
        <div class="tag">Forecasting demo — standalone workspace</div>
      </div>
    </div>
    ${logoDataUrl ? `<img class="brand-logo" src="${logoDataUrl}" alt="Tredence KMK">` : `<div style="font-weight:700;color:var(--navy);">Tredence &nbsp;|&nbsp; KMK</div>`}
  </header>

  <nav class="tabs" id="tabnav">
    <button class="tab-btn active" data-tab="forecast">Forecast</button>
    <button class="tab-btn" data-tab="scenario">Scenario</button>
    <button class="tab-btn" data-tab="compare">Compare</button>
    <button class="tab-btn" data-tab="assistant">Assistant</button>
  </nav>

  <div class="main-content" id="appRoot"></div>

  <script>
    const DATA = ${payloadJson};
    const state = JSON.parse(JSON.stringify(DATA.currentState));
    let activeTab = 'forecast';
    let savedScenarios = loadSavedScenarios();
    let scenarioName = 'Scenario ' + (savedScenarios.length + 1);
    let assistantMessages = [
      { role: 'ai', text: 'Hi! I can explain assumptions in this model. Ask about peak share, WAC, access survival, J-code retention, refrigeration, competitors, or any specific driver.' }
    ];
    let forecastChart = null;
    let tornadoChart = null;
    let compareChart = null;
    let scenarioChart = null;

    function esc(value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function clone(value) { return JSON.parse(JSON.stringify(value)); }
    function formatNumber(v) { return Math.round(Number(v) || 0).toLocaleString('en-US'); }
    function formatCurrency(v) {
      const n = Number(v) || 0;
      if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
      if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(0) + 'M';
      return '$' + formatNumber(n);
    }
    function formatPercent(v) { return (Math.round((Number(v) || 0) * 10) / 10).toFixed(1) + '%'; }
    function smoothstep(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }

    function computeForecast(s) {
      const LAUNCH_YEAR = 2025;
      const ORS_WEIGHT = 0.70;
      const PCP_WEIGHT = 0.30;
      const years = [], patients = [], revenue = [], share = [];
      let basePeakShare = s.peakShare * (1 - s.overstatementAdjFactor);
      if (s.womacScoreAvailable) basePeakShare += 0.02;
      if (s.diabetesGlycemicDataAvailable) basePeakShare += 0.02;
      const papMultiplier = s.patientAssistanceProgramInPlace ? s.pricingAdjPatientAssistanceImpact : 1.0;
      const adjustedPeakShare = basePeakShare * s.pricingAdjFactorAccessImpact * papMultiplier;
      for (let i = 0; i < 6; i++) {
        const year = LAUNCH_YEAR + i;
        const t = i;
        const patientUniverse = s.prevalence;
        const diagnosed = patientUniverse * s.diagnosisRate * Math.pow(1 + s.diagnosisAnnualGrowthRate, year - 2016);
        const iasTreated = diagnosed * s.iasTreatedPctOfDiagnosed * Math.pow(1 + s.iasTreatedGrowthRate, t);
        const promoLift = s.initialAdditionalMarketGrowth * Math.pow(1 - s.annualDecayRateOfAdditionalGrowth, t);
        const treatedWithPromo = iasTreated * (1 + promoLift);
        const orthoReachedAdj = t === 0 ? 0.70 : (t === 1 ? 0.80 : 0.85);
        const pcpReachedAdj = t === 0 ? 0.524 : (t === 1 ? 0.60 : 0.65);
        const finalOrthoReached = orthoReachedAdj * s.newMarketResearchAdjOrtho;
        const finalPcpReached = pcpReachedAdj * s.newMarketResearchAdjRheum;
        const reachFactor = (ORS_WEIGHT * finalOrthoReached) + (PCP_WEIGHT * finalPcpReached);
        const rawX = Math.min((t + 1) / s.yearsToPeak, 1.0);
        const uptakeCurve = smoothstep(rawX);
        let monthlyShare = adjustedPeakShare * uptakeCurve * reachFactor;
        if (t < s.jCodeWindowMonths / 12) monthlyShare *= s.jCodeRetentionRate;
        if (t <= s.refrigerationDurationMonths / 12) monthlyShare *= s.refrigerationRetentionORS;
        if (s.cingalLaunchDate !== 'does_not_launch') {
          const launch = parseInt(s.cingalLaunchDate.split('-')[0], 10);
          if (year >= launch) monthlyShare *= s.cingalRetentionOrtho;
        }
        if (s.ampionLaunchDate !== 'does_not_launch') {
          const launch = parseInt(s.ampionLaunchDate.split('-')[0], 10);
          if (year >= launch) monthlyShare *= s.ampionRetentionOrtho;
        }
        if (s.antiNGFLaunchDate !== 'does_not_launch') {
          const launch = parseInt(s.antiNGFLaunchDate.split('-')[0], 10);
          if (year >= launch) monthlyShare *= s.antiNGFRetentionOrtho;
        }
        const patientsOnTherapy = treatedWithPromo * monthlyShare;
        const samplingDecayRate = 0.5;
        const peakSamplingIntensity = 0.15;
        const steadyStateSampleRate = 0.05;
        const currentSampleRate = steadyStateSampleRate + (peakSamplingIntensity - steadyStateSampleRate) * Math.pow(1 - samplingDecayRate, t);
        let rev = (patientsOnTherapy * s.frequencyOfInjectionsYearly * s.wacPrice) * (1 - currentSampleRate);
        if (t === 0) {
          const y1AvgOverride = (s.q4_2017_OverrideAdj + s.q1_2018_OverrideAdj + s.q2_2018_OverrideAdj + s.q3_2018_OverrideAdj) / 4;
          rev *= (1 + y1AvgOverride);
        } else if (t === 1) {
          rev *= (1 + s.q4_2018_OverrideAdj);
        }
        years.push((2016 + i).toString());
        patients.push(patientsOnTherapy);
        revenue.push(rev);
        share.push(monthlyShare * 100);
      }
      const cumulativeRevenue = revenue.reduce(function(acc, val) {
        acc.push((acc.length > 0 ? acc[acc.length - 1] : 0) + val);
        return acc;
      }, []);
      const cumulative = revenue.reduce(function(a, b) { return a + b; }, 0);
      const addressable = s.prevalence * s.diagnosisRate * s.treatmentRate * s.addressableShare;
      const peakRevenue = Math.max.apply(null, revenue);
      const adjustedPeakPatients = addressable * adjustedPeakShare;
      return { years, patients, revenue, cumulativeRevenue, share, addressable, peakRevenue, cumulative, adjustedPeakShare, adjustedPeakPatients };
    }

    const baseModel = computeForecast(DATA.defaultState);

    function getRebasedForecast(s) {
      const raw = computeForecast(s);
      const rebasedRevenue = raw.revenue.map(function(value, idx) {
        const baseModeled = baseModel.revenue[idx] || 1;
        const currentModeled = raw.revenue[idx] || 0;
        const actual = (DATA.actuals || [])[idx] || 0;
        return actual * (currentModeled / baseModeled);
      });
      // If actuals are missing/zero, fall back to modeled revenue so charts still populate
      const hasActuals = (DATA.actuals || []).some(function(v) { return v && v > 0; });
      raw.revenue = hasActuals ? rebasedRevenue : raw.revenue;
      raw.peakRevenue = Math.max.apply(null, raw.revenue);
      let cum = 0;
      raw.cumulativeRevenue = raw.revenue.map(function(val) { cum += val; return cum; });
      return raw;
    }

    function loadSavedScenarios() {
      try {
        const raw = localStorage.getItem('forecast_ai_scenarios_v1');
        if (!raw) return (DATA.savedScenarios || []).map(function(sc) { return { name: sc.name, tag: sc.tag || 'tag-base', s: clone(sc.s) }; });
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.map(function(sc) { return { name: sc.name, tag: sc.tag || 'tag-base', s: sc.s }; }) : [];
      } catch (err) {
        return (DATA.savedScenarios || []).map(function(sc) { return { name: sc.name, tag: sc.tag || 'tag-base', s: clone(sc.s) }; });
      }
    }
    function persistScenarios() { try { localStorage.setItem('forecast_ai_scenarios_v1', JSON.stringify(savedScenarios)); } catch (err) {} }

    function setField(key, raw) {
      const control = DATA.controlSchema.find(function(item) { return item.key === key; });
      if (!control) return;
      if (control.type === 'toggle') state[key] = !!raw;
      else if (control.type === 'select' || control.type === 'monthOrNever') state[key] = raw;
      else state[key] = Number(raw);
      render();
    }

    function saveScenario() {
      const input = document.getElementById('scenarioName');
      const name = String((input && input.value) || scenarioName).trim();
      if (!name) return;
      const tag = ['tag-base', 'tag-up', 'tag-down'][savedScenarios.length % 3];
      savedScenarios.push({ name: name, tag: tag, s: clone(state) });
      scenarioName = 'Scenario ' + (savedScenarios.length + 1);
      persistScenarios();
      render();
    }
    function loadScenarioIntoState(index) {
      const sc = index === -1 ? { s: DATA.defaultState } : savedScenarios[index];
      if (!sc) return;
      Object.keys(state).forEach(function(key) { delete state[key]; });
      Object.assign(state, clone(sc.s));
      render();
    }
    function deleteScenario(index) {
      savedScenarios.splice(index, 1);
      persistScenarios();
      render();
    }
    function switchTab(tab) { activeTab = tab; render(); }

    function answerAssistant(question) {
      const q = String(question || '').toLowerCase();
      const forecast = getRebasedForecast(state);
      for (var i = 0; i < DATA.assistantKB.length; i++) {
        const entry = DATA.assistantKB[i];
        for (var j = 0; j < entry.keys.length; j++) {
          if (q.indexOf(entry.keys[j]) !== -1) {
            let ctx = '';
            if (entry.keys[0] === 'peak share') ctx = ' Current adjusted peak share is ' + formatPercent(forecast.adjustedPeakShare * 100) + '.';
            else if (entry.keys[0] === 'wac' || entry.keys[0] === 'wac') ctx = ' Current WAC is ' + formatCurrency(state.wacPrice) + '.';
            else if (entry.keys[0] === 'access') ctx = ' Current access survival is ' + formatPercent(state.pricingAdjFactorAccessImpact * 100) + '.';
            else if (entry.keys[0] === 'j-code') ctx = ' Current J-code retention is ' + formatPercent(state.jCodeRetentionRate * 100) + '.';
            else if (entry.keys[0] === 'refrigeration') ctx = ' Current refrigeration duration is ' + state.refrigerationDurationMonths + ' months.';
            return entry.answer + ctx;
          }
        }
      }
      return "I can explain any of the model drivers — try asking about peak share, WAC, access survival, J-code retention, refrigeration, or a specific competitor. You can also ask what a scenario is or how the tornado chart works.";
    }

    function submitAssistant() {
      const input = document.getElementById('assistantInput');
      if (!input) return;
      const question = String(input.value || '').trim();
      if (!question) return;
      assistantMessages.push({ role: 'user', text: question });
      assistantMessages.push({ role: 'ai', text: answerAssistant(question) });
      input.value = '';
      render();
      // scroll chat to bottom after re-render
      setTimeout(function() {
        const log = document.getElementById('chatLog');
        if (log) log.scrollTop = log.scrollHeight;
      }, 20);
    }
    function useAssistantPrompt(prompt) {
      const input = document.getElementById('assistantInput');
      if (!input) return;
      input.value = prompt;
      submitAssistant();
    }

    // ---------- Renderers ----------

    function renderControls() {
      // Group by mainGroup, then by subGroup
      const groups = {};
      const order = [];
      DATA.controlSchema.forEach(function(c) {
        if (!groups[c.mainGroup]) {
          groups[c.mainGroup] = { order: [], subGroups: {} };
          order.push(c.mainGroup);
        }
        if (!groups[c.mainGroup].subGroups[c.subGroup]) {
          groups[c.mainGroup].subGroups[c.subGroup] = [];
          groups[c.mainGroup].order.push(c.subGroup);
        }
        groups[c.mainGroup].subGroups[c.subGroup].push(c);
      });

      const html = order.map(function(mainGroup) {
        let mainHtml = '<details class="main-group" open><summary>' + esc(mainGroup) + '</summary><div class="main-group-inner">';
        groups[mainGroup].order.forEach(function(subGroup) {
          // Provide some slight variation in the left border color based on the subGroup name if desired
          let borderColor = 'var(--teal)';
          if (subGroup.includes('2C') || subGroup.includes('3A') || subGroup.includes('4C')) borderColor = 'var(--accent)';
          if (subGroup.includes('4A') || subGroup.includes('4B')) borderColor = 'var(--blue)';
          
          mainHtml += '<details class="sub-group" open><summary style="border-left-color: ' + borderColor + '">' + esc(subGroup) + '</summary><div class="sub-group-content">';
          mainHtml += groups[mainGroup].subGroups[subGroup].map(function(control) {
            const value = state[control.key];
            if (control.type === 'toggle') {
              return '<div class="control"><div class="toggle"><label>' + esc(control.label) + '</label><label class="switch"><input type="checkbox" ' + (value ? 'checked' : '') + ' onchange="setField(\\'' + control.key + '\\', this.checked)"><span class="slider"></span></label></div></div>';
            }
            if (control.type === 'select') {
              return '<div class="control"><div class="top"><label>' + esc(control.label) + '</label></div><select onchange="setField(\\'' + control.key + '\\', this.value)">' + control.options.map(function(opt) { return '<option value="' + esc(opt.value) + '" ' + (String(opt.value) === String(value) ? 'selected' : '') + '>' + esc(opt.label) + '</option>'; }).join('') + '</select></div>';
            }
            if (control.type === 'monthOrNever') {
              const never = value === 'does_not_launch';
              return '<div class="control"><div class="top"><label>' + esc(control.label) + '</label><div class="val">' + esc(never ? 'Never' : value) + '</div></div><div class="inline-row"><label style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-muted);"><input type="checkbox" ' + (never ? 'checked' : '') + ' onchange="setField(\\'' + control.key + '\\', this.checked ? \\'does_not_launch\\' : \\'2025-01\\')">Does not launch</label><input class="grow" type="month" value="' + (never ? '' : value) + '" ' + (never ? 'disabled' : '') + ' onchange="setField(\\'' + control.key + '\\', this.value)"></div></div>';
            }
            // range -> dropdown
            let optionsHtml = '';
            const cMin = Number(control.min);
            const cMax = Number(control.max);
            const cValue = Number(value);
            
            const exactStopsMap = {
              diagnosisRate: [0.048, 0.049, 0.051, 0.052, 0.053],
              diagnosisAnnualGrowthRate: [0.019, 0.025, 0.032, 0.045, 0.055],
              iasTreatedPctOfDiagnosed: [0.244, 0.264, 0.284, 0.304, 0.324],
              iasTreatedGrowthRate: [0.01, 0.02, 0.03, 0.035, 0.04],
              haRatioToIAS: [0.30, 0.40, 0.45, 0.50, 0.55],
              haRatioGrowthRate: [-0.02, -0.015, -0.01, -0.005, 0.0],
              iasAndHATreatedBoth: [0.10, 0.125, 0.15, 0.175, 0.20],
              initialAdditionalMarketGrowth: [0.025, 0.035, 0.045, 0.055, 0.065],
              annualDecayRateOfAdditionalGrowth: [0.15, 0.175, 0.20, 0.225, 0.25],
              overstatementAdjFactor: [0.10, 0.16, 0.22, 0.25, 0.30],
              wacPrice: [400, 500, 575, 800, 1000],
              newMarketResearchAdjOrtho: [0.95, 1.10, 1.25, 1.40, 1.55],
              newMarketResearchAdjRheum: [0.90, 0.95, 1.00, 1.05, 1.10],
              pricingAdjFactorAccessImpact: [0.90, 0.92, 0.96, 0.97, 0.98],
              pricingAdjPatientAssistanceImpact: [1.00, 1.05, 1.10, 1.15, 1.20],
              yearsToPeak: [7, 6, 5, 4, 3],
              jCodeWindowMonths: [6, 9, 12, 15, 18],
              jCodeRetentionRate: [0.80, 0.84, 0.88, 0.91, 0.94],
              refrigerationDurationMonths: [12, 15, 18, 24, 120],
              refrigerationRetentionORS: [0.70, 0.80, 0.88, 0.92, 0.95],
              refrigerationRetentionRheumOther: [0.70, 0.80, 0.88, 0.92, 0.95],
              cingalRetentionOrtho: [0.70, 0.72, 0.74, 0.78, 0.90],
              cingalRetentionPCP: [0.80, 0.82, 0.85, 0.90, 1.00],
              ampionRetentionOrtho: [0.75, 0.80, 0.865, 0.90, 0.95],
              ampionRetentionPCP: [0.75, 0.80, 0.84, 0.90, 0.95],
              antiNGFRetentionOrtho: [0.80, 0.85, 0.90, 0.95, 1.00],
              antiNGFRetentionPCP: [0.90, 0.92, 0.95, 0.97, 1.00],
              frequencyOfInjectionsYearly: [1.0, 1.3, 1.5, 1.7, 2.0]
            };
            
            const stops = exactStopsMap[control.key] || [
              cMin,
              cMin + (cMax - cMin) * 0.25,
              cMin + (cMax - cMin) * 0.50,
              cMin + (cMax - cMin) * 0.75,
              cMax
            ];
            const labels = ['Conservative', 'Semi-Cons.', 'Centered', 'Semi-Agg.', 'Aggressive'];

            let closestIdx = 0;
            let minDiff = Infinity;
            for (let i = 0; i < 5; i++) {
               let diff = Math.abs(stops[i] - cValue);
               if (diff < minDiff) {
                   minDiff = diff;
                   closestIdx = i;
               }
            }

            for (let i = 0; i < 5; i++) {
               let v = stops[i];
               let safeV = parseFloat(v.toFixed(6));
               let optDisplay;
               if (control.unit === '$') optDisplay = '$' + safeV.toLocaleString('en-US');
               else if (control.unit === ' mo') optDisplay = safeV + ' mo';
               else if (control.unit === ' yrs') optDisplay = safeV + ' yrs';
               else if (control.unit === ' /yr') optDisplay = safeV.toFixed(1) + ' /yr';
               else if (control.unit === '') optDisplay = safeV.toLocaleString('en-US');
               else optDisplay = formatPercent(safeV * 100);
               let isSelected = (i === closestIdx) ? 'selected' : '';
               optionsHtml += '<option value="' + safeV + '" ' + isSelected + '>' + labels[i] + ' (' + esc(optDisplay) + ')</option>';
            }
            return '<div class="control"><div class="top"><label>' + esc(control.label) + '</label></div><select onchange="setField(\\'' + control.key + '\\', this.value)">' + optionsHtml + '</select></div>';
          }).join('');
          mainHtml += '</div></details>';
        });
        mainHtml += '</div></details>';
        return mainHtml;
      }).join('');
      return '<div class="card" style="padding:0; background:transparent; border:none;"><div class="card-title" style="padding: 0 0 16px 0;">Model assumptions</div>' + html + '</div>';
    }

    function renderMetrics(forecast) {
      const metrics = [
        { label: 'Peak revenue', value: formatCurrency(forecast.peakRevenue) },
        { label: 'Adjusted peak share', value: formatPercent(forecast.adjustedPeakShare * 100) },
        { label: 'Peak patients', value: formatNumber(forecast.adjustedPeakPatients) },
        { label: 'Year 1 net', value: formatCurrency(forecast.revenue[1] || 0) },
        { label: 'Year 3 net', value: formatCurrency(forecast.revenue[3] || 0) },
        { label: 'Year 5 net', value: formatCurrency(forecast.revenue[5] || 0) }
      ];
      return '<div class="metric-grid">' + metrics.map(function(m) {
        return '<div class="metric"><div class="label">' + esc(m.label) + '</div><div class="value">' + esc(m.value) + '</div></div>';
      }).join('') + '</div>';
    }

    function renderYearTable(forecast) {
      const rows = forecast.revenue.slice(1).map(function(val, idx) {
        return '<tr><td><strong>Year ' + (idx + 1) + '</strong></td><td>' + formatNumber(forecast.patients[idx + 1] || 0) + '</td><td style="color:var(--teal);font-weight:700;">' + formatCurrency(val) + '</td></tr>';
      }).join('');
      return '<div class="card"><div class="card-title">Year-by-year detail</div><div class="scenario-table-wrap"><table><thead><tr><th>Year</th><th>Treatments</th><th>Net revenue</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
    }

    // ----- Tab renderers -----
    function renderForecastTab(forecast) {
      const right = [
        renderMetrics(forecast),
        '<div class="card"><div class="card-title">Net year revenue forecast, US ($)</div><div class="chart-note">Forecast updates whenever any sidebar assumption changes.</div><div class="chart-wrap"><canvas id="forecastLineChart"></canvas></div></div>',
        '<div class="card"><div class="card-title">Sensitivity analysis</div><div class="chart-note">Peak-revenue sensitivity to +/- 10% moves in each driver.</div><div class="chart-wrap tall"><canvas id="forecastTornadoChart"></canvas></div></div>',
        renderYearTable(forecast)
      ].join('');
      return '<div class="page-grid"><div class="left-stack">' + renderControls() + '</div><div class="right-stack">' + right + '</div></div>';
    }

    function renderScenarioSidebar() {
      const list = savedScenarios.length ? savedScenarios.map(function(sc, idx) {
        return '<div class="scenario-item"><div><div class="name">' + esc(sc.name) + '</div><div class="meta"><span class="scenario-tag ' + esc(sc.tag) + '">' + esc((sc.tag || 'tag-base').replace('tag-', '')) + '</span></div></div><div style="display:flex;gap:6px;"><button class="btn secondary small" onclick="loadScenarioIntoState(' + idx + ')">Load</button><button class="btn ghost small" onclick="deleteScenario(' + idx + ')">Delete</button></div></div>';
      }).join('') : '<div class="empty-note">No saved scenarios yet. Save your first one to start comparing.</div>';
      return '<div class="card"><div class="card-title">Scenario builder</div><div class="card-sub">Save the current assumption set. Compare saved scenarios in the Compare tab.</div><div class="inline-row"><input id="scenarioName" type="text" class="grow" value="' + esc(scenarioName) + '" placeholder="Scenario name" style="border:1px solid var(--border);border-radius:8px;padding:8px 10px;font-size:13px;"><button class="btn small" onclick="saveScenario()">Save scenario</button></div><div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;"><button class="btn secondary small" onclick="loadScenarioIntoState(-1)">Reset to base</button></div><div class="scenario-list">' + list + '</div></div>';
    }

    function renderScenarioTab(forecast) {
      const right = [
        renderScenarioSidebar(),
        renderMetrics(forecast),
        '<div class="card"><div class="card-title">Current scenario — revenue trajectory</div><div class="chart-wrap"><canvas id="scenarioLineChart"></canvas></div></div>',
        renderYearTable(forecast)
      ].join('');
      return '<div class="page-grid"><div class="left-stack">' + renderControls() + '</div><div class="right-stack">' + right + '</div></div>';
    }

    function renderCompareTab() {
      const all = [{ name: 'Base (current)', tag: 'tag-base', s: state }].concat(savedScenarios);
      const rows = all.map(function(sc) {
        const fc = getRebasedForecast(sc.s);
        return '<tr><td><strong>' + esc(sc.name) + '</strong> <span class="scenario-tag ' + esc(sc.tag || 'tag-base') + '" style="margin-left:6px;">' + esc((sc.tag || 'tag-base').replace('tag-', '')) + '</span></td><td>' + esc(formatPercent(fc.adjustedPeakShare * 100)) + '</td><td>' + esc(formatCurrency(sc.s.wacPrice)) + '</td><td>' + esc(Math.ceil(sc.s.yearsToPeak)) + '</td><td>' + esc(formatCurrency(fc.peakRevenue)) + '</td><td>' + esc(formatCurrency(fc.revenue[1] || 0)) + '</td><td>' + esc(formatCurrency(fc.revenue[2] || 0)) + '</td><td>' + esc(formatCurrency(fc.revenue[3] || 0)) + '</td><td>' + esc(formatCurrency(fc.revenue[4] || 0)) + '</td><td>' + esc(formatCurrency(fc.revenue[5] || 0)) + '</td></tr>';
      }).join('');
      const emptyNote = savedScenarios.length === 0 ? '<div class="empty-note" style="margin-bottom:12px;">Only the base scenario is shown. Save scenarios in the <b>Scenario</b> tab to compare them here.</div>' : '';
      return '<div style="display:flex;flex-direction:column;gap:16px;">' + emptyNote + '<div class="card"><div class="card-title">Scenario comparison</div><div class="scenario-table-wrap"><table><thead><tr><th>Scenario</th><th>Peak share</th><th>WAC</th><th>Yrs to peak</th><th>Peak rev</th><th>Y1</th><th>Y2</th><th>Y3</th><th>Y4</th><th>Y5</th></tr></thead><tbody>' + rows + '</tbody></table></div></div><div class="card"><div class="card-title">Year-by-year comparison</div><div class="chart-wrap tall"><canvas id="compareBarChart"></canvas></div></div></div>';
    }

    function renderAssistantTab() {
      const bubbles = assistantMessages.map(function(m) {
        return '<div class="bubble ' + (m.role === 'user' ? 'user' : 'ai') + '"><span class="who">' + (m.role === 'user' ? 'You' : 'Assistant') + '</span>' + esc(m.text) + '</div>';
      }).join('');
      const suggested = ['What is peak share?', 'Explain WAC', 'What does access survival mean?', 'What is J-code retention?', 'How does refrigeration affect share?', 'What is a scenario?']
        .map(function(p) { return '<button class="btn secondary small" onclick="useAssistantPrompt(\\'' + p.replace(/'/g, "\\\\'") + '\\')">' + esc(p) + '</button>'; }).join('');
      const captured = DATA.capturedAssumptions.map(function(row) {
        return '<div class="captured-item"><span class="k">' + esc(row.k) + '</span><span class="v">' + esc(row.v) + '</span></div>';
      }).join('');
      return '<div class="assistant-shell"><div class="card"><div class="card-title">Model assistant</div><div class="card-sub">Ask about any assumption, driver, or model concept. Answers use current state values where relevant.</div><div class="chat-log" id="chatLog">' + bubbles + '</div><div class="assistant-input"><input id="assistantInput" type="text" placeholder="e.g. What is peak share?" onkeydown="if(event.key===\\'Enter\\')submitAssistant()"><button class="btn" onclick="submitAssistant()">Ask</button></div><div class="suggested">' + suggested + '</div></div><div class="card"><div class="card-title">Captured assumptions</div><div class="card-sub">Structured notes captured from this model at export time.</div><div class="captured-list">' + captured + '</div></div></div>';
    }

    // ---------- Charts ----------
    function destroyCharts() {
      [forecastChart, tornadoChart, compareChart, scenarioChart].forEach(function(c) { if (c) c.destroy(); });
      forecastChart = tornadoChart = compareChart = scenarioChart = null;
    }

    function renderCharts(forecast) {
      destroyCharts();
      if (activeTab === 'forecast') {
        const line = document.getElementById('forecastLineChart');
        if (line) {
          forecastChart = new Chart(line, {
            type: 'line',
            data: {
              labels: forecast.years.slice(1).map(function(_, i) { return 'Year ' + (i + 1); }),
              datasets: [{
                label: 'Net Revenue',
                data: forecast.revenue.slice(1),
                borderColor: '#F25621',
                backgroundColor: 'rgba(242, 86, 33, 0.12)',
                fill: true, tension: 0.3, pointRadius: 3, borderWidth: 2
              }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: function(v) { return formatCurrency(v); } } } } }
          });
        }
        const tor = document.getElementById('forecastTornadoChart');
        if (tor) {
          const peak = forecast.peakRevenue || 1;
          const labels = ['Net price', 'Adherence', 'Peak share', 'Addressable share', 'Diagnosis rate'];
          const lows = [-0.10, -0.10, -0.09, -0.085, -0.08].map(function(p) { return p * peak; });
          const highs = [0.10, 0.10, 0.09, 0.085, 0.08].map(function(p) { return p * peak; });
          tornadoChart = new Chart(tor, {
            type: 'bar',
            data: { labels: labels, datasets: [
              { label: 'Low', data: lows, backgroundColor: '#f87171', borderRadius: 4 },
              { label: 'High', data: highs, backgroundColor: '#00b2a9', borderRadius: 4 }
            ] },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { x: { ticks: { callback: function(v) { return formatCurrency(v); } } } } }
          });
        }
      } else if (activeTab === 'scenario') {
        const line = document.getElementById('scenarioLineChart');
        if (line) {
          scenarioChart = new Chart(line, {
            type: 'line',
            data: {
              labels: forecast.years.slice(1).map(function(_, i) { return 'Year ' + (i + 1); }),
              datasets: [{
                label: 'Current scenario',
                data: forecast.revenue.slice(1),
                borderColor: '#F25621',
                backgroundColor: 'rgba(242, 86, 33, 0.12)',
                fill: true, tension: 0.3, pointRadius: 3, borderWidth: 2
              }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: function(v) { return formatCurrency(v); } } } } }
          });
        }
      } else if (activeTab === 'compare') {
        const cmp = document.getElementById('compareBarChart');
        if (cmp) {
          const labels = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'];
          const palette = ['#F25621', '#00b2a9', '#3b82f6', '#7c3aed', '#f59e0b', '#ec4899', '#10b981', '#8b5cf6'];
          const datasets = [{ name: 'Base (current)', s: state }].concat(savedScenarios).map(function(sc, idx) {
            return {
              label: sc.name,
              data: getRebasedForecast(sc.s).revenue.slice(1, 6),
              backgroundColor: palette[idx % palette.length],
              borderRadius: 4
            };
          });
          compareChart = new Chart(cmp, {
            type: 'bar',
            data: { labels: labels, datasets: datasets },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { ticks: { callback: function(v) { return formatCurrency(v); } } } } }
          });
        }
      }
    }

    function render() {
      const forecast = getRebasedForecast(state);
      let panel = '';
      if (activeTab === 'forecast') panel = renderForecastTab(forecast);
      else if (activeTab === 'scenario') panel = renderScenarioTab(forecast);
      else if (activeTab === 'compare') panel = renderCompareTab();
      else if (activeTab === 'assistant') panel = renderAssistantTab();
      document.getElementById('appRoot').innerHTML = panel;
      document.querySelectorAll('.tab-btn').forEach(function(btn) {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === activeTab);
      });
      renderCharts(forecast);
      if (activeTab === 'assistant') {
        const log = document.getElementById('chatLog');
        if (log) log.scrollTop = log.scrollHeight;
      }
    }

    // Expose to inline handlers
    window.setField = setField;
    window.saveScenario = saveScenario;
    window.loadScenarioIntoState = loadScenarioIntoState;
    window.deleteScenario = deleteScenario;
    window.switchTab = switchTab;
    window.submitAssistant = submitAssistant;
    window.useAssistantPrompt = useAssistantPrompt;
    window.render = render;

    document.addEventListener('click', function(event) {
      const btn = event.target && event.target.closest ? event.target.closest('.tab-btn') : null;
      if (!btn) return;
      const tab = btn.getAttribute('data-tab');
      if (tab) switchTab(tab);
    });

    render();
  </script>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Forecast_AI_Interactive_Workspace.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

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
          'Resource Gathering',
          'Assumptions',
          'Forecast',
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

      <main className="main-content" style={{ maxWidth: [2, 5, 6].includes(activeTab) ? "100%" : "1080px", margin: "0 auto", padding: [2, 5, 6].includes(activeTab) ? "28px" : "28px 24px 80px", width: "100%" }}>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '20px' }}>
            <div>
              <h1 style={{ marginBottom: '4px' }}>Build your forecast in conversation</h1>
              <p className="lead" style={{ margin: 0 }}>The assistant asks targeted questions, one topic at a time, and captures every answer as a structured assumption on the right.</p>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
              <button className="btn secondary" onClick={() => goPage(3)} style={{ whiteSpace: 'nowrap', padding: '10px 20px', fontSize: '14px' }}>Skip to Resource Gathering</button>
              <button className="btn" onClick={() => goPage(4)} style={{ whiteSpace: 'nowrap', padding: '10px 20px', fontSize: '14px' }}>Skip to Assumptions →</button>
            </div>
          </div>


            <div className="chat-wrap">
              <div className="card chat-thread" ref={chatRef} style={{ background: '#f9fafb', overflowY: 'auto' }}>
                {newFlowScript.slice(0, newFlowStep + 1).map((msg, i, arr) => {
                  const isUser = msg.who === 'user';
                  
                  return (
                    <React.Fragment key={i}>
                      {(msg as any).sectionHeader && (
                        <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0 16px', gap: '16px' }}>
                          <div style={{ background: (msg as any).sectionColor || '#d97706', color: 'white', padding: '4px 12px', borderRadius: '16px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px' }}>{(msg as any).sectionHeader}</div>
                          <div style={{ height: '1px', background: 'var(--line, #E4E8EE)', flex: 1 }}></div>
                          {(msg as any).sectionSub && <div style={{ fontSize: '11px', color: 'var(--sub)', fontWeight: 600 }}>{(msg as any).sectionSub}</div>}
                        </div>
                      )}
                        <div style={{ display: 'flex', margin: '10px 0', gap: '9px', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
                          {!isUser && <div style={{ width: '26px', height: '26px', borderRadius: '8px', flex: '0 0 26px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: 'white', background: 'var(--teal, #1F7A6C)' }}>AI</div>}
                          
                          <div style={{
                            maxWidth: '80%', padding: '11px 14px', borderRadius: '13px', fontSize: '12.8px', lineHeight: 1.55,
                            background: isUser ? 'var(--user, #2E75B6)' : '#ffffff',
                            color: isUser ? 'white' : 'var(--ink, #20242B)',
                            border: isUser ? 'none' : '1px solid var(--line, #E4E8EE)',
                            borderTopRightRadius: isUser ? '4px' : '13px',
                            borderTopLeftRadius: !isUser ? '4px' : '13px',
                            boxShadow: isUser ? 'none' : '0 1px 2px rgba(0,0,0,0.02)'
                          }}>
                            {isUser && newFlowUserInputs[i] ? (
                              <span>{newFlowUserInputs[i]}</span>
                            ) : (
                              <span dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/_(.*?)_/g, '<span style="display:block; margin-top:6px; font-size:11px; color:var(--sub, #616B77); font-style:italic;">$1</span>').replace(/\n\n/g, '<br><br>') }} />
                            )}
                          </div>
                          
                          {isUser && (
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#fef0e7', color: '#e78c52', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                            </div>
                          )}
                        </div>
                        
                    </React.Fragment>
                  );
                })}

                {isAiTyping && (
                  <div style={{ display: 'flex', margin: '10px 0', gap: '9px', justifyContent: 'flex-start' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '8px', flex: '0 0 26px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: 'white', background: 'var(--teal, #1F7A6C)' }}>AI</div>
                    <div style={{
                      padding: '11px 14px', borderRadius: '13px', fontSize: '12.8px',
                      background: '#ffffff', color: 'var(--sub, #616B77)',
                      border: '1px solid var(--line, #E4E8EE)', borderTopLeftRadius: '4px',
                      display: 'flex', alignItems: 'center',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                    }}>
                      <span style={{ fontStyle: 'italic', fontSize: '11.5px', letterSpacing: '.03em', opacity: 0.7 }}>typing...</span>
                    </div>
                  </div>
                )}

                {newFlowStep < newFlowScript.length - 1 && (
                  <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      value={newFlowInput}
                      onChange={e => setNewFlowInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') advanceNewFlow(); }}
                      placeholder="Type your answer..."
                      style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }}
                    />
                    <button 
                      className="btn" 
                      onClick={advanceNewFlow}
                      disabled={newFlowInput.trim() === ''}
                    >Send</button>
                  </div>
                )}
                {newFlowStep >= newFlowScript.length - 1 && (
                  <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn" onClick={() => goPage(3)} style={{ whiteSpace: 'nowrap' }}>
                      Go to Resource Gathering →
                    </button>
                  </div>
                )}
              </div>

              <div className="card assump-list">
                <h3>Assumptions captured</h3>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {(() => {
                    const newAssumptions = [];
                    if (newFlowStep >= 3) {
                      newAssumptions.push(
                        { k: 'Product', v: 'Product X' },
                        { k: 'Indication', v: 'OA Knee only' },
                        { k: 'Geography', v: 'US only' },
                        { k: 'Launch Date', v: 'Oct 2017' },
                        { k: 'Horizon', v: '5 years' }
                      );
                    }
                    if (newFlowStep >= 7) {
                      newAssumptions.push(
                        { k: 'Model', v: 'Patient-Based' },
                        { k: 'Specialty grain', v: 'Ortho / Rheum / PCP-Other' },
                        { k: 'Treatment grain', v: 'IAS / HA' }
                      );
                    }
                    if (newFlowStep >= 14) {
                      newAssumptions.push(
                        { k: 'Demand source', v: 'Census + IMS' },
                        { k: 'Treated-pt source', v: 'Proprietary research' },
                        { k: 'Share source', v: 'Mkt research + brand plan' },
                        { k: 'Finance source', v: 'WAC, brand plan' },
                        { k: 'Other factors', v: 'None flagged' }
                      );
                    }
                    
                    if (newAssumptions.length === 0) return 'Waiting for conversation to start…';
                    
                    return newAssumptions.map((a, i) => (
                      <div key={i} className="assump-item">
                        <span className="k">{a.k}</span>
                        <span className="v">{a.v}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>


        </section>

        {/* PAGE 3 : RESOURCE GATHERING */}
        <section className={`page ${activeTab === 3 ? 'active' : ''}`} id="page-3">
          <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {resourceStages.map(stage => {
                const isUnlocked = !stage.lockedBy
                  || (stage.id === 2 && [1, 2, 3].every(id => uploadedSheets[id]))
                  || (stage.id === 3 && !!uploadedSheets[4]);

                return (
                  <div key={stage.id} style={{ background: '#fff', border: '1px solid #dde5ee', borderRadius: '14px', opacity: isUnlocked ? 1 : 0.48, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minHeight: '68px', padding: '16px 22px', background: '#fbfcfe', borderBottom: '1px solid #e7edf4' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: stage.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800, flex: '0 0 auto' }}>{stage.id}</div>
                      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: stage.iconBg, color: stage.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800, flex: '0 0 auto' }}>{stage.icon}</div>
                      <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                        <h2 style={{ margin: 0, color: '#13233a', fontSize: '16px', fontWeight: 600 }}>{stage.title}</h2>
                        <p style={{ margin: '4px 0 0', color: '#7d8997', fontSize: '12px', lineHeight: 1.35 }}>{stage.description}</p>
                      </div>
                      {!isUnlocked && stage.lockedBy && (
                        <div style={{ borderRadius: '999px', background: '#f7f9fb', color: '#98a2ae', padding: '7px 12px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          <span style={{ color: '#f0a54a', marginRight: '5px' }}>lock</span> Unlocks after {stage.lockedBy}
                        </div>
                      )}
                    </div>

                    {stage.sheets.map(sheet => {
                      const isUploaded = !!uploadedSheets[sheet.id];
                      return (
                        <div key={sheet.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '18px', minHeight: '62px', padding: '14px 22px', borderTop: '1px solid #edf1f5' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: isUploaded ? '#eaf8f5' : '#f7f8fb', color: isUploaded ? '#6fae9f' : '#d7dce5', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z"></path><polyline points="14 2 14 7 19 7"></polyline><line x1="9" y1="13" x2="15" y2="13"></line><line x1="9" y1="17" x2="15" y2="17"></line></svg>
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <h3 style={{ margin: 0, color: '#16233a', fontSize: '13px', fontWeight: 600 }}>{sheet.title}</h3>
                              <p style={{ margin: '3px 0 0', color: isUploaded ? '#6fae9f' : '#9ca6b3', fontSize: '11px' }}>{isUploaded ? 'Data successfully processed' : sheet.subtitle}</p>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: '0 0 auto' }}>
                            <input type="file" id={`file-upload-${sheet.id}`} accept=".csv,.xlsx,.xls" style={{ display: 'none' }} disabled={!isUnlocked} onChange={(e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                setUploadedSheets(prev => ({ ...prev, [sheet.id]: true }));
                                e.target.value = '';
                              }
                            }} />
                            {isUploaded && (
                              <button
                                type="button"
                                onClick={() => setPreviewSheet(sheet.id)}
                                disabled={!isUnlocked}
                                aria-label={`View uploaded data for ${sheet.title}`}
                                title="View uploaded data"
                                style={{ background: '#fff', color: isUnlocked ? '#183968' : '#aeb6c2', border: '1px solid #b9c8dc', borderRadius: '8px', width: '38px', height: '38px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: isUnlocked ? 'pointer' : 'not-allowed', opacity: isUnlocked ? 1 : 0.65 }}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"></path>
                                  <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                              </button>
                            )}
                            <button type="button" onClick={() => {
                              if (!isUnlocked) return;
                              if (isUploaded) {
                                setUploadedSheets(prev => ({ ...prev, [sheet.id]: false }));
                              } else {
                                document.getElementById(`file-upload-${sheet.id}`)?.click();
                              }
                            }} disabled={!isUnlocked} style={{ background: isUploaded ? '#fff' : '#1f3d70', color: isUploaded ? '#677487' : '#fff', border: isUploaded ? '1px solid #d2dae5' : '1px solid #1f3d70', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 800, cursor: isUnlocked ? 'pointer' : 'not-allowed', opacity: isUnlocked ? 1 : 0.65 }}>
                              {isUploaded ? 'Remove' : 'Upload File'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '18px', minHeight: '72px', background: '#fff', border: '1px dashed #aab8cc', borderRadius: '14px', padding: '14px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f6f8fb', color: '#243a61', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 800 }}>UP</div>
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ margin: 0, color: '#13233a', fontSize: '14px', fontWeight: 800 }}>Existing Forecast Model <span style={{ fontWeight: 600 }}>(optional)</span></h3>
                    <p style={{ margin: '5px 0 0', color: '#1d355c', fontSize: '12px', lineHeight: 1.35 }}>Have a prior model already? Upload it and the AI cross-checks its own recommendations against it before finalizing Assumptions.</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', flex: '0 0 auto' }}>
                  <input type="file" id="file-upload-7" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setUploadedSheets(prev => ({ ...prev, 7: true }));
                      e.target.value = '';
                    }
                  }} />
                  <button type="button" onClick={() => {
                    if (uploadedSheets[7]) {
                      setUploadedSheets(prev => ({ ...prev, 7: false }));
                    } else {
                      document.getElementById('file-upload-7')?.click();
                    }
                  }} style={{ background: uploadedSheets[7] ? '#fff' : '#6b7788', color: uploadedSheets[7] ? '#677487' : '#fff', border: uploadedSheets[7] ? '1px solid #d2dae5' : '1px solid #6b7788', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}>
                    {uploadedSheets[7] ? 'Remove' : 'Upload File'}
                  </button>
                </div>
              </div>
            </div>
            <div style={{ marginTop: '22px', display: 'flex', justifyContent: 'center' }}>
               <button className="btn primary" onClick={() => goPage(4)} style={{ padding: '14px 28px', background: '#1f3d70', borderRadius: '9px', fontSize: '15px' }}>Continue to Assumptions -&gt;</button>
            </div>
          </div>
        </section>
        {/* PAGE 4 : ASSUMPTIONS REVIEW */}
        <section className={`page ${activeTab === 4 ? 'active' : ''}`} id="page-4">
          <h1>Assumptions review</h1>
          <p className="lead">Everything the assistant captured, now editable directly. Adjust any field and the patient funnel updates immediately.</p>
          
          <div style={{ background: 'var(--teal-light)', borderLeft: '4px solid var(--teal)', padding: '12px 16px', borderRadius: '4px', marginBottom: '24px', fontSize: '13.5px', color: 'var(--navy)', lineHeight: '1.5' }}>
            <strong>What is ✨ Ask AI?</strong> Click this button next to any assumption to open the AI assistant. You can use it to validate your inputs against market research, ask for suggested values based on recent data, or even upload documents to automatically extract the right number.
          </div>

          {renderAssumptions(false, false, true)}

          <div style={{ textAlign: 'right', marginTop: '24px' }}>
            <button className="btn secondary" onClick={resetAssumptions} style={{ marginRight: '8px' }}>Reset to conversation defaults</button>
            <button className="btn" onClick={() => goPage(5)}>Generate forecast →</button>
          </div>
        </section>

        {/* PAGE 4 : FORECAST DASHBOARD */}
        <section className={`page ${activeTab === 5 ? 'active' : ''}`} id="page-5">
          <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '32px', alignItems: 'start' }}>
            <div style={{ position: 'sticky', top: '24px', maxHeight: 'calc(100vh - 48px)', overflowY: 'auto', paddingRight: '8px' }}>
              {renderForecastingAlgorithm()}
              {renderAssumptions(true)}
            </div>
            <div style={{ minWidth: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '24px' }} id="dashMetrics">
              <div className="metric" style={{ padding: '12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <div className="label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Net Rev - Peak</div>
                <div className="value" style={{ fontSize: '18px' }}>{fmtM(f.peakRevenue)}</div>
              </div>
              <div className="metric" style={{ padding: '12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <div className="label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Peak Share (Adj)</div>
                <div className="value" style={{ fontSize: '18px' }}>{fmtPct((f as any).adjustedPeakShare * 100)}</div>
              </div>
              <div className="metric" style={{ padding: '12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <div className="label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Peak Patients (Adj)</div>
                <div className="value" style={{ fontSize: '18px' }}>{fmtNum((f as any).adjustedPeakPatients)}</div>
              </div>
              <div className="metric">
                <div className="label">Year 1 Net Rev</div>
                <div className="value" style={{ fontSize: '18px' }}>{fmtM(fAnnual.revenue[0] ?? 0)}</div>
              </div>
              <div className="metric">
                <div className="label">Year 2 Net Rev</div>
                <div className="value" style={{ fontSize: '18px' }}>{fmtM(fAnnual.revenue[1] ?? 0)}</div>
              </div>
              <div className="metric">
                <div className="label">Year 3 Net Rev</div>
                <div className="value" style={{ fontSize: '18px' }}>{fmtM(fAnnual.revenue[2] ?? 0)}</div>
              </div>
            </div>

          <div className="card">
            <h3>Net year revenue forecast, US ($)</h3>
            <div className="legend-row">
              <span><span className="legend-dot" style={{ background: '#2a78d6' }}></span>Net year revenue</span>
            </div>
            <div className="canvas-wrap">
              {activeTab === 5 && <Line 
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => fmtM(Number(v)) } } } }}
                data={{ labels: fAnnual.labels, datasets: [{ label: 'Net Rev', data: fAnnual.revenue, borderColor: '#2a78d6', backgroundColor: 'rgba(42,120,214,0.1)', fill: true, tension: 0.3, pointRadius: 3 }] }} 
              />}
            </div>
          </div>
          
          {renderTornadoChart(false)}

          <div className="grid2">
            <div className="card">
              <h3>Treatments by Months</h3>
              <div className="canvas-wrap" style={{ height: '240px' }}>
                {activeTab === 5 && <Line 
                  options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: (v: any) => fmtNum(Number(v)) } } } }}
                  data={{ labels: MONTH_LABELS_60, datasets: [{ label: 'Patients', data: monthlyTreatmentSeries, borderColor: '#00b2a9', backgroundColor: 'rgba(0,178,169,0.1)', fill: true, tension: 0.3, pointRadius: 3 }] }} 
                />}
              </div>
            </div>
            <div className="card">
              <h3>Market share of treated patients (%)</h3>
              <div className="canvas-wrap" style={{ height: '240px' }}>
                {activeTab === 5 && <Line 
                  options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: (v: any) => `${Number(v).toFixed(1)}%` } } } }}
                  data={{ labels: MONTH_LABELS_60, datasets: [{ label: 'Share %', data: monthlyShareSeries, borderColor: '#F25621', backgroundColor: 'rgba(242,86,33,0.1)', fill: true, tension: 0.3, pointRadius: 3 }] }} 
                />}
              </div>
            </div>
          </div>

          <div className="card">
            <h3>Year-by-year detail</h3>
            <table id="forecastTable">
              <thead>
                <tr><th>Year</th><th>Treatments</th><th>Net Rev</th></tr>
              </thead>
              <tbody>
                {fAnnual.labels.map((label, i) => {
                  return (
                    <tr key={i}>
                      <td>{label}</td>
                      <td>{fmtNum(fAnnual.treatments[i] ?? 0)}</td>
                      <td style={{ fontWeight: 600, color: 'var(--teal)' }}>{fmtM(fAnnual.revenue[i] ?? 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ModelArchitecturePanel state={state} />
          <div style={{ marginTop: '24px' }}></div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '16px' }}>
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
              <button className="btn primary" onClick={() => goPage(6)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                Explore scenarios <span style={{ fontSize: '18px' }}>&rarr;</span>
              </button>
            </div>

            {/* Floating Insights Modal */}
            {showInsights && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.45)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(4px)',
                animation: 'fadeIn 0.2s ease'
              }} onClick={() => setShowInsights(false)}>
                <div style={{
                  background: 'white',
                  borderRadius: '16px',
                  maxWidth: '720px',
                  width: '90vw',
                  maxHeight: '85vh',
                  overflowY: 'auto',
                  padding: '32px',
                  boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
                  position: 'relative',
                  animation: 'slideUp 0.25s ease'
                }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '22px', color: 'var(--navy)' }}>{String.fromCodePoint(0x1F4A1)} Key Insights</h2>
                      <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>AI-generated read on what{String.fromCharCode(39)}s driving the forecast, and where it could break.</p>
                    </div>
                    <button onClick={() => setShowInsights(false)} style={{
                      background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-muted)',
                      width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: '8px', transition: 'background 0.15s'
                    }} onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                       onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}>
                      {String.fromCharCode(0x2715)}
                    </button>
                  </div>

                  <div className="card" style={{ marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '15px', marginBottom: '12px' }}>{String.fromCharCode(0x25B6)} What{String.fromCharCode(39)}s driving this forecast</h3>
                    {[
                      <>
                        Peak share of <strong>{fmtPct(f.adjustedPeakShare * 100)}</strong> is reached around <strong>{`Year ${Math.ceil(state.yearsToPeak)}${peakCalendarYear ? ` (${peakCalendarYear})` : ''}`}</strong>, driven by the current uptake curve and access-retention assumptions.
                      </>,
                      <>
                        Peak-year volume reaches approximately <strong>{fmtNum(peakTreatedPatients)}</strong> patients treated - about <strong>{fmtNum(peakAnnualInjections)}</strong> annual injections at <strong>{state.injectionsPerYear}</strong> injections per patient per year.
                      </>,
                      <>
                        At <strong>{fmtM(state.wacPrice)}</strong> WAC, peak-year revenue reaches <strong>{fmtM(peakGrossRevenue)}</strong> gross - <strong>{fmtM(f.peakRevenue)}</strong> net after sample demand.
                      </>
                    ].map((d, i) => (
                      <div key={i} className="insight-item">
                        <div className="insight-dot"></div>
                        <div className="body" style={{ fontSize: '13.5px', lineHeight: '1.6' }}>{d}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div className="card" style={{ marginBottom: 0 }}>
                      <h3 style={{ fontSize: '15px', marginBottom: '12px' }}>{String.fromCharCode(0x26A0)} Risks to watch</h3>
                      {[
                        earliestCompetitorLaunch
                          ? {
                              title: 'Competitive launch timing',
                              text: (
                                <>
                                  The earliest modeled competitor launch is <strong>{earliestCompetitorLaunch.name}</strong> in <strong>{earliestCompetitorLaunch.launchYear}</strong>, with specialty retention ranging from <strong>{fmtPct(Math.min(earliestCompetitorLaunch.orthoRetention, earliestCompetitorLaunch.pcpRetention) * 100)}</strong> to <strong>{fmtPct(Math.max(earliestCompetitorLaunch.orthoRetention, earliestCompetitorLaunch.pcpRetention) * 100)}</strong>. An earlier launch would pull share pressure forward.
                                </>
                              )
                            }
                          : {
                              title: 'Competitive launch timing',
                              text: <>No competitive launch is currently modeled, so timing pressure stays muted in the forecast.</>
                            },
                        {
                          title: 'Payer access friction',
                          text: (
                            <>
                              Payer access is modeled as <strong>{payerAccessLabels[state.payerAccessRequirement]}</strong> with <strong>{fmtPct(state.pricingAdjFactorAccessImpact * 100)}</strong> retention. Broader payer restriction than assumed could meaningfully delay time-to-peak.
                            </>
                          )
                        }
                      ].map((r, i) => (
                        <div key={i} className="insight-item">
                          <div className="insight-dot risk"></div>
                          <div className="body">
                            <span className="risk-badge">Risk</span><br />
                            <strong>{r.title}</strong>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '3px' }}>{r.text}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="card" style={{ marginBottom: 0 }}>
                      <h3 style={{ fontSize: '15px', marginBottom: '12px' }}>{String.fromCharCode(0x2B06)} Upside levers</h3>
                      {[
                        {
                          title: 'Refrigeration-free reformulation',
                          text: (
                            <>
                              The model still carries <strong>{state.refrigerationDurationMonths}</strong> months of refrigeration friction, with <strong>{fmtPct(state.refrigerationRetentionORS * 100)}</strong> Ortho/Surgical retention and <strong>{fmtPct(state.refrigerationRetentionRheumOther * 100)}</strong> Rheum/Other retention. Removing that cold-chain requirement could lift retention across both channels.
                            </>
                          )
                        },
                        {
                          title: 'Broader treatment-type capture',
                          text: (
                            <>
                              Gains in the <strong>Both IAS + HA</strong> segment beyond the modeled <strong>{fmtPct(state.iasAndHATreatedBoth * 100)}</strong> would expand the addressable pool independently of core share gains.
                            </>
                          )
                        }
                      ].map((r, i) => (
                        <div key={i} className="insight-item">
                          <div className="insight-dot"></div>
                          <div className="body">
                            <span className="opp-badge">Upside</span><br />
                            <strong>{r.title}</strong>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '3px' }}>{r.text}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            )}

                    </div>
          </div>
        </section>

        {/* PAGE 5 : SCENARIOS */}
                <section className={`page ${activeTab === 6 ? 'active' : ''}`} id="page-6">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ margin: 0, marginBottom: '8px' }}>Scenario &amp; sensitivity analysis</h1>
              <p className="lead" style={{ margin: 0 }}>Drag any assumption and the forecast, peak metrics, and sensitivity ranking recalculate instantly.</p>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button className="btn primary" style={{ fontSize: '13px', padding: '8px 16px' }} onClick={() => setScenarioState(JSON.parse(JSON.stringify(state)))}>Have base forecast assumptions populated</button>
          </div>

          <div className="scenario-layout">
            <div style={{ position: 'sticky', top: '24px', maxHeight: 'calc(100vh - 48px)', overflowY: 'auto', paddingRight: '8px' }}>
              {renderAssumptions(true, true)}
              {renderForecastingAlgorithm()}
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
                      <span key={i} className={`scenario-tag ${sc.tag}`}>{sc.name}</span>
                    ))}
                  </div>
                )}
  
                <div className="grid3" style={{ alignContent: 'start' }} id="scenarioMetrics">
                  <div className="metric"><div className="label">Peak-year revenue</div><div className="value">{fmtM(scenarioF.peakRevenue)}</div></div>
                  <div className="metric"><div className="label">Peak patients</div><div className="value">{fmtNum((scenarioF as any).adjustedPeakPatients)}</div></div>
                  <div className="metric"><div className="label">Peak market share</div><div className="value">{fmtPct((scenarioF as any).adjustedPeakShare * 100)}</div></div>
                  <div className="metric"><div className="label">Year 1 revenue</div><div className="value">{fmtM(scenarioAnnual.cumulativeRevenue[0] ?? 0)}</div></div>
                  <div className="metric"><div className="label">Year 2 cumulative revenue</div><div className="value">{fmtM(scenarioAnnual.cumulativeRevenue[1] ?? 0)}</div></div>
                  <div className="metric"><div className="label">Year 3 cumulative revenue</div><div className="value">{fmtM(scenarioAnnual.cumulativeRevenue[2] ?? 0)}</div></div>
                </div>
              </div>
  
              <div className="card">
                <h3>Revenue forecast under current sliders</h3>
                <div className="canvas-wrap">
                  {activeTab === 6 && <Line 
                    options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => fmtM(Number(v)) } } } }}
                    data={{
                      labels: scenarioAnnual.labels,
                      datasets: [
                        { label: 'Net Revenue', data: scenarioAnnual.revenue, borderColor: '#0f7696', backgroundColor: 'rgba(15, 118, 150, 0.1)', tension: 0.3, fill: true, pointRadius: 4, pointHoverRadius: 6 }
                      ]
                    }}
                  />}
                </div>
              </div>
  
              {renderTornadoChart(true)}
            <div style={{ textAlign: 'right', marginTop: '24px' }}>
              <button className="btn" onClick={() => goPage(7)}>Compare scenarios →</button>
            </div>

          </div>
          </div>
        </section>

        {/* PAGE 6 : COMPARE */}
        <section className={`page ${activeTab === 7 ? 'active' : ''}`} id="page-7">
          <h1>Scenario comparison</h1>
          <p className="lead">The base case alongside any custom scenarios you've saved.</p>

          <div className="card">
            <h3>Summary</h3>
            <div style={{ overflowX: 'auto' }}>
              <table id="compareTable" style={{ whiteSpace: 'nowrap', width: '100%' }}>
                <thead>
                  <tr><th>Scenario</th><th>Peak share</th><th>WAC price</th><th>Years to peak</th><th>Peak revenue</th><th>Year 1 net</th><th>Year 2 net</th><th>Year 3 net</th><th>Year 4 net</th><th>Year 5 net</th></tr>
                </thead>
              <tbody>
                {scenarios.map((sc, i) => {
                  const fc = getRebasedForecast(sc.s);
                  const fcAnnual = {
                    revenue: fc.revenue.slice(1)
                  };
                  return (
                    <tr key={i}>
                      <td><span className={`scenario-tag ${sc.tag}`}>{sc.name}</span></td>
                      <td>{fmtPct(fc.adjustedPeakShare * 100)}</td>
                      <td>{fmtM(sc.s.wacPrice)}</td>
                      <td>{Math.ceil(sc.s.yearsToPeak)}</td>
                      <td>{fmtM(fc.peakRevenue)}</td>
                      <td>{fmtM(fcAnnual.revenue[0] ?? 0)}</td>
                      <td>{fmtM(fcAnnual.revenue[1] ?? 0)}</td>
                      <td>{fmtM(fcAnnual.revenue[2] ?? 0)}</td>
                      <td>{fmtM(fcAnnual.revenue[3] ?? 0)}</td>
                      <td>{fmtM(fcAnnual.revenue[4] ?? 0)}</td>
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
                  labels: buildSequentialLabels('Year ', 5), 
                  datasets: scenarios.map((sc, i) => ({ 
                    label: sc.name, 
                    data: getRebasedForecast(sc.s).revenue.slice(1, 6), 
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

        {/* PAGE 7 : EXPORT */}
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

          <div className="card export-card">
            <div>
              <div className="etitle">Export Scenarios (HTML)</div>
              <div className="edesc">Download all saved scenarios as an interactive HTML document, exactly as they appear in the Scenarios tab.</div>
            </div>
            <button className="btn" onClick={exportScenariosHTML}>Download Scenarios HTML</button>
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

        {previewSheet !== null && (
          <div onClick={() => setPreviewSheet(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '800px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ margin: 0, fontSize: '18px' }}>{resourcePreviewData[previewSheet]?.title || `Sheet ${previewSheet}`} Uploaded Data</h2>
                <button onClick={() => setPreviewSheet(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sub)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
              <div style={{ overflow: 'auto', flex: 1, border: '1px solid var(--line)', borderRadius: '8px' }}>
                {previewSheet === 3 ? (
                  <div style={{ padding: '12px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 10px', borderRadius: '999px', background: '#f7f7fb', color: '#667085', fontSize: '11px', fontWeight: 700, marginBottom: '10px' }}>
                      <span>Data Source:</span>
                      <span style={{ color: '#475569' }}>Proprietary Market Research</span>
                    </div>

                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', marginBottom: '14px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ background: '#fff' }}>
                            <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px' }}>METRIC</th>
                            <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px' }}>VALUE</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(resourcePreviewData[3]?.rows || []).map((row, rowIndex) => (
                            <tr key={`treated-metric-${rowIndex}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '7px 12px', color: 'var(--ink)' }}>{row[0]}</td>
                              <td style={{ padding: '7px 12px', textAlign: 'right', color: 'var(--ink)', whiteSpace: 'nowrap' }}>{row[1]}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                      <div style={{ background: '#f8fafc', padding: '8px 12px', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Specialty split (same research, by physician type)</div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ background: '#fff' }}>
                            <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px' }}>SPECIALTY</th>
                            <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px' }}>IAS</th>
                            <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px' }}>HA</th>
                            <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px' }}>BOTH</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            ['Orthopedic Surgeons', '32%', '41%', '27%'],
                            ['Rheumatologists', '28%', '46%', '26%'],
                            ['PCP / Other', '19%', '55%', '26%']
                          ].map((row, rowIndex) => (
                            <tr key={`treated-specialty-${rowIndex}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '7px 12px', color: 'var(--ink)' }}>{row[0]}</td>
                              <td style={{ padding: '7px 12px', textAlign: 'right', color: 'var(--ink)' }}>{row[1]}</td>
                              <td style={{ padding: '7px 12px', textAlign: 'right', color: 'var(--ink)' }}>{row[2]}</td>
                              <td style={{ padding: '7px 12px', textAlign: 'right', color: 'var(--ink)' }}>{row[3]}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div style={{ padding: '8px 12px', fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', borderTop: '1px solid #e2e8f0' }}>
                        Once uploaded, these values populate treatment rates and specialty splits in Assumptions.
                      </div>
                    </div>
                  </div>
                ) : previewSheet === 4 ? (
                  <div style={{ padding: '12px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 10px', borderRadius: '999px', background: '#f7f7fb', color: '#667085', fontSize: '11px', fontWeight: 700, marginBottom: '10px' }}>
                      <span>Data Source:</span>
                      <span style={{ color: '#475569' }}>Proprietary Market Research</span>
                    </div>
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ background: '#fff' }}>
                            <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px' }}>WAC</th>
                            <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px' }}>Ortho</th>
                            <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px' }}>Rheum</th>
                            <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px' }}>PCP/Other</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            ['$400', '26.3%', '25.6%', '23.3%'],
                            ['$575', '22.0%', '22.0%', '22.2%'],
                            ['$800', '20.7%', '20.3%', '19.6%'],
                            ['$1,000', '15.7%', '19.8%', '17.0%']
                          ].map((row, rowIndex) => (
                            <tr key={rowIndex} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              {row.map((cell, cellIndex) => (
                                <td key={cellIndex} style={{ padding: '7px 12px', textAlign: cellIndex === 0 ? 'left' : 'right', color: 'var(--ink)', whiteSpace: 'nowrap' }}>{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div style={{ padding: '8px 12px', fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', borderTop: '1px solid #e2e8f0' }}>
                        Once uploaded, these values populate peak share and the price-based share curve in Assumptions.
                      </div>
                    </div>
                  </div>
                ) : previewSheet === 6 ? (
                  <div style={{ padding: '12px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 10px', borderRadius: '999px', background: '#f7f7fb', color: '#667085', fontSize: '11px', fontWeight: 700, marginBottom: '10px' }}>
                      <span>Data Source:</span>
                      <span style={{ color: '#475569' }}>Proprietary Market Research</span>
                    </div>
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ background: '#fff' }}>
                            <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px' }}>Factor / Event</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px' }}>Timing</th>
                            <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px' }}>Ortho/Rheum Retained</th>
                            <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px' }}>PCP/Other Retained</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            ['Payer access requirement', 'Ongoing', '96%', '94%'],
                            ['Patient assistance program', 'Ongoing', '100%', '100%'],
                            ['Reimbursement / coding transition', 'Auto-linked to launch', '60%', '60%'],
                            ['Regulatory / guideline change', 'Year 1', '95%', '95%'],
                            ['Competitive launch — Event 1', 'Year 2', '85%', '88%'],
                            ['Competitive launch — Event 2', 'Year 3', '90%', '92%']
                          ].map((row, rowIndex) => (
                            <tr key={rowIndex} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              {row.map((cell, cellIndex) => (
                                <td key={cellIndex} style={{ padding: '7px 12px', textAlign: cellIndex >= 2 ? 'right' : 'left', color: 'var(--ink)', whiteSpace: 'nowrap' }}>{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div style={{ padding: '8px 12px', fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', borderTop: '1px solid #e2e8f0' }}>
                        This is the standard shape a PMR summary takes for share-impact questions - one factor per row, retention split by physician channel.
                      </div>
                    </div>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                      <tr>
                        {(resourcePreviewData[previewSheet]?.headers || []).map((header, i) => (
                          <th key={header} style={{ padding: '10px 12px', textAlign: i === 0 ? 'left' : 'right', borderBottom: '1px solid var(--line)', color: 'var(--sub)' }}>{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(resourcePreviewData[previewSheet]?.rows || []).map((row, rowIndex) => (
                        <tr key={`${previewSheet}-${rowIndex}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          {row.map((cell, cellIndex) => (
                            <td key={`${previewSheet}-${rowIndex}-${cellIndex}`} style={{ padding: '10px 12px', textAlign: cellIndex === 0 ? 'left' : 'right', color: 'var(--ink)', whiteSpace: 'nowrap' }}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
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



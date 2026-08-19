import sys

with open('app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Inline components
components = '''
function AccordionSection({
  idx, title, color, isOpen, onToggle, children
}: {
  idx: number; title: string; color: string;
  isOpen: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="accordion-section">
      <button
        className={`accordion-header ${isOpen ? 'open' : ''}`}
        onClick={onToggle}
        style={{ borderLeft: `4px solid ${color}` }}
      >
        <span>{title}</span>
        <span className="accordion-chevron">{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && <div className="accordion-body">{children}</div>}
    </div>
  );
}

function SliderControl({
  label, fieldKey, stops, currentValue, unit, onAskAI,
  onChange
}: {
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

  return (
    <div className="slider-control-row">
      <div className="slider-label-row">
        <span className="slider-label">{label}</span>
        <span className="slider-value-chip">
          {unit === '$'
            ? `$${stops[currentIdx].toLocaleString()}`
            : `${(stops[currentIdx] * (unit === '%' ? 100 : 1)).toLocaleString()}${unit === '$' ? '' : unit}`
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
      />
      <div className="slider-ticks">
        {['Conservative','Semi-Con.','Centered','Semi-Agg.','Aggressive'].map((t,i) => (
          <span key={i} className={`tick-label ${i === currentIdx ? 'active' : ''}`}>{t}</span>
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
'''

content = content.replace('export default function ForecastApp() {', components + '\nexport default function ForecastApp() {')

# 2. Update state and handler
old_handler = '''  function handleStateChange(key: keyof ForecastState, value: number) {
    setState(prev => ({ ...prev, [key]: value }));
  }'''
new_handler = '''  const [openSections, setOpenSections] = useState<Set<number>>(new Set([1]));

  function toggleSection(idx: number) {
    setOpenSections(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  function handleStateChange(
    key: keyof ForecastState,
    value: number | string | boolean
  ) {
    setState(prev => ({ ...prev, [key]: value as never }));
  }'''

content = content.replace(old_handler, new_handler)


# 3. Replace page-3 JSX
import re
start_str = r'<section className=\{`page \$\{activeTab === 3 \? \'active\' : \'\'\}`\} id="page-3">'
end_str = r'<div className="card">\s*<h3>Patient flow funnel</h3>'

page3_replacement = '''<section className={`page ${activeTab === 3 ? 'active' : ''}`} id="page-3">
          <h1>Assumptions review</h1>
          <p className="lead">Everything the assistant captured, now editable directly. Adjust any field and the patient funnel updates immediately.</p>
          
          <div style={{ background: 'var(--teal-light)', borderLeft: '4px solid var(--teal)', padding: '12px 16px', borderRadius: '4px', marginBottom: '24px', fontSize: '13.5px', color: 'var(--navy)', lineHeight: '1.5' }}>
            <strong>What is ✨ Ask AI?</strong> Click this button next to any assumption to open the AI assistant. You can use it to validate your inputs against market research, ask for suggested values based on recent data, or even upload documents to automatically extract the right number.
          </div>

          <AccordionSection idx={1} title="SECTION 1 — 🧬 Patient Universe & Diagnosis (Stages 1–2)" color="#1a9e75" isOpen={openSections.has(1)} onToggle={() => toggleSection(1)}>
            <SliderControl label="Prevalence (diagnosed patients)" fieldKey="prevalence" stops={[1500000, 1620000, 1750000, 1880000, 2000000]} currentValue={state.prevalence} unit=" pts" onAskAI={() => openAiModal('prevalence')} onChange={v => handleStateChange('prevalence', v)} />
            <SliderControl label="Diagnosis rate (base year)" fieldKey="diagnosisRate" stops={[0.048, 0.049, 0.051, 0.052, 0.053]} currentValue={state.diagnosisRate} unit="%" onAskAI={() => openAiModal('diagnosisRate')} onChange={v => handleStateChange('diagnosisRate', v)} />
            <SliderControl label="Diagnosis annual growth rate" fieldKey="diagnosisAnnualGrowthRate" stops={[0.019, 0.025, 0.032, 0.045, 0.055]} currentValue={state.diagnosisAnnualGrowthRate} unit="%" onAskAI={() => openAiModal('diagnosisAnnualGrowthRate')} onChange={v => handleStateChange('diagnosisAnnualGrowthRate', v)} />
          </AccordionSection>

          <AccordionSection idx={2} title="SECTION 2 — 💉 Treatment Split (Stage 3)" color="#e07b2a" isOpen={openSections.has(2)} onToggle={() => toggleSection(2)}>
            <SliderControl label="IAS treated % of diagnosed (base yr)" fieldKey="iasTreatedPctOfDiagnosed" stops={[0.244, 0.264, 0.284, 0.304, 0.324]} currentValue={state.iasTreatedPctOfDiagnosed} unit="%" onAskAI={() => openAiModal('iasTreatedPctOfDiagnosed')} onChange={v => handleStateChange('iasTreatedPctOfDiagnosed', v)} />
            <SliderControl label="IAS treated annual growth rate" fieldKey="iasTreatedGrowthRate" stops={[0.01, 0.02, 0.03, 0.035, 0.04]} currentValue={state.iasTreatedGrowthRate} unit="%" onAskAI={() => openAiModal('iasTreatedGrowthRate')} onChange={v => handleStateChange('iasTreatedGrowthRate', v)} />
            <SliderControl label="HA-to-IAS ratio" fieldKey="haRatioToIAS" stops={[0.30, 0.40, 0.45, 0.50, 0.55]} currentValue={state.haRatioToIAS} unit="%" onAskAI={() => openAiModal('haRatioToIAS')} onChange={v => handleStateChange('haRatioToIAS', v)} />
            <SliderControl label="HA ratio annual growth rate" fieldKey="haRatioGrowthRate" stops={[-0.02, -0.015, -0.01, -0.005, 0.0]} currentValue={state.haRatioGrowthRate} unit="%" onAskAI={() => openAiModal('haRatioGrowthRate')} onChange={v => handleStateChange('haRatioGrowthRate', v)} />
            <SliderControl label="IAS+HA treated (both) %" fieldKey="iasAndHATreatedBoth" stops={[0.10, 0.125, 0.15, 0.175, 0.20]} currentValue={state.iasAndHATreatedBoth} unit="%" onAskAI={() => openAiModal('iasAndHATreatedBoth')} onChange={v => handleStateChange('iasAndHATreatedBoth', v)} />
            <SliderControl label="Initial promotional market lift" fieldKey="initialAdditionalMarketGrowth" stops={[0.025, 0.035, 0.045, 0.055, 0.065]} currentValue={state.initialAdditionalMarketGrowth} unit="%" onAskAI={() => openAiModal('initialAdditionalMarketGrowth')} onChange={v => handleStateChange('initialAdditionalMarketGrowth', v)} />
            <SliderControl label="Annual decay of promo lift" fieldKey="annualDecayRateOfAdditionalGrowth" stops={[0.15, 0.175, 0.20, 0.225, 0.25]} currentValue={state.annualDecayRateOfAdditionalGrowth} unit="%" onAskAI={() => openAiModal('annualDecayRateOfAdditionalGrowth')} onChange={v => handleStateChange('annualDecayRateOfAdditionalGrowth', v)} />
          </AccordionSection>

          <AccordionSection idx={3} title="SECTION 3 — 🏥 Product Profile & Preference (Stage 5)" color="#e07b2a" isOpen={openSections.has(3)} onToggle={() => toggleSection(3)}>
            <SliderControl label="Overstatement adjustment factor" fieldKey="overstatementAdjFactor" stops={[0.10, 0.16, 0.22, 0.25, 0.30]} currentValue={state.overstatementAdjFactor} unit="%" onAskAI={() => openAiModal('overstatementAdjFactor')} onChange={v => handleStateChange('overstatementAdjFactor', v)} />
            <ToggleControl label="WOMAC pain-score data available?" fieldKey="womacScoreAvailable" value={state.womacScoreAvailable} onChange={v => handleStateChange('womacScoreAvailable', v)} />
            <ToggleControl label="Diabetes/glycemic data available?" fieldKey="diabetesGlycemicDataAvailable" value={state.diabetesGlycemicDataAvailable} onChange={v => handleStateChange('diabetesGlycemicDataAvailable', v)} />
            <SliderControl label="WAC price per injection" fieldKey="wacPrice" stops={[400, 500, 575, 800, 1000]} currentValue={state.wacPrice} unit="$" onAskAI={() => openAiModal('wacPrice')} onChange={v => handleStateChange('wacPrice', v)} />
            <SliderControl label="Market research adj. — Ortho" fieldKey="newMarketResearchAdjOrtho" stops={[0.95, 1.10, 1.25, 1.40, 1.55]} currentValue={state.newMarketResearchAdjOrtho} unit="%" onAskAI={() => openAiModal('newMarketResearchAdjOrtho')} onChange={v => handleStateChange('newMarketResearchAdjOrtho', v)} />
            <SliderControl label="Market research adj. — Rheum/PCP" fieldKey="newMarketResearchAdjRheum" stops={[0.90, 0.95, 1.00, 1.05, 1.10]} currentValue={state.newMarketResearchAdjRheum} unit="%" onAskAI={() => openAiModal('newMarketResearchAdjRheum')} onChange={v => handleStateChange('newMarketResearchAdjRheum', v)} />
          </AccordionSection>

          <AccordionSection idx={4} title="SECTION 4 — 🔒 Payer Access (Stage 6)" color="#d9534f" isOpen={openSections.has(4)} onToggle={() => toggleSection(4)}>
            <SelectControl label="Payer access requirement" fieldKey="payerAccessRequirement" options={[{value: 'none', label: 'None'}, {value: 'prior_auth_only', label: 'Prior Auth'}, {value: 'pre_cert', label: 'Pre-Cert'}, {value: 'pre_cert_step_edit', label: 'Pre-Cert + Step Edit'}, {value: 'prior_auth_plus_step_edit', label: 'PA + Step Edit'}]} value={state.payerAccessRequirement} onAskAI={() => openAiModal('payerAccessRequirement')} onChange={v => handleStateChange('payerAccessRequirement', v)} />
            <SliderControl label="Pricing adj. — access impact (% surviving)" fieldKey="pricingAdjFactorAccessImpact" stops={[0.90, 0.92, 0.96, 0.97, 0.98]} currentValue={state.pricingAdjFactorAccessImpact} unit="%" onAskAI={() => openAiModal('pricingAdjFactorAccessImpact')} onChange={v => handleStateChange('pricingAdjFactorAccessImpact', v)} />
            <ToggleControl label="Patient assistance program in place?" fieldKey="patientAssistanceProgramInPlace" value={state.patientAssistanceProgramInPlace} onChange={v => handleStateChange('patientAssistanceProgramInPlace', v)} />
            <SliderControl label="Pricing adj. — PAP lift" fieldKey="pricingAdjPatientAssistanceImpact" stops={[1.00, 1.05, 1.10, 1.15, 1.20]} currentValue={state.pricingAdjPatientAssistanceImpact} unit="%" onAskAI={() => openAiModal('pricingAdjPatientAssistanceImpact')} onChange={v => handleStateChange('pricingAdjPatientAssistanceImpact', v)} />
          </AccordionSection>

          <AccordionSection idx={5} title="SECTION 5 — 📈 Market Uptake & Reach (Stage 7)" color="#5b6abf" isOpen={openSections.has(5)} onToggle={() => toggleSection(5)}>
            <SliderControl label="Years to peak share" fieldKey="yearsToPeak" stops={[7, 6, 5, 4, 3]} currentValue={state.yearsToPeak} unit=" yrs" onAskAI={() => openAiModal('yearsToPeak')} onChange={v => handleStateChange('yearsToPeak', v)} />
            <SliderControl label="Ortho/Rheum reached by month 12" fieldKey="pctORSReachedByMonth12" stops={[0.60, 0.65, 0.70, 0.75, 0.80]} currentValue={state.pctORSReachedByMonth12} unit="%" onAskAI={() => openAiModal('pctORSReachedByMonth12')} onChange={v => handleStateChange('pctORSReachedByMonth12', v)} />
            <SliderControl label="Ortho/Rheum reached by year 2" fieldKey="pctORSReachedByYear2" stops={[0.70, 0.75, 0.80, 0.85, 0.90]} currentValue={state.pctORSReachedByYear2} unit="%" onAskAI={() => openAiModal('pctORSReachedByYear2')} onChange={v => handleStateChange('pctORSReachedByYear2', v)} />
            <SliderControl label="Ortho/Rheum reached by year 3+" fieldKey="pctORSReachedByYear3Plus" stops={[0.75, 0.80, 0.85, 0.90, 0.95]} currentValue={state.pctORSReachedByYear3Plus} unit="%" onAskAI={() => openAiModal('pctORSReachedByYear3Plus')} onChange={v => handleStateChange('pctORSReachedByYear3Plus', v)} />
            <SliderControl label="PCP/Other reached by month 12" fieldKey="pctPCPReachedByMonth12" stops={[0.40, 0.46, 0.524, 0.58, 0.64]} currentValue={state.pctPCPReachedByMonth12} unit="%" onAskAI={() => openAiModal('pctPCPReachedByMonth12')} onChange={v => handleStateChange('pctPCPReachedByMonth12', v)} />
            <SliderControl label="PCP/Other reached by year 2" fieldKey="pctPCPReachedByYear2" stops={[0.52, 0.56, 0.60, 0.64, 0.68]} currentValue={state.pctPCPReachedByYear2} unit="%" onAskAI={() => openAiModal('pctPCPReachedByYear2')} onChange={v => handleStateChange('pctPCPReachedByYear2', v)} />
            <SliderControl label="PCP/Other reached by year 3+" fieldKey="pctPCPReachedByYear3Plus" stops={[0.56, 0.60, 0.65, 0.70, 0.75]} currentValue={state.pctPCPReachedByYear3Plus} unit="%" onAskAI={() => openAiModal('pctPCPReachedByYear3Plus')} onChange={v => handleStateChange('pctPCPReachedByYear3Plus', v)} />
          </AccordionSection>

          <AccordionSection idx={6} title="SECTION 6 — 🏷️ Access Friction (Stages 8–9)" color="#d9534f" isOpen={openSections.has(6)} onToggle={() => toggleSection(6)}>
            <SliderControl label="J-Code window duration" fieldKey="jCodeWindowMonths" stops={[6, 9, 12, 15, 18]} currentValue={state.jCodeWindowMonths} unit=" mo" onAskAI={() => openAiModal('jCodeWindowMonths')} onChange={v => handleStateChange('jCodeWindowMonths', v)} />
            <SliderControl label="J-Code retention rate (misc code)" fieldKey="jCodeRetentionRate" stops={[0.80, 0.84, 0.88, 0.91, 0.94]} currentValue={state.jCodeRetentionRate} unit="%" onAskAI={() => openAiModal('jCodeRetentionRate')} onChange={v => handleStateChange('jCodeRetentionRate', v)} />
            <SliderControl label="Refrigeration requirement duration" fieldKey="refrigerationDurationMonths" stops={[12, 15, 18, 24, 120]} currentValue={state.refrigerationDurationMonths} unit=" mo" onAskAI={() => openAiModal('refrigerationDurationMonths')} onChange={v => handleStateChange('refrigerationDurationMonths', v)} />
            <SliderControl label="Refrigeration retention — Ortho/Surgical" fieldKey="refrigerationRetentionORS" stops={[0.70, 0.80, 0.88, 0.92, 0.95]} currentValue={state.refrigerationRetentionORS} unit="%" onAskAI={() => openAiModal('refrigerationRetentionORS')} onChange={v => handleStateChange('refrigerationRetentionORS', v)} />
            <SliderControl label="Refrigeration retention — Rheum/Other" fieldKey="refrigerationRetentionRheumOther" stops={[0.70, 0.80, 0.88, 0.92, 0.95]} currentValue={state.refrigerationRetentionRheumOther} unit="%" onAskAI={() => openAiModal('refrigerationRetentionRheumOther')} onChange={v => handleStateChange('refrigerationRetentionRheumOther', v)} />
          </AccordionSection>

          <AccordionSection idx={7} title="SECTION 7 — ⚔️ Competitive Events (Stages 11–13)" color="#c0392b" isOpen={openSections.has(7)} onToggle={() => toggleSection(7)}>
            <div className="competitor-card">
              <div className="competitor-card-title">Product Y (HA+steroid combo)</div>
              <DateOrNeverControl label="Launch Date" fieldKey="cingalLaunchDate" value={state.cingalLaunchDate} onChange={v => handleStateChange('cingalLaunchDate', v)} />
              <SliderControl label="Retention Ortho" fieldKey="cingalRetentionOrtho" stops={[0.70, 0.72, 0.74, 0.78, 0.90]} currentValue={state.cingalRetentionOrtho} unit="%" onAskAI={() => openAiModal('cingalRetentionOrtho')} onChange={v => handleStateChange('cingalRetentionOrtho', v)} />
              <SliderControl label="Retention PCP" fieldKey="cingalRetentionPCP" stops={[0.80, 0.82, 0.85, 0.90, 1.00]} currentValue={state.cingalRetentionPCP} unit="%" onAskAI={() => openAiModal('cingalRetentionPCP')} onChange={v => handleStateChange('cingalRetentionPCP', v)} />
            </div>
            
            <div className="competitor-card">
              <div className="competitor-card-title">Product Z (biologic) — base case: Does Not Launch</div>
              <DateOrNeverControl label="Launch Date" fieldKey="ampionLaunchDate" value={state.ampionLaunchDate} onChange={v => handleStateChange('ampionLaunchDate', v)} />
              <SliderControl label="Retention Ortho" fieldKey="ampionRetentionOrtho" stops={[0.75, 0.80, 0.865, 0.90, 0.95]} currentValue={state.ampionRetentionOrtho} unit="%" onAskAI={() => openAiModal('ampionRetentionOrtho')} onChange={v => handleStateChange('ampionRetentionOrtho', v)} />
              <SliderControl label="Retention PCP" fieldKey="ampionRetentionPCP" stops={[0.75, 0.80, 0.84, 0.90, 0.95]} currentValue={state.ampionRetentionPCP} unit="%" onAskAI={() => openAiModal('ampionRetentionPCP')} onChange={v => handleStateChange('ampionRetentionPCP', v)} />
            </div>

            <div className="competitor-card">
              <div className="competitor-card-title">Anti-NGF class</div>
              <DateOrNeverControl label="Launch Date" fieldKey="antiNGFLaunchDate" value={state.antiNGFLaunchDate} onChange={v => handleStateChange('antiNGFLaunchDate', v)} />
              <SliderControl label="Retention Ortho" fieldKey="antiNGFRetentionOrtho" stops={[0.80, 0.85, 0.90, 0.95, 1.00]} currentValue={state.antiNGFRetentionOrtho} unit="%" onAskAI={() => openAiModal('antiNGFRetentionOrtho')} onChange={v => handleStateChange('antiNGFRetentionOrtho', v)} />
              <SliderControl label="Retention PCP" fieldKey="antiNGFRetentionPCP" stops={[0.90, 0.92, 0.95, 0.97, 1.00]} currentValue={state.antiNGFRetentionPCP} unit="%" onAskAI={() => openAiModal('antiNGFRetentionPCP')} onChange={v => handleStateChange('antiNGFRetentionPCP', v)} />
            </div>
          </AccordionSection>

          <AccordionSection idx={8} title="SECTION 8 — 📦 Volume & Revenue (Stage 14)" color="#7b3fa0" isOpen={openSections.has(8)} onToggle={() => toggleSection(8)}>
            <SliderControl label="Injection frequency (per patient/year)" fieldKey="frequencyOfInjectionsYearly" stops={[1.0, 1.3, 1.5, 1.7, 2.0]} currentValue={state.frequencyOfInjectionsYearly} unit="/yr" onAskAI={() => openAiModal('frequencyOfInjectionsYearly')} onChange={v => handleStateChange('frequencyOfInjectionsYearly', v)} />
          </AccordionSection>

          <div className="card">
            <h3>Patient flow funnel</h3>'''

content = re.sub(start_str + r'.*?' + end_str, page3_replacement, content, flags=re.DOTALL)

with open('app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)


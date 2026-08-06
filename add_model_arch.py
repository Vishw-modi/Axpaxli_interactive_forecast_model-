import sys

with open('app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# ADD ModelArchitecturePanel component
comp_code = '''
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
'''

# Find export default function ForecastApp
insert_idx = content.find("export default function ForecastApp")
content = content[:insert_idx] + comp_code + content[insert_idx:]

# Inject into page-4
# Search for the buttons at the end of page-4
search_str = "<div style={{ textAlign: 'right' }}>\\n              <button className=\"btn secondary\" onClick={() => goPage(6)}"
panel_usage = "<ModelArchitecturePanel state={state} />\\n            <div style={{ marginTop: '24px' }}></div>\\n            "

inject_idx = content.find(search_str)
if inject_idx != -1:
    content = content[:inject_idx] + panel_usage + content[inject_idx:]
else:
    print("Could not find insertion point!")

with open('app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

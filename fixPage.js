const fs = require('fs');
let content = fs.readFileSync('app/page.tsx', 'utf8');

const startStr = '// Forecast calculations';
const endStr = '// Compare scenarios';
const startIdx = content.indexOf(startStr);
const endIdx = content.indexOf(endStr);

const replacement = `// Forecast calculations
  const f = computeForecast(state);
  const baseF = computeForecast(defaultState);
  
  // Rebase modeled revenue to Product X actuals
  const rebasedRevenue = f.years.map((y, i) => {
    const baseModeled = baseF.revenue[i] || 1;
    const currentModeled = f.revenue[i] || 0;
    const actual = (f as any).zilrettaActuals[i] || 0;
    const ratio = currentModeled / baseModeled;
    return actual * ratio;
  });
  
  f.revenue = rebasedRevenue;
  f.peakRevenue = Math.max(...rebasedRevenue);

  const scenarioF = computeForecast(scenarioState);
  
  // Rebase scenario modeled revenue to Product X actuals
  const rebasedScenarioRevenue = scenarioF.years.map((y, i) => {
    const baseModeled = baseF.revenue[i] || 1;
    const currentModeled = scenarioF.revenue[i] || 0;
    const actual = (scenarioF as any).zilrettaActuals[i] || 0;
    const ratio = currentModeled / baseModeled;
    return actual * ratio;
  });
  
  scenarioF.revenue = rebasedScenarioRevenue;
  scenarioF.peakRevenue = Math.max(...rebasedScenarioRevenue);
  let _cum = 0;
  scenarioF.cumulativeRevenue = rebasedScenarioRevenue.map(r => { _cum += r; return _cum; });

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

  `;

content = content.substring(0, startIdx) + replacement + content.substring(endIdx);
fs.writeFileSync('app/page.tsx', content, 'utf8');

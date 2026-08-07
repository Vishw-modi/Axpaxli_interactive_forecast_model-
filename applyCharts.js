const fs = require('fs');

let pageContent = fs.readFileSync('app/page.tsx', 'utf8');

// 1. Add Constants above ForecastApp
const constantsStr = `
const CHART_LABELS_13 = ['Dec-17','Jun-18','Dec-18','Jun-19','Dec-19','Jun-20','Dec-20',
          'Jun-21','Dec-21','Jun-22','Dec-22','Jun-23','Dec-23'];
 
const PATIENTS_BASE_13 = [562, 4208, 13835, 33960, 58345, 84981, 107172, 121203,
                 128872, 131983, 133472, 135366, 138285];
 
const SHARE_BASE_13 = [0.001, 0.005, 0.016, 0.037, 0.060, 0.082, 0.099, 0.107,
              0.108, 0.107, 0.104, 0.101, 0.100];

export default function ForecastApp() {`;

pageContent = pageContent.replace('export default function ForecastApp() {', constantsStr);

// 2. Add computation logic after `const scenarioF = getRebasedForecast(scenarioState);`
const logicStr = `const scenarioF = getRebasedForecast(scenarioState);

  // Dynamic rebasing for 13-point charts
  const mapPointToYearIndex = (pointIndex: number) => {
    if (pointIndex === 0) return 0; // Dec-17 -> Year 0
    if (pointIndex <= 2) return 1;  // Jun-18, Dec-18 -> Year 1
    if (pointIndex <= 4) return 2;  // Jun-19, Dec-19 -> Year 2
    if (pointIndex <= 6) return 3;  // Jun-20, Dec-20 -> Year 3
    if (pointIndex <= 8) return 4;  // Jun-21, Dec-21 -> Year 4
    return 5;                       // Jun-22 to Dec-23 -> Year 5
  };

  const dynamicPatients = PATIENTS_BASE_13.map((baseVal, idx) => {
    const i = mapPointToYearIndex(idx);
    const ratio = baseF.patients[i] ? (f.patients[i] / baseF.patients[i]) : 1;
    return Math.round(baseVal * ratio);
  });

  const dynamicShare = SHARE_BASE_13.map((baseVal, idx) => {
    const i = mapPointToYearIndex(idx);
    const ratio = baseF.share[i] ? (f.share[i] / baseF.share[i]) : 1;
    // Convert fraction to percentage and clamp to 100%
    const scaledPct = (baseVal * ratio) * 100;
    return Math.min(scaledPct, 100); 
  });
`;
pageContent = pageContent.replace('const scenarioF = getRebasedForecast(scenarioState);', logicStr);

// 3. Replace the two charts
const oldChartsRegex = /<div className="grid2">[\s\S]*?<div className="card">\s*<h3>Year-by-year detail<\/h3>/;

const newChartsStr = `<div className="grid2">
            <div className="card">
              <h3>Patients on therapy</h3>
              <div className="canvas-wrap" style={{ height: '240px' }}>
                {activeTab === 4 && <Line 
                  options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: (v: any) => fmtNum(Number(v)) } } } }}
                  data={{ labels: CHART_LABELS_13, datasets: [{ label: 'Patients', data: dynamicPatients, borderColor: '#00b2a9', backgroundColor: 'rgba(0,178,169,0.1)', fill: true, tension: 0.3, pointRadius: 3 }] }} 
                />}
              </div>
            </div>
            <div className="card">
              <h3>Market share of treated patients (%)</h3>
              <div className="canvas-wrap" style={{ height: '240px' }}>
                {activeTab === 4 && <Line 
                  options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: (v: any) => \`\${Number(v).toFixed(1)}%\` } } } }}
                  data={{ labels: CHART_LABELS_13, datasets: [{ label: 'Share %', data: dynamicShare, borderColor: '#F25621', backgroundColor: 'rgba(242,86,33,0.1)', fill: true, tension: 0.3, pointRadius: 3 }] }} 
                />}
              </div>
            </div>
          </div>

          <div className="card">
            <h3>Year-by-year detail</h3>`;

pageContent = pageContent.replace(oldChartsRegex, newChartsStr);

fs.writeFileSync('app/page.tsx', pageContent, 'utf8');
console.log('Charts replaced successfully');

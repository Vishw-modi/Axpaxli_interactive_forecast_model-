const fs = require('fs');
let content = fs.readFileSync('app/page.tsx', 'utf8');

const target1 = `  // Forecast calculations
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
  scenarioF.cumulativeRevenue = rebasedScenarioRevenue.map(r => { _cum += r; return _cum; });`;

const replacement1 = `  // Forecast calculations
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
  const scenarioF = getRebasedForecast(scenarioState);`;

const target2 = `                {scenarios.map((sc, i) => {
                  const fc = computeForecast(sc.s);
                  return (
                    <tr key={i}>`;

const replacement2 = `                {scenarios.map((sc, i) => {
                  const fc = getRebasedForecast(sc.s);
                  return (
                    <tr key={i}>`;

if(content.includes(target1) && content.includes(target2)) {
    content = content.replace(target1, replacement1);
    content = content.replace(target2, replacement2);
    fs.writeFileSync('app/page.tsx', content, 'utf8');
    console.log("Success");
} else {
    console.log("Target not found");
}

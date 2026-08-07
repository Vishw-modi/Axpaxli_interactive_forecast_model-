const fs = require('fs');
let content = fs.readFileSync('app/page.tsx', 'utf8');

const fixTableTarget = `          <div className="card">
            <h3>Summary</h3>
            <div style={{ overflowX: 'auto' }}>
                      <td>{fmtM(fc.peakRevenue)}</td>
                      <td>{fmtM(fc.revenue[0])}</td>
                      <td>{fmtM(fc.revenue[1])}</td>`;

const fixTableReplacement = `          <div className="card">
            <h3>Summary</h3>
            <div style={{ overflowX: 'auto' }}>
              <table id="compareTable" style={{ whiteSpace: 'nowrap', width: '100%' }}>
                <thead>
                  <tr><th>Scenario</th><th>Peak share</th><th>Net price</th><th>Years to peak</th><th>Peak revenue</th><th>Year 1 net</th><th>Year 2 net</th><th>Year 3 net</th><th>Year 4 net</th><th>Year 5 net</th></tr>
                </thead>
              <tbody>
                {scenarios.map((sc, i) => {
                  const fc = getRebasedForecast(sc.s);
                  return (
                    <tr key={i}>
                      <td><span className={\`scenario-tag \${sc.tag}\`}>{sc.name}</span></td>
                      <td>{fmtPct(sc.s.peakShare * 100)}</td>
                      <td>{fmtM(sc.s.netPrice)}</td>
                      <td>{Math.ceil(sc.s.yearsToPeak)}</td>
                      <td>{fmtM(fc.peakRevenue)}</td>
                      <td>{fmtM(fc.revenue[0])}</td>
                      <td>{fmtM(fc.revenue[1])}</td>`;

if(content.includes(fixTableTarget)) {
    content = content.replace(fixTableTarget, fixTableReplacement);
} else {
    console.log("fixTableTarget not found");
}

const fixChartTarget = `                    data: computeForecast(sc.s).revenue.slice(0, 5),`;
const fixChartReplacement = `                    data: getRebasedForecast(sc.s).revenue.slice(0, 5),`;

if(content.includes(fixChartTarget)) {
    content = content.replace(fixChartTarget, fixChartReplacement);
} else {
    console.log("fixChartTarget not found");
}

fs.writeFileSync('app/page.tsx', content, 'utf8');
console.log("Done");

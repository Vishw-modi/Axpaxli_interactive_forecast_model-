const fs = require('fs');
let content = fs.readFileSync('app/page.tsx', 'utf8');

const target = `          <h1>Scenario comparison</h1>
          <p className="lead">The base case alongside any custom scenarios you've saved.</p>
            </div>
          </div>`;

const replacement = `          <h1>Scenario comparison</h1>
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
                  const fc = getRebasedForecast(sc.s);
                  return (
                    <tr key={i}>
                      <td><span className={\`scenario-tag \${sc.tag}\`}>{sc.name}</span></td>
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
          </div>`;

if(content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('app/page.tsx', content, 'utf8');
    console.log("Success");
} else {
    console.log("Target not found");
}

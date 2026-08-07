const fs = require('fs');
let content = fs.readFileSync('app/page.tsx', 'utf8');

const regex = /<tr><th>Scenario<\/th><th>Peak share<\/th><th>Net price<\/th><th>Years to peak<\/th><th>Peak revenue<\/th><th>Year 1 net<\/th><th>Year 2 net<\/th><th>Year 3 net<\/th><th>Year 4 net<\/th><th>Year 5 net<\/th><\/tr>\s*<\/thead>\s*<tbody>\s*\{scenarios\.map\(\(sc, i\) => \{\s*const fc = getRebasedForecast\(sc\.s\);\s*return \(\s*<tr key=\{i\}>\s*<td><span className=\{\`scenario-tag \$\{sc\.tag\}\`\}>\{sc\.name\}<\/span><\/td>\s*<td>\{fmtPct\(sc\.s\.peakShare \* 100\)\}<\/td>\s*<td>\{fmtM\(sc\.s\.netPrice\)\}<\/td>\s*<td>\{Math\.ceil\(sc\.s\.yearsToPeak\)\}<\/td>/g;

const replacement = `<tr><th>Scenario</th><th>Peak share</th><th>WAC price</th><th>Years to peak</th><th>Peak revenue</th><th>Year 1 net</th><th>Year 2 net</th><th>Year 3 net</th><th>Year 4 net</th><th>Year 5 net</th></tr>
                </thead>
              <tbody>
                {scenarios.map((sc, i) => {
                  const fc = getRebasedForecast(sc.s);
                  return (
                    <tr key={i}>
                      <td><span className={\`scenario-tag \${sc.tag}\`}>{sc.name}</span></td>
                      <td>{fmtPct(fc.adjustedPeakShare * 100)}</td>
                      <td>{fmtM(sc.s.wacPrice)}</td>
                      <td>{Math.ceil(sc.s.yearsToPeak)}</td>`;

if(regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync('app/page.tsx', content, 'utf8');
    console.log("Success");
} else {
    console.log("Target not found");
}

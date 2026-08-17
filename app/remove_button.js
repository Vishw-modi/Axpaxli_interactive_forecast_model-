const fs = require('fs');
const path = 'page.tsx';
let content = fs.readFileSync(path, 'utf8');

const searchStr = `<p className="lead" style={{ margin: 0 }}>Drag any assumption and the forecast, peak metrics, and sensitivity ranking recalculate instantly.</p>
            </div>
            <button className="btn secondary" onClick={() => setScenarioState(JSON.parse(JSON.stringify(state)))}>Have base forecast assumptions populated</button>
          </div>`;

const replaceStr = `<p className="lead" style={{ margin: 0 }}>Drag any assumption and the forecast, peak metrics, and sensitivity ranking recalculate instantly.</p>
            </div>
          </div>`;

content = content.replace(searchStr, replaceStr);

fs.writeFileSync(path, content, 'utf8');
console.log("Original button removed.");

const fs = require('fs');
let content = fs.readFileSync('app/page.tsx', 'utf8');

const target = `            <div style={{ textAlign: 'right', marginTop: '24px' }}>
              <button className="btn" onClick={() => goPage(7)}>Compare scenarios →</button>
            </div>

          </div>`;

const replacement = `            <div style={{ textAlign: 'right', marginTop: '24px' }}>
              <button className="btn" onClick={() => goPage(7)}>Compare scenarios →</button>
            </div>

          </div>
          </div>
        </section>

        {/* PAGE 7 : COMPARE */}
        <section className={\`page \${activeTab === 7 ? 'active' : ''}\`} id="page-7">
          <h1>Scenario comparison</h1>
          <p className="lead">The base case alongside any custom scenarios you've saved.</p>`;

if(content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('app/page.tsx', content, 'utf8');
    console.log("Success");
} else {
    console.log("Target not found");
}

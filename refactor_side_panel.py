import re

with open('app/page.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

start_str = '<AccordionSection idx={1}'
end_str = '</div>\n\n          <div style={{ textAlign: \'right\', marginTop: \'24px\' }}>'

start_idx = c.find(start_str)
end_idx = c.find(end_str)

if start_idx == -1 or end_idx == -1:
    print("Could not find assumptions block bounds!")
    exit(1)

assumptions_code = c[start_idx:end_idx]

# To avoid ID conflicts on funnelBody
assumptions_code = assumptions_code.replace('id="funnelBody"', 'className="funnelBody"')

c = c[:start_idx] + '{renderAssumptions()}' + c[end_idx:]

# Update page-4
page4_start = c.find('<section className={`page ${activeTab === 4 ? \'active\' : \'\'}`} id="page-4">')
if page4_start == -1:
    print("Could not find page-4 start!")
    exit(1)

page4_end = c.find('</section>', page4_start)
page4_content = c[page4_start:page4_end + len('</section>')]

new_page4_content = page4_content.replace(
    '<section className={`page ${activeTab === 4 ? \'active\' : \'\'}`} id="page-4">',
    '<section className={`page ${activeTab === 4 ? \'active\' : \'\'}`} id="page-4">\n' +
    '          <div style={{ display: \'grid\', gridTemplateColumns: \'360px 1fr\', gap: \'32px\', alignItems: \'start\' }}>\n' +
    '            <div style={{ position: \'sticky\', top: \'24px\', maxHeight: \'calc(100vh - 48px)\', overflowY: \'auto\', paddingRight: \'8px\' }}>\n' +
    '              <h3 style={{marginTop: 0, marginBottom: "16px"}}>Live Assumptions</h3>\n' +
    '              {renderAssumptions()}\n' +
    '            </div>\n' +
    '            <div style={{ minWidth: 0 }}>'
)
new_page4_content = new_page4_content.replace('</section>', '            </div>\n          </div>\n        </section>')

c = c.replace(page4_content, new_page4_content)

# Inject render_func just before `return (` 
# using a regex to find the `return (` of the `ForecastApp` function.
# since the state variables are inside ForecastApp, we inject it inside ForecastApp.
# we find the last `return (` since ForecastApp is the main function and ends with `return (`.
return_match = list(re.finditer(r'\s+return\s*\(\s*<>', c))[-1]

render_func = f'''
  const renderAssumptions = () => (
    <>
      {assumptions_code}
    </>
  );
'''

c = c[:return_match.start()] + render_func + c[return_match.start():]

with open('app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

print("Successfully refactored page-4 to include assumptions side panel.")

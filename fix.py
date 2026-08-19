import re

with open('app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Tornado chart logic
content = content.replace('activeTab === 5 || activeTab === 4', 'activeTab === 6 || activeTab === 5')
content = content.replace('const tabCheck = isScenario ? 5 : 4;', 'const tabCheck = isScenario ? 6 : 5;')

# 2. Layout stretching for main-content
old_main = '<main className={`main-content ${[2, 5, 6].includes(activeTab) ? \'wide\' : \'\'}`}>'
new_main = '<main className="main-content" style={{ maxWidth: [2, 5, 6].includes(activeTab) ? "100%" : "1080px", margin: "0 auto", padding: [2, 5, 6].includes(activeTab) ? "28px" : "28px 24px 80px", width: "100%" }}>'
content = content.replace(old_main, new_main)

# 3. Tab 3 Resource Gathering Centering
old_tab3 = '''<section className={`page ${activeTab === 3 ? 'active' : ''}`} id="page-3">
          <div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '24px', textAlign: 'center' }}>'''
new_tab3 = '''<section className={`page ${activeTab === 3 ? 'active' : ''}`} id="page-3">
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '24px', textAlign: 'center' }}>'''
content = content.replace(old_tab3, new_tab3)

# 4. Overrides Nomenclature
content = content.replace('Q4-2017 Override Adjustment', 'Q4-Year 2 Override Adjustment')
content = content.replace('Q1-2018 Override Adjustment', 'Q1-Year 3 Override Adjustment')
content = content.replace('Q2-2018 Override Adjustment', 'Q2-Year 3 Override Adjustment')
content = content.replace('Q3-2018 Override Adjustment', 'Q3-Year 3 Override Adjustment')
content = content.replace('Q4-2018 Override Adjustment', 'Q4-Year 3 Override Adjustment')

# 5. Exact years replacement (2016-2020)
content = content.replace('2016 Net Rev', 'Year 1 Net Rev')
content = content.replace('2017 Net Rev', 'Year 2 Net Rev')
content = content.replace('2018 Net Rev', 'Year 3 Net Rev')

content = content.replace('2016 net', 'Year 1 net')
content = content.replace('2017 net', 'Year 2 net')
content = content.replace('2018 net', 'Year 3 net')
content = content.replace('2019 net', 'Year 4 net')
content = content.replace('2020 net', 'Year 5 net')

content = content.replace('2016 cumulative revenue', 'Year 1 cumulative revenue')
content = content.replace('2017 cumulative revenue', 'Year 2 cumulative revenue')
content = content.replace('2018 cumulative revenue', 'Year 3 cumulative revenue')
content = content.replace('2019 cumulative revenue', 'Year 4 cumulative revenue')
content = content.replace('2020 cumulative revenue', 'Year 5 cumulative revenue')

content = content.replace('2016 revenue', 'Year 1 revenue')

content = content.replace('>2016</th>', '>Year 1</th>')
content = content.replace('>2017</th>', '>Year 2</th>')
content = content.replace('>2018</th>', '>Year 3</th>')
content = content.replace('>2019</th>', '>Year 4</th>')
content = content.replace('>2020</th>', '>Year 5</th>')

content = content.replace('2016 IMS OA Knee Diagnosed Patients', 'Year 1 IMS OA Knee Diagnosed Patients')
content = content.replace('2016 IMS diagnosed-patient data', 'Year 1 IMS diagnosed-patient data')
content = content.replace('2016 IMS Data', 'Year 1 IMS Data')
content = content.replace('2016 IMS PharMetrics', 'Year 1 IMS PharMetrics')
content = content.replace('2016 IMS data', 'Year 1 IMS Data')

# 6. Chart labels array map replacement
content = content.replace("labels: ['2016', '2017', '2018', '2019', '2020']", "labels: ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5']")
content = content.replace("data={{ labels: f.years, datasets: [{ label: 'Net Rev', data: f.revenue", "data={{ labels: f.years.map(y => `Year ${y - 2015}`), datasets: [{ label: 'Net Rev', data: f.revenue")
content = content.replace("labels: scenarioF.years,\n                      datasets: [", "labels: scenarioF.years.map(y => `Year ${y - 2015}`),\n                      datasets: [")
content = content.replace("<td>{y}</td>\n                      <td>{fmtNum((f as any).zilrettaTreatments[i])}</td>", "<td>Year {y - 2015}</td>\n                      <td>{fmtNum((f as any).zilrettaTreatments[i])}</td>")

with open('app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

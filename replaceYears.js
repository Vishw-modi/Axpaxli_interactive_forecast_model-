const fs = require('fs');

let pageContent = fs.readFileSync('app/page.tsx', 'utf8');
let forecastContent = fs.readFileSync('utils/forecast.ts', 'utf8');

forecastContent = forecastContent.replace(/years\.push\('Year ' \+ \(i \+ 1\)\);/g, "years.push((2016 + i).toString());");

pageContent = pageContent.replace(/Year 1 Net Rev/g, '2016 Net Rev');
pageContent = pageContent.replace(/Year 2 Net Rev/g, '2017 Net Rev');
pageContent = pageContent.replace(/Year 3 Net Rev/g, '2018 Net Rev');
pageContent = pageContent.replace(/Year 4 Net Rev/g, '2019 Net Rev');
pageContent = pageContent.replace(/Year 5 Net Rev/g, '2020 Net Rev');
pageContent = pageContent.replace(/Year 6 Net Rev/g, '2021 Net Rev');

pageContent = pageContent.replace(/1-year revenue/g, '2016 revenue');
pageContent = pageContent.replace(/2-year cumulative revenue/g, '2017 cumulative revenue');
pageContent = pageContent.replace(/3-year cumulative revenue/g, '2018 cumulative revenue');

pageContent = pageContent.replace(/<th>Year 1 net<\/th><th>Year 2 net<\/th><th>Year 3 net<\/th><th>Year 4 net<\/th><th>Year 5 net<\/th>/g, 
  "<th>2016 net</th><th>2017 net</th><th>2018 net</th><th>2019 net</th><th>2020 net</th>");

pageContent = pageContent.replace(/labels: \['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'\],/g, 
  "labels: ['2016', '2017', '2018', '2019', '2020'],");

fs.writeFileSync('app/page.tsx', pageContent, 'utf8');
fs.writeFileSync('utils/forecast.ts', forecastContent, 'utf8');
console.log('Replacements executed');

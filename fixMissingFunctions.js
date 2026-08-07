const fs = require('fs');
let content = fs.readFileSync('app/page.tsx', 'utf8');

const targetStr = `  const openAiModal = (metricKey: string) => {`;
const toInsert = `  const handleStateChange = (key: keyof ForecastState, value: number | string | boolean) => {
    setState(prev => ({ ...prev, [key]: value as never }));
    setScenarioState(prev => ({ ...prev, [key]: value as never }));
  };

  const handleScenarioChange = (key: keyof ForecastState, value: number | string | boolean) => {
    setScenarioState(prev => ({ ...prev, [key]: value as never }));
  };

  const resetAssumptions = () => {
    setScenarioState(state);
  };

`;

content = content.replace(targetStr, toInsert + targetStr);
fs.writeFileSync('app/page.tsx', content, 'utf8');

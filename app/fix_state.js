const fs = require('fs');
const path = 'page.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('const [showInsights, setShowInsights]')) {
    content = content.replace('const [activeTab, setActiveTab] = useState(1);', 'const [activeTab, setActiveTab] = useState(1);\n  const [showInsights, setShowInsights] = useState(false);');
    fs.writeFileSync(path, content, 'utf8');
    console.log('State added.');
} else {
    console.log('State already exists.');
}

const fs = require('fs');
const path = 'F:\\inkflow app\\InkFlow_Project\\inkflow_harvests\\_side_effect_test.txt';
fs.writeFileSync(path, 'Node.js ran at ' + new Date().toISOString(), 'utf8');

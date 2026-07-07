const { execSync } = require('child_process');
try {
  console.log('=== Starting vite build ===');
  const stdout = execSync('npx vite build 2>&1', { 
    cwd: 'F:\\inkflow app\\InkFlow_Project\\inkflow_harvests',
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  });
  console.log(stdout);
  console.log('=== Build SUCCEEDED ===');
  process.exit(0);
} catch (e) {
  console.log('=== Build FAILED ===');
  console.log(e.stdout || '');
  console.log(e.stderr || '');
  console.log('Error:', e.message);
  process.exit(1);
}

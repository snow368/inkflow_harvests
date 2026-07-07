const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const logFile = path.join('F:\\inkflow app\\InkFlow_Project\\inkflow_harvests', '_step_output.txt');
const lines = [];

function log(msg) {
  lines.push(msg);
  console.log(msg);
}

try {
  // Step 1: Build
  log('=== STEP 1: npx vite build ===');
  try {
    const buildOut = execSync('npx.cmd vite build', {
      cwd: 'F:\\inkflow app\\InkFlow_Project\\inkflow_harvests',
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024,
      shell: 'cmd.exe',
      timeout: 120000
    });
    log('BUILD OUTPUT:');
    log(buildOut);
    log('=== BUILD SUCCEEDED ===');
  } catch (e) {
    log('BUILD FAILED:');
    log('stdout: ' + (e.stdout || ''));
    log('stderr: ' + (e.stderr || ''));
    log('message: ' + e.message);
    log('=== BUILD FAILED - skipping deploy ===');
    fs.writeFileSync(logFile, lines.join('\n'), 'utf8');
    process.exit(1);
  }

  // Step 2: Deploy
  log('');
  log('=== STEP 2: npx wrangler pages deploy dist --project-name=harvests --branch=main ===');
  try {
    const deployOut = execSync('npx.cmd wrangler pages deploy dist --project-name=harvests --branch=main', {
      cwd: 'F:\\inkflow app\\InkFlow_Project\\inkflow_harvests',
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024,
      shell: 'cmd.exe',
      timeout: 120000
    });
    log('DEPLOY OUTPUT:');
    log(deployOut);
    log('=== DEPLOY SUCCEEDED ===');
  } catch (e) {
    log('DEPLOY FAILED:');
    log('stdout: ' + (e.stdout || ''));
    log('stderr: ' + (e.stderr || ''));
    log('message: ' + e.message);
    log('=== DEPLOY FAILED ===');
  }

  fs.writeFileSync(logFile, lines.join('\n'), 'utf8');
  log('Log written to: ' + logFile);

} catch (err) {
  log('FATAL ERROR: ' + err.message);
  fs.writeFileSync(logFile, lines.join('\n'), 'utf8');
}

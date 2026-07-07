const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectDir = 'F:\\inkflow app\\InkFlow_Project\\inkflow_harvests';
const outFile = path.join(projectDir, '_build_log.txt');

const lines = [];

function log(m) { lines.push(m); console.log(m); }

log(new Date().toISOString());
log('=== STEP 1: npx vite build ===');
try {
  const out = execSync('npx.cmd vite build', {
    cwd: projectDir,
    encoding: 'utf8',
    maxBuffer: 50*1024*1024,
    shell: 'cmd.exe',
    timeout: 120000
  });
  log(out);
  log('=== BUILD SUCCEEDED ===');
} catch(e) {
  log('BUILD FAILED');
  log('stdout: ' + (e.stdout||''));
  log('stderr: ' + (e.stderr||''));
  log('message: ' + e.message);
  fs.writeFileSync(outFile, lines.join('\n'), 'utf8');
  process.exit(1);
}

log('');
log('=== STEP 2: npx wrangler pages deploy dist --project-name=harvests --branch=main ===');
try {
  const out = execSync('npx.cmd wrangler pages deploy dist --project-name=harvests --branch=main', {
    cwd: projectDir,
    encoding: 'utf8',
    maxBuffer: 50*1024*1024,
    shell: 'cmd.exe',
    timeout: 120000
  });
  log(out);
  log('=== DEPLOY SUCCEEDED ===');
} catch(e) {
  log('DEPLOY FAILED');
  log('stdout: ' + (e.stdout||''));
  log('stderr: ' + (e.stderr||''));
  log('message: ' + e.message);
}

fs.writeFileSync(outFile, lines.join('\n'), 'utf8');
log('Written to ' + outFile);

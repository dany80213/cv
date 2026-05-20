import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PORT = 4399;
const OUT = path.join(ROOT, 'public', 'Daniele_Porcaro_CV.pdf');

function startPreview() {
  return new Promise((resolve, reject) => {
    const proc = spawn('npm', ['run', 'preview', '--', '--port', PORT, '--host', 'localhost'], {
      cwd: ROOT, stdio: 'pipe',
    });
    proc.stdout.on('data', d => {
      if (d.toString().includes('localhost')) resolve(proc);
    });
    proc.stderr.on('data', d => {
      if (d.toString().includes('localhost')) resolve(proc);
    });
    setTimeout(() => resolve(proc), 4000);
  });
}

async function run() {
  console.log('Building...');
  const { execSync } = await import('child_process');
  execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });

  console.log('Starting preview server...');
  const server = await startPreview();
  await new Promise(r => setTimeout(r, 1500));

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.goto(`http://localhost:${PORT}/cv/pdf`, { waitUntil: 'networkidle0', timeout: 30000 });

  // Wait for fonts
  await page.evaluateHandle('document.fonts.ready');
  await new Promise(r => setTimeout(r, 1000));

  console.log('Generating PDF...');
  await page.pdf({
    path: OUT,
    format: 'A4',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });

  await browser.close();
  server.kill();

  const size = (fs.statSync(OUT).size / 1024).toFixed(1);
  console.log(`✓ PDF generated: ${OUT} (${size} KB)`);
}

run().catch(err => { console.error(err); process.exit(1); });

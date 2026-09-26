import { chromium } from '@playwright/test';
import fs from 'fs';
const d = JSON.parse(fs.readFileSync('/tmp/claude-0/-home-user-family-tree/7da6b52e-f1e8-54b7-b5a7-840367393bf8/scratchpad/medida.json','utf8')).family;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const w of [800, 1024, 1400, 1920]) {
const ctx = await b.newContext({ viewport: { width: w, height: 800 } });
await ctx.addInitScript((x) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('family-tree-data-v2', JSON.stringify(x)); localStorage.setItem('medida_theme','light'); sessionStorage.setItem('s','1'); } }, { schemaVersion:'2.0.0', ...d });
const p = await ctx.newPage();
await p.goto('http://localhost:5173/app', { waitUntil:'networkidle' }); await p.waitForTimeout(1800);
const hh = await p.evaluate(() => { const h = document.querySelector('.ft-header'); const bad = [...h.querySelectorAll('button')].filter(b => { const r=b.getBoundingClientRect(); return r.width && (r.right > innerWidth || r.height > 48); }).map(b=>b.innerText||b.title); return { h: h.getBoundingClientRect().height, bad }; });
console.log(w, JSON.stringify(hh));
await p.screenshot({ path: '/tmp/claude-0/-home-user-family-tree/7da6b52e-f1e8-54b7-b5a7-840367393bf8/scratchpad/hdr-'+w+'.png', clip: { x:0, y:0, width: w, height: 110 } });
if (w===1400) await p.screenshot({ path: '/tmp/claude-0/-home-user-family-tree/7da6b52e-f1e8-54b7-b5a7-840367393bf8/scratchpad/open-1400.png' });
await ctx.close();
}
await b.close();

import { spawn } from 'child_process';

const child = spawn('npx.cmd', ['vite', '--host'], {
  cwd: 'd:\\Projects\\family-tree',
  shell: true,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, CI: 'true' }
});

child.stdout.on('data', (d) => console.log('[STDOUT]', d.toString()));
child.stderr.on('data', (d) => console.error('[STDERR]', d.toString()));
child.on('error', (err) => console.error('[ERROR]', err));
child.on('exit', (code, sig) => console.log('[EXIT]', code, sig));

setTimeout(() => {
  console.log('[TIMEOUT REACHED] Child is still running:', !child.killed);
  child.kill();
}, 5000);

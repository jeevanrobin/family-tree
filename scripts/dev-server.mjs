import { spawn } from 'child_process';

console.log('[dev-server] Launching Vite development server...');

const isWindows = process.platform === 'win32';
const viteBin = isWindows ? 'npx.cmd' : 'npx';

const child = spawn(viteBin, ['vite', '--host'], {
  cwd: process.cwd(),
  shell: true,
  stdio: 'inherit',
  env: { ...process.env, CI: 'true' }
});

child.on('error', (err) => {
  console.error('[dev-server] Failed to start child process:', err);
});

child.on('exit', (code, signal) => {
  console.log(`[dev-server] Vite exited with code ${code} and signal ${signal}`);
  // If Vite exited with non-zero, exit accordingly
  if (code !== 0 && code !== null) {
    process.exit(code);
  }
});

// Handle graceful shutdown
const cleanup = () => {
  if (!child.killed) {
    try {
      child.kill('SIGTERM');
    } catch {
      /* ignore */
    }
  }
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

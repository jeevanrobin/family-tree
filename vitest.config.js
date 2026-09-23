import { defineConfig } from 'vitest/config';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function loadLocalEnv() {
  const envPath = resolve(process.cwd(), '.env.local');
  if (!existsSync(envPath)) return {};
  
  const content = readFileSync(envPath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex > 0) {
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      env[key] = value;
    }
  }
  return env;
}

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.js'],
    exclude: ['tests/browser/**'],
    env: loadLocalEnv(),
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/family-tree/**/*.js'],
      exclude: [
        'src/family-tree/data/sampleData.js',
        'src/**/*.jsx'
      ]
    }
  }
});

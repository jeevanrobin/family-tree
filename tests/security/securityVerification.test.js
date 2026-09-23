/**
 * Security Verification Tests
 * Verify no client-side secrets in build output
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * @param {string} dir
 * @param {string} ext
 * @returns {string[]}
 */
function findFiles(dir, ext) {
  const results = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      results.push(...findFiles(fullPath, ext));
    } else if (item.name.endsWith(ext)) {
      results.push(fullPath);
    }
  }
  
  return results;
}

describe('Security Verification', () => {
  describe('Environment Variables', () => {
    it('should not have VITE_TYPESAFE_API_KEY in .env.example', () => {
      const envExample = fs.readFileSync('.env.example', 'utf-8');
      expect(envExample).not.toContain('VITE_TYPESAFE_API_KEY');
      expect(envExample).not.toContain('TYPESAFE_API_KEY');
    });

    it('should not have TypeSafe API key references in source', () => {
      const files = findFiles('src', '.js').concat(findFiles('src', '.jsx'));
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        expect(content).not.toContain('api.typesafe.ai');
      }
    });

    it('should not import TypeSafe SDK in client code', () => {
      const files = findFiles('src', '.js').concat(findFiles('src', '.jsx'));
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        expect(content).not.toContain('@typesafe-ai/sdk');
      }
    });
  });

  describe('Edge Function Security', () => {
    it('Edge Function should use Deno.env.get for secrets', () => {
      const edgeFunction = fs.readFileSync(
        'supabase/functions/jev-date-extract/index.ts',
        'utf-8'
      );
      expect(edgeFunction).toContain('Deno.env.get("TYPESAFE_API_KEY")');
      expect(edgeFunction).not.toContain('VITE_TYPESAFE_API_KEY');
    });

    it('Edge Function should not log raw input', () => {
      const edgeFunction = fs.readFileSync(
        'supabase/functions/jev-date-extract/index.ts',
        'utf-8'
      );
      expect(edgeFunction).not.toContain('console.log(input');
      expect(edgeFunction).not.toContain('console.log(body');
    });

    it('Edge Function should have CORS headers', () => {
      const edgeFunction = fs.readFileSync(
        'supabase/functions/jev-date-extract/index.ts',
        'utf-8'
      );
      expect(edgeFunction).toContain('corsHeaders');
      expect(edgeFunction).toContain('Access-Control-Allow-Origin');
    });

    it('Edge Function should handle OPTIONS preflight', () => {
      const edgeFunction = fs.readFileSync(
        'supabase/functions/jev-date-extract/index.ts',
        'utf-8'
      );
      expect(edgeFunction).toContain('req.method === "OPTIONS"');
    });
  });

  describe('Client Code Security', () => {
    it('client should call Edge Function, not direct API', () => {
      const clientCode = fs.readFileSync(
        'src/family-tree/utils/jevDateExtraction.js',
        'utf-8'
      );
      expect(clientCode).toContain('client.functions.invoke');
      expect(clientCode).toContain('jev-date-extract');
      expect(clientCode).not.toContain('api.typesafe.ai');
    });

    it('client should use Supabase anon key only', () => {
      const clientCode = fs.readFileSync(
        'src/family-tree/utils/jevDateExtraction.js',
        'utf-8'
      );
      expect(clientCode).toContain('VITE_SUPABASE_ANON_KEY');
      expect(clientCode).not.toContain('TYPESAFE_API_KEY');
    });

    it('client should not store API key in module scope', () => {
      const clientCode = fs.readFileSync(
        'src/family-tree/utils/jevDateExtraction.js',
        'utf-8'
      );
      expect(clientCode).not.toMatch(/const.*apiKey.*=.*['"]/);
      expect(clientCode).not.toMatch(/let.*apiKey.*=.*['"]/);
    });
  });

  describe('Build Security (requires build)', () => {
    /**
     * @returns {string[]}
     */
    function findDistFiles() {
      if (!fs.existsSync('dist')) return [];
      
      const results = [];
      const items = fs.readdirSync('dist', { withFileTypes: true });
      
      for (const item of items) {
        if (item.isDirectory()) {
          const subDir = path.join('dist', item.name);
          const subItems = fs.readdirSync(subDir, { withFileTypes: true });
          for (const subItem of subItems) {
            if (subItem.name.endsWith('.js')) {
              results.push(path.join(subDir, subItem.name));
            }
          }
        } else if (item.name.endsWith('.js')) {
          results.push(path.join('dist', item.name));
        }
      }
      
      return results;
    }

    it('should not contain actual API key in dist', () => {
      if (!fs.existsSync('dist')) {
        throw new Error('Run npm run build first');
      }

      const distFiles = findDistFiles();

      let foundSecrets = false;
      for (const file of distFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        
        if (content.includes('apikey_') || /\bsk-[A-Za-z0-9]{20,}\b/.test(content)) {
          foundSecrets = true;
          console.error(`Found secret in ${file}`);
        }
      }

      expect(foundSecrets).toBe(false);
    });

    it('should not contain TypeSafe URL in dist', () => {
      if (!fs.existsSync('dist')) {
        throw new Error('Run npm run build first');
      }

      const distFiles = findDistFiles();

      let foundUrl = false;
      for (const file of distFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        
        if (content.includes('api.typesafe.ai')) {
          foundUrl = true;
          console.error(`Found TypeSafe URL in ${file}`);
        }
      }

      expect(foundUrl).toBe(false);
    });
  });
});

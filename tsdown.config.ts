import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'tsdown';

export function createTemplateManifest(
  templateRoot = new URL('./templates/', import.meta.url),
): Record<string, string> {
  const manifest: Record<string, string> = {};

  const walk = (currentPath: string, relativeDir = ''): void => {
    const entries = fs
      .readdirSync(currentPath, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      const entryPath = path.join(currentPath, entry.name);
      const relativePath = relativeDir ? path.posix.join(relativeDir, entry.name) : entry.name;

      if (entry.isDirectory()) {
        walk(entryPath, relativePath);
        continue;
      }

      manifest[relativePath] = fs.readFileSync(entryPath).toString('base64');
    }
  };

  walk(path.normalize(new URL(templateRoot).pathname));

  return manifest;
}

const templateManifest = createTemplateManifest();

export default defineConfig({
  outExtensions: () => ({ js: '.js' }),
  deps: {
    alwaysBundle: ['*'],
    onlyBundle: false,
  },
  define: {
    'globalThis.SCRIPT_ACTION_TEMPLATE_MANIFEST': JSON.stringify(templateManifest),
  },
});

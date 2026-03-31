import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('tsdown config', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('creates a single neutral bundle with a stable index entry', async () => {
    const { createBuildConfig } = await import('../tsdown.config.js');
    const config = createBuildConfig(process.env);

    expect(config).toMatchObject({
      entry: { index: './src/index.ts' },
      format: 'esm',
      clean: true,
      fixedExtension: false,
      platform: 'node',
      target: 'node24',
    });
  });

  it('disables minify in watch mode', async () => {
    const { createBuildConfig } = await import('../tsdown.config.js');
    const config = createBuildConfig({
      ...process.env,
      SCRIPT_ACTION_BUILD_WATCH: 'true',
    });

    expect(config).toMatchObject({
      minify: false,
    });
  });
});

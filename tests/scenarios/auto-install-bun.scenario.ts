import type { RunScenario } from './types.js';

const scenario: RunScenario = {
  name: 'auto-install packages in bun mode',
  inputs: {
    bun: 'true',
    auto_install: 'true',
  },
  execCalls: [
    {
      command: '/bun/bin/bun',
      args: ['run', '-i', '/tmp/script-action/src/index.ts'],
    },
  ],
  renderContext: {
    bun: true,
    zx: true,
  },
  installBunCalls: 1,
  existingPaths: ['/tmp/script-action/node_modules'],
};

export default scenario;

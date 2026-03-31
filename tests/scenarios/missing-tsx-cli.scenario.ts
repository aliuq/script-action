import type { RunScenario } from './types.js';

const scenario: RunScenario = {
  name: 'missing-tsx-cli fails clearly',
  script: 'console.log("missing tsx")',
  execCalls: [
    {
      command: 'npm',
      args: ['install', '@actions/core', '@actions/exec', 'tsx', 'zx'],
    },
  ],
  renderContext: {
    bun: false,
    zx: true,
  },
  expectedFailure: 'tsx CLI not found at: /tmp/script-action/node_modules/tsx/dist/cli.mjs',
};

export default scenario;

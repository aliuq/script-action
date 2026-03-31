import type { RunScenario } from './types.js';

const scenario: RunScenario = {
  name: 'environment-variable in bun mode',
  inputs: {
    bun: 'true',
  },
  script: 'console.log(process.env.TEST_VAR)',
  execCalls: [
    {
      command: '/bun/bin/bun',
      args: ['install', '@actions/core', '@actions/exec'],
    },
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
};

export default scenario;

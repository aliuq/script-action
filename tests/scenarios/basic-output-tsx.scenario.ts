import process from 'node:process';
import type { RunScenario } from './types.js';

const scenario: RunScenario = {
  name: 'basic-output in tsx mode',
  script: 'console.log("Hello from Script Action!")',
  execCalls: [
    {
      command: 'npm',
      args: ['install', '@actions/core', '@actions/exec', 'tsx', 'zx'],
    },
    {
      command: process.execPath,
      args: ['/tmp/script-action/node_modules/tsx/dist/cli.mjs', '/tmp/script-action/src/index.ts'],
    },
  ],
  renderContext: {
    bun: false,
    zx: true,
  },
};

export default scenario;

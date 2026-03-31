import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RunScenario } from './scenarios/types.js';

const coreMock = vi.hoisted(() => ({
  endGroup: vi.fn(),
  getInput: vi.fn(),
  getMultilineInput: vi.fn(),
  group: vi.fn(async (_name: string, callback: () => Promise<void>) => callback()),
  info: vi.fn(),
  isDebug: vi.fn(() => false),
  setFailed: vi.fn(),
  setOutput: vi.fn(),
  startGroup: vi.fn(),
}));

const fsMock = vi.hoisted(() => ({
  readFile: vi.fn(),
  rm: vi.fn(),
}));

const utilsMock = vi.hoisted(() => ({
  exist: vi.fn(),
  execCommand: vi.fn(),
  installBun: vi.fn(),
  logDebug: vi.fn(),
  renderTemplates: vi.fn(),
  tmpdir: vi.fn(),
  writeTemplates: vi.fn(),
}));

vi.mock('@actions/core', () => coreMock);
vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
  return {
    ...actual,
    default: {
      ...actual,
      readFile: fsMock.readFile,
      rm: fsMock.rm,
    },
    readFile: fsMock.readFile,
    rm: fsMock.rm,
  };
});
vi.mock('../src/utils.js', () => utilsMock);

const TMP_DIR = '/tmp/script-action';
const MODULE_DIR = path.join(TMP_DIR, 'node_modules');
const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const INPUT_NAMES = ['script', 'auto_install', 'bun', 'zx'] as const;
type InputName = (typeof INPUT_NAMES)[number];

function defaultInputValue(name: InputName | string): string {
  switch (name) {
    case 'script':
      return '#!/usr/bin/env node\nconsole.log("hello")';
    case 'auto_install':
      return 'false';
    case 'bun':
      return 'false';
    case 'zx':
      return 'true';
    default:
      return '';
  }
}

function expectedInputValue(name: InputName | string, override?: string): string {
  if (name === 'script' && override) {
    return override;
  }

  return override ?? defaultInputValue(name);
}

async function loadRunScenarios(): Promise<RunScenario[]> {
  const scenariosDir = path.join(TEST_DIR, 'scenarios');
  const entries = await fs.readdir(scenariosDir);
  const scenarioFiles = entries
    .filter((file) => file.endsWith('.scenario.ts'))
    .sort((left, right) => left.localeCompare(right));

  const scenarios = await Promise.all(
    scenarioFiles.map(async (file) => {
      const moduleUrl = pathToFileURL(path.join(scenariosDir, file)).href;
      const module = (await import(moduleUrl)) as { default: RunScenario };
      return module.default;
    }),
  );

  return scenarios.sort((left, right) => left.name.localeCompare(right.name));
}

const runScenarios = await loadRunScenarios();

function resetScenarioMocks(): void {
  vi.clearAllMocks();
  vi.resetModules();
  delete process.env.BUN;

  coreMock.getInput.mockImplementation((name: string) => defaultInputValue(name));
  coreMock.getMultilineInput.mockReturnValue([]);
  fsMock.readFile.mockResolvedValue('compiled script');
  fsMock.rm.mockResolvedValue(undefined);
  utilsMock.execCommand.mockResolvedValue('');
  utilsMock.installBun.mockResolvedValue('/bun/bin/bun');
  utilsMock.renderTemplates.mockResolvedValue(undefined);
  utilsMock.tmpdir.mockResolvedValue(TMP_DIR);
  utilsMock.writeTemplates.mockResolvedValue('/repo/templates');
  utilsMock.exist.mockResolvedValue(true);
}

describe('runAction scenarios', () => {
  beforeEach(() => {
    resetScenarioMocks();
  });

  it('discovers scenario files from the filesystem', () => {
    expect(runScenarios.length).toBeGreaterThan(0);
  });

  for (const scenario of runScenarios) {
    it(scenario.name, async () => {
      coreMock.getInput.mockImplementation((name: string) => {
        const typedName = name as InputName;
        const override = INPUT_NAMES.includes(typedName)
          ? (scenario.inputs?.[typedName] ?? (typedName === 'script' ? scenario.script : undefined))
          : undefined;

        return expectedInputValue(typedName, override);
      });
      coreMock.getMultilineInput.mockReturnValue(scenario.packages ?? []);
      utilsMock.exist.mockImplementation(async (target: string) => {
        if (
          scenario.expectedFailure &&
          target === path.join(MODULE_DIR, 'tsx', 'dist', 'cli.mjs')
        ) {
          return false;
        }

        return scenario.existingPaths?.includes(target) ?? true;
      });

      const { runAction } = await import('../src/index.js');
      await runAction();

      expect(utilsMock.renderTemplates).toHaveBeenCalledWith(
        '/repo/templates',
        TMP_DIR,
        expect.objectContaining(scenario.renderContext),
      );

      if (scenario.installBunCalls !== undefined) {
        expect(utilsMock.installBun).toHaveBeenCalledTimes(scenario.installBunCalls);
      }

      if (scenario.expectedFailure) {
        expect(coreMock.setFailed).toHaveBeenCalledWith(scenario.expectedFailure);
        expect(coreMock.setOutput).not.toHaveBeenCalled();
      } else {
        expect(coreMock.setOutput).toHaveBeenCalledWith('status', 'success');
      }

      expect(
        utilsMock.execCommand.mock.calls.map(([command, args]) => ({ command, args })),
      ).toEqual(scenario.execCalls);
    });
  }
});

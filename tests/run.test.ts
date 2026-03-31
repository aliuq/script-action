import path from 'node:path';
import process from 'node:process';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  default: {
    readFile: vi.fn(),
    rm: vi.fn(),
  },
}));

const utilsMock = vi.hoisted(() => ({
  exist: vi.fn(),
  execCommand: vi.fn(),
  getTemplateRoot: vi.fn(),
  installBun: vi.fn(),
  logDebug: vi.fn(),
  renderTemplates: vi.fn(),
  tmpdir: vi.fn(),
}));

vi.mock('@actions/core', () => coreMock);
vi.mock('node:fs/promises', () => fsMock);
vi.mock('../src/utils.js', () => utilsMock);

const TMP_DIR = '/tmp/script-action';
const MAIN_FILE = path.join(TMP_DIR, 'src', 'index.ts');
const MODULE_DIR = path.join(TMP_DIR, 'node_modules');
const TSX_CLI = path.join(MODULE_DIR, 'tsx', 'dist', 'cli.mjs');

function getInputValue(name: string): string {
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

describe('runAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    delete process.env.BUN;

    coreMock.getInput.mockImplementation((name: string) => getInputValue(name));
    coreMock.getMultilineInput.mockReturnValue([]);
    fsMock.default.readFile.mockResolvedValue('compiled script');
    fsMock.default.rm.mockResolvedValue(undefined);
    utilsMock.execCommand.mockResolvedValue('');
    utilsMock.getTemplateRoot.mockReturnValue('/repo/templates');
    utilsMock.installBun.mockResolvedValue('/bun/bin/bun');
    utilsMock.renderTemplates.mockResolvedValue(undefined);
    utilsMock.tmpdir.mockResolvedValue(TMP_DIR);
    utilsMock.exist.mockResolvedValue(true);
  });

  it('installs packages with npm and runs tsx when bun is disabled', async () => {
    coreMock.getMultilineInput.mockReturnValue(['axios dayjs']);

    const { runAction } = await import('../src/run.js');
    await runAction();

    expect(utilsMock.execCommand).toHaveBeenNthCalledWith(
      1,
      'npm',
      ['install', 'axios', 'dayjs', '@actions/core', '@actions/exec', 'tsx', 'zx'],
      expect.objectContaining({ cwd: TMP_DIR, silent: true }),
    );
    expect(utilsMock.execCommand).toHaveBeenNthCalledWith(
      2,
      process.execPath,
      [TSX_CLI, MAIN_FILE],
      expect.objectContaining({ cwd: TMP_DIR, silent: false }),
    );
    expect(utilsMock.renderTemplates).toHaveBeenCalledWith(
      '/repo/templates',
      TMP_DIR,
      expect.objectContaining({ bun: false, zx: true }),
    );
    expect(coreMock.setOutput).toHaveBeenCalledWith('status', 'success');
  });

  it('removes node_modules and runs bun when auto_install is enabled', async () => {
    coreMock.getInput.mockImplementation((name: string) => {
      if (name === 'bun') return 'true';
      if (name === 'auto_install') return 'true';
      return getInputValue(name);
    });
    utilsMock.exist.mockImplementation(async (target: string) => target === MODULE_DIR);

    const { runAction } = await import('../src/run.js');
    await runAction();

    expect(utilsMock.installBun).toHaveBeenCalledTimes(1);
    expect(fsMock.default.rm).toHaveBeenCalledWith(MODULE_DIR, {
      recursive: true,
      force: true,
    });
    expect(utilsMock.execCommand).toHaveBeenCalledWith(
      '/bun/bin/bun',
      ['run', '-i', MAIN_FILE],
      expect.objectContaining({ cwd: TMP_DIR, silent: false }),
    );
    expect(coreMock.setOutput).toHaveBeenCalledWith('status', 'success');
  });

  it('fails clearly when the tsx CLI is missing', async () => {
    utilsMock.exist.mockResolvedValue(false);

    const { runAction } = await import('../src/run.js');
    await runAction();

    expect(coreMock.setFailed).toHaveBeenCalledWith(`tsx CLI not found at: ${TSX_CLI}`);
    expect(coreMock.setOutput).not.toHaveBeenCalled();
  });
});

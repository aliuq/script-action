import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const coreMock = vi.hoisted(() => ({
  endGroup: vi.fn(),
  getInput: vi.fn(() => 'false'),
  group: vi.fn(async (_name: string, callback: () => Promise<void>) => callback()),
  info: vi.fn(),
  isDebug: vi.fn(() => false),
  setFailed: vi.fn(),
  startGroup: vi.fn(),
  warning: vi.fn(),
}));

const execMock = vi.hoisted(() => ({
  exec: vi.fn(),
  getExecOutput: vi.fn(),
}));

vi.mock('@actions/core', () => coreMock);
vi.mock('@actions/exec', () => execMock);

import { execCommand, exist, getTemplateRoot, renderTemplates } from '../src/utils.js';

describe('utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {});

  it('captures stdout from execCommand and trims the result', async () => {
    execMock.exec.mockImplementation(async (_command, _args, options) => {
      options?.listeners?.stdout?.(Buffer.from('  hello world  \n'));
      return 0;
    });

    await expect(execCommand('echo', ['hello'])).resolves.toBe('hello world');
    expect(execMock.exec).toHaveBeenCalledWith(
      'echo',
      ['hello'],
      expect.objectContaining({ silent: true }),
    );
  });

  it('warns and returns an empty string when execCommand fails', async () => {
    execMock.exec.mockImplementation(async (_command, _args, options) => {
      options?.listeners?.stderr?.(Buffer.from('boom stderr'));
      throw new Error('boom');
    });

    await expect(execCommand('broken', ['cmd'])).resolves.toBe('');
    expect(coreMock.warning).toHaveBeenCalledWith('boom stderr');
    expect(coreMock.warning).toHaveBeenCalledWith('boom, Failed to execute command: broken cmd');
  });

  it('renders nested handlebars templates into a destination directory', async () => {
    const templateRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'script-action-template-root-'));
    const destRoot = path.join(
      await fs.mkdtemp(path.join(os.tmpdir(), 'script-action-template-dest-')),
      'out',
    );

    await fs.mkdir(path.join(templateRoot, 'nested'), { recursive: true });
    await fs.writeFile(path.join(templateRoot, 'root.txt'), 'Hello {{ name }}!', 'utf-8');
    await fs.writeFile(
      path.join(templateRoot, 'nested', 'value.txt'),
      'Value: {{ value }}',
      'utf-8',
    );

    await renderTemplates(templateRoot, destRoot, {
      name: 'Copilot',
      value: 24,
    });

    await expect(fs.readFile(path.join(destRoot, 'root.txt'), 'utf-8')).resolves.toBe(
      'Hello Copilot!',
    );
    await expect(fs.readFile(path.join(destRoot, 'nested', 'value.txt'), 'utf-8')).resolves.toBe(
      'Value: 24',
    );
  });

  it('resolves the repository template root directly', async () => {
    const templateRoot = getTemplateRoot();

    await expect(exist(templateRoot)).resolves.toBe(true);
    await expect(exist(path.join(templateRoot, 'package.json'))).resolves.toBe(true);
    await expect(exist(path.join(templateRoot, 'src', 'index.ts'))).resolves.toBe(true);
  });

  it('reports whether a path exists', async () => {
    const existingDir = await fs.mkdtemp(path.join(os.tmpdir(), 'script-action-exists-'));
    const missingDir = path.join(existingDir, 'missing');

    await expect(exist(existingDir)).resolves.toBe(true);
    await expect(exist(missingDir)).resolves.toBe(false);
  });
});

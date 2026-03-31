export type RunScenario = {
  name: string;
  inputs?: Partial<Record<'script' | 'auto_install' | 'bun' | 'zx', string>>;
  packages?: string[];
  script?: string;
  execCalls: Array<{
    command: string;
    args: string[];
  }>;
  renderContext: {
    bun: boolean;
    zx: boolean;
  };
  installBunCalls?: number;
  existingPaths?: string[];
  expectedFailure?: string;
};

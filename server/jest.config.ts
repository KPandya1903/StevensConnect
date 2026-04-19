import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: './tsconfig.test.json' }],
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '@stevensconnect/shared': '<rootDir>/../shared/src/types/index.ts',
  },
  globalSetup: './__tests__/global-setup.ts',
  globalTeardown: './__tests__/global-teardown.ts',
  setupFilesAfterEnv: ['./__tests__/setup.ts'],
  // Run tests serially — they share a DB, parallel runs cause conflicts
  maxWorkers: 1,
  collectCoverageFrom: ['src/**/*.ts', '!src/index.ts', '!src/db/migrations/**'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
};

export default config;

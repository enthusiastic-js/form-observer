import type { Config } from "@jest/types";

const jestConfig: Config.InitialOptions = {
  collectCoverageFrom: ["<rootDir>/src/**/*.ts"],
  coverageThreshold: {
    global: {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
  },
  testEnvironment: "jsdom",
  testMatch: ["<rootDir>/**/__tests__/**/*.test.ts?(x)"],
  transform: {
    "\\.tsx?$": "ts-jest",
  },
  watchPlugins: ["jest-watch-typeahead/filename", "jest-watch-typeahead/testname"],
};

export default jestConfig;

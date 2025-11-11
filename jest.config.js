/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",

  // Look for tests in both src/ and tests/
  roots: ["<rootDir>/src", "<rootDir>/tests"],

  // Only run *.test.ts files
  testMatch: ["**/*.test.ts"],

  // Make sure Jest can resolve .ts, .js, .json
  moduleFileExtensions: ["ts", "js", "json"],

  // Tell Jest where to find modules when you write '@/...'
  moduleDirectories: ["node_modules", "src"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },

  // Coverage
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/config/**",
    "!src/index.ts",
    "!src/server.ts",
    "!src/database/**",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],

  // Misc
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};

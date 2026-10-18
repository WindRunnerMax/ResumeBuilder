module.exports = {
  moduleFileExtensions: ["js", "ts"],
  moduleDirectories: ["node_modules", "src", "test"],
  moduleNameMapper: {
    "^@re/utils$": "<rootDir>/../utils/src",
    "^@re/json$": "<rootDir>/../json/src",
    "^@re/core$": "<rootDir>/../core/src",
    "^@re/react$": "<rootDir>/../react/src",
    "src/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "\\.(js|ts)$": [
      "@swc/jest",
      {
        jsc: {
          parser: { syntax: "typescript", decorators: true },
          transform: { legacyDecorator: true, decoratorMetadata: true },
        },
      },
    ],
  },
  transformIgnorePatterns: ["<rootDir>/node_modules/"],
  collectCoverage: false,
  testEnvironment: "node",
  testMatch: ["<rootDir>/test/**/*.test.ts"],
};

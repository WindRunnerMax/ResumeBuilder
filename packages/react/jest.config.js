module.exports = {
  moduleFileExtensions: ["js", "ts", "tsx"],
  moduleDirectories: ["node_modules", "src", "test"],
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "<rootDir>/test/style-mock.js",
    "^@re/utils$": "<rootDir>/../utils/src",
    "^@re/json$": "<rootDir>/../json/src",
    "^@re/core$": "<rootDir>/../core/src",
    "^@re/react$": "<rootDir>/src",
    "src/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "\\.(js|ts|tsx)$": [
      "@swc/jest",
      {
        jsc: {
          parser: { syntax: "typescript", tsx: true, decorators: true },
          transform: { legacyDecorator: true, react: { runtime: "automatic" } },
        },
      },
    ],
  },
  transformIgnorePatterns: ["<rootDir>/node_modules/"],
  collectCoverage: false,
  testEnvironment: "jsdom",
  testMatch: ["<rootDir>/test/**/*.test.ts?(x)"],
};

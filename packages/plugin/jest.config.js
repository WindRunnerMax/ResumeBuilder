module.exports = {
  moduleFileExtensions: ["js", "ts", "tsx"],
  moduleDirectories: ["node_modules", "src", "test"],
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "<rootDir>/test/style-mock.js",
    "^@cv/utils$": "<rootDir>/../utils/src",
    "^@cv/json$": "<rootDir>/../json/src",
    "^@cv/core$": "<rootDir>/../core/src",
    "^@cv/react$": "<rootDir>/../react/src",
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

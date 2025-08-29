module.exports = {
  root: true,
  env: {
    es2021: true,
    node: true,   // Node globals like require/module
  },
  parserOptions: {
    ecmaVersion: 12,
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  rules: {
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    "quotes": ["error", "double", { "allowTemplateLiterals": true }],
    "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }], 
  },
  overrides: [
    {
      files: ["**/*.spec.*"],
      env: {
        mocha: true,
      },
    },
  ],
};


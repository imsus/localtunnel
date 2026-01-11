module.exports = {
  extends: ["airbnb-base", "prettier"],
  plugins: ["prettier"],
  env: {
    node: true,
    mocha: true,
  },
  rules: {
    "prettier/prettier": [
      "warn",
      {
        printWidth: 100,
        tabWidth: 2,
        bracketSpacing: true,
        trailingComma: "es5",
        singleQuote: true,
        jsxBracketSameLine: false,
      },
    ],
  },
};

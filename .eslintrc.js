module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'import'],
  extends: ['airbnb-typescript/base', 'plugin:@typescript-eslint/recommended'],
  rules: {
    '@typescript-eslint/lines-between-class-members': 'off',
    '@typescript-eslint/naming-convention': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-use-before-define': 'off',
    '@typescript-eslint/comma-dangle': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
  },
};

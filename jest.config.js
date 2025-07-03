module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: { '^.+\\.ts$': 'ts-jest' },
  testMatch: ['**/__tests__/**/*.test.ts'],
};

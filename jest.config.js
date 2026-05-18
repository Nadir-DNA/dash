module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.js'],
  moduleFileExtensions: ['js', 'json'],
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  transformIgnorePatterns: [
    // Transform uuid and other ESM modules
    'node_modules/(?!(uuid|@supabase)/)',
  ],
  moduleNameMapper: {
    // Mock uuid with a simple implementation
    '^uuid$': '<rootDir>/tests/__mocks__/uuid.js',
  },
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
};
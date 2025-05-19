module.exports = {
  extends: ['react-app', 'react-app/jest'],
  rules: {
    'import/no-anonymous-default-export': 'error',
    'react-hooks/exhaustive-deps': 'error',
    'no-unused-vars': 'error',
    'default-case': 'error'
  },
  overrides: [
    {
      files: ['*.js', '*.jsx'],
      rules: {
        'import/no-anonymous-default-export': process.env.CI ? 'warn' : 'error',
        'react-hooks/exhaustive-deps': process.env.CI ? 'warn' : 'error',
        'no-unused-vars': process.env.CI ? 'warn' : 'error',
        'default-case': process.env.CI ? 'warn' : 'error'
      }
    }
  ]
}; 
module.exports = {
  apps: [
    {
      name: 'tms-koa-account',
      script: './server.js',

      // Options reference: https://pm2.io/doc/en/runtime/reference/ecosystem-file/
      instances: 1,
      autorestart: true,
      watch: true,
      ignore_watch: ['node_modules', 'tests', 'files', 'logs'],
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
      },
    },
  ],
}

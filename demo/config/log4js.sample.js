module.exports = {
  appenders: {
    consoleout: { type: 'console' },
  },
  categories: {
    default: {
      appenders: ['consoleout'],
      level: process.env.TMS_APP_LOG4JS_LEVEL || 'debug',
    },
  },
  pm2: true,
}

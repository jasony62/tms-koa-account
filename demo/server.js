const log4js = require('log4js')
log4js.configure({
  appenders: {
    consoleout: { type: 'console' },
  },
  categories: {
    default: { appenders: ['consoleout'], level: 'debug' },
  },
})
const { TmsKoa } = require('tms-koa')

const tmsKoa = new TmsKoa()

tmsKoa.startup()

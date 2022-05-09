const log4js = require('log4js')
log4js.configure({
  appenders: {
    consoleout: { type: 'console' },
  },
  categories: {
    default: { appenders: ['consoleout'], level: 'debug' },
  },
})

const { TmsKoaAccount } = require('tms-koa-account')

const tmsKoaAccount = new TmsKoaAccount()

tmsKoaAccount.startup()

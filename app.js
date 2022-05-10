const fs = require('fs')
const http = require('http')
const https = require('https')
const _ = require('lodash')
const Koa = require('koa')
const koaBody = require('koa-body')
const cors = require('@koa/cors')
const log4js = require('@log4js-node/log4js-api')
const logger = log4js.getLogger('tms-koa-account')

require('dotenv-flow').config()

const { AccountConfig, AppConfig, loadConfig } = require("./config")

process.on('uncaughtException', (err) => {
  logger.warn('uncaughtException error:', err)
})
process.on('unhandledRejection', (reason) => {
  logger.warn('Unhandled Rejection reason:', reason)
})
process.on('exit', (code) => {
  logger.info(`退出应用[code=${code}]`)
})
process.on('SIGINT', async () => {
  logger.info(`退出应用[ctrl+c]`)
  process.exit()
})
process.on('SIGTERM', async () => {
  logger.info(`退出应用[kill]`)
  process.exit()
})

// 初始化配置信息
let AppContext,
  LowDbContext
const Context = {}

class TmsKoaAccount extends Koa {
  /**
   *
   * @param {*} options
   */
  constructor(options) {
    super(options)
  }
  /**
   * 启动应用
   */
  async startup() {
    /**
     * 应用配置
     */
    AppContext = require('./context/app').Context
    try {
      await AppContext.init(AppConfig, AccountConfig)
      Context.AppContext = AppContext
    } catch (e) {
      let logMsg = `初始化[app]配置失败`
      logger.isDebugEnabled() ? logger.debug(logMsg, e) : logger.warn(logMsg)
      process.exit(0)
    }

    /**
     * 初始化lowdb
     */
    const lowdbConfig = loadConfig('lowdb', {})
    if (lowdbConfig && lowdbConfig.disabled !== true) {
      LowDbContext = require('./context/lowdb').Context
      try {
        await LowDbContext.init(lowdbConfig)
        Context.LowDbContext = LowDbContext
      } catch (e) {
        let logMsg = `初始化[lowdb]配置失败`
        logger.isDebugEnabled() ? logger.debug(logMsg, e) : logger.warn(logMsg)
      }
    }
    
    /**
     * 初始化redis
    */
    const redisConfig = loadConfig('redis')
    if (redisConfig && redisConfig.disabled !== true) {
      try {
        const RedisContext = require('tms-koa/lib/context/redis').Context
        await RedisContext.init(redisConfig)
        Context.RedisContext = RedisContext
      } catch (e) {
        let logMsg = `初始化[redis]配置失败`
        logger.isDebugEnabled() ? logger.debug(logMsg, e) : logger.warn(logMsg)
      }
    }

    /**
     * 支持跨域
     */
    const corsOptions = _.get(AppContext.insSync(), 'cors')
    this.use(cors(corsOptions))
    /**
     * 支持post
     */
    this.use(koaBody())

    /**
     * 认证机制
     */
    let router = require('./router')
    this.use(router.routes())
    logger.info(`启用API调用认证机制`)

    /**
     * 启用端口
     */
    let serverCallback = this.callback()
    const appContext = AppContext.insSync()
    try {
      const httpServer = http.createServer(serverCallback)
      httpServer.listen(appContext.port, (err) => {
        if (err) {
          logger.error(`启动http端口【${appContext.port}】失败: `, err)
        } else {
          logger.info(`完成启动http端口：${appContext.port}`)
        }
      })
    } catch (ex) {
      logger.error('启动http服务失败\n', ex, ex && ex.stack)
    }
    /**
     * 支持https
     */
    if (
      typeof appContext.https === 'object' &&
      appContext.https.disabled !== true
    ) {
      const { port, key, cert } = appContext.https
      try {
        const httpsServer = https.createServer(
          {
            key: fs.readFileSync(key, 'utf8').toString(),
            cert: fs.readFileSync(cert, 'utf8').toString(),
          },
          serverCallback
        )
        httpsServer.listen(port, (err) => {
          if (err) {
            logger.error(`启动https端口【${port}】失败: `, err)
          } else {
            logger.info(`完成启动https端口：${port}`)
          }
        })
      } catch (ex) {
        logger.error('启动https服务失败\n', ex, ex && ex.stack)
      }
    }
  }
}
/**
 * 对外接口
 */
module.exports = {
  TmsKoaAccount,
  Context,
  loadConfig
}

const _ = require('lodash')
const fs = require('fs')
const log4js = require('@log4js-node/log4js-api')
const logger = log4js.getLogger('tms-koa-account-app')


/* 初始化端口 */
function initServer(instance, appConfig) {
  const { port, https } = appConfig
  instance.port = port
  if (https && typeof https === 'object') {
    const { disabled, port, key, cert } = https
    let valid = true
    if (!parseInt(port)) {
      logger.warn(`指定的https服务端口[${port}]不可用`)
      valid = false
    }
    if (!fs.existsSync(key)) {
      logger.warn(`指定的https服务key文件[${key}]不存在`)
      valid = false
    }
    if (!fs.existsSync(cert)) {
      logger.warn(`指定的https服务cert文件[${cert}]不存在`)
      valid = false
    }
    if (valid) instance.https = { disabled, port, key, cert }
  }
}
/* 初始化控制器路由 */
function initRouter(instance, appConfig) {
  if (appConfig.router) {
    const { auth } = appConfig.router
    instance.router = { auth }
  }
}

/* 初始化访问控制 */
function initAuth(instance, accountConfig) {
  const captcha = require("../models/captcha")

  const authConfig = {}

  if (!accountConfig.captchaConfig || accountConfig.captchaConfig.disabled !== true) authConfig.captcha = captcha

  instance.auth = authConfig
}

class Context {
  constructor(appConfig) {
    this.appConfig = appConfig
  }
  get routerAuthPrefix() {
    // 路由前缀必须以反斜杠开头
    let prefix = _.get(this, ['router', 'auth', 'prefix'], 'auth')
    if (prefix && !/^\//.test(prefix)) prefix = `/${prefix}`
    return prefix
  }
}

Context.init = (function () {
  let _instance

  return async function (appConfig, accountConfig) {
    if (_instance) return _instance

    _instance = new Context(appConfig)

    initServer(_instance, appConfig)

    initRouter(_instance, appConfig)

    initAuth(_instance, accountConfig)

    Context.insSync = function () {
      return _instance
    }

    logger.info(`完成应用基础设置。`)

    return _instance
  }
})()
Context.ins = Context.init

module.exports = { Context }

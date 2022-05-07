const log4js = require('@log4js-node/log4js-api')
const logger = log4js.getLogger('tms-koa-account-router')
const Router = require('@koa/router')

const { ResultData, ResultFault } = require('./models/response')

const { AppContext } = require('./app').Context

let prefix = AppContext.insSync().routerAuthPrefix
const router = new Router({ prefix })
logger.info(`指定Auth控制器前缀：${prefix}`)

const Auth = AppContext.insSync().auth

try {
  /**
   * 验证 验证码
   */
   router.all('/auth/authCaptcha', async (ctx) => {
    if (!Auth.captcha)
      return (ctx.response.body = new ResultFault('没有指定验证码库'))

    const rst = await Auth.captcha.authCaptchaCode(ctx)
    if (rst[0] === false) {
      return (ctx.response.body = new ResultFault(rst[1]))
    }

    ctx.response.body = new ResultData(rst[1])
  })
  /**
   * 生成验证码
   */
   router.all('/auth/captcha', async (ctx) => {
    if (!Auth.captcha)
      return (ctx.response.body = new ResultFault('没有指定验证码库'))

    const rst = await Auth.captcha.createCaptchaCode(ctx)
    if (rst[0] === false) {
      return (ctx.response.body = new ResultFault(rst[1]))
    }

    ctx.response.body = new ResultData(rst[1])
  })
  /**
   * 生成验证码图片
   */
  router.all('/auth/captchaImages', async (ctx) => {
    if (!Auth.captcha)
      return (ctx.response.body = '没有指定验证码库')

    const image = await Auth.captcha.createCaptchaImage(ctx)

    ctx.response.body = image[1]
  })

} catch (error) {
  logger.error('auth执行异常', err)
    let errMsg =
      typeof err === 'string' ? err : err.message ? err.message : err.toString()
    ctx.response.body = new ResultFault(errMsg)
}

module.exports = router

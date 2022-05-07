const { Client } = require('tms-koa')
const AccountConfig = require('../config').AccountConfig
const { authCaptchaCode } = require("../models/captcha")
const CaptchaConfig = AccountConfig.captchaConfig

/**
 * 根据http请求中包含的信息获得用户数据，支持异步调用
 */
module.exports = async function (ctx) {
  const { Account } = require('./account')
  const { username, password } = ctx.request.body
  if (AccountConfig && AccountConfig.disabled !== true) {
    const { admin } = AccountConfig
    /**指定管理员账号 */
    if (admin && typeof admin === 'object') {
      if (admin.username === username && admin.password === password) {
        let tmsClient = new Client(username, { username }, true)
        return [true, tmsClient]
      }
    }
    // 验证码
    if (!CaptchaConfig || CaptchaConfig.disabled !== true) {
      const code = ctx.request.body.code
      if (!code) return [false, '登录信息不完整']

      const rst = await authCaptchaCode(ctx)
      if (rst[0] === false)
        return rst
    }
    /**mongodb存储账号 */
    let found = await Account.authenticate(username, password, ctx)
    if (found[0] === true) {
      found = found[1]
      let tmsClient = new Client(
        username,
        found,
        found.isAdmin === true,
        found.allowMultiLogin === true
      )
      return [true, tmsClient]
    } else return [false, found[1]]
  }

  return [false, "没有找到匹配的账号"]
}

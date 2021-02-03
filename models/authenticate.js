const { Client } = require('tms-koa')
const AccountConfig = require('../config')

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
    if (AccountConfig.authConfig && AccountConfig.authConfig.authCaptchaCheck === true) {
      const pin = ctx.request.body.pin
      if (!pin) return [false, '登录信息不完整']
      
      const masterCaptcha = AccountConfig.authConfig.masterCaptcha
      if (!masterCaptcha || masterCaptcha !== pin) {
        const captchaCookieKey = (AccountConfig.authConfig.captchaCookieKey) ? AccountConfig.authConfig.captchaCookieKey : "tmsAcctCap"
        let capText = ctx.cookies.get(captchaCookieKey)
        if (!capText) return [false, '获取验证码失败']
        ctx.cookies.set(captchaCookieKey, '', { maxAge : 0 })
        if (capText != pin) return [false, '验证码错误！请重新输入']
      }
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

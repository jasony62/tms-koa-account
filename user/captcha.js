const svgCaptcha = require('svg-captcha')
const { authConfig: AuthConfig } = require('../config')

const { Ctrl, ResultData, ResultFault, loadConfig } = require('tms-koa')

class Captcha extends Ctrl {
  constructor(...args) {
    super(...args)
  }

  static tmsAccessWhite() {
    let rule_action = [
      'get'
    ]
    return rule_action
  }

  async get() {
    let { mathMin = 1, mathMax = 30, mathOperator = '+', width = 160, height = 60, fontSize = 50, noise = 2, color = true, background = '#eee' } = this.request.query
    
    let cap = svgCaptcha.createMathExpr({
        mathMin : mathMin,
        mathMax : mathMax,
        mathOperator : mathOperator,
        // size: 4, // 验证码长度
        width:width,
        height:height,
        fontSize: fontSize,
        ignoreChars: '0oO1ilI', // 验证码字符中排除 0o1i
        noise: noise, // 干扰线条的数量
        color: color, // 验证码的字符是否有颜色，默认没有，如果设定了背景，则默认有
        background: background // 验证码图片背景颜色
    })

    // 验证码存放到cookie中 （cap.text）
    let captchaCookieKey = (AuthConfig && AuthConfig.captchaCookieKey) ? AuthConfig.captchaCookieKey : "tmsAcctCap"
    this.ctx.cookies.set(captchaCookieKey, cap.text, { httpOnly:true })

    return new ResultData(cap.data)
  }
}

module.exports = Captcha
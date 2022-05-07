const _ = require('lodash')
const { customAlphabet } = require('nanoid')
const { Context: lowdbContext } = require("../context/lowdb")
const { captchaConfig: CaptchaConfig = {} } = require('../config').AccountConfig


/**
 * 
 */
class Captcha {
  constructor(config) {
    this.numberAlphabet = "1234567890"
    this.upperCaseAlphabet = "QWERTYUIOPASDFGHJKLZXCVBNM"
    this.lowerCaseAlphabet = "qwertyuiopasdfghjklzxcvbnm"

    this.storageType = config.storageType || "lowdb"
    this.masterCaptcha = config.masterCaptcha || null
    this.codeType = config.codeType || "number,upperCase,lowerCase"
    this.codeSize = parseInt(config.codeSize) || 4
    let expire = parseInt(config.expire) || 300
    this.expire = expire * 1000
    this.limit = parseInt(config.limit) || 3

    if (config.alphabet) {
      this.alphabet = config.alphabet
    } else {
      let codeAlphabet = ""
      this.codeType.split(",").forEach( v => {
        switch (v) {
          case "number":
            codeAlphabet += this.numberAlphabet
            break
          case "upperCase":
            codeAlphabet += this.upperCaseAlphabet
            break
          case "lowerCase":
            codeAlphabet += this.lowerCaseAlphabet
            break
        }
      })
      this.alphabet = codeAlphabet
    }
  }
  /**
   * 
   * @returns 
   */
  getCode() {
    if (this.code) {
      return this.code
    }

    const nanoid = customAlphabet(this.alphabet, this.codeSize)
    this.code = nanoid()
    return this.code
  }
  /**
   * 
   */
  async storageCode(appid, userid) {
    if (!userid || !appid) {
      return [false, "参数缺失"]
    }

    let code = this.getCode()

    const data = {
      appid,
      userid,
      code,
      expire_at: Date.now() + this.expire,
      limit: this.limit
    }

    if (this.storageType === "lowdb") {
      const lowClient = this.getLowDb()
      this.removeCodeByUser(appid, userid) // 清空此用户的验证码
      lowClient.get('captchas').push(data).write() // 添加
    } else {
      return [false, "暂不支持的储存方式"]
    }

    return [true]
  }
  /**
   * 
   * @returns 
   */
  authCode(appid, userid, code) {
    if (!userid || !appid || !code) {
      return [false, "参数缺失"]
    }

    if (this.masterCaptcha && this.masterCaptcha === code) { //万能验证码
      this.removeCodeByUser(appid, userid)
      return [ true, { appid, userid, code } ]
    }

    let captchaCode, current = Date.now()
    if (this.storageType === "lowdb") {
      const lowClient = this.getLowDb()
      let captchaCodes = lowClient
        .get('captchas')
        .filter( v => v.appid === appid && v.userid === userid && v.code.toLowerCase() === code.toLowerCase() )
        .value()

      if (captchaCodes.length === 0)
        return [false, "验证码错误"]
      if (captchaCodes.length > 1) {
        this.removeCodeByUser(appid, userid)
        return [false, "验证码获取错误"]
      }

      captchaCode = captchaCodes[0]
      this.removeCodeByUser(appid, userid)
      if (captchaCode.expire_at < current) { // 验证码过期
        return [false, "验证码已过期"]
      }
    } else {
      return [false, "暂不支持的储存方式"]
    }

    return [ true, captchaCode ]
  }
  /**
   * 删除用户验证码
   * @returns 
   */
  removeCodeByUser(appid, userid) {
    if (this.storageType === "lowdb") {
      this
        .getLowDb()
        .get('captchas')
        .remove( { appid, userid } )
        .write()
    } else {
      return [false, "暂不支持的储存方式"]
    }

    return [ true ]
  }
  /**
   * 
   */
  getLowDb() {
    if (this.lowClient) {
      return this.lowClient
    }

    const instance = lowdbContext.ins()
    const db = instance.getDBSync()
    db.defaults({ captchas: [] }).write()

    this.lowClient = db
    return  this.lowClient
  }
}

Captcha.ins = (config = {}) => {
  let config2 = _.merge(
    {},
    CaptchaConfig, 
    config
  )

  return new Captcha(config2)
}

/**
 * 
 * @param {*} ctx 
 * @returns 
 */
async function createCaptchaCode(ctx) {
  let storageType, codeType, alphabet, codeSize, expire, limit, userid, appid

  if (ctx.request.method === "GET") {
    storageType = ctx.request.query.storageType
    codeType = ctx.request.query.codeType
    alphabet = ctx.request.query.alphabet
    codeSize = ctx.request.query.codeSize
    expire = ctx.request.query.expire
    limit = ctx.request.query.limit
    appid = ctx.request.query.appid
    userid = ctx.request.query.userid
  } else if (ctx.request.method === "POST") {
    storageType = ctx.request.body.storageType
    codeType = ctx.request.body.codeType
    alphabet = ctx.request.body.alphabet
    codeSize = ctx.request.body.codeSize
    expire = ctx.request.body.expire
    limit = ctx.request.body.limit
    appid = ctx.request.body.appid
    userid = ctx.request.body.userid
  }

  if (!userid || !appid) {
    return [false, "参数缺失"]
  }

  let config = { 
    storageType, 
    codeType, 
    alphabet,
    codeSize, 
    expire,
    limit
  }

  const instance = Captcha.ins(config)
  const code = instance.getCode()
  let rst = await instance.storageCode(appid, userid)
  if (rst[0] === false) return rst
  
  return [true, code]
}
/**
 * 
 * @param {*}  
 * @returns 
 */
async function authCaptchaCode(ctx) {
  let storageType, userid, appid, code
  
  if (ctx.request.method === "GET") {
    storageType = ctx.request.query.storageType
    appid = ctx.request.query.appid
    userid = ctx.request.query.userid
    code = ctx.request.query.code
  } else if (ctx.request.method === "POST") {
    storageType = ctx.request.body.storageType
    appid = ctx.request.body.appid
    userid = ctx.request.body.userid
    code = ctx.request.body.code
  }

  if (!userid || !appid || !code) {
    return [false, "参数缺失"]
  }

  const instance = Captcha.ins({ storageType })
  return instance.authCode(appid, userid, code)
}
/**
 * 生成图形验证码
 */
async function createCaptchaImage(ctx) {
  let code
  if (ctx.request.query.code) {
    code = ctx.request.query.code
  } else {
    const rst = await createCaptchaCode(ctx)
    if (rst[0] === false)
      return rst

    code = rst[1]
  }

  // 生成验证码图片
  let { width, height, fontSize, noise, background } = ctx.request.query
  if (background) background = `#${background}`
  
  let captchaOptions = {}
  captchaOptions.noise = 2 // number of noise lines
  captchaOptions.background = '#48d1cc' // number of noise lines

  width && (captchaOptions.width = width)
  height && (captchaOptions.height = height)
  fontSize && (captchaOptions.fontSize = fontSize)
  noise && (captchaOptions.noise = noise)
  background && (captchaOptions.background = background)

  const svgCaptcha = require('svg-captcha')
  let image = svgCaptcha(code, captchaOptions)

  return [ true, image ]
}

module.exports = createCaptchaImage
module.exports.createCaptchaCode = createCaptchaCode
module.exports.createCaptchaImage = createCaptchaImage
module.exports.authCaptchaCode = authCaptchaCode
module.exports.Captcha = Captcha
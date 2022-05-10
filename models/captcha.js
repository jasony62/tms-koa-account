const _ = require('lodash')
const { customAlphabet } = require('nanoid')
const { Context: lowdbContext } = require("../context/lowdb")
const { AccountConfig, loadConfig } = require('../config')
const CaptchaConfig = AccountConfig.captchaConfig || {}
const log4js = require('@log4js-node/log4js-api')
const logger = log4js.getLogger('tms-koa-account-captcha')


/**
 * 在redis中保存客户端的验证码
 */
class InRedis {
  /**
   *
   * @param {*} redisClient
   */
  constructor(redisClient) {
    this.redisClient = redisClient
  }
  //
  key (appid, userid) {
    return `${AccountConfig.prefix || 'tms-koa-account'}:captcha:${appid}:${userid}`
  }
  // 连接redis
  static create() {
    let redisContext = require('../app').Context.RedisContext
    if (!redisContext) {
      redisContext = require('tms-koa').Context.RedisContext
    }
    if (!redisContext) throw new Error("未找到redis连接")

    let redisConfig = loadConfig("redis")
    if (!redisConfig.host || !redisConfig.port) {
      let redisName = AccountConfig.redis && AccountConfig.redis.name ? AccountConfig.redis.name : "master"
      redisConfig = redisConfig[redisName]
      if (!redisConfig) {
        return Promise.reject("未找到指定的redis配置信息")
      }
    }
    return redisContext.ins(redisConfig).then(
      (context) => new InRedis(context.redisClient)
    )
  }
  quit() {
    //this.redisClient.quit()
  }
  /**
   * 保存创建的token
   *
   * @param {String} token
   * @param {String} clientId
   * @param {Object} data
   */
  store(appid, userid, data, expire_in) {
    let key = this.key(appid, userid)
    return new Promise((resolve) => {
      this.redisClient.set(
        key,
        JSON.stringify(data),
        () => {
          this.expire(appid, userid, expire_in).then(() => resolve(expire_in))
        }
      )
    })
  }
  /**
   * 设置过期时间
   * @param {String} token
   * @param {String} clientId
   */
  expire(appid, userid, expire_in) {
    let key = this.key(appid, userid)
    return new Promise((resolve) => {
      this.redisClient.expire(key, expire_in, () => {
        resolve(expire_in)
      })
    })
  }
  /**
   * 检查是否已经分配过token
   *
   * @param {*} clientId
   */
  scan(appid, userid, cursor = '0', keys = []) {
    return new Promise((resolve, reject) => {
      this.redisClient.scan(
        cursor,
        'MATCH',
        this.key(appid, userid),
        'COUNT',
        '500',
        (err, res) => {
          if (err) return reject(err)
          else {
            if (res[1].length) keys.push(...res[1])
            if (res[0] !== '0') {
              return this.scan(appid, userid, res[0], keys)
                .then((r) => resolve(r))
                .catch((e) => reject(e))
            } else {
              return resolve(keys)
            }
          }
        }
      )
    })
  }
  /**
   * 获得对应的数据
   *
   * @param {string} 
   */
  get(appid, userid, ) {
    let key = this.key(appid, userid)
    return new Promise((resolve, reject) => {
      this.redisClient.get(key, (e, r) => {
        if (e) {
          logger.error(e)
          return reject('access token error:redis error')
        } else return resolve(JSON.parse(r))
      })
    })
  }
  /**
   *
   * @param {array} keys
   */
  del(appid, userid) {
    let key = this.key(appid, userid)
    return this.redisClient.del(key)
  }
}


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
    this.alphabetType = config.alphabetType || "number,upperCase,lowerCase"
    this.codeSize = parseInt(config.codeSize) || 4
    this.expire = parseInt(config.expire) || 300
    this.limit = parseInt(config.limit) || 3

    if (config.alphabet) {
      this.alphabet = config.alphabet
    } else {
      let codeAlphabet = ""
      this.alphabetType.split(",").forEach( v => {
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
      if (codeAlphabet.length === 0) throw new Error("验证码字母表为空")
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
      expire_at: Date.now() + (this.expire * 1000),
      limit: this.limit
    }

    await this.removeCodeByUser(appid, userid) // 清空此用户的验证码
    if (this.storageType === "lowdb") {
      const lowClient = this.getLowDbClient()
      lowClient.get('captchas').push(data).write() // 添加
    } else if (this.storageType === "redis") {
      const redisClient = await this.getRedisClient()
      await redisClient.store(appid, userid, data, this.expire)
    } else {
      return [false, "暂不支持的储存方式"]
    }

    return [true]
  }
  /**
   * 
   * @param {*} appid 
   * @param {*} userid 
   * @param {*} code 
   * @param {*} strictMode Y | N 检验大小写
   * @returns 
   */
  async authCode(appid, userid, code, strictMode = "N") {
    if (!userid || !appid || !code) {
      return [false, "参数缺失"]
    }

    if (this.masterCaptcha && this.masterCaptcha === code) { //万能验证码
      await this.removeCodeByUser(appid, userid)
      return [ true, { appid, userid, code } ]
    }

    let captchaCode, current = Date.now()
    if (this.storageType === "lowdb") {
      const lowClient = this.getLowDbClient()
      let captchaCodes = lowClient
        .get('captchas')
        .filter( v => {
          let pass = v.appid === appid && v.userid === userid
          if (pass) {
            if (strictMode === "Y") pass = v.code === code
            else pass = v.code.toLowerCase() === code.toLowerCase()
          }
          return pass
        } )
        .value()

      if (captchaCodes.length === 0)
        return [false, "验证码错误"]
      if (captchaCodes.length > 1) {
        await this.removeCodeByUser(appid, userid)
        return [false, "验证码获取错误"]
      }

      captchaCode = captchaCodes[0]
      await this.removeCodeByUser(appid, userid)
      if (captchaCode.expire_at < current) { // 验证码过期
        return [false, "验证码已过期"]
      }
    } else if (this.storageType === "redis") {
      const redisClient = await this.getRedisClient()
      captchaCode = await redisClient.get(appid, userid)
      if (!captchaCode)
        return [false, "验证码错误"]

      let pass
      if (strictMode === "Y") pass = captchaCode.code === code
      else pass = captchaCode.code.toLowerCase() === code.toLowerCase()
      if (!pass) {
        return [false, "验证码错误"]
      } else {
        await this.removeCodeByUser(appid, userid)
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
  async removeCodeByUser(appid, userid) {
    if (this.storageType === "lowdb") {
      this
        .getLowDbClient()
        .get('captchas')
        .remove( { appid, userid } )
        .write()
    } else if (this.storageType === "redis") {
      const redisClient = await this.getRedisClient()
      await redisClient.del(appid, userid)
    } else {
      return [false, "暂不支持的储存方式"]
    }

    return [ true ]
  }
  /**
   * 
   */
  getLowDbClient() {
    if (this.lowClient) {
      return this.lowClient
    }

    const instance = lowdbContext.ins()
    const db = instance.getDBSync()
    db.defaults({ captchas: [] }).write()

    this.lowClient = db
    return  this.lowClient
  }
  /**
   * 
   */
  async getRedisClient() {
    if (this.redisClient) {
      return this.redisClient
    }

    this.redisClient = await InRedis.create()
    return this.redisClient
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
  let storageType, alphabetType, alphabet, codeSize, expire, limit, userid, appid

  if (ctx.request.method === "GET") {
    storageType = ctx.request.query.storageType
    alphabetType = ctx.request.query.alphabetType
    alphabet = ctx.request.query.alphabet
    codeSize = ctx.request.query.codeSize
    expire = ctx.request.query.expire
    limit = ctx.request.query.limit
    appid = ctx.request.query.appid
    userid = ctx.request.query.userid
  } else if (ctx.request.method === "POST") {
    storageType = ctx.request.body.storageType
    alphabetType = ctx.request.body.alphabetType
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
    alphabetType, 
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
  let storageType, userid, appid, code, strictMode
  
  if (ctx.request.method === "GET") {
    storageType = ctx.request.query.storageType
    appid = ctx.request.query.appid
    userid = ctx.request.query.userid
    code = ctx.request.query.code
    strictMode = ctx.request.query.strictMode
  } else if (ctx.request.method === "POST") {
    storageType = ctx.request.body.storageType
    appid = ctx.request.body.appid
    userid = ctx.request.body.userid
    code = ctx.request.body.code
    strictMode = ctx.request.body.strictMode
  }

  if (!userid || !appid || !code) {
    return [false, "参数缺失"]
  }

  const instance = Captcha.ins({ storageType })
  return instance.authCode(appid, userid, code, strictMode)
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
const Crypto = require('crypto')
const { customAlphabet } = require('nanoid')

const AccountConfig = require('../config')

class PasswordValidator {
  constructor(pwd, config, options = {}) {
    this.pwd = pwd
    this.options = options
    if (Object.prototype.toString.call(config) !== '[object Object]') config = {}
    this.config = {
      min: config.min ? config.min : 0, // 密码最小长度
      max: config.max ? config.max : 100, // 密码最大长度
      pwdBlack: Array.isArray(config.pwdBlack) ? config.pwdBlack : [], // 密码黑名单
      hasSpaces: config.hasSpaces ? true : false, // 是否包含空格
      hasAccount: config.hasAccount ? true : false, // 是否包含空格
    }
    
    this.containProjects = []
    this.checkProjectsLength = 0
    // {mustCheckNum: 3, contains: ["digits", "uppercase", "lowercase", "symbols"]}
    if (
      Object.prototype.toString.call(config.containProjects) === '[object Object]' && 
      Array.isArray(config.containProjects.contains) && 
      config.containProjects.contains.length > 0
    ) {
      this.containProjects = config.containProjects.contains
      if (config.containProjects.mustCheckNum && new RegExp(/^[1-9]\d*$/).test(config.containProjects.mustCheckNum))
        this.checkProjectsLength = config.containProjects.mustCheckNum
      else 
        this.checkProjectsLength = this.containProjects.length
    }
  }

  // 校验密码
  validate() {
    const PwdValidator = require('password-validator')

    const { min, max, pwdBlack, hasSpaces, hasAccount } = this.config
    
    const schema = new PwdValidator()
    schema
      .is().min(min)
      .is().max(max)
    if (hasSpaces === false) schema.has().not().spaces()
    if (pwdBlack.length > 0) schema.is().not().oneOf(pwdBlack)
    if (schema.validate(this.pwd) === false) return [false, "密码格式错误或为风险密码"]

    // 密码中不能包含账号
    if (hasAccount === false && this.options.account) {
      let account = this.options.account
      let reverseAccount = account.split('').reverse().join('')
      if (this.pwd.includes(account) || this.pwd.includes(reverseAccount)) return [false, "密码中不能包含账号"]
    }
    //
    if (this.containProjects) {
      let passNum = 0
      let msg = "密码中缺少必须字符"
      for (const project of this.containProjects) {
        const schemaPj = new PwdValidator()
        schemaPj.has()[project]()
        if (schemaPj.validate(this.pwd) !== false) 
          passNum++
        else {
          switch (project) {
            case "digits":
              msg += '【数字】'
              break;
            case "uppercase":
              msg += '【大写字母】'
              break;
            case "lowercase":
              msg += '【小写字母】'
              break;
            case "symbols":
              msg += '【特殊字符】'
              break;  
            default:
              msg += `【${project}】`
              break;
          }
        }
      }
      if (passNum < this.checkProjectsLength) {
        msg += ` 至少【${this.checkProjectsLength - passNum}】项`
        return [false, msg]
      }
    }

    return [true]
  }
}

const SALT = Symbol('salt')
const HASH = Symbol('hash')
const OPTIONS = Symbol('options')
class PasswordProcess {
  constructor(myPlaintextPassword, salt = "", options = {}) {
    this.myPlaintextPassword = myPlaintextPassword
    this.salt = salt
    this.options = options
  }

  get hash() {
    if (!this[HASH]) 
      this[HASH] = this.getPwdHash(this.myPlaintextPassword)
    
    return this[HASH]
  }

  get salt() {
    return this[SALT]
  }

  set salt(value) {
    this[SALT] = value
  }

  get options() {
    return this[OPTIONS]
  }

  set options(value) {
    this[OPTIONS] = value
  }

  getPwdHash(pwd) {
    if (!this.salt) throw "未找到加密密钥"
    return Crypto.createHash('sha256').update(pwd + this.salt).digest('hex')
  }

  compare(otherPlaintextPassword) {
    return this.hash === otherPlaintextPassword
  }

  static getSalt(length = 16) {
    const nanoid = customAlphabet('0123456789qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM', length)
    return nanoid()
  }

  pwdStrengthCheck() {
    let { pwdStrengthCheck } = AccountConfig.authConfig
    if (
      Object.prototype.toString.call(pwdStrengthCheck) !== '[object Object]' || 
      Object.keys(pwdStrengthCheck).length === 0
    ) return [ true ]

    //
    const modelValidator = new PasswordValidator(this.myPlaintextPassword, pwdStrengthCheck, this.options)
    const rst = modelValidator.validate()
    
    return rst
  }
}

module.exports = { PasswordProcess, PasswordValidator }
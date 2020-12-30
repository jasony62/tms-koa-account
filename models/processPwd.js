const Crypto = require('crypto')
const { customAlphabet } = require('nanoid')

const AccountConfig = require('../config')

class PasswordValidator {
  constructor(pwd, config) {
    this.pwd = pwd
    if (Object.prototype.toString.call(config) !== '[object Object]') config = {}
    this.config = {
      min: config.min ? config.min : 8, // 密码最小长度
      max: config.max ? config.max : 20, // 密码最大长度
      pwdBlack: Array.isArray(config.pwdBlack) ? config.pwdBlack : [], // 密码黑名单
      hasSpaces: config.hasSpaces ? true : false, // 是否包含空格
      KeyboardSequence: config.KeyboardSequence ? true : false, // 是否检查键盘序
      pwdContainsAccount: config.pwdContainsAccount ? true : false // 检查密码中是否包含账号
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

    const { min, max, pwdBlack, hasSpaces, KeyboardSequence, pwdContainsAccount } = this.config
    
    const schema = new PwdValidator()
    schema
      .is().min(min)
      .is().max(max)
    if (hasSpaces === false) schema.has().not().spaces()
    if (pwdBlack.length > 0) schema.is().not().oneOf(pwdBlack)
    if (schema.validate(this.pwd) === false) return [false, "密码格式错误或为风险密码"]
    
    //
    if (this.containProjects) {
      let passNum = 0
      let msg = ""
      for (const project of this.containProjects) {
        const schemaPj = new PwdValidator()
        schemaPj.has()[project]()
        if (schemaPj.validate(this.pwd) !== false) passNum++
      }
      if (passNum < this.checkProjectsLength) return [false, "密码缺少必须项"]
    }
    

    // 过滤账号相关性 如果改变账号字符顺序以及大小写，如果与账号的匹配字符大于账号中字符数量-2个返回false

    // 机械键盘序 口令中不能包括连续的3个或3个以上键盘键位的字符,包括正、反、斜方向的顺序

    return [true]
  }
}

class PasswordProcess {
  constructor(myPlaintextPassword, salt) {
    this.myPlaintextPassword = myPlaintextPassword
    this.salt = salt
  }

  get hash() {
    if (!this.pwdHash) 
      this.pwdHash = this.getPwdHash(this.myPlaintextPassword, this.salt)
    
    return this.pwdHash
  }

  get salt() {
    return this.salt
  }

  set salt(value) {
    this.salt = value
  }

  getPwdHash(pwd) {
    return Crypto.createHash('sha256').update(pwd + this.salt).digest('hex')
  }

  compare(otherPlaintextPassword) {
    const otherPwdHash = this.getPwdHash(otherPlaintextPassword)
    return this.hash === otherPwdHash
  }

  static getSalt(length = 16) {
    const nanoid = customAlphabet('0123456789qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM', length)
    return nanoid()
  }

  pwdStrengthCheck() {
    let { pwdStrengthCheck } = AccountConfig.taConfig
    if (
      Object.prototype.toString.call(pwdStrengthCheck) !== '[object Object]' || 
      Object.keys(pwdStrengthCheck).length === 0
    ) return [ true ]

    //
    const modelValidator = new PasswordValidator(this.myPlaintextPassword, pwdStrengthCheck)
    const rst = modelValidator.validate()
    
    return rst
  }
}

module.exports = { PasswordProcess, PasswordValidator }
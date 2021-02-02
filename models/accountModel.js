const { Account } = require('./account')
const AccountConfig = require('../config')
const { MongoContext } = require('tms-koa').Context
const { PasswordProcess } = require('../models/processPwd')

const log4js = require('@log4js-node/log4js-api')
const logger = log4js.getLogger('tms-koa-account-accountModel')

/**
 * 存储在配置文件中的账号
 */
class FileModel {
  constructor(accounts) {
    this.accounts = accounts
  }
  list() {
    return { accounts: this.accounts, total: this.accounts.length }
  }
  create(newAccount) {
    let maxId = this.accounts.reduce((maxId, account) => {
      return account.id > maxId ? account.id : maxId
    }, 0)
    newAccount.id = maxId + 1
    this.accounts.push(newAccount)
    return newAccount
  }
  forbid(id) {
    const found = this.accounts.find((account) => (account.id = id))
    if (found) {
      found.forbidden = true
      return true
    }
    return false
  }
  unforbid(id) {
    const found = this.accounts.find((account) => (account.id = id))
    if (found) {
      found.forbidden = false
      return true
    }
    return false
  }
}
/**
 * mongodb存储数据
 */
class MongodbModel {
  constructor(mongoClient, database, collection) {
    this.mongodbAccount = new Account(mongoClient, database, collection)
  }
  async list(ctrl) {
    let result = await this.mongodbAccount.list()
    return result
  }
  async create(newAccount) {
    let created = await this.mongodbAccount.create(newAccount)
    return created
  }
  createModel(userInfo) {
    return new Promise(async (resolve, reject) => {
      if (["password", "username", "nickname"].every(v => userInfo[v]) === false) return reject("用户信息不完整")
      
      let {username: account, password, nickname, isAdmin, allowMultiLogin, ...other} = userInfo
      // 检查账号是否已存在
      const rst = await this.getAccount(account)
      if (rst) return reject("账号已存在")
      // 检查密码格式
      const pwdProcess = new PasswordProcess(password)
      const checkRst = pwdProcess.pwdStrengthCheck()
      if (checkRst[0] === false) return reject(checkRst[1])
      // 
      let newAccount = {
        account, 
        password, 
        nickname, 
        isAdmin: new RegExp(/^true$/).test(isAdmin) ? true : false,
        allowMultiLogin: new RegExp(/^true$/).test(allowMultiLogin) ? true : false,
        create_at: Date.now()
      }
      if (
        AccountConfig.mongodb && 
        Object.prototype.toString.call(AccountConfig.mongodb.schema) === '[object Object]'
      ) {
        const otherData = 
          Object.keys(other)
            .filter( key => AccountConfig.mongodb.schema[key] )
            .reduce( (res, key) => (res[key] = other[key], res), {} )
        Object.assign(newAccount, otherData) 
      }
      const result = await this.mongodbAccount.create(newAccount)

      return resolve(result)
    })
  }
  async forbid(id) {
    return await this.mongodbAccount.forbid(id)
  }
  async unforbid(id) {
    return await this.mongodbAccount.unforbid(id)
  }
  async getAccount(account) {
    return await this.mongodbAccount.getAccount(account)
  }
  async updateOne(where, updata) {
    return await this.mongodbAccount.updateOne(where, updata)
  }
  async findOne(where) {
    return await this.mongodbAccount.findOne(where)
  }
}

/**
 * 如果没有指定有效的账号管理实现时，抛异常
 */
const unsupportHandler = {
  get: function (target, prop, receiver) {
    if (['list', 'create', 'forbid', 'unforbid'].includes(prop)) {
      return function () {
        throw Error('不支持账号管理功能')
      }
    }
  },
}

let modelAccountImpl // 账号处理

if (AccountConfig && AccountConfig.disabled !== true) {
  const { mongodb, accounts } = AccountConfig
  if (mongodb && typeof mongodb === 'object' && mongodb.disabled !== true) {
    let valid = [('name', 'database', 'collection')].reduce((result, prop) => {
      if (!mongodb[prop] || typeof mongodb[prop] !== 'string') {
        logger.warn(`配置文件中[account.mongodb.${prop}]错误`)
        return false
      }
      return result
    }, true)
    if (valid) {
      const { name, database, collection } = mongodb
      modelAccountImpl = new MongodbModel(
        MongoContext.mongoClientSync(name),
        database,
        collection
      )
    } else {
      modelAccountImpl = new Proxy({}, unsupportHandler)
    }
  } else if (Array.isArray(accounts)) {
    modelAccountImpl = new FileModel(accounts)
  } else {
    logger.warn('配置文件[account]没有指定有效账号存储方式')
    modelAccountImpl = new Proxy({}, unsupportHandler)
  }
} else {
  logger.warn('没有指定账号管理配置信息，不支持账号管理')
  modelAccountImpl = new Proxy({}, unsupportHandler)
}

module.exports = { FileModel, MongodbModel, modelAccountImpl }
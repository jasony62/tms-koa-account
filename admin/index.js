const log4js = require('@log4js-node/log4js-api')
const logger = log4js.getLogger('tms-koa-account-admin')

const { Ctrl, ResultData, ResultFault, loadConfig } = require('tms-koa')
const { MongoContext } = require('tms-koa').Context

const { Account } = require('../models/account')
const { PasswordProcess } = require('../models/processPwd')

const AccountConfig = loadConfig('account')
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
/**
 * 管理系统账号
 */
class Admin extends Ctrl {
  tmsBeforeEach() {
    if (!this.client || this.client.isAdmin !== true)
      return new ResultFault('只有管理员账号可进行该操作')
  }
  /**账号列表 */
  async list() {
    let { page, size } = this.request.query
    const { filter } = this.request.body

    const result = await modelAccountImpl.list({ filter }, { page, size })

    return new ResultData(result)
  }
  /**创建新账号 */
  async create() {
    let userInfo = this.request.body
    if (["password", "username", "nickname"].every(v => userInfo[v]) === false) return new ResultFault("用户信息不完整")
    
    let {username: account, password, nickname} = userInfo
    // 检查账号是否已存在
    const rst = await modelAccountImpl.getAccount(account)
    if (rst) return new ResultFault("账号已存在")
    // 检查密码格式
    const pwdProcess = new PasswordProcess(password)
    const checkRst = pwdProcess.pwdStrengthCheck()
    if (checkRst[0] === false) return new ResultFault(checkRst[1])
    // 加密密码
    const salt = PasswordProcess.getSalt()
    pwdProcess.salt = salt
    const pwdHash = pwdProcess.hash
    // 
    const newAccount = {account, password: pwdHash, nickname, create_at: Date.now()}
    const result = await modelAccountImpl.create(newAccount)
    return new ResultData(result)
  }
  /**禁用账号 */
  async forbid() {
    const { id } = this.request.query
    const result = await modelAccountImpl.forbid(id)
    return new ResultData(result)
  }
  /**解禁账号 */
  async unforbid() {
    const { id } = this.request.query
    const result = await modelAccountImpl.unforbid(id)
    return new ResultData(result)
  }
}

module.exports = Admin

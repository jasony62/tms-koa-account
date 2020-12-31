const ObjectId = require('mongodb').ObjectId
const AccountConfig = require('../config')
const { PasswordProcess: ProcessPwd } = require('./processPwd')

/**
 * 将指定的page和size参数转换为skip和limit参互
 * @param {number} page
 * @param {number} size
 *
 * @return {object} 包含skip和limit的对象
 */
function toSkipAndLimit(page, size) {
  let skip = 0
  let limit = 0
  if (page && page > 0 && size && size > 0) {
    skip = (parseInt(page) - 1) * parseInt(size)
    limit = parseInt(size)
  }
  return { skip, limit }
}
/**
 * 账号
 */
class Account {
  constructor(mongoClient, database, collection) {
    this.cl = mongoClient.db(database).collection(collection)
  }
  create(newAccount) {
    return this.cl.insertOne(newAccount).then((result) => result.ops[0])
  }
  async list({ filter } = {}, { page, size } = {}) {
    let query = filter
    const options = {}
    // 添加分页条件
    let { skip, limit } = toSkipAndLimit(page, size)
    if (typeof skip === 'number') {
      options.skip = skip
      options.limit = limit
    }
    const accounts = await this.cl.find(query, options).toArray()

    const total = await this.cl.countDocuments(query)

    return { accounts, total }
  }
  forbid(id) {
    return this.cl
      .updateOne({ _id: ObjectId(id) }, { $set: { forbidden: true } })
      .then(({ modifiedCount }) => modifiedCount === 1)
  }
  unforbid(id) {
    return this.cl
      .updateOne({ _id: ObjectId(id) }, { $set: { forbidden: false } })
      .then(({ modifiedCount }) => modifiedCount === 1)
  }
  async updateOne(where, updata) {
    return this.cl
      .updateOne(where, { $set: updata })
      .then(({ modifiedCount }) => modifiedCount === 1)
  }
  async findOne(where) {
    return this.cl.findOne(where)
  }
  async authenticate(account, password) {
    const oAccount = await this.findOne({ account })
    if (!oAccount) return [false, "账号或密码错误"]
    if (oAccount.forbidden === true) return [false, "禁止登录"]
    //
    const current = Date.now()
    if (oAccount.authLockExp && current < oAccount.authLockExp) {
      return [false, `登录过于频繁，请在${parseInt((oAccount.authLockExp - current) / 1000)}秒后再次尝试`]
    }
    //可以登录检查密码
    const proPwd = new ProcessPwd(password, oAccount.salt)
    if (proPwd.compare(oAccount.password) === false) {
      let msg = "账号或密码错误"
      // 记录失败次数
      const pwdErrNum = !oAccount.pwdErrNum ? 1 : oAccount.pwdErrNum * 1 + 1
      let updata = { pwdErrNum }
      if (AccountConfig.authConfig) {
        const authConfig = AccountConfig.authConfig
        if (
          new RegExp(/^[1-9]\d*$/).test(authConfig.pwdErrMaxNum) && 
          new RegExp(/^[1-9]\d*$/).test(authConfig.authLockDUR)
        ) {
          if (pwdErrNum >= parseInt(authConfig.pwdErrMaxNum)) { // 密码错误次数超限后，账号锁定
            updata.authLockExp = current + (authConfig.authLockDUR * 1000) 
            updata.pwdErrNum = 0
            msg += `; 账号锁定 ${parseInt(authConfig.authLockDUR)} 秒`
          } else {
            msg += `, 账号即将被锁定。剩余次数【${parseInt(authConfig.pwdErrMaxNum) - pwdErrNum}】`
          }
        }
      }
      await this.updateOne({ _id: oAccount._id }, updata)
      return [false, msg]
    }
    // 密码正确需要重置密码错误次数
    await this.updateOne({ _id: oAccount._id }, {pwdErrNum: 0, authLockExp: 0, lastLoginTime: current})

    const {_id, password: pwd, salt, ...newAccount} = oAccount
    return [true, newAccount]
  }
  async getAccount(account) {
    return this.findOne({account})
  }
}

module.exports.Account = Account

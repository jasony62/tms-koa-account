const { Client } = require('tms-koa')
const AccountConfig = require('../config')
const { Account } = require('./account')

/**
 * 根据http请求中包含的信息获得用户数据，支持异步调用
 */
module.exports = async function (ctx) {
  const { username, password } = ctx.request.body
  let msg = "没有找到匹配的账号"
  if (AccountConfig && AccountConfig.disabled !== true) {
    const { admin, mongodb, accounts } = AccountConfig
    /**指定管理员账号 */
    if (admin && typeof admin === 'object') {
      if (admin.username === username && admin.password === password) {
        let tmsClient = new Client(username, { username }, true)
        return [true, tmsClient]
      }
    }
    if (mongodb && typeof mongodb === 'object' && mongodb.disabled !== true) {
      /**mongodb存储账号 */
      const { name, database, collection } = mongodb
      const { MongoContext } = require('tms-koa').Context
      const modelAccount = new Account(
        MongoContext.mongoClientSync(name),
        database,
        collection
      )
      let found = await modelAccount.authenticate(username, password)
      if (found[0] === true) {
        found = found[1]
        let tmsClient = new Client(
          username,
          found,
          found.isAdmin === true,
          found.allowMultiLogin === true
        )
        return [true, tmsClient]
      } else msg = found[1]
    } else if (Array.isArray(accounts) && accounts.length) {
      /**配置文件存储账号 */
      let found = accounts.find(
        (account) =>
          account.username === username && account.password === password
      )
      if (found) {
        let tmsClient = new Client(
          username,
          { username },
          found.isAdmin === true,
          found.allowMultiLogin === true
        )
        return [true, tmsClient]
      }
    }
  }

  return [false, msg]
}

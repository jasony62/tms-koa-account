const ObjectId = require('mongodb').ObjectId

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
  async authenticate(username, password) {
    const account = await this.cl.findOne({ username, password })
    return account
  }
}

module.exports.Account = Account

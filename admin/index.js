

const { Ctrl, ResultData, ResultFault } = require('tms-koa')

const { modelAccountImpl } = require('../models/accountModel')


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
    
    return modelAccountImpl
      .createModel(userInfo)
      .then(rst => {
        return new ResultData(rst)
      })
      .catch(errMsg => {
        return new ResultFault(errMsg)
      })
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

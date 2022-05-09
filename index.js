const { ResultData } = require('./models/response')
const { TmsKoaAccount, Context } = require('./app')

class Main {
  /**
   * 保存测试流
   */
  version() {
    let pkg = require(__dirname + '/package.json')
    return new ResultData(pkg.version)
  }
}

module.exports = { Main, TmsKoaAccount, Context }

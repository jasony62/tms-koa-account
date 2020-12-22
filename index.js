const { ResultData } = require('tms-koa/lib/response')

class Main {
  /**
   * 保存测试流
   */
  version() {
    let pkg = require(__dirname + '/package.json')
    return new ResultData(pkg.version)
  }
}

module.exports = Main

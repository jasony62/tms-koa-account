module.exports = {
  port: process.env.APP_PORT2 || 3002,
  name: 'tms-koa-account-demo2',
  router: {
    auth: {
      prefix: 'auth' // 接口调用url的前缀
    },
  }
}

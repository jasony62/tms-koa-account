module.exports = {
  port: 4000,
  name: 'tms-koa-account-demo',
  router: {
    auth: {
      prefix: 'auth' // 接口调用url的前缀
    },
    controllers: {
      prefix: 'api', // 接口调用url的前缀
      plugins_npm: [{ id: 'tms-koa-account', alias: 'account' }],
    },
  },
  auth: {
    disabled: false,
    // jwt: {
    //   privateKey: 'tms-koa-account',
    //   expiresIn: 3600,
    // },
    
    redis: {
      prefix: 'dev-op',
      host: 'localhost',
      port: 6378,
      expiresIn: 600
    },
    captcha: {  // 验证码
      npm: {
        disabled: false,
        id: 'tms-koa-account',
        authentication: 'models/captcha',
      },
    },
    client: {
      npm: {
        disabled: false,
        id: 'tms-koa-account',
        authentication: 'models/authenticate',
      },
    },
  },
}

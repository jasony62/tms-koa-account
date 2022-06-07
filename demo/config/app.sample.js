module.exports = {
  port: process.env.APP_PORT || 3001,
  name: 'tms-koa-account-demo',
  router: {
    auth: {
      // prefix: 'auth', // 接口调用url的前缀
      plugins_npm: [{ id: 'tms-koa-account', alias: 'account' }],
    },
    controllers: {
      prefix: 'api', // 接口调用url的前缀
      plugins_npm: [{ id: 'tms-koa-account', alias: 'account' }],
    },
  },
  auth: {
    disabled: false,
    jwt: {
      privateKey: 'tms-koa-account',
      expiresIn: 3600,
    },
    // redis: {
    //   host: '127.0.0.1',
    //   port: 6379,
    //   password: '8811aa..',
    //   expiresIn: 3600,
    //   prefix: 'tms-koa-account',
    // },
    captcha: {  // 验证码
      npm: {
        disabled: false,
        id: 'tms-koa-account',
        module: 'models/captcha',
        checker: 'checkCaptcha',
        generator: "createCaptcha"
      },
    },
    client: {
      npm: {
        disabled: false,
        id: 'tms-koa-account',
        authentication: 'models/authenticate',
        register: 'models/register',
      },
    },
  },
}

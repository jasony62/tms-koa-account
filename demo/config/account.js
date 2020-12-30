module.exports = {
  disabled: false,
  mongodb: {
    disabled: false,
    name: 'master',
    dababase: 'tms_account',
    collection: 'account',
    schema: {},
  },
  accounts: [
    {
      id: 1,
      username: 'user1',
      password: 'user1',
      isAdmin: true,
      allowMultiLogin: true
    },
    {
      id: 2,
      username: 'user2',
      password: 'user2',
      isAdmin: true,
      allowMultiLogin: true
    },
  ],
  admin: { username: 'admin', password: 'admin' },
  taConfig: {
    pwdErrMaxNum: 0, // int 密码错误次数限制 0 不限制
    authLockDUR: 0,   // int 登录锁定时长 （秒）
    authCaptchaCheck: 1,   // int 是否启用验证码 0 不启用 1 启用
    masterCaptcha: "",   // string 万能验证码
    pwdStrengthCheck: {
      min: 8, // 密码最小长度
      max: 20, // 密码最大长度
      pwdBlack: ["P@ssw0rd"], // 密码黑名单
      containProjects: {mustCheckNum: 3, contains: ["digits", "uppercase", "lowercase", "symbols"]}, // 是否包含数字、大写字母、小写字母、特殊字符, 至少满足其中length项
      hasSpaces: false, // 是否包含空格
      KeyboardSequence: false, // 是否检查键盘序
      pwdContainsAccount: false // 检查密码中是否包含账号
    }
  }
}
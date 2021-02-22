# tms-koa-account

tms-koa 账号管理控制器插件

支持账号的增删改查操作。

# tms-koa 用户认证方法

`models/authenticate.js`

```javascript
module.exports = {
  auth: {
    client: {
      npm: {
        disabled: false,
        id: 'tms-koa-account',
        authentication: 'models/authenticate',
      },
    },
  },
}
```

# tms-koa 验证码方法

`models/captcha`

```javascript
module.exports = {
  auth: {
    captcha: {  // 验证码
      npm: {
        disabled: false,
        id: 'tms-koa-account',
        authentication: 'models/captcha',
      },
    },
  },
}
```

# 账号管理配置文件

```javascript
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
    },
    {
      id: 2,
      username: 'user2',
      password: 'user2',
    },
  ],
  admin: { username: 'admin', password: 'admin' },
  authConfig: {
    pwdErrMaxNum: 0,
    authLockDUR: 0, 
    authCaptchaCheck: true,
    captchaCookieKey: "tmsAcctCap",
    masterCaptcha: "",
    pwdStrengthCheck: {
      min: 0,
      max: 100,
      pwdBlack: [],
      containProjects: {mustCheckNum: 4, contains: ["digits", "uppercase", "lowercase", "symbols"]},
      hasSpaces: false,
      hasAccount: false,
    }
  }
}
```

| 字段         | 说明                               | 类型     | 必填 |
| ------------ | ---------------------------------- | -------- | ---- |
| mongodb      | 存储账号数据的 MongoDB 设置        | object   | 否   |
| mongodb.name | `tms-koa`配置的`MongoDB`连接名称。 | object   | 否   |
| accounts     | 存储账号数据的数据                 | object[] | 否   |
| admin        | 管理员账号                         | object   | 否   |
| authConfig   | 登录或注册时的检查                 | object   | 否   |

# authConfig 字段说明

| 字段                    | 说明                               | 类型     | 必填 |
| ----------------------- | ---------------------------------- | -------- | ---- |
| pwdErrMaxNum            | 密码错误次数限制 0 不限制           | int   | 否   |
| authLockDUR             | 密码错误次数超限后登录锁定时长（秒） | int   | 否   |
| authCaptchaCheck        | 是否启用验证码                    | boolean | 否   |
| masterCaptcha           | 万能验证码                         | string   | 否   |
| pwdStrengthCheck        | 注册时密码强度校验                 | object   | 否   |

# pwdStrengthCheck 字段说明

| 字段           | 说明                             | 类型     | 必填 |
| -------------- | ------------------------------- | -------- | ---- |
| min            | 密码最小长度                     | int      | 否   |
| max            | 密码最大长度                     | int      | 否   |
| pwdBlack       | 密码黑名单                       | object[] | 否   |
| containProjects| 密码中需要包含的字符类型          | object   | 否   |
| hasSpaces      | 密码中是否可以包含空格            | boolean  | 否   |
| hasAccount      | 密码中是否可以包含账号           | boolean  | 否   |

`mongodb`优先于`accounts`设置。

# 密码强度校验类

```javascript
const { PasswordProcess } = require('../models/processPwd')
const pwdProcess = new PasswordProcess(password)
pwdProcess.options = { account }
const checkRst = pwdProcess.pwdStrengthCheck()
```

# 账号对象固定字段

| 字段              | 说明                 | 类型     | 必填 |
| ----------------- | -------------------- | -------- | ---- |
| \_id              | 系统自动生成 id       | ObjectId | 是   |
| username          | 用户账户名，不可重复  | string   | 是   |
| nickname          | 用户昵称              | string   | 是   |
| password          | 系统自动加密          | string   | 是   |
| salt              | 系统自动生成          | string   | 是   |
| pwdErrNum         |  密码错误次数         | int      | 否   |
| authLockExp       |  授权锁截止时间       | string   | 否   |
| isAdmin           | 是否为管理员          | boolean  | 否   |
| allowMultiLogin   | 是否允许多点登录      | boolean  | 否   |

# 演示

> curl -H "Content-Type: application/json" -X POST -d '{"username": "admin", "password":"admin" }' http://localhost:4000/auth/authenticate

> curl 'http://localhost:4000/api/account/admin/list?access_token='

> curl -H "Content-Type: application/json" -X POST -d '{"username": "user1", "password":"user1", "nickname": "user1" }' 'http://localhost:4000/api/account/admin/create?access_token='

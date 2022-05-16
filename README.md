# tms-koa-account

tms-koa 账号管理控制器插件

支持账号的增删改查操作。

# tms-koa 用户认证方法

./config/app.js

```
models/authenticate.js
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

./config/app.js

```
models/captcha
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

./config/account.js

```javascript
module.exports = {
  disabled: false,
  mongodb: {
    disabled: true,
    name: 'master',
    database: 'tms_account',
    collection: 'account',
    schema: {"test": {type: 'string', title: '测试'}},   // 集合中药保留的账号信息字段
  },
  // redis: {
  //   name: master
  // }
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
  authConfig: {
    pwdErrMaxNum: 5, // int 密码错误次数限制 0 不限制
    authLockDUR: 20,   // int 登录锁定时长 （秒）
    pwdStrengthCheck: {
      min: 8, // 密码最小长度
      max: 20, // 密码最大长度
      pwdBlack: ["P@ssw0rd"], // 密码黑名单
      containProjects: {mustCheckNum: 3, contains: ["digits", "uppercase", "lowercase", "symbols"]}, // 是否包含数字、大写字母、小写字母、特殊字符, 至少满足其中length项
      hasSpaces: false, // 是否包含空格
      hasAccount: false,
    }
  },
  // captchaConfig: {
  //   disabled: false,   // boolean 是否启用验证码
  //   storageType: "lowdb", // 验证码存储方式  lowdb | redis
  //   masterCaptcha: "aabb",   // string 万能验证码
  //   codeSize: 4, //验证码长度  默认4
  //   alphabetType: "number,upperCase,lowerCase", // 字母表生产类型 默认 数字+大写字母+小写字母
  //   alphabet: "1234567890" // 与alphabetType不可公用，优先级大于alphabetType
  //   expire: 300, // 过期时间 s 默认300
  // }
}
```

| 字段          | 说明                               | 类型     | 必填 |
| ------------- | ---------------------------------- | -------- | ---- |
| mongodb       | 存储账号数据的 MongoDB 设置        | object   | 否   |
| mongodb.name  | `tms-koa`配置的`MongoDB`连接名称。 | object   | 否   |
| mongodb.schema | 账号集合中中要保留的账号信息字段 | object   | 否   |
| accounts      | 存储账号数据的数据                 | object[] | 否   |
| admin         | 管理员账号                         | object   | 否   |
| authConfig    | 登录或注册时的检查                 | object   | 否   |
| captchaConfig | 验证码生成配置                     | object   | 否   |

# authConfig 字段说明

| 字段                     | 说明                               | 类型     | 必填 |
| ----------------------- | ---------------------------------- | -------- | ---- |
| pwdErrMaxNum            | 密码错误次数限制 0 不限制           | int   | 否   |
| authLockDUR             | 密码错误次数超限后登录锁定时长（秒） | int   | 否   |
| pwdStrengthCheck        | 注册时密码强度校验                 | object   | 否   |

# pwdStrengthCheck 字段说明

| 字段           | 说明                             | 类型     | 必填 |
| -------------- | ------------------------------- | -------- | ---- |
| min            | 密码最小长度                     | int      | 否   |
| max            | 密码最大长度                     | int      | 否   |
| pwdBlack       | 密码黑名单                       | object[] | 否   |
| containProjects| 密码中需要包含的字符类型           | object   | 否   |
| hasSpaces      | 密码中是否可以包含空格             | boolean  | 否   |
| hasAccount      | 密码中是否可以包含账号            | boolean  | 否   |

`mongodb`优先于`accounts`设置。

# captchaConfig字段说明

| 字段          | 说明                                                         | 类型    | 默认                       | 必填 |
| ------------- | ------------------------------------------------------------ | ------- | -------------------------- | ---- |
| disabled      | 是否启用验证码                                                | boolean | false                     | 否   |
| storageType   | 验证码存储方式  支持 redis、lowdb                              | string  | lowdb                     | 否   |
| masterCaptcha | 万能验证码                                                   | string  |                            | 否   |
| codeSize      | 验证码长度                                                   | int     | 4                          | 否   |
| alphabetType  | 验证码字母表类型 与alphabetType不可公用，优先级大于alphabetType   | string  | number,upperCase,lowerCase | 否   |
| expire        | 验证码有效期（s）                                             | int     | 300                        | 否   |



# 密码强度校验类

```javascript
const { PasswordProcess } = require('../models/processpwd')
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

## 密码

### 获取验证码
> curl 'http://localhost:3001/auth/captcha?appid=oauth&userid=aly21'
### 登录
> curl -H "Content-Type: application/json" -X POST -d '{ "appid":"oauth","userid":"aly21","code":"dha2c","username": "admin", "password":"admin" }' http://localhost:3001/auth/authenticate
### 获取用户列表
> curl 'http://localhost:3001/api/account/admin/list?access_token='
### 创建账号
> curl -H "Content-Type: application/json" -X POST -d '{"username": "user1", "password":"user1", "nickname": "user1" }' 'http://localhost:3001/api/account/admin/create?access_token='



# 启动tms-koa-account服务

## 配置

./config/app.js

```javascript
module.exports = {
  port: process.env.APP_PORT2 || 3002,
  name: 'tms-koa-account-demo2',
  router: {
    auth: {
      prefix: 'auth' // 接口调用url的前缀
    },
  }
}

```

./config/account.js

同上【账号管理配置文件】

## 启动服务

```javascript
const log4js = require('log4js')
log4js.configure({
  appenders: {
    consoleout: { type: 'console' },
  },
  categories: {
    default: { appenders: ['consoleout'], level: 'debug' },
  },
})

const { TmsKoaAccount } = require('tms-koa-account')

const tmsKoaAccount = new TmsKoaAccount()

tmsKoaAccount.startup()

```



## TMS_KOA_ACCOUNT API

### 生成验证码 GET|POST

> curl 'http://localhost:3002/auth/auth/captcha?appid=pool&userid=aly21&alphabet=QWERTYUIOPqwertyuiop1234567890&expire=300&alphabetType=number&codeSize=6'

### 验证验证码 GET | POST

> curl -H "Content-Type: application/json" -X POST -d '{"appid":"pool","userid":"aly21", "code": "1iwtiO", "strictMode":"N"}' http://localhost:3002/auth/auth/authCaptcha

### 获取验证码图片 GET

> curl 'http://localhost:3002/auth/auth/captchaImages?appid=pool&userid=aly21&code='
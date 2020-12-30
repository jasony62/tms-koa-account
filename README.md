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
}
```

| 字段         | 说明                               | 类型     | 必填 |
| ------------ | ---------------------------------- | -------- | ---- |
| mongodb      | 存储账号数据的 MongoDB 设置        | object   | 否   |
| mongodb.name | `tms-koa`配置的`MongoDB`连接名称。 | object   | 否   |
| accounts     | 存储账号数据的数据                 | object[] | 否   |
| admin        | 管理员账号                         | object   | 否   |

`mongodb`优先于`accounts`设置。

# 账号对象固定字段

| 字段              | 说明                 | 类型     | 必填 |
| ----------------- | -------------------- | -------- | ---- |
| \_id              | 系统自动生成 id       | ObjectId | 是   |
| username          | 用户账户名，不可重复  | string   | 是   |
| password          |                      | string   | 是   |
| salt              |  密码加密密钥         | string   | 是   |
| pwdErrNum         |  密码错误次数         | int      | 否   |
| authLockExp       |  授权锁截止时间       | string   | 否   |
| isAdmin           | 是否为管理员          | boolean  | 否   |
| allowMultiLogin   | 是否允许多点登录      | boolean  | 否   |

密码应该不用明文存储。

# 演示

> curl -H "Content-Type: application/json" -X POST -d '{"username": "admin", "password":"admin" }' http://localhost:4000/auth/authenticate

> curl 'http://localhost:4000/api/account/admin/list?access_token='

> curl -H "Content-Type: application/json" -X POST -d '{"username": "user1", "password":"user1" }' 'http://localhost:4000/api/account/admin/create?access_token='

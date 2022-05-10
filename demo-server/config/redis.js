module.exports = {
  disabled: false, // 可省略
  host: process.env.APP_REDIS_HOST || 'localhost',
  port: parseInt(process.env.APP_REDIS_PORT) || 6379,
  password: process.env.APP_REDIS_PASSWORD || "",
}

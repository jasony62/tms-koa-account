module.exports = {
  host: process.env.APP_MONGODB_HOST || "127.0.0.1",
  port: process.env.APP_MONGODB_PORT || 27017,
  user: process.env.APP_MONGODB_USER || false,
  password: process.env.APP_MONGODB_PASSWORD || false
}

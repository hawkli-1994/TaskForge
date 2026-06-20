import type { RedisOptions } from "ioredis";

export function createRedisConnection(): RedisOptions {
  const options: RedisOptions = {
    host: "localhost",
    port: 6379,
    maxRetriesPerRequest: null,
  };

  const urlString = process.env.REDIS_URL;
  if (urlString) {
    const url = new URL(urlString);
    options.host = url.hostname || options.host;
    options.port = Number(url.port) || options.port;
    if (url.password) options.password = url.password;
    if (url.pathname && url.pathname !== "/") {
      options.db = Number(url.pathname.slice(1));
    }
  }

  return options;
}

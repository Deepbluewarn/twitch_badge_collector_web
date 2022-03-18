import logger from './utils/logger';
const redis = require('ioredis');

const sessClientOption = {
    host: 'localhost',
    port: 6379, 
    password: process.env.SESSION_REDIS_AUTH,
    db: 0
}
const cacheClientOption = {
    host: 'localhost',
    port: 6444, 
    password: process.env.CACHE_REDIS_AUTH,
    db: 0
}
const sessSubscribeOption = {
    host: 'localhost',
    port: 6379,
    password: process.env.SESSION_REDIS_AUTH,
    db: 0
}
export const redisSessClient = redis.createClient(sessClientOption);
export const redisCacheClient = redis.createClient(cacheClientOption);
export const redisTokenSubscriber = redis.createClient(sessSubscribeOption);

redisSessClient.on('connect',() => {
    logger.info('connected to redis for session successfully!');
});

redisSessClient.on('error',(error) => {
    logger.error('Redis for session connection error ', error);
});

redisCacheClient.on('connect',() => {
    logger.info('connected to redis for cache successfully!');
});

redisCacheClient.on('error',(error) => {
    logger.error('Redis for cache connection error ', error);
});

redisTokenSubscriber.on('connect',() => {
    logger.info('connected to redis for redisTokenSubscriber successfully!');
});

redisTokenSubscriber.on('error',(error) => {
    logger.error('Redis for redisTokenSubscriber connection error ', error);
});
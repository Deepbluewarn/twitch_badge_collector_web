import logger from './utils/logger';
const redis = require('ioredis');


export const redisClient = redis.createClient({
    host:'localhost', 
    port:6379, 
    password:'*&o8BT%$437h$M'
});

redisClient.on('connect',() => {
    logger.info('connected to redis successfully!');
})

redisClient.on('error',(error) => {
    logger.error('Redis connection error ', error);
});
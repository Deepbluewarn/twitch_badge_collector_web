const redis = require('ioredis');

export const redisClient = redis.createClient({
    host:'localhost', 
    port:6379, 
    password:'*&o8BT%$437h$M'
});

redisClient.on('connect',() => {
    console.log('connected to redis successfully!');
})

redisClient.on('error',(error) => {
    console.log('Redis connection error :', error);
});
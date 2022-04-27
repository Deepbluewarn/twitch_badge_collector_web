import { createProxyMiddleware, responseInterceptor } from 'http-proxy-middleware';
import { redisSessClient, redisTokenSubscriber, redisCacheClient } from './redis_client.js';
import logger from './utils/logger';


let AppAccessToken;

redisSessClient.get(process.env.APP_ACCESS_TOKEN_KEY).then(t => {
    AppAccessToken = t;
});

redisTokenSubscriber.subscribe(process.env.TOKEN_PUBLISH_CHANNEL, (err, count) => {
    if(err) {
        logger.error("Failed to subscribe: %s", err.message);
    }else{
        logger.info(`Subscribed successfully! This client is currently subscribed to ${count} channels.`);
    }
});

redisTokenSubscriber.on("message", (channel, message) => {
    if(channel === process.env.TOKEN_PUBLISH_CHANNEL){
        AppAccessToken = message;
    }
});

const onProxyRes = responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
    if (proxyRes.headers['content-type'].includes('application/json')) {
        let data = JSON.parse(responseBuffer.toString('utf8'));

        const url = new URL(req.url, `https://${req.headers.host}`);
        const pathname = url.pathname;
        const cacheKey = getCacheKey(pathname, url.searchParams);

        if(cacheKey && proxyRes.statusCode !== 401){
            if(pathname === '/users'){
                const rkeys = {};
                for(let d of data.data){
                    rkeys[`${pathname}:${d['login']}`] = JSON.stringify(d);
                }
                redisCacheClient.mset(rkeys);
            }else{
                redisCacheClient.set(Object.keys(cacheKey)[0], JSON.stringify(data.data));
            }
        }
    }
    return responseBuffer;
});

function onProxyReq(proxyReq, req, res){
    const url = new URL(req.url, `https://${req.headers.host}`);
    const pathname = url.pathname;
    const params = url.searchParams;

    let access_token = '';

    if(pathname === '/users' && !params.get('login')){
        access_token = req.session.access_token;
    }else if(pathname === '/streams/followed'){
        access_token = req.session.access_token;
    }else{
        access_token = AppAccessToken;
    }

    proxyReq.setHeader('Authorization', `Bearer ${access_token}`);
    proxyReq.setHeader('Client-Id', process.env.CLIENT_ID);
}

const onUndocProxyRes = responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
    if (proxyRes.headers['content-type'].includes('application/json')) {
        const url = new URL(req.url, `https://${req.headers.host}`);
        const cacheKey = getCacheKey(url.pathname, url.searchParams);

        let data = JSON.parse(responseBuffer.toString('utf8'));

        if(cacheKey !== '' && proxyRes.statusCode !== 401){
            redisCacheClient.set(Object.keys(cacheKey)[0], JSON.stringify(data));
        }
    }
    return responseBuffer;
});

const apiProxy = createProxyMiddleware({
	target : 'https://api.twitch.tv/helix',
	changeOrigin: true,
	pathRewrite: {
		'^/api' : ''
	},
    selfHandleResponse: true,
    onProxyReq : onProxyReq,
    onProxyRes : onProxyRes,
});

const undocApiProxy = createProxyMiddleware({
    target: 'https://badges.twitch.tv/v1',
    changeOrigin: true,
    pathRewrite: {
        '^/udapi': ''
    },
    selfHandleResponse: true,
    onProxyRes: onUndocProxyRes
});

// getCacheKey pathname : /users, params : {"login":"2chamcham2"}
function getCacheKey(pathname: string, params: URLSearchParams){
    let keys: any = {};
    const bc_regex = /\/badges\/channels\/[0-9]+\/display/;

    let q: Array<string> | string;
    if (pathname === '/users') {
        q = params.getAll('login');
    }else if (['/chat/badges', '/bits/cheermotes'].includes(pathname)){
        q = params.get('broadcaster_id');
    }else if(pathname === '/chat/badges/global'){
        q = '';
    }else if(bc_regex.test(pathname) || pathname === '/badges/global/display'){
        q = params.get('language');
    }

    if(!q) return;
    if(Array.isArray(q) && q.length === 0) return;
    if(typeof q === 'string'){
        q = [q];
    }
    
    for(let qq of q){
        keys[`${pathname}${qq !== '' ? `:${qq}` : ''}`] = qq;
    }

    return keys;
}

async function checkCacheAvailable(req, res, next){
    const url = new URL(req.url, `https://${req.headers.host}`);
    const cacheKey = getCacheKey(url.pathname, url.searchParams);

    let cache: Array<string>;
    let keys = [];

    if(cacheKey){
        keys = Object.keys(cacheKey);
        cache = await redisCacheClient.mget(...keys);
    }

    if(cache && ! cache.some((e) => e === null)){
        logger.info(`redis cache found. respond with cached value by req.path : ${req.path}, cacheKey : ${JSON.stringify(cacheKey)}`);

        const resObj: any = {data: []};

        const bc_regex = /\/badges\/channels\/[0-9]+\/display/;

        if(req.path === '/badges/global/display' || bc_regex.test(req.path)){
            res.json(JSON.parse(cache[0]));
            return;
        }

        if(req.path !== '/users' && cache.length === 1){
            resObj.data.push(...JSON.parse(cache[0]));
            res.json(resObj);
            return;
        }

        for(let c = 0; c < cache.length; c++){
            resObj.data.push(JSON.parse(cache[c]));
        }
        res.json(resObj);
    }else{
        logger.info(`redis cache not found. req.path : ${req.path}, cacheKey : ${JSON.stringify(cacheKey)}`);
        next();
    }
}

export { apiProxy, undocApiProxy , checkCacheAvailable};
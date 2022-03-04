import { createProxyMiddleware, responseInterceptor } from 'http-proxy-middleware';
import { Twitch_Api } from './api/twitchApi';
import { redisCacheClient } from './redis_client.js';
import logger from './utils/logger';

var url = require('url');

const tapi = new Twitch_Api();
tapi.getAppAccessToken();

const onProxyRes = responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
    if (proxyRes.headers['content-type'].includes('application/json')) {
        let data = JSON.parse(responseBuffer.toString('utf8'));
        const parseUrl = url.parse(req.url, true);
        const pathname = parseUrl.pathname;
        const query = parseUrl.query;
        const cacheKey = getCacheKey(pathname, query);

        if(cacheKey !== '' && proxyRes.statusCode !== 401){
            redisCacheClient.set(cacheKey, JSON.stringify(data));
        }
    }
    return responseBuffer;
});

function onProxyReq(proxyReq, req, res){
    const parseUrl = url.parse(req.url, true);
    const pathname = parseUrl.pathname;
    const query = parseUrl.query;

    let access_token = tapi.token; // 서버 APP ACCESS TOKEN.

    if(pathname === '/users' && !query.login){
        access_token = req.session.access_token;
    }else if(pathname === '/streams/followed'){
        access_token = req.session.access_token;
    }
    console.log(`pathname : ${pathname}, access_token : ${access_token}`);

    proxyReq.setHeader('Authorization', `Bearer ${access_token}`);
    proxyReq.setHeader('Client-Id', process.env.CLIENT_ID);
}

const onUndocProxyRes = responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
    if (proxyRes.headers['content-type'].includes('application/json')) {
        let data = JSON.parse(responseBuffer.toString('utf8'));
        const parseUrl = url.parse(req.url, true);
        const pathname = parseUrl.pathname;
        const query = parseUrl.query;

        const cacheKey = getCacheKey(pathname, query);
        if(cacheKey !== '' && proxyRes.statusCode !== 401){
            redisCacheClient.set(cacheKey, JSON.stringify(data));
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

function getCacheKey(pathname: string, query){
    let key = '';
    const bc_regex = /\/badges\/channels\/[0-9]+\/display/;

    if(pathname === '/users'){
        if(query.login){
            key = `${pathname}:${query.login || ''}`;
        }
    }else if(pathname === '/streams/followed'){
        // 캐싱 필요 없음.
    }else if(pathname === '/chat/badges'){
        key = `${pathname}:${query.broadcaster_id || ''}`;
    }else if(pathname === '/chat/badges/global'){
        // query 없음.
        key = pathname;
    }else if(bc_regex.test(pathname)){
        key = `${pathname}:${query.language || ''}`;
    }else if(pathname === '/badges/global/display'){
        key = `${pathname}:${query.language || ''}`;
    }else if(pathname === '/chat/emotes/set'){
        // 캐싱 필요 없음.
    }else if(pathname === '/bits/cheermotes'){
        key = `${pathname}:${query.broadcaster_id || ''}`;
    }

    return key;
}

async function checkCacheAvailable(req, res, next){
    const parseUrl = url.parse(req.url, true);
    const pathname = parseUrl.pathname;
    const query = parseUrl.query;
    const cacheKey = getCacheKey(pathname, query);

    let cache;

    if(cacheKey !== ''){
        cache = await redisCacheClient.get(cacheKey);
    }

    if(cache){
        logger.info(`redis cache found. respond with cached value by pathname : ${pathname}, cacheKey : ${cacheKey}`);
        res.json(JSON.parse(cache));
    }else{
        logger.info(`redis cache not found. pathname : ${pathname}, cacheKey : ${cacheKey}`);
        next();
    }
}

export { apiProxy, undocApiProxy , checkCacheAvailable};
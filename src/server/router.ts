import express from 'express';
import path from 'path';
// import * as constant from './const';
import logger from './utils/logger';
import { redisCacheClient } from './redis_client.js';
import { Twitch_Api } from './api/twitchApi';

const router = express.Router();
const tapi = new Twitch_Api();

tapi.getAppAccessToken();

router.get('/', (req, res) => {
    const logMsgHeader = `${req.method} ${req.originalUrl} ${req.headers['cf-connecting-ip']}`;
    logger.info(`${logMsgHeader}`);

    res.cookie('language', getRequestedLang(req));
    
    res.sendFile(path.join(__dirname, "../src", "webpage", "tbc.html"));
});

router.get('/mini', (req, res) => {
    const logMsgHeader = `${req.method} ${req.originalUrl} ${req.headers['cf-connecting-ip']}`;
    logger.info(`${logMsgHeader}`);

    res.cookie('language', getRequestedLang(req));
    
    res.sendFile(path.join(__dirname, "../src", "webpage", "mini.html"));
});

router.get('/setting/filter', (req, res) => {
    const logMsgHeader = `${req.method} ${req.originalUrl} ${req.headers['cf-connecting-ip']}`;
    logger.info(`${logMsgHeader}`);
    
    res.cookie('language', getRequestedLang(req));
    res.sendFile(path.join(__dirname, "../src", "webpage", "filter.html"));
});

router.get('/login', wrapAsync(async(req, res) => {
    const logMsgHeader = `${req.method} ${req.originalUrl} ${req.headers['cf-connecting-ip']}`;
    logger.info(`${logMsgHeader}`);
    const client_state = <string>req.query.cstate;
    const server_state = <string>req.query.state;
    const auth_code = <string>req.query.code;

    let pagePath = resolvePath(req.query.page as string);
    const url = 'https://id.twitch.tv/oauth2/authorize?'
     + `client_id=${process.env.CLIENT_ID}&`
     + `redirect_uri=${process.env.REDIRECT_URI}login&`
     + `scope=${process.env.AUTH_SCOPE}&`
     + `state=${client_state + pagePath}&`
     + 'force_verify=false&response_type=code';

    const s_cstate = req.session.cstate;
    const redirect_path = s_cstate ? s_cstate.substring(10) : '/';

    if(auth_code && server_state){
        delete req.session.cstate;
        if(!(server_state === s_cstate)){
            logger.warn(`${logMsgHeader} state mismatch. client_state : ${s_cstate}, server_state : ${server_state}`);
            res.redirect(redirect_path);
        }else{
            const token = await tapi.request_token(auth_code).catch(err => {
                logger.warn(`${logMsgHeader} request_token failed.`, err);
                res.redirect(redirect_path);
            });
            req.session.access_token = token.access_token;
            req.session.refresh_token = token.refresh_token;
            req.session.expire_time = token.expires_in;
            res.redirect(redirect_path);
        }
    }else{
        if(!req.session.access_token){
            req.session.cstate = client_state + pagePath;
            res.redirect(url);
            logger.info(`${logMsgHeader} redirect to twitch login page url : ${url}`);
        }else{
            res.redirect(redirect_path);
            logger.info(`${logMsgHeader} no state, but have access_token.`);
        }
    }
}));

router.post('/token', wrapAsync(async(req, res) => {
    const logMsgHeader = `${req.method} ${req.originalUrl} ${req.headers['cf-connecting-ip']}`;
	logger.info(`${logMsgHeader}`);

	const access_token = req.session.access_token;

	if(!access_token) {
        logger.warn(`${logMsgHeader} access_token not exist.`);
		res.json({ status: false });
        return;
	}

    const valToken = await tapi.validate_token(access_token).catch(err => {
        const refresh_token = req.session.refresh_token;

        if(refresh_token){
            res.redirect(307, '/token/refresh');
        }else{
            req.session.destroy(() => {});
            res.json({ status: false });
        }
        logger.error(`${req.method} ${req.originalUrl} validate_token failed. `, err);
    });

    if(valToken){
        req.session.expire_time = valToken.expires_in;
        res.json({
            status: true,
            access_token: access_token,
            expire_time: valToken.expires_in
        });
        logger.info(`${logMsgHeader} validate_token success.`);
    }
}));

router.get('/logout', wrapAsync(async(req, res) => {
    const logMsgHeader = `${req.method} ${req.originalUrl} ${req.headers['cf-connecting-ip']}`;
	const token = req.session.access_token;
    let page = resolvePath(req.query.page as string);
	
	if(token){
		tapi.revoke_token(token).then(res=>{
            logger.info(`${logMsgHeader} token revoked. status : ${res.status}`);
		}).catch(err=>{
            logger.error(`${logMsgHeader} revoke_token failed : ${err.response.data}`);
		});
		req.session.destroy(() => {});
	}
	res.redirect(page);
}));

router.post('/token/refresh', wrapAsync(async(req, res)=>{
    const logMsgHeader = `${req.method} ${req.originalUrl} ${req.headers['cf-connecting-ip']}`;
    logger.info(`${logMsgHeader}`);

    const refresh_token = req.session.refresh_token;
    const current_time = new Date().getTime();
    const lastTokenRefreshTime = req.session.lastTokenRefreshTime;

    if(lastTokenRefreshTime && current_time - lastTokenRefreshTime < 44 * 1000){
        logger.warn(`${logMsgHeader} refresh token request interval is too short.`);
        res.status(429).json({ status: false });
        return;
    }
    tapi.refresh_token(refresh_token).then(token=>{
        req.session.access_token = token.access_token; // 새로 발급받은 access token.
        req.session.refresh_token = token.refresh_token; // 새로 발급받은 refresh token.
        req.session.expire_time = token.expires_in;
        req.session.lastTokenRefreshTime = new Date().getTime();

        res.json({
            status: true,
            access_token: token.access_token,
            expire_time : token.expires_in
        });
        logger.info(`${logMsgHeader} token refreshed.`);
    }).catch(err=>{
        logger.error(`${logMsgHeader} refresh_token failed.`, err);
        req.session.destroy(() => {}); // refresh token 으로 요청했는데 실패한 경우 다시 로그인할 수 있게 세션 destroy.
        res.json({ status: false });
    });
}));


// Client 유저 토큰으로 요청.

router.get('/api/users', wrapAsync(async (req, res) => {
    const access_token = req.session.access_token;
    let user, login = <string>req.query.login;

    if(login){
        user = JSON.parse(await redisCacheClient.get(`${req.path}:${login}`));
    }
    if(!user){
        user = await tapi.get_users(access_token, login);
        if(login){
            redisCacheClient.set(`${req.path}:${login}`, JSON.stringify(user));
        }
    }
    res.json(user);
}));

router.get('/api/streams/followed', wrapAsync(async(req, res) => {
    const access_token = req.session.access_token;
    const user_id = <string>req.query.user_id;
    const after = <string>req.query.after;

    const followedStreams = await tapi.get_followed_streams(access_token, user_id, after);
    res.json(followedStreams);
}));

// Server 경유 요청

router.get('/api/badge/channels', wrapAsync(async(req, res) => {
    const broadcaster_id = <string>req.query.broadcaster_id;
    const cache = await redisCacheClient.get(`${req.path}:${broadcaster_id}`);

    if(cache){
        res.json(JSON.parse(cache));
    }else{
        const channel_badges = await tapi.get_channel_chat_badges(broadcaster_id);
        redisCacheClient.set(`${req.path}:${broadcaster_id}`, JSON.stringify(channel_badges));
        res.json(channel_badges);
    }
    
}));

router.get('/api/badge/global', wrapAsync(async(req, res) => {
    const cache = await redisCacheClient.get(`${req.path}:global`);

    if(cache){
        res.json(JSON.parse(cache));
    }else{
        const global_badges = await tapi.get_global_chat_badges();
        redisCacheClient.set(`${req.path}:global`, JSON.stringify(global_badges));
        res.json(global_badges);
    }
}));

// ud : undocumented.
router.get('/api/ud/badge/channels', wrapAsync(async(req, res) => {
    const broadcaster_id = <string>req.query.broadcaster_id;
    const cache = await redisCacheClient.get(`${req.path}:${broadcaster_id}`);

    if(cache){
        res.json(JSON.parse(cache));
    }else{
        const channelBadges = await tapi.getChannelChatBadges(broadcaster_id);
        redisCacheClient.set(`${req.path}:${broadcaster_id}`, JSON.stringify(channelBadges));
        res.json(channelBadges);
    }
}));

router.get('/api/ud/badge/global', wrapAsync(async(req, res) => {
    const cache = await redisCacheClient.get(`${req.path}:global`);

    if(cache){
        res.json(JSON.parse(cache));
    }else{
        const globalBadges = await tapi.getGlobalChatBadges();
        redisCacheClient.set(`${req.path}:global`, JSON.stringify(globalBadges));
        res.json(globalBadges);
    }
}));

router.get('/api/emote', wrapAsync(async(req, res) => {
    const emoteId = <string[]>req.query.emote_id;
    const emoteSets = await tapi.get_emote_sets(emoteId);
    res.json(emoteSets);
}));

router.get('/api/cheermote', wrapAsync(async(req, res) => {
    const broadcaster_id = <string>req.query.broadcaster_id;
    const cache = await redisCacheClient.get(`${req.path}:${broadcaster_id}`);

    if(cache){
        res.json(JSON.parse(cache));
    }else{
        const cheermotes = await tapi.get_cheermotes(broadcaster_id);
        redisCacheClient.set(`${req.path}:${broadcaster_id}`, JSON.stringify(cheermotes));
        res.json(cheermotes);
    }
}));

router.get('/test', (req, res) => {
	res.sendFile(path.join(__dirname, "../src", "webpage", "tbc_test.html"));
});

function getRequestedLang(req){
    const lang = req.acceptsLanguages('en', 'en-US', 'ko', 'ko-KR');
    return lang ? lang : 'en';
}

function resolvePath(page: string){
    if(page === 'main'){
        page = '/';
    }else if(page === 'filter'){
        page = '/setting/filter';
    }
    return page;
}

function wrapAsync (asyncFn){
    return (async (req, res, next) => {
        try {
            return await asyncFn(req, res, next)
        } catch (error) {
            return next(error)
        }
    })
}
  
module.exports = router;
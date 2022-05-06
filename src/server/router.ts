import express from 'express';
import path from 'path';
import logger from './utils/logger';
import { Twitch_Api } from './api/twitchApi';

const router = express.Router();
const tapi = new Twitch_Api();
const latestVersion = ['1.4.7', '1.4.8', 'web'];

router.get('/', (req, res) => {
    const dev = <string>req.query.dev;
    res.cookie('language', getRequestedLang(req), {sameSite : 'strict'});
    res.sendFile(path.join(__dirname, '../src', 'webpage', getPagePathByVersion('tbc', 'web', dev)));
});

router.get('/mini', (req, res) => {
    const dev = <string>req.query.dev;
    const logMsgHeader = `${req.method} ${req.originalUrl} ${req.headers['cf-connecting-ip']}`;
    const extVersion = <string>req.query.ext_version;

    logger.info(`${logMsgHeader} extVersion : ${extVersion}`);

    res.cookie('language', getRequestedLang(req), {sameSite : 'strict'});
    res.sendFile(path.join(__dirname, '../src', 'webpage', getPagePathByVersion('mini', extVersion, dev)));
});

router.get('/setting/filter', (req, res) => {
    const dev = <string>req.query.dev;
    const logMsgHeader = `${req.method} ${req.originalUrl} ${req.headers['cf-connecting-ip']}`;
    const extVersion = <string>req.query.ext_version;

    logger.info(`${logMsgHeader} extVersion : ${extVersion}`);

    res.cookie('language', getRequestedLang(req), {sameSite : 'strict'});
    res.sendFile(path.join(__dirname, '../src', 'webpage', getPagePathByVersion('filter', extVersion, dev)));
});

router.get('/chat', (req, res) => {
    const dev = <string>req.query.dev;
    const logMsgHeader = `${req.method} ${req.originalUrl} ${req.headers['cf-connecting-ip']}`;
    const extVersion = <string>req.query.ext_version;

    logger.info(`${logMsgHeader} extVersion : ${extVersion}`);

    res.cookie('language', getRequestedLang(req), {sameSite : 'strict'});
    res.sendFile(path.join(__dirname, '../src', 'webpage', getPagePathByVersion('chatSaver', extVersion, dev)));
});

router.get('/replay', (req, res) => {
    const dev = <string>req.query.dev;
    const logMsgHeader = `${req.method} ${req.originalUrl} ${req.headers['cf-connecting-ip']}`;
    const extVersion = <string>req.query.ext_version;

    logger.info(`${logMsgHeader} extVersion : ${extVersion}`);

    res.cookie('language', getRequestedLang(req), {sameSite : 'strict'});
    res.sendFile(path.join(__dirname, '../src', 'webpage', getPagePathByVersion('replay', extVersion, dev)));
});
router.get('/login', wrapAsync(async(req, res) => {
    const logMsgHeader = `${req.method} ${req.originalUrl} ${req.headers['cf-connecting-ip']}`;
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
            tapi.request_token(auth_code).then(token => {
                req.session.access_token = token.access_token;
                req.session.refresh_token = token.refresh_token;
                req.session.expire_time = token.expires_in;
                res.redirect(redirect_path);
            }).catch(err => {
                logger.warn(`${logMsgHeader} request_token failed.`, err);
                res.redirect(redirect_path);
            });
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
	// logger.info(`${logMsgHeader}`);

	const access_token = req.session.access_token;

	if(!access_token) {
        logger.warn(`${logMsgHeader} access_token not exist.`);
		res.json({ status: false });
        return;
	}
    tapi.validate_token(access_token).then((token => {
        req.session.expire_time = token.expires_in;
        res.json({
            status: true,
            access_token: access_token,
            expire_time: token.expires_in
        });
        logger.info(`${logMsgHeader} validate_token success.`);
    })).catch(err => {
        const refresh_token = req.session.refresh_token;

        if(refresh_token){
            res.redirect(307, '/token/refresh');
        }else{
            req.session.destroy(() => {});
            res.json({ status: false });
        }
        logger.error(`${req.method} ${req.originalUrl} validate_token failed. `, err);

    });
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
    tapi.refresh_token(refresh_token).then(token=>{
        req.session.access_token = token.access_token; // 새로 발급받은 access token.
        req.session.refresh_token = token.refresh_token; // 새로 발급받은 refresh token.
        req.session.expire_time = token.expires_in;

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

router.get('/test', (req, res) => {
	res.sendFile(path.join(__dirname, "../src", "webpage", "tbc_test.html"));
});

function getPagePathByVersion(htmlName: string, version: string, dev?:string){

    if(!latestVersion.includes(version)){
        return `old/${htmlName}.html`;
    }
    if(version === 'web'){
        return dev ? `dev/${htmlName}.html` : `${htmlName}.html`;
    }

    return dev ? `dev/${htmlName}.html` : `${version}/${htmlName}.html`;
}

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
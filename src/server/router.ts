import express from 'express';
import path from 'path';
import * as token_api from './token_api';
import * as constant from './const';
import logger from './utils/logger';

const router = express.Router();

router.get('/', (req, res) => {
    const logMsgHeader = `${req.method} ${req.originalUrl} ${req.headers['cf-connecting-ip']}`;
    logger.info(`${logMsgHeader}`);
    res.sendFile(path.join(__dirname, "../src", "webpage", "tbc.html"));
});

router.get('/login', (req, res) => {
    const logMsgHeader = `${req.method} ${req.originalUrl} ${req.headers['cf-connecting-ip']}`;
    logger.info(`${logMsgHeader}`);
    const client_state = req.query.cstate;
    const server_state = req.query.state;
    const auth_code = req.query.code;

    const url = 'https://id.twitch.tv/oauth2/authorize?'
     + `client_id=${constant.CLIENT_ID}&`
     + `redirect_uri=${constant.REDIRECT_URI}login&`
     + `scope=${constant.AUTH_SCOPE}&`
     + `state=${client_state}&`
     + 'force_verify=false&response_type=code';

    if(auth_code && server_state){
        const s_cstate = req.session.cstate;
        delete req.session.cstate;
        if(!(server_state === s_cstate)){
            logger.warn(`${logMsgHeader} state mismatch. client_state : ${s_cstate}, server_state : ${server_state}`);
            res.redirect('/');
        }else{
            token_api.request_token(auth_code).then(token => {
                req.session.access_token = token.data.access_token;
                req.session.refresh_token = token.data.refresh_token;
                req.session.expire_time = token.data.expires_in;
                res.redirect('/');
            }).catch(err =>{
                logger.warn(`${logMsgHeader} request_token failed.`, err);
                res.redirect('/');
            });
        }
    }else{
        if(!req.session.access_token){
            req.session.cstate = client_state;
            res.redirect(url);
            logger.info(`${logMsgHeader} redirect to twitch login page url : ${url}`);
        }else{
            res.redirect('/');
            logger.info(`${logMsgHeader} no state, but have access_token.`);
        }
    }
});

router.post('/token', (req, res) => {
    const logMsgHeader = `${req.method} ${req.originalUrl} ${req.headers['cf-connecting-ip']}`;
	logger.info(`${logMsgHeader}`);

	const access_token = req.session.access_token;
	if(!access_token) {
        logger.warn(`${logMsgHeader} access_token not exist.`);
		res.json({ status: false });
        return;
	}

	token_api.validate_token(access_token).then(v=>{
        req.session.expire_time = v.data.expires_in;
		res.json({
			status: true,
			access_token: access_token,
			expire_time : v.data.expires_in
		});
        logger.info(`${logMsgHeader} validate_token success.`);
	}).catch(err=>{
        req.session.destroy();
        res.json({ status: false });
        logger.error(`${req.method} ${req.originalUrl} validate_token failed. `, err);
	});
});

router.get('/logout', (req, res) => {
    const logMsgHeader = `${req.method} ${req.originalUrl} ${req.headers['cf-connecting-ip']}`;
	const session = req.session;
	
	if(session.access_token){
		token_api.revoke_token(session.access_token).then(res=>{
            logger.info(`${logMsgHeader} token revoked. status : ${res.status}`);
		}).catch(err=>{
            logger.error(`${logMsgHeader} revoke_token failed : ${err.response.data}`);
		});
		req.session.destroy();
	}
	res.redirect('/');
});

// refresh token..
router.post('/token/refresh', (req, res)=>{
    const logMsgHeader = `${req.method} ${req.originalUrl} ${req.headers['cf-connecting-ip']}`;
    logger.info(`${logMsgHeader}`);

    const refresh_token = req.session.refresh_token;
    const current_time = new Date().getTime();
    const lastTokenRefreshTime = req.session.lastTokenRefreshTime;

    if(!refresh_token){
        logger.warn(`${logMsgHeader} refresh_token not exist.`);
        res.json({ status: false });
        return;
    }
    if(!lastTokenRefreshTime && current_time - lastTokenRefreshTime < 44 * 1000){
        logger.warn(`${logMsgHeader} refresh token request interval is too short.`);
        res.json({ status: false });
        return;
    }
    token_api.refresh_token(refresh_token).then(token=>{
        req.session.access_token = token.data.access_token; // 새로 발급받은 access token.
        req.session.refresh_token = token.data.refresh_token; // 새로 발급받은 refresh token.
        req.session.expire_time = token.data.expires_in;
        req.session.lastTokenRefreshTime = new Date().getTime();

        res.json({
            status: true,
            access_token: token.data.access_token,
            expire_time : token.data.expires_in
        });
        logger.info(`${logMsgHeader} token refreshed.`);
    }).catch(err=>{
        logger.error(`${logMsgHeader} refresh_token not exist.`, err);
        res.json({ status: false });
    });
});
router.get('/test', (req, res) => {
	res.sendFile(path.join(__dirname, "../src", "webpage", "tbc_test.html"));
});

module.exports = router;
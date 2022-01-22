import express from 'express';
import path from 'path';
import * as token_api from './token_api';
import * as constant from './const';

const router = express.Router();

router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, "../src", "webpage", "tbc.html"));
});

router.get('/login', (req, res) => {
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
            console.log(`state 불일치. req.session.cstate : ${req.session.cstate}, server_state : ${server_state}`);
            res.redirect('/');
        }else{
            token_api.request_token(auth_code).then(token => {
                req.session.access_token = token.data.access_token;
                req.session.refresh_token = token.data.refresh_token;
                req.session.expire_time = token.data.expires_in;
                res.redirect('/');
            }).catch(err =>{
                console.log('request_token 실패. : ', err);
                res.redirect('/');
            });
        }
    }else{
        if(!req.session.access_token){
            req.session.cstate = client_state;
            res.redirect(url);
        }else{
            res.redirect('/token');
        }
    }
});

router.post('/token', (req, res) => {
	console.log('POST /token : ', req.session);

	const access_token = req.session.access_token;
    const refresh_token = req.session.refresh_token;

	if(!access_token) {
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
	}).catch(err=>{
		if(err.response.status === 401 && refresh_token){
            res.redirect('/token/refresh');
		}else{
            res.json({ status: false });
        }
	})
});

router.get('/logout', (req, res) => {
	const session = req.session;
	
	if(session.access_token){
		token_api.revoke_token(session.access_token).then(res=>{
			console.log('revoke token result : ', res.status);
		}).catch(err=>{
			console.log('revoke_token failed : ', err.response.data);
		});
		req.session.destroy();
	}
	res.redirect('/');
});

// refresh token..
router.post('/token/refresh', (req, res)=>{
    const refresh_token = req.session.refresh_token;

    console.log('POST /token/refresh : ', refresh_token);

    token_api.refresh_token(refresh_token).then(token=>{
        req.session.access_token = token.data.access_token; // 새로 발급받은 access token.
        req.session.refresh_token = token.data.refresh_token; // 새로 발급받은 refresh token.
        req.session.expire_time = token.data.expires_in;

        res.json({
            status: true,
            access_token: token.data.access_token,
            expire_time : token.data.expires_in
        });
    }).catch(err=>{
        console.log('refresh_token failed err : ', err.response.data);
        res.json({ status: false });
    });
});
router.get('/test', (req, res) => {
	res.sendFile(path.join(__dirname, "../src", "webpage", "tbc_test.html"));
});

module.exports = router;
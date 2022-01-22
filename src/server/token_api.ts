import axios from 'axios';
import * as constant from './const';

function request_token(code: string) {
	const url = 'https://id.twitch.tv/oauth2/token?' + new URLSearchParams({
		client_id: constant.CLIENT_ID,
		client_secret: constant.CLIENT_SECRET,
		code: code,
		grant_type: 'authorization_code',
		redirect_uri: constant.REDIRECT_URI
	});
	return axios.post(url);
}

function validate_token(token: string) {
	const url = 'https://id.twitch.tv/oauth2/validate';
	return axios.get(url, {
		headers: {
			Authorization : `Bearer ${token}`
		}
	});
}

function refresh_token(r_token: string) {
	const url = 'https://id.twitch.tv/oauth2/token?' + new URLSearchParams({
		grant_type: 'refresh_token',
		refresh_token: r_token,
		client_id: constant.CLIENT_ID,
		client_secret: constant.CLIENT_SECRET
	});
	return axios.post(url);
}

function revoke_token(token: string){
	const url = 'https://id.twitch.tv/oauth2/revoke?' + new URLSearchParams({
		client_id: constant.CLIENT_ID,
		token: token
	})
	return axios.post(url);
}

export {request_token, revoke_token, refresh_token, validate_token}
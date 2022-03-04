import axios, { AxiosRequestConfig, Method } from 'axios';
import logger from '../utils/logger';

class Twitch_Api {
    token: string;

    // Twitch Authorization

    async request_token(code: string) {
        const url = 'https://id.twitch.tv/oauth2/token?' + new URLSearchParams({
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: process.env.REDIRECT_URI
        });
        return await this.request(url, 'POST', null);
    }
    
    validate_token(token: string) {
        const url = 'https://id.twitch.tv/oauth2/validate';
        const headers = {
            Authorization : `Bearer ${token}`
        }
        return this.request(url, 'get', headers);
    }
    
    refresh_token(r_token: string) {
        const url = 'https://id.twitch.tv/oauth2/token?' + new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: r_token,
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET
        });
        return this.request(url, 'post', null);
    }
    
    revoke_token(token: string){
        const url = 'https://id.twitch.tv/oauth2/revoke?' + new URLSearchParams({
            client_id: process.env.CLIENT_ID,
            token: token
        });
        return this.request(url, 'post', null);
    }
    
    getAppAccessToken(){
        const params = new URLSearchParams();
        params.append('client_id', process.env.CLIENT_ID);
        params.append('client_secret', process.env.CLIENT_SECRET);
        params.append('grant_type', 'client_credentials');
    
        const url = `https://id.twitch.tv/oauth2/token?${params}`;

        return this.request(url, 'post', null).then(token => {
            this.token = token.access_token;
        });
    }

    private async request(url: string, m: Method, headers, userToken?: string) {
        headers = headers ? headers : {
            Authorization: `Bearer ${userToken || this.token}`,
            'Client-Id': process.env.CLIENT_ID
        };

        const config: AxiosRequestConfig = {
            url: url,
            method: m,
            headers: headers
        }

        return axios(config).then(res => {
            return res.data;
        })
    }
}

export { Twitch_Api };
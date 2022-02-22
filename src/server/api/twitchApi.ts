import axios, { AxiosRequestConfig, Method } from 'axios';

class Twitch_Api {
    token: string;

    get_users(user_token?: string, login?: string) {
        let url = `https://api.twitch.tv/helix/users`;

        if(login){
            const params = new URLSearchParams();
            params.append('login', login);
            url = url + '?' + params;
        }
        return this.request(url, 'GET', null, user_token);
    }
    get_followed_streams(user_token: string, user_id: string, after?: string) {
        console.log('get_followed_streams user_token : ', user_token);

        if(after === null) return Promise.reject();

        const params = new URLSearchParams();
        params.append('user_id', user_id);
        if(after) params.append('after', after);
        params.append('first', '10');

        const url = `https://api.twitch.tv/helix/streams/followed?${params}`;
        return this.request(url, 'GET', null, user_token);
    }

    // server app access token 요청.

    get_channel_chat_badges(broadcaster_id: string) {
        const url = `https://api.twitch.tv/helix/chat/badges?broadcaster_id=${broadcaster_id}`;
        return this.request(url, 'GET', null).then(badges => {
            return badges;
        });
    }
    get_global_chat_badges(/*map: boolean*/) {
        const url = 'https://api.twitch.tv/helix/chat/badges/global';
        return this.request(url, 'GET', null);
    }
    getChannelChatBadges(broadcaster_id: string){
        const params = new URLSearchParams();
        // params.append('language', i18n.language);
        params.append('language', 'ko');
        const url = `https://badges.twitch.tv/v1/badges/channels/${broadcaster_id}/display?${params}`
        return this.request(url, 'GET', null).then(badges=>{
            return badges;
        });
    }
    getGlobalChatBadges(){
        const params = new URLSearchParams();
        // params.append('language', i18n.language);
        params.append('language', 'ko');
        const url = `https://badges.twitch.tv/v1/badges/global/display?${params}`
        return this.request(url, 'GET', null).then(badges=>{
            return badges;
        });
    }
    get_emote_sets(emote_sets_id: string[]) {
        const url = 'https://api.twitch.tv/helix/chat/emotes/set?';

        const params = new URLSearchParams();
        for(let i = 0; i < emote_sets_id.length; i++){
            params.append('emote_set_id', emote_sets_id[i]);
        }
        return this.request(url + params, 'GET', null).then(sets=>{
            return sets;
        });
    }
    get_cheermotes(broadcaster_id: string){
        const url = `https://api.twitch.tv/helix/bits/cheermotes?broadcaster_id=${broadcaster_id}`;
        return this.request(url, 'GET', null).then(cm => {
            return cm;
        });
    }

    // Twitch Authrization

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

        const res = (await axios(config)).data;
        return res;
    }
}

export { Twitch_Api };
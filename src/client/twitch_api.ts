import type Swal from 'sweetalert2/dist/sweetalert2.js';
import { Auth } from './auth.js';
import * as swal_setting from './swal_setting.js';

// import type Swal from 'sweetalert2';
// import type { Client, Options, CommonUserstate } from 'tmi.js';
// const Swal = require('sweetalert2');

interface badge_info {
    id: string;
    image_url_1x: string;
    image_url_2x: string;
    image_url_4x: string;
}
class Twitch_Api {
    _user_id: string;
    _username: string;
    client_id: string;
    token: string;
    cur_channel: string; // 가장 최근에 연결에 성공한 채널.
    _targetChannel: string; // 가장 최근에 JOIN 시도했던 채널.
    t_expire: number;
    ch_badges: Map<string, badge_info>;
    gb_badges: Map<string, badge_info>;
    _emote_sets: Map<string, object> = new Map();
    _cheermotes: Map<string, object> = new Map();
    auth: Auth = new Auth();

    dev = JSON.parse(localStorage.getItem('dev'));

    Toast = Swal.mixin(swal_setting.setting_def);

    constructor(c_id: string) {
        this.client_id = c_id;
    }

    get_users(...logins: string[]) {
        let params = new URLSearchParams();
        logins.forEach(login=>{
            params.append('login', login);
        });
        return this.request(`https://api.twitch.tv/helix/users?${params}`, 'GET');
    }
    get_followed_streams(user_id: string, after?: string) {
        if(after === null) return Promise.reject();

        let params = new URLSearchParams();
        params.append('user_id', user_id);
        if(after) params.append('after', after);
        params.append('first', '10');

        const url = `https://api.twitch.tv/helix/streams/followed?${params}`;
        return this.request(url, 'GET');
    }
    get_users_follows(user_id: string, after?: string) {
        if(after === null) return Promise.reject();

        let params = new URLSearchParams();
        params.append('user_id', user_id);
        if(after) params.append('after', after);

        const url = `https://api.twitch.tv/helix/users/follows?${params}`;
        return this.request(url, 'GET');
    }
    get_channel_chat_badges(broadcaster_id: string) {
        const url = `https://api.twitch.tv/helix/chat/badges?broadcaster_id=${broadcaster_id}`;
        return this.request(url, 'GET').then(badges => {
            const m = this.badge_data_to_map(badges);
            if(this.dev) console.log(m);
            return m;
        });
    }
    get_global_chat_badges() {
        const url = 'https://api.twitch.tv/helix/chat/badges/global';
        return this.request(url, 'GET').then(badges=>{
            const m = this.badge_data_to_map(badges);
            if(this.dev) console.log(m);
            return m;
        });
    }
    get_emote_sets(emote_sets_id: string[]) {
        const url = 'https://api.twitch.tv/helix/chat/emotes/set?';

        let params = new URLSearchParams();
        for(let i = 0; i < emote_sets_id.length; i++){
            params.append('emote_set_id', emote_sets_id[i]);
        }
        return this.request(url + params, 'GET').then(sets=>{
            sets.data.forEach(e => {
                this.emote_sets.set(e.name, e);
            });
            return this.emote_sets;
        });
    }
    get_cheermotes(broadcaster_id: string){
        const url = `https://api.twitch.tv/helix/bits/cheermotes?broadcaster_id=${broadcaster_id}`;
        return this.request(url, 'GET').then(cm => {
            const m = this.cheermote_map(cm);
            if(this.dev) console.log(m);
            return m;
        });
    }

    get user_id(){
        return this._user_id;
    }
    set user_id(user_id: string){
        this._user_id = user_id;
    }
    get username(){
        return this._username;
    }
    set username(username: string){
        this._username = username;
    }
    get access_token(){
        return this.token;
    }
    set access_token(token: string){
        this.token = token;
    }
    get expire_time(){
        return this.t_expire;
    }
    set expire_time(expire_time: number){
        this.t_expire = expire_time;
    }
    get current_channel() {
        return this.cur_channel;
    }
    set current_channel(channel: string) {
        this.cur_channel = channel;
    }
    get targetChannel(){
        return this._targetChannel;
    }
    set targetChannel(channel: string){
        this._targetChannel = channel;
    }
    get channel_badges() {
        return this.ch_badges;
    }
    set channel_badges(badges: Map<string, badge_info>) {
        this.ch_badges = badges;
    }
    get global_badges() {
        return this.gb_badges;
    }
    set global_badges(badges: Map<string, badge_info>) {
        this.gb_badges = badges;
    }
    get emote_sets() {
        return this._emote_sets;
    }
    set emote_sets(emote_sets){
        this._emote_sets = emote_sets;
    }
    get cheermotes() {
        return this._cheermotes;
    }
    set cheermotes(cheermotes) {
        this._cheermotes = cheermotes;
    }

    private request(url: string, m: string) {
        return fetch(url, {
            method: m,
            headers: {
                Authorization: `Bearer ${this.token}`,
                'Client-Id': this.client_id
            }
        }).then(res => {
            if(this.dev) console.log('twitch_api request res : ', res);
            if (!res.ok) {
                if(res.status === 401){
                    this.auth.token_refresh().then(token => {
                        if(token.status){
                            this.access_token = token.access_token;

                            this.Toast.fire({
                                icon: 'error',
                                title: '로그인 정보 갱신',
                                text: '다시 시도하세요.'
                            });
                        }else{
                            this.Toast.fire({
                                icon: 'error',
                                title: '요청 실패',
                                text: '새로고침 후 다시 로그인하세요.'
                            });
                        }
                    });
                }else{
                    return Promise.reject(res);
                }
            } else {
                return res.json();
            }
        }).catch(err => {
            this.Toast.fire({
                icon : 'error',
                title : '오류',
                text : '알 수 없는 오류가 발생했습니다.'
            });
        });
    }
    badge_data_to_map(badges) {
        const badge_data = badges.data;
        let badges_map = new Map();

        for (let b = 0; b < badge_data.length; b++) {
            let bd = badge_data[b];
            for (let v = 0; v < bd.versions.length; v++) {
                const badge_raw = `${bd.set_id}/${bd.versions[v].id}`;
                badges_map.set(badge_raw, bd.versions[v]);
            }
        }
        return badges_map;
    }
    private cheermote_map(cheermotes){
        const cheer_data = cheermotes.data;
        let cm_map = new Map();

        for (let c = 0; c < cheer_data.length; c++) {
            let cd = cheer_data[c];
            cm_map.set(cd.prefix, cd.tiers);
        }
        return cm_map;

    }
    get_query_str(query: string[], query_name: string) {
        let str = '';
        if (!query) return str;

        for (let i = 0; i < query.length; i++) {
            if (query) str = str + `&${query_name}=${query[i]}`;
        }
        return '?' + str;
    }
}

export { Twitch_Api, badge_info };
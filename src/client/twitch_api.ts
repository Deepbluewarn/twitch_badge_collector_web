interface badge_info {
    id: string;
    image_url_1x: string;
    image_url_2x: string;
    image_url_4x: string;
}
class Twitch_Api {
    _username: string;
    client_id: string;
    token: string;
    cur_channel: string;
    t_expire: number;
    ch_badges: Map<string, badge_info>;
    gb_badges: Map<string, badge_info>;

    constructor(c_id: string) {
        this.client_id = c_id;
    }


    get_users(logins?: string[]) {
        const login = this.get_query_str(logins, 'login');
        return this.request(`https://api.twitch.tv/helix/users${login}`, 'GET');
    }
    get_followed_streams(user_id: string, after?: string) {
        const a = this.get_query_str(after ? [after] : null, 'after');
        const url = `https://api.twitch.tv/helix/streams/followed?user_id=${user_id}` + a;
        return this.request(url, 'GET');
    }
    get_users_follows(user_id: string, after?: string) {
        const a = this.get_query_str(after ? [after] : null, 'after');
        const url = `https://api.twitch.tv/helix/users/follows?from_id=${user_id}` + a;
        return this.request(url, 'GET');
    }
    get_channel_chat_badges(broadcaster_id: string) {
        const url = `https://api.twitch.tv/helix/chat/badges?broadcaster_id=${broadcaster_id}`;
        return this.request(url, 'GET').then(badges => {
            const m = this.badge_data_to_map(badges);
            console.log(m);
            return m;
        });
    }
    get_global_chat_badges() {
        const url = 'https://api.twitch.tv/helix/chat/badges/global';
        return this.request(url, 'GET').then(badges=>{
            const m = this.badge_data_to_map(badges);
            console.log(m);
            return m;
        });
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

    request(url: string, m: string) {
        return fetch(url, {
            method: m,
            headers: {
                Authorization: `Bearer ${this.token}`,
                'Client-Id': this.client_id
            }
        }).then(res => {
            if (!res.ok) {
                return Promise.reject(res);
            } else {
                return res.json();
            }
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
    get_query_str(query: string[], query_name: string) {
        let str = '';
        if (!query) return str;

        for (let i = 0; i < query.length; i++) {
            if (query) str = str + `&${query_name}=${query[i]}`;
        }
        str = '?' + str;
        return str;
    }
}

export { Twitch_Api, badge_info };
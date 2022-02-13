import { Badges, Userstate } from "tmi.js";
import { badge_info } from "../twitch_api";
import { ChatColor, color_list } from '../chatColor';

const exp = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;


class Chat{
    badges: Badges;
    badges_raw: string;
    login_name: string;
    disp_name: string;
    color: string;
    text: string;
    msg_id: string;
    user_id: string;
    messge_type: string;
    tmi_send_ts: string;
    id: string;
    emotes: any;
    bits: string;
    _cheermotes: Map<string, any>;
    self: boolean;
    // userColorList: Map<string, string>;
    // chatColor;

    cb_info?: Map<string, badge_info>; // channel badge info.
    gb_info?: Map<string, badge_info>; // global badge info.
    emoteset: Map<string, any>;

    constructor(text: string, userstate: Userstate, self: boolean, channel_badge_info: Map<string, badge_info>, global_badge_info: Map<string, badge_info>, emoteset: Map<string, any>, cheermotes?: Map<string, any>){
        this.badges = userstate.badges;
        this.badges_raw = userstate["badges-raw"];
        this.login_name = userstate.username || userstate.login;
        this.disp_name = userstate["display-name"];
        this.color = userstate.color;
        this.text = text;
        this.msg_id = userstate['msg-id'];
        this.user_id = userstate['user-id'];
        this.messge_type = userstate['message-type']; // chat, action..
        this.tmi_send_ts = userstate['tmi-sent-ts'];
        this.id = userstate.id;
        this.emotes = userstate.emotes;
        this.bits = userstate.bits;
        this._cheermotes = cheermotes;
        this.self = self;
        // this.userColorList = userColorList;
        // this.chatColor = new ChatColor();

        this.cb_info = channel_badge_info;
        this.gb_info = global_badge_info;
        this.emoteset = emoteset;
    }

    render_chat() {
        let chat_container = document.createElement('div');

        let chat_author_html = this.render_author();
        let chat_msg_html = this.render_message();

        chat_container.appendChild(this.render_time());

        if (this.badges) {
            chat_container.appendChild(this.render_badges());
        }

        chat_container.appendChild(chat_author_html);
        chat_container.appendChild(chat_msg_html);

        chat_container.classList.add('chat', this.login_name);

        chat_container.id = this.id;
        return chat_container;
    }

    private render_badges(){
        let s = document.createElement('span');
        s.classList.add('badges');
        const channel_badges = this.cb_info;
        const global_badges = this.gb_info;
        const badges = this.badges_raw.split(',');

        if(!channel_badges || !global_badges){
            return s;
        }
        for(let b = 0; b < badges.length; b++){
            let badge = channel_badges.get(badges[b]) || global_badges.get(badges[b]);
            if(!badge){
                continue;
            }
            const img = document.createElement('img');
            img.classList.add('chat_badge');
            img.src = badge.image_url_1x;
            img.srcset = `${badge.image_url_1x} 1x, ${badge.image_url_2x} 2x, ${badge.image_url_4x} 4x`;

            s.appendChild(img);
        }
        return s;
    }

    private render_author(){
        let author_span = document.createElement('span');
        let chat_author_disp = document.createElement('span');
        let chat_author_login = document.createElement('span');
        let chat_msg_separator = document.createElement('span');

        chat_author_disp.classList.add('chat_author_disp');
        chat_author_login.classList.add('chat_author_login');

        chat_msg_separator.classList.add('chat_message_separator');
        chat_msg_separator.textContent = ': ';

        author_span.classList.add('author');

        chat_author_disp.textContent = this.disp_name;
        author_span.appendChild(chat_author_disp);

        if(this.login_name && this.login_name !== this.disp_name.toLowerCase()){
            chat_author_login.textContent = ` (${this.login_name})`;
            author_span.appendChild(chat_author_login);
        }

        const chatColor = new ChatColor();
        author_span.style.color = chatColor.getReadableColor(this.login_name, this.color);

        if(this.messge_type !== 'action'){
            author_span.appendChild(chat_msg_separator);
        }else{
            chat_msg_separator.textContent = ' ';
        }
        author_span.appendChild(chat_msg_separator);
        return author_span;
    }

    private render_message(){
        let message = this.text;
        let chat_span = document.createElement('span');
        const isDarkTheme = localStorage.getItem('theme') === 'dark_theme' ? true : false;

        chat_span.classList.add('chat_message');

        if(this.messge_type === 'action'){
            chat_span.classList.add('italic');
        }
        if(this.msg_id === 'highlighted-message'){
            chat_span.classList.add('highlighted-message');
        }

        let words = message.split(' ');
        let seps = []; // 링크, 이모티콘을 기준으로 message 를 나누어야 할 인덱스 위치 배열.
        let emote_last_index = 0;

        const emote_map = this.emoteToMap();
        const emote_id_map = new Map();

        // message 문자열을 공백으로 나눈 다음 이모티콘, 링크와 일반 텍스트를 구분하는 seps 배열을 만듬.
        words.forEach((w, i)=>{
            const isCheer = this.isCheermote(w) && this.bits;
            let start = 0;
            let end = 0;
            let cur_idx = ''; // message 에서 word 에 해당하는 부분의 시작 인덱스 - 끝 인덱스.

            if(i === 0){
                start = i;
                end = w.length - 1;
                emote_last_index = end;
            }else{
                start = emote_last_index + 2;
                end = emote_last_index + w.length + 1;
                emote_last_index = end;
            }
            cur_idx = `${start}-${end}`;

            const emote_obj = this.emoteset.get(w); // this.self = true;
            const emote_id = emote_map.get(cur_idx); // this.self = false;

            let eid;

            if(emote_obj){
                eid = emote_obj.id;
            }else if(emote_id){
                eid = emote_id;
            }
            const isEmote = this.emoteset.get(w) || emote_map.get(cur_idx);

            if(isEmote){
                emote_id_map.set(w, eid);
            }

            let link_idx = this.getLinkStartIdxArr(w);

            if(link_idx.length !== 0){
                seps.push(start, ...link_idx, end + 1);
            }

            if(isEmote || isCheer){
                seps.push(start, end + 1);
            }
        });
        seps.sort((a, b) => a - b);

        const msg_frag = this.splitOn(message, ...seps);

        for(let m of msg_frag){
            if(m === '') continue;

            const emote_id = emote_id_map.get(m);

            if(emote_id_map.get(m)){
                chat_span.appendChild(this.getEmoteTag(emote_id));
            }else if(this.isLink(m)){
                chat_span.appendChild(this.getLinkAnchor(m));
            }else if(this.isCheermote(m) && this.bits){
                let s = document.createElement('span');

                const exp = /[0-9]+$/;
                const bits = parseInt(m.match(exp)[0]);
                const prefix = m.replace(exp, '');
                const min_bits = this.getMinBits(bits);
                const tier = this.getTierByMinBits(prefix, min_bits);
                const links = isDarkTheme ? tier.images.dark.animated : tier.images.light.animated;
                const tier_color = tier.color;

                s.classList.add('bits_amount');
                s.style.color = tier_color;
                s.textContent = bits.toString();

                chat_span.appendChild(this.getCheermoteTag(links[1], links[2], links[3]));
                chat_span.appendChild(s);
            }else{
                let s = document.createElement('span');
                s.textContent = m;
                chat_span.appendChild(s);
            }
        }
        
        return chat_span;
    }

    private getEmoteTag(emote_id) {
        let div = document.createElement('div');
        let img = document.createElement('img');
        let emote_link = `https://static-cdn.jtvnw.net/emoticons/v2/${emote_id}/default/dark`;

        div.classList.add('emoticon_container');
        img.classList.add('emoticon');

        img.src = emote_link + '/1.0';
        img.srcset = `${emote_link}/1.0 1x, ${emote_link}/2.0 2x, ${emote_link}/3.0 4x`;

        div.appendChild(img);
        return div;
    }
    private getCheermoteTag(...links){
        let div = document.createElement('div');
        let img = document.createElement('img');

        div.classList.add('emoticon_container');
        img.classList.add('emoticon');

        img.src = links[0];
        img.srcset = `${links[0]} 1x, ${links[1]} 2x, ${links[2]} 4x`;

        div.appendChild(img);
        return div;
    }
    private getLinkAnchor(link_text) {
        const a = document.createElement('a');
        a.href = link_text;
        a.target = '_blank';
        a.rel = 'noreferrer';
        a.textContent = link_text;
        return a;
    }

    private getTierByMinBits(prefix: string, min_bits: number) {
        const tiers = this._cheermotes.get(prefix);

        for (let t of tiers) {
            if (min_bits === t.min_bits) {
                return t;
            }
        }
    }
    private getMinBits(bits: number) {
        let min_bits = 0;
        if(bits >= 1 && bits <= 99){
            min_bits = 1;
        }else if(bits >= 100 && bits <= 999){
            min_bits = 100;
        }else if(bits >= 1000 && bits <= 4999){
            min_bits = 1000;
        }else if(bits >= 5000 && bits <= 9999){
            min_bits = 5000;
        }else if(bits >= 10000){
            min_bits = 10000;
        }
        return min_bits;
    }

    private splitOn = (slicable, ...indices) => [0, ...indices].map((n, i, m) => slicable.slice(n, m[i + 1]));

    private emoteToMap() {
        const map = new Map();

        for (var i in this.emotes) {
            var e = this.emotes[i];
            for (var j in e) {
                map.set(e[j], i);
            }
        }
        return map;
    }

    private isLink(link_text) {
        return exp.test(link_text);
    }
    private getLinkStartIdxArr(link_text) {
        const matches = link_text.match(exp);
        const arr = [];
        
        if(!matches) return arr;
        matches.forEach(m => {
            const idx = link_text.indexOf(m);
            arr.push(idx, idx + m.length);
        });
        return arr;
    }

    private isCheermote(cheer_text) {
        const exp = /[A-Za-z0-9]+([0-9]+)$/;
        return exp.test(cheer_text);
    }

    private render_time(){
        let date: Date;
        let hours: string ,minutes: string;
        let time_span = document.createElement('span');
        
        if(this.tmi_send_ts){
            date = new Date(parseInt(this.tmi_send_ts));
        }else{
            date = new Date();
        }

        hours = ((date.getHours() + 11) % 12 + 1).toString();
        minutes = date.getMinutes().toString();

        // hours = hours.length === 1 ? '0' + hours : hours;
        minutes = minutes.length === 1 ? '0' + minutes : minutes;

        time_span.textContent = hours + ':' + minutes;
        time_span.classList.add('chat_sent_ts');

        return time_span;
    }
}

export {Chat};
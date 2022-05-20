import { Badges, Userstate } from "tmi.js";
import { badge_info, Twitch_Api } from "../twitch_api";
import { ChatColor, color_list } from '../chatColor';
import { Filter } from "../filter";

const linkRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;


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
    replay: boolean;
    replay_chat_offset: number;

    filter: Filter;

    cb_info?: Map<string, badge_info>; // channel badge info.
    gb_info?: Map<string, badge_info>; // global badge info.
    emoteset: Map<string, any>;

    constructor(text: string, userstate: Userstate, self: boolean, tapi: Twitch_Api, filter: Filter, replay_chat_offset?: number, replay?: boolean){
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
        this._cheermotes = tapi.cheermotes || new Map();
        this.self = self;
        this.filter = filter;
        this.cb_info = tapi.channel_badges;
        this.gb_info = tapi.global_badges;
        this.emoteset = tapi.emote_sets;
        this.replay = replay;
        this.replay_chat_offset = replay_chat_offset;
    }

    checkFilter(){
        return this.filter.checkFilterWithValues(this.badges_raw, this.text, this.login_name, this.disp_name);
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
        // const isDarkTheme = localStorage.getItem('theme') === 'dark_theme' ? true : false;

        chat_span.classList.add('chat_message');

        if(this.messge_type === 'action'){
            chat_span.classList.add('italic');
        }
        if(this.msg_id === 'highlighted-message'){
            chat_span.classList.add('highlighted-message');
        }

        const links = this.resolveLink(message);
        const motes = this.resolveMotes(message);

        const objectInfo = [...links, ...motes];

        objectInfo.sort((a, b) => a.idx[0] - b.idx[0]);

        if(objectInfo.length === 0){
            chat_span.appendChild(this.getTextTag(message));
        }

        for(let i = 0; i < objectInfo.length; i++){
            const info = objectInfo[i];
            
            if(i === 0 && info.idx[0] !== 0){
                chat_span.appendChild(this.getTextTag(message.substring(0, info.idx[0]))); // 6, 0
            }

            if(info.type === 'emote'){
                chat_span.appendChild(this.getEmoteTag(info.value));
            }else if(info.type === 'cheermote'){
                let span = document.createElement('span');

                const prefix = info.value[0];
                const bits = info.value[1];

                const min_bits = this.getMinBits(bits);
                const tier = this.getTierByMinBits(prefix, min_bits);
                // const links = isDarkTheme ? tier.images.dark.animated : tier.images.light.animated;
                const links = tier.images.dark.animated;
                const tier_color = tier.color;

                span.classList.add('bits_amount');
                span.style.color = tier_color;
                span.textContent = bits.toString();

                chat_span.appendChild(this.getCheermoteTag(links[1], links[2], links[3]));
                chat_span.appendChild(span);
            }else if(info.type === 'link'){
                const msg = message.substring(info.idx[0], info.idx[1] + 1);
                chat_span.appendChild(this.getLinkAnchor(msg));
            }

            if(objectInfo.length - 1 === i){
                if(info.idx[1] < message.length - 1){
                    chat_span.appendChild(this.getTextTag(message.substring(info.idx[1] + 1, message.length))); // 6, 0
                }
            }else{
                const info_next = objectInfo[i + 1];
                chat_span.appendChild(this.getTextTag(message.substring(info.idx[1] + 1, info_next.idx[0])));
            }
        }
        return chat_span;
    }

    private getTextTag(text){
        let span = document.createElement('span');
        span.textContent = text;
        return span;
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

    private resolveMotes(message){
        const res = [];
        const words = message.split(' ');
        let lastWordEndIdx = 0;

        const emote = this.emotes || {};
        const emoteEmpty = Object.keys(emote).length === 0 && Object.getPrototypeOf(emote) === Object.prototype;

        if(!emoteEmpty){
            Object.keys(emote).forEach(e => {
                for(let idx of emote[e]){
                    res.push({type : 'emote', value : e, idx : idx.split('-').map(e => parseInt(e))});
                }
            });
        }

        for (let w = 0; w < words.length; w++) {
            const word = words[w];
            const idx = [lastWordEndIdx, lastWordEndIdx + word.length - 1];

            const cheer = this.checkCheermote(word);
            if(this.bits && cheer.length !== 0){
                res.push({type : 'cheermote', value : cheer, idx : idx});
            }else if(emoteEmpty && this.emoteset.has(word)){
                const emote_id = this.emoteset.get(word).id;
                res.push({type : 'emote', value : emote_id, idx : idx});
            }
            lastWordEndIdx = lastWordEndIdx + word.length + 1;
        }
        return res;
    }

    private resolveLink(link_text) {
        const matches = link_text.matchAll(linkRegex);
        const arr = [];
        
        for (const match of matches) {
            arr.push({type : 'link', idx : [match.index, match.index + match[0].length - 1]});
        }
        return arr;
    }

    private checkCheermote(cheerText){
        const bits_regex = /([1-9]+[0-9]*)$/;
        const cheer = cheerText.split(bits_regex);

        return this._cheermotes.has(cheer[0]) ? [cheer[0], cheer[1]] : [];
    }

    private render_time(){
        let date: Date;
        let hours: string, minutes: string;
        let time_span = document.createElement('span');
        
        if(this.tmi_send_ts){
            date = new Date(parseInt(this.tmi_send_ts));
        }else if(this.replay){
            date = new Date(0);
            date.setSeconds(this.replay_chat_offset);
        }else{
            date = new Date();
        }

        hours = ((date.getHours() + 11) % 12 + 1).toString();
        minutes = date.getMinutes().toString();
        minutes = minutes.length === 1 ? '0' + minutes : minutes;

        if(this.replay){
            if(this.replay_chat_offset < 3600){
                time_span.textContent = date.toISOString().substring(14, 19);
            }else{
                time_span.textContent = date.toISOString().substring(11, 19);
            }
        }else{
            time_span.textContent = hours + ':' + minutes;
        }
        
        time_span.classList.add('chat_sent_ts');

        return time_span;
    }
}

export {Chat};
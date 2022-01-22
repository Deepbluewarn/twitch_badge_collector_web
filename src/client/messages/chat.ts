import { Badges, Userstate } from "tmi.js";
import { badge_info } from "../twitch_api.js";


class Chat{
    badges: Badges;
    badges_raw: string;
    login_name: string;
    disp_name: string;
    color: string;
    text: string;
    messge_type: string;
    tmi_send_ts: string;
    id: string;

    cb_info?: Map<string, badge_info>; // channel badge info.
    gb_info?: Map<string, badge_info>; // global badge info.

    constructor(text: string, tags: Userstate, channel_badge_info: Map<string, badge_info>, global_badge_info: Map<string, badge_info>){
        this.badges = tags.badges;
        this.badges_raw = tags["badges-raw"];
        this.login_name = tags.username || tags.login;
        this.disp_name = tags["display-name"];
        this.color = tags.color;
        this.text = text;
        this.messge_type = tags['message-type']; // chat, action..
        this.tmi_send_ts = tags['tmi-sent-ts'];
        this.id = tags.id;

        this.cb_info = channel_badge_info;
        this.gb_info = global_badge_info;
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

        chat_container.classList.add('chat');
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
            const img = document.createElement('img');
            img.classList.add('chat_badge');
            let badge = channel_badges.get(badges[b]);
            if(!badge){
                badge = global_badges.get(badges[b]);
            }
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

        console.log(`disp : ${this.disp_name}, login : ${this.login_name}`);
        if(this.login_name && this.login_name !== this.disp_name.toLowerCase()){
            chat_author_login.textContent = ` (${this.login_name})`;
            author_span.appendChild(chat_author_login);
        }
        if(this.color){
            author_span.style.color = this.color;
        }
        if(this.messge_type !== 'action'){
            author_span.appendChild(chat_msg_separator);
        }
        return author_span;
    }

    private render_message(){
        let chat_span = document.createElement('span');

        chat_span.classList.add('chat_message');
        if(this.messge_type === 'action'){
            chat_span.classList.add('italic');
        }
        chat_span.textContent = this.text;

        return chat_span;
    }

    private render_time(){
        let date: Date;
        let hours: number ,minutes: number;
        let time_span = document.createElement('span');
        
        if(this.tmi_send_ts){
            date = new Date(parseInt(this.tmi_send_ts));
        }else{
            date = new Date();
        }

        hours = ((date.getHours() + 11) % 12 + 1);
        minutes = date.getMinutes();

        time_span.textContent = hours + ':' + minutes;
        time_span.classList.add('chat_sent_ts');

        return time_span;
    }
}

export {Chat};
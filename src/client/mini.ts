import { Twitch_Api } from "./twitch_api";
import { CLIENT_ID } from './auth';
import { Filter } from "./filter";
import { messageList } from "./messageList";
import { Client, Options } from "tmi.js";
import { Etc } from './utils/etc';
import i18n from './i18n/index';
import { BroadcastChannel } from 'broadcast-channel';
import * as chatTools from './chat_tools';
import * as default_client from './client';

const filterChannel = new BroadcastChannel('Filter');
const chatChannel = new BroadcastChannel('Chat');

const chat_list_container = document.getElementById('chat_list_container');
const chat_list_clone = <HTMLDivElement>chat_list_container.getElementsByClassName('chat_list clone')[0];

const urlSearchParams = new URLSearchParams(window.location.search);
const params = Object.fromEntries(urlSearchParams.entries());
const channel = params.channel;
let tbc_messageId = '';
let displayName = '';
let theme = 'light';

const random = Math.floor(1000 + Math.random() * 9000);
const tapi: Twitch_Api = default_client.tapi;
const filter: Filter = default_client.filter;
const msgList: messageList = default_client.msgList;
const client: Client = default_client.client;

tapi.get_global_chat_badges(true).then(badges => {
    tapi.global_badges = badges;
});

client.connect().then(async () => {
    if(!channel) return;
    let user = await tapi.get_users(channel);
    if (user.data.length === 0) {
        msgList.addIRCMessage(null, i18n.t('tmi:channelNotFound', { channel: channel }), true);
        return;
    }
    displayName = user.data[0].display_name;

    let channelBadges = await tapi.get_channel_chat_badges(user.data[0].id, true);
    let cheer = await tapi.get_cheermotes(user.data[0].id);

    tapi.channel_badges = channelBadges;
    tapi.cheermotes = cheer;
});


client.on('connected', (address: string, port: number) => {
    msgList.addIRCMessage(null, i18n.t('tmi:connected'), true);
    const channels = client.getChannels();
    
    if(channels.length === 0){
        client.join(channel).then(() => {
            tapi.current_channel = channel;
        });
    }
});
client.on("join", (channel, username, self) => {
    if(self){
        msgList.addIRCMessage(null, i18n.t('tmi:chatConnected', {channel : Etc.trim_hash(channel)}), true);
    }
});

chat_list_clone.addEventListener("scroll", function () {
    msgList.cloneChatIsAtBottom = chat_list_clone.scrollTop + chat_list_clone.clientHeight >= chat_list_clone.scrollHeight - 40;
}, false);

filterChannel.onmessage = msg => {
    if(!msg.to.includes('wtbc-mini')) return;
    if(!msg.filter){
        msgList.addIRCMessage(null, '필터를 적용하지 못했습니다.', true);
        return;
    }
    filter.filter = Object.fromEntries(msg.filter);
    msgList.addIRCMessage(null, '필터가 업데이트 되었습니다.', true);
}
chatChannel.onmessage = msg => {
    if(msg.type === 'REQUEST_CHATROOM_ID'){
        chatChannel.postMessage({
            type: 'RESPONSE_CHATROOM_ID',
            theme: theme,
            channel: channel,
            displayName: displayName,
            random: random,
        });
    }

    if(msg.type === 'REQUEST_CHAT_LIST'){
        if(msg.id !== `${random}-${channel}`){
            return;
        }
        const se = new XMLSerializer();
        const chatListXML = se.serializeToString(document.getElementsByClassName('chat_list')[0]);

        chatChannel.postMessage({
            type: 'chatList',
            chatListXML: chatListXML
        });
    }
}

window.addEventListener('message', e=> {
    if(e.data.sender !== 'tbc') return;

    for(let d of e.data.body){
        const msgType = d.type;
        const msgValue = d.value;

        if(msgType === 'tbc_messageId'){
            tbc_messageId = msgValue;
        }
        if(!tbc_messageId || tbc_messageId === '') return;
        if(d.tbc_messageId !== tbc_messageId) return;

        if(msgType === 'language'){
            i18n.changeLanguage(msgValue);
        }else if(msgType === 'font_size'){
            chatTools.setFontSize(`font_${msgValue}`);
        }else if(msgType === 'theme'){
            theme = msgValue;
            chatTools.setTheme(msgValue);
        }else if(msgType === 'filter'){
            if(!msgValue){
                msgList.addIRCMessage(null, '필터를 적용하지 못했습니다.', true);
                return;
            }
            filter.filter = Object.fromEntries(msgValue);
        }
    }
});
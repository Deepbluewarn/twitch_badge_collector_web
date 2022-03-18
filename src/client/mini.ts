import { Twitch_Api } from "./twitch_api";
import { CLIENT_ID } from './auth';
import { Filter } from "./filter";
import { messageList } from "./messageList";
import { Client, Options } from "tmi.js";
import { Etc } from './utils/etc';
import i18n from './i18n/index';
import { ChatColor } from "./chatColor";

const filterChannel = new BroadcastChannel('Filter');

const chat_list_container = document.getElementById('chat_list_container');
const chat_list_clone = <HTMLDivElement>chat_list_container.getElementsByClassName('chat_list clone')[0];

const urlSearchParams = new URLSearchParams(window.location.search);
const params = Object.fromEntries(urlSearchParams.entries());
const messageId = params.messageId;
const channel = params.channel;
const language = params.language || 'en';
const font_size = params.font_size || 'default';
const theme = params.theme || 'light';

i18n.changeLanguage(language);
setFontSize(`font_${font_size}`);
setTheme(theme);

const tapi: Twitch_Api = new Twitch_Api(CLIENT_ID);
const filter: Filter = new Filter(tapi);
const msgList: messageList = new messageList(filter, tapi, false);

const random = Math.floor(1000 + Math.random() * 9000);
let tmi_client_obj: Options = {
    options: {
        clientId: CLIENT_ID,
        skipUpdatingEmotesets: true,
        skipMembership: true
    },
    connection: { reconnect: true, secure: true },
    identity: { username: `justinfan${random}`, password: '' }
};
let client: Client = new Client(tmi_client_obj);

function setTheme(theme: string){
    let th = '';
    if(theme === 'dark'){
        th = 'dark_theme';
    }else{
        th = 'light_theme';
    }
    document.documentElement.className = th;
    updateChatColor();
}
function updateChatColor(){
    const chatColor = new ChatColor();

    const chatListContainer = document.getElementById('chat_list_container');
    const chat = chatListContainer.getElementsByClassName('chat');

    for (let c of chat) {
        const author = <HTMLSpanElement>c.getElementsByClassName('author')[0];
        if (!author) continue;

        const username = c.classList.item(1);
        author.style.color = chatColor.getReadableColor(username, null);
    }
}

function setFontSize(id: string){
    if(!id) id = 'font_default';
    let cls = '';

    if(id === 'font_small'){
        cls = 'font_size_0';
    }else if(id === 'font_big'){
        cls = 'font_size_2';
    }else if(id === 'font_bigger'){
        cls = 'font_size_3';
    }else{
        cls = 'font_size_1';
    }
    
    const chat_room = document.getElementById('chat_room');

    for(let cls of chat_room.classList){
        if(/font_size_[0-9]$/.test(cls)){
            chat_room.classList.remove(cls);
        }
    }
    chat_room.classList.add(cls);
}

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

client.on('message', (channel, userstate, message, self) => {
    msgList.addChatMessage(channel, message, userstate, self);
});
client.on("subscription", (channel, username, method, message, userstate) => {
    msgList.addUserNoticeMessage(channel, userstate, message);
});
client.on("cheer", (channel, userstate, message) => {
    msgList.addChatMessage(channel, message, userstate, false);
});
client.on("giftpaidupgrade", (channel, username, sender, userstate) => {
    msgList.addUserNoticeMessage(channel, userstate, userstate.message);
});
client.on("anongiftpaidupgrade", (channel, username, userstate) => {
    msgList.addUserNoticeMessage(channel, userstate, userstate.message);
});
client.on("submysterygift", (channel, username, numbOfSubs, methods, userstate) => {
    msgList.addUserNoticeMessage(channel, userstate, userstate.message);
});
client.on("resub", (channel, username, months, message, userstate, methods) => {
    msgList.addUserNoticeMessage(channel, userstate, message);
});
client.on('primepaidupgrade', (channel, username, methods, userstate) => {
    msgList.addUserNoticeMessage(channel, userstate, userstate.message);
});
client.on("subgift", (channel, username, streakMonths, recipient, methods, userstate) => {
    msgList.addUserNoticeMessage(channel, userstate, userstate.message);
});
client.on("emotesets", (sets, obj) => {
    let sets_arr = sets.split(',');
    for (let i = 0; i < sets_arr.length; i = i + 25) {
        tapi.get_emote_sets(sets_arr.splice(0, 25));
    }
});

chat_list_clone.addEventListener("scroll", function () {
    msgList.cloneChatIsAtBottom = chat_list_clone.scrollTop + chat_list_clone.clientHeight >= chat_list_clone.scrollHeight - 40;
}, false);

filterChannel.onmessage = event => {
    const data = event.data;
    
    if(!data.to.includes('wtbc-mini')) return;
    filter.filter = Object.fromEntries(data.filter);
}

window.addEventListener('message', e=> {
    if(!messageId) return;
    if(e.data.messageId !== messageId) return;

    const data = e.data;
    const msgType = data.type;
    const msgValue = data.value;
    
    if(msgType === 'language'){
        i18n.changeLanguage(language);
    }else if(msgType === 'font_size'){
        setFontSize(`font_${msgValue}`);
    }else if(msgType === 'theme'){
        setTheme(msgValue);
    }else if(msgType === 'filter'){
        filter.filter = Object.fromEntries(data.value);
    }
});
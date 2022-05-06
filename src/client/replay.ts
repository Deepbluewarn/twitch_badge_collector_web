import { CLIENT_ID } from "./auth";
import { Filter } from "./filter";
import { messageList } from "./messageList";
import { Twitch_Api } from "./twitch_api";
import { BroadcastChannel } from 'broadcast-channel';
import i18n from './i18n/index';
import * as chatTools from './chat_tools';

const tapi: Twitch_Api = new Twitch_Api(CLIENT_ID);
const filter: Filter = new Filter(tapi);
const msgList: messageList = new messageList(filter, tapi, false);
const filterChannel = new BroadcastChannel('Filter');

let comments_arr;
let tbc_messageId = '';
let last_chat_time: number;
let chatPlayInterval: number;

let theme = 'light';

tapi.get_global_chat_badges(true).then(badges => {
    tapi.global_badges = badges;
});

function cancelReplayChat(){
    window.clearInterval(chatPlayInterval);
}
function playReplayChat(){
    window.clearInterval(chatPlayInterval);
    chatPlayInterval = window.setInterval(() => {
        if(!Array.isArray(comments_arr)) return;

        last_chat_time = last_chat_time + 1;
    
        comments_arr.filter(c=> c.content_offset_seconds <= last_chat_time).forEach(ce=> {
            addCommentMessage(ce);
            const idx = comments_arr.indexOf(ce);
            if(idx !== -1){
                comments_arr.splice(idx, 1);
            }
        });
    }, 1000);
}
playReplayChat();

function addCommentMessage(comment){
    const user_state = {};
    const badges = {};
    const badges_raw = [];
    const emotes = {};

    if (Array.isArray(comment.message.user_badges)) {
        for (let badge of comment.message.user_badges) {
            badges[badge._id] = badge.version;
            badges_raw.push(`${badge._id}/${badge.version}`);
        }
    }
    if(Array.isArray(comment.message.emoticons)){
        for(let emote of comment.message.emoticons){

            const e = `${emote.begin}-${emote.end}`;

            if(Array.isArray(emotes[emote._id])){
                emotes[emote._id].push(e);
            }else{
                emotes[emote._id] = [e];
            }
        }
    }

    user_state["badges"] = badges;
    user_state["badges-raw"] = badges_raw.join();
    user_state['color'] = comment.message.user_color;
    user_state['display-name'] = comment.commenter.display_name;
    user_state['user-id'] = comment.commenter._id;
    user_state['username'] = comment.commenter.name;
    user_state['emotes'] = emotes;

    if(comment.message.is_action) {
        user_state['message-type'] = 'action';
    }else if(comment.message.user_notice_params['msg-id']){
        user_state['message-type'] = comment.message.user_notice_params['msg-id'];
        user_state['system-msg'] = comment.message.body;
        msgList.addUserNoticeMessage(tapi.current_channel, user_state, '');
        return;
    }
    msgList.addChatMessage(tapi.current_channel, comment.message.body, user_state, false, comment.content_offset_seconds, true);
}

async function receiveMessage(event) {
    const data = event.data;
    
    if(data.sender !== 'tbc') return;

    for (let d of data.body) {
        const msgType = d.type;
        const msgValue = d.value;

        if (msgType === 'tbc_messageId') {
            tbc_messageId = msgValue;
        }
        if (!tbc_messageId || tbc_messageId === '') return;
        if(d.tbc_messageId !== 'omitted'){
            if((d.tbc_messageId !== tbc_messageId)){
                return;
            }
        }

        if (msgType === 'wtbc-replay-init') {
            const url = new URL(d.url);
            const video_id = url.pathname.split('/')[2];
            const video_info = await tapi.get_videos(video_id);

            if (video_info.data.length === 0) return;

            getChannelInfo(video_info.data[0].user_id);

            tapi.current_channel = video_info.data[0].user_login;
        }
        if (msgType === 'wtbc-replay') {
            // wtbc-replay 는 content scripts 가 아닌 
            // 트위치 사이트에 직접 삽입된 스크립트에서 보내기 때문에 
            // tbc_messageId 가 없음.

            const url = new URL(d.url);

            url.searchParams.get('content_offset_seconds')
            url.searchParams.get('cursor');

            if(url.searchParams.has('cursor')){
            }else if(url.searchParams.has('content_offset_seconds')){
                msgList.clearCopiedChat();
            }
            comments_arr = d.body.comments;
    
            return;
        }
        if(msgType === 'wtbc-player-playing'){
            last_chat_time = msgValue;
            playReplayChat();
        }
        if(msgType === 'wtbc-player-paused'){
            last_chat_time = msgValue;
            cancelReplayChat();
        }
        if(msgType === 'language'){
            i18n.changeLanguage(msgValue);
        }
        if(msgType === 'font_size'){
            chatTools.setFontSize(`font_${msgValue}`);
        }
        if(msgType === 'theme'){
            theme = msgValue;
            chatTools.setTheme(msgValue);
        }
        if(msgType === 'filter'){
            if(!msgValue){
                msgList.addIRCMessage(null, '필터를 적용하지 못했습니다.', true);
                return;
            }
            filter.filter = Object.fromEntries(msgValue);
        }
        if (msgType === 'filter') {
            if (!msgValue) {
                msgList.addIRCMessage(null, '필터를 적용하지 못했습니다.', true);
                return;
            }
            filter.filter = Object.fromEntries(msgValue);
        }
    }
}
const chat_list_container = document.getElementById('chat_list_container');
const chat_list_clone = <HTMLDivElement>chat_list_container.getElementsByClassName('chat_list clone')[0];

chat_list_clone.addEventListener("scroll", function () {
    msgList.cloneChatIsAtBottom = chat_list_clone.scrollTop + chat_list_clone.clientHeight >= chat_list_clone.scrollHeight - 40;
}, false);

window.addEventListener("message", receiveMessage, false);

async function getChannelInfo(channel_id) {
    let channelBadges = await tapi.get_channel_chat_badges(channel_id, true);
    let cheer = await tapi.get_cheermotes(channel_id);

    tapi.channel_badges = channelBadges;
    tapi.cheermotes = cheer;
}

filterChannel.onmessage = msg => {
    if (!msg.to.includes('wtbc-replay')) return;
    if (!msg.filter) {
        msgList.addIRCMessage(null, '필터를 적용하지 못했습니다.', true);
        return;
    }
    filter.filter = Object.fromEntries(msg.filter);
    msgList.addIRCMessage(null, '필터가 업데이트 되었습니다.', true);
}

import { CLIENT_ID } from "./auth";
import { Filter } from "./filter";
import { messageList } from "./messageList";
import { Twitch_Api } from "./twitch_api";
import { BroadcastChannel } from 'broadcast-channel';
import i18n from './i18n/index';
import * as chatTools from './chat_tools';
import { Etc } from "./utils/etc";

const tapi: Twitch_Api = new Twitch_Api(CLIENT_ID);
const filter: Filter = new Filter(tapi);
const msgList: messageList = new messageList(filter, tapi, false);
const filterChannel = new BroadcastChannel('Filter');

let comments_arr = [];
let tbc_messageId = '';
let currentPlayId: string;
let videoType: string;
let content_offset_seconds: number; // 클립 영상 채팅 시간 보정값.

tapi.get_global_chat_badges(true).then(badges => {
    tapi.global_badges = badges;
});

function updateReplayChat(time: number){
    let latest_message_id = '';

    if(videoType === 'clip'){
        time = time + content_offset_seconds;
    }

    for (let cs = 0; cs < comments_arr.length; cs++) {
        let cmt = comments_arr[cs];

        if (!Array.isArray(cmt)) return;

        let commentFiltered = cmt.filter((c, i) => {
            if (c.content_offset_seconds <= time) {
                if (!c.tbc_id || c.tbc_id !== currentPlayId) {
                    cmt[i].tbc_id = currentPlayId;
                    return true;
                }
            }
        });

        commentFiltered.forEach(ce => {
            if (latest_message_id !== ce._id) {
                addCommentMessage(ce);
            }
            latest_message_id = ce._id;
        });
    }
}

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

async function updateChannelInfo(videoType: string, url: string){
    const urlObj = new URL(url);
    let res, id;

    if(videoType === 'clip'){
        let channel = urlObj.pathname.split('/')[1];
        res = await tapi.get_users(channel);
        id = res.data[0].id;
    }else if(videoType === 'replay'){
        const video_id = urlObj.pathname.split('/')[2];
        res = await tapi.get_videos(video_id);
        id = res.data[0].user_id;
    }
    if (res.data.length === 0) return;
    
    getChannelInfo(id);

    tapi.current_channel = res.data[0].user_login;
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
            videoType = msgValue.type;
            updateChannelInfo(videoType, d.url);
        }
        if (msgType === 'wtbc-replay') {
            const url = new URL(d.url);

            if(url.searchParams.has('cursor')){

            }else if(url.searchParams.has('content_offset_seconds')){
                msgList.clearCopiedChat();
                
                if(!content_offset_seconds){
                    content_offset_seconds = parseInt(url.searchParams.get('content_offset_seconds'));
                }

                currentPlayId = Etc.getRandomString();
                comments_arr = [];
            }
            comments_arr.push(d.body.comments);

            if(comments_arr.length > 2){
                comments_arr.shift();
            }
            return;
        }
        if(msgType === 'wtbc-player-time'){
            updateReplayChat(msgValue.time);
        }
        if(msgType === 'language'){
            i18n.changeLanguage(msgValue);
        }
        if(msgType === 'font_size'){
            chatTools.setFontSize(`font_${msgValue}`);
        }
        if(msgType === 'theme'){
            chatTools.setTheme(msgValue);
        }
        if(msgType === 'filter'){
            if(!msgValue){
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

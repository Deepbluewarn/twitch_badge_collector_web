import { CLIENT_ID } from "./auth";
import { Filter } from "./filter";
import { messageList } from "./messageList";
import { Twitch_Api } from "./twitch_api";
import { BroadcastChannel } from 'broadcast-channel';
import i18n from './i18n/index';
import * as chatTools from './chat_tools';
import { Etc } from "./utils/etc";
import * as default_client from './client';

const filterChannel = new BroadcastChannel('Filter');

const tapi: Twitch_Api = default_client.tapi;
const filter: Filter = default_client.filter;
const msgList: messageList = default_client.msgList;

let comments_arr = [];
let tbc_messageId = '';
let currentPlayId: string = Etc.getRandomString();
let videoType: string;
let clip_offset;
let currPlayerTime = 0;
let commentReceived = false;

let latest_direction = '';

tapi.get_global_chat_badges(true).then(badges => {
    tapi.global_badges = badges;
});

function updateReplayChat(time: number) {
    comments_arr.forEach(cmt => {
        const data = cmt.data;
        const edges = data.video.comments.edges;
        const commentFiltered = edges.filter((e, i) => {
            const node = e.node;
            let contentOffsetSeconds = node.contentOffsetSeconds;

            if (contentOffsetSeconds <= time) {
                if (!e.tbc_id || e.tbc_id !== currentPlayId) {
                    e.tbc_id = currentPlayId;
                    return true;
                }
            }
        });

        commentFiltered.forEach(e => {
            addCommentMessage(e);
        });
    });
}

function addCommentMessage(edge) {
    const node = edge.node;
    const commenter = node.commenter;
    const commenterId = node.commenter.id;
    const message = node.message;
    const userBadges = message.userBadges;
    const contentOffsetSeconds = node.contentOffsetSeconds;
    const messageFragments = message.fragments;
    const userColor = message.userColor;
    const messageId = node.id;
    const displayName = commenter.displayName;
    const login = commenter.login;
    const user_state = {};

    let badges = [];
    let badgesRaw;

    for (let badge of userBadges) {
        badges.push(`${badge.setID}/${badge.version}`)
    }

    badgesRaw = badges.join(',');

    let messages = [];
    let messageText: string;
    const emotes = {};

    let idx = 0;

    for (let msgfrag of messageFragments) {
        const emote = msgfrag.emote;
        const text = msgfrag.text;

        idx = idx + text.length;

        if (emote) {
            if (emotes![emote.emoteID]) {
                emotes![emote.emoteID].push(`${emote.from}-${idx - 1}`);
            } else {
                emotes![emote.emoteID] = [`${emote.from}-${idx - 1}`];
            }
        }

        messages.push(text);
    }

    messageText = messages.join('');

    user_state["badges-raw"] = badgesRaw;
    user_state['color'] = userColor;
    user_state['display-name'] = displayName;
    user_state['username'] = login;
    user_state['user-id'] = commenterId;
    user_state['emotes'] = emotes;

    msgList.addChatMessage(tapi.current_channel, messageText, user_state, false, contentOffsetSeconds, true);
}

async function updateChannelInfo(videoType: string, url: string) {
    const urlObj = new URL(url);
    let res, id;

    if (videoType === 'clip') {
        let channel = urlObj.pathname.split('/')[1];
        let clip_id = urlObj.pathname.split('/')[3];

        const clip_res = await tapi.get_clips(clip_id);

        if(clip_res.data.length > 0){
            clip_offset = clip_res.data[0].vod_offset;
        }

        res = await tapi.get_users(channel);
        id = res.data[0].id;
    } else if (videoType === 'replay') {
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

    if (data.sender !== 'tbc') return;

    for (let d of data.body) {
        const msgType = d.type;
        const msgValue = d.value;

        if (msgType === 'tbc_messageId') {
            tbc_messageId = msgValue;
        }
        if (!tbc_messageId || tbc_messageId === '') {
            if (d.tbc_messageId !== 'omitted') {
                return;
            }
        }
        if (d.tbc_messageId !== 'omitted') {
            if (d.tbc_messageId !== tbc_messageId) {
                return;
            }
        }

        if (msgType === 'wtbc-replay-init') {
            videoType = msgValue.type;
            updateChannelInfo(videoType, d.url);
        }
        if (msgType === 'wtbc-replay') {
            if (latest_direction === 'backward') {
                latest_direction = '';
                currentPlayId = Etc.getRandomString();
                msgList.clearCopiedChat();
            }

            if(!commentReceived){
                const noComments = document.getElementsByClassName('no_comments')[0];
                noComments.classList.add('hidden_visibility');
            }

            comments_arr.push(msgValue);

            if (comments_arr.length > 2) {
                comments_arr.shift();
            }

            return;
        }
        if (msgType === 'wtbc-player-time') {
            let time = msgValue.time;

            if (Math.abs(time - currPlayerTime) >= 1) {
                if (time - currPlayerTime < 0) {
                    latest_direction = 'backward';
                }
            }
            if(clip_offset){
                time = time + clip_offset;
            }

            currPlayerTime = time;

            updateReplayChat(time);
        }
        if (msgType === 'language') {
            i18n.changeLanguage(msgValue);
        }
        if (msgType === 'font_size') {
            chatTools.setFontSize(`font_${msgValue}`);
        }
        if (msgType === 'theme') {
            chatTools.setTheme(msgValue);
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

parent.postMessage({
    sender: 'wtbc',
    body: 'READY'
}, '*');

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

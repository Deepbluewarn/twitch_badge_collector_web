import { Client, Options } from "tmi.js";
import { CLIENT_ID } from "./auth";
import { Filter } from "./filter";
import { messageList } from "./messageList";
import { Twitch_Api } from "./twitch_api";

const random = Math.floor(1000 + Math.random() * 9000);

export const tmi_client_obj: Options = {
    options: {
        clientId: CLIENT_ID,
        skipUpdatingEmotesets: true,
        skipMembership: true
    },
    connection: { reconnect: true, secure: true },
    identity: { username: `justinfan${random}`, password: '' }
};

export const tapi: Twitch_Api = new Twitch_Api(CLIENT_ID);
export const filter: Filter = new Filter(tapi);
export const client: Client = new Client(tmi_client_obj);
export const msgList: messageList = new messageList(filter, tapi, false);

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

client.on("raw_message", (messageCloned, message) => {

    const channel = message.params[0];
    const textMessage = message.params[1];
    const userstate = message.tags;

    if(message.tags['msg-id'] === 'announcement'){
        msgList.addAnnouncementMessage(channel, userstate, textMessage);
    }
});
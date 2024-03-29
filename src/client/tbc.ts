import { Client, UserNoticeState, Options } from 'tmi.js';
import Swal from 'sweetalert2';
import * as swal_setting from './swal_setting';
import i18n from './i18n/index';
import { Auth, CLIENT_ID } from './auth';
import { Twitch_Api } from './twitch_api'

import { UserColorMap } from './usercolormap';

import { Filter } from './filter';
import { ChatColor } from './chatColor';
import { Etc } from './utils/etc';
import { messageList } from './messageList';

import { BroadcastChannel } from 'broadcast-channel';
import * as default_client from './client';

const APP_TITLE = 'Twitch Badge Collector';
const twitch_login_btn = document.getElementById('twitch-login__btn');
const twitch_logout_btn = document.getElementById('login_btn_icon');
const auth_info = document.getElementById('auth_info');
const user_setting = document.getElementById('user_setting');
const setting_btn = document.getElementById('setting_btn');
const dark_mode_btn = document.getElementById('dark_mode_btn');
const reverse_chat_btn = document.getElementById('reverse_chat_btn');
const hidePlayer_btn = document.getElementById('hidePlayer');

const sidebar = document.getElementById('sidebar');
const sidebar_btn = document.getElementById('sidebar_btn');
const chat_room = document.getElementById('chat_room');
const flwStrCtl = document.getElementById('flw_str_control');
const channel_id_input = <HTMLInputElement>document.getElementById('channel_id');
const channel_connect_btn = <HTMLButtonElement>document.getElementById('connect_channel');

const chat_list_container = document.getElementById('chat_list_container');
const chat_list_origin = <HTMLDivElement>chat_list_container.getElementsByClassName('chat_list origin')[0];
const chat_list_clone = <HTMLDivElement>chat_list_container.getElementsByClassName('chat_list clone')[0];

const chat_text_input = <HTMLInputElement>document.getElementById('chat_text_input');
const chat_text_send_btn = <HTMLButtonElement>document.getElementById('chat_text_send');
const channel_list_container = document.getElementById('channel_list_container');
const recent_list = document.getElementsByClassName('channel_list recent')[0];
const online_list = document.getElementsByClassName('channel_list online')[0];
const setting_container = document.getElementById('setting');
const font_size_examples = document.getElementById('font_size_examples');
const handler = document.getElementById('handler');
const hiddenClassName = 'hidden';
const hiddenVisibilityClassName = 'hidden_visibility';

// First we get the viewport height and we multiple it by 1% to get a value for a vh unit
const vh = window.innerHeight * 0.01;
// Then we set the value in the --vh custom property to the root of the document
document.documentElement.style.setProperty('--vh', `${vh}px`);

const random = Math.floor(1000 + Math.random() * 9000);
const filterChannel = new BroadcastChannel('Filter');
const chatChannel = new BroadcastChannel('Chat');

const Toast = Swal.mixin(swal_setting.setting_def);

let followed_streams_after: string = '';
let LAST_JOIN_TIME: number = 0;

let container_ratio = localStorage.getItem('ratio') || 0;
let chat_order_reversed: boolean = localStorage.getItem('ratio') === 'true';
let channelDisplayName = '';

const font_setting = localStorage.getItem('fontSize');
setFontSize(font_setting);
setLanguage(localStorage.getItem('language'));

setCurrentTheme();

change_container_ratio(parseInt(localStorage.getItem('ratio')) || 30);

setPageLanguage();

const auth = new Auth();
const tapi: Twitch_Api = default_client.tapi;
let localFilter = JSON.parse(localStorage.getItem('filter'));

let filter: Filter;

if (localFilter) {
	filter = new Filter(tapi, Object.fromEntries(localFilter));
} else {
	filter = new Filter(tapi);
}
// const filter: Filter = new Filter(tapi, Object.fromEntries(localFilter));
const msgList: messageList = new messageList(filter, tapi, true);

let tmi_client_obj: Options = {
	options: {
		clientId: CLIENT_ID,
		skipUpdatingEmotesets: true,
		skipMembership: true
	},
	connection: { reconnect: true, secure: true },
	identity: { username: '', password: '' }
};
let player: any = null;
const client: Client = default_client.client;

document.addEventListener('DOMContentLoaded', () => {
	// let Twitch: any;
	// var player = new (window as any).Twitch.Player('twitch_player', {width: '100%', height: '100%', channel: 'nanayango3o'});
	
	// player.setVolume(0.5);
});


function connectChatServer(username: string, password: string) {

	const random = Math.floor(1000 + Math.random() * 9000);

	default_client.tmi_client_obj.identity.username = password ? username : 'justinfan' + random;
	default_client.tmi_client_obj.identity.password = password ? `oauth:${password}` : '';

	return client.connect().then(() => {
		return true;
	}).catch(err => {
		return false;
	});
}

function init_user_info(user) {
	const user_info = document.getElementById('user_info');
	const user_profile_img = <HTMLImageElement>document.getElementById('user_profile_img');
	const user_disp_name = document.getElementById('user_disp_name');

	const login_btn_container = document.getElementById('login_btn_container');
	login_btn_container.classList.add(hiddenClassName);

	user_profile_img.src = user.profile_image_url;
	user_disp_name.textContent = user.display_name;
	user_info.classList.remove(hiddenClassName);
}

function updateFollowedStream(user_id: string, after?: string) {
	return tapi.get_followed_streams(user_id, after).then(fs => {
		document.getElementById('followed_online-list').classList.remove(hiddenClassName);

		let fs_data = fs.data;
		const logins = [];

		for (let i = 0; i < fs_data.length; i++) {
			logins.push(fs_data[i].user_login);
		}

		tapi.get_users(...logins).then(users => {
			const userMap = new Map();

			for(let u of users.data){
				userMap.set(u.login, u.profile_image_url);
			}

			const more_btn = document.getElementById('get_more_flw_str');

			if (Etc.isEmpty(fs.pagination)) {
				followed_streams_after = null;
				more_btn.classList.add(hiddenVisibilityClassName);
			} else {
				followed_streams_after = fs.pagination.cursor;
				more_btn.classList.remove(hiddenVisibilityClassName);
			}
	
			const online_list = document.getElementsByClassName('channel_list online')[0];
			
	
			for (let i = 0; i < fs_data.length; i++) {
				add_channel(online_list, fs_data[i].user_name, fs_data[i].user_login, userMap.get(fs_data[i].user_login));
			}
		});

		
	});
}

function getChannelElement(username, user_login, profile_image_url) {
	const dv = document.createElement('div');
	const sl = document.createElement('span');

	const profileImg = document.createElement('img');
	const sp_disp_name = document.createElement('span');
	const sp_login_name = document.createElement('span');

	dv.classList.add('channel_container');
	dv.setAttribute('channel', user_login);
	sp_disp_name.textContent = username;
	sp_login_name.textContent = ` (${user_login})`;
	profileImg.src = profile_image_url;

	sp_disp_name.classList.add('c_disp_name');
	sp_login_name.classList.add('c_login_name');
	profileImg.classList.add('c_profile_img');
	
	sl.appendChild(sp_disp_name);
	sl.appendChild(sp_login_name);
	sl.classList.add('channel');

	dv.appendChild(profileImg);
	dv.appendChild(sl);
	return dv;
}
function add_channel(parentHTML, username, user_login, profile_image_url) {
	parentHTML.appendChild(getChannelElement(username, user_login, profile_image_url));
}

// function addReqFailedMsg() {
// 	msgList.addIRCMessage(null, '요청 실패', true);
// }

function setRecentChannel(disp_name: string, user_login: string, profile_image_url: string) {
	let rc = getRecentChannel();
	let channel_avail: boolean = false;

	for (let c of rc) {
		if (c.channel === user_login.toLocaleLowerCase()) {
			channel_avail = true;
		}
	}
	if (channel_avail) return;

	const KEY = 'RECENT_CONN_LIST';
	const c = recent_list.getElementsByClassName('channel_container');

	rc.push({ channel: user_login.toLocaleLowerCase(), disp_name: disp_name, profile_image_url: profile_image_url });
	recent_list.prepend(getChannelElement(disp_name, user_login, profile_image_url));

	if (rc.length > 4) {
		rc.shift();
		c[c.length - 1].remove();
	}

	localStorage.setItem(KEY, JSON.stringify(rc));
}

function getRecentChannel() {
	const KEY = 'RECENT_CONN_LIST';
	return JSON.parse(localStorage.getItem(KEY)) || [];
}

function setPageLanguage() {
	channel_connect_btn.textContent = i18n.t('page:connect');
	channel_id_input.placeholder = i18n.t('page:channelIdInputPh');
	document.getElementById('recentChannel').textContent = i18n.t('page:recentConnection');
	document.getElementById('onlineChannel').textContent = i18n.t('page:onlineFollowed');
	document.getElementById('contact-developer__a').textContent = i18n.t('page:contactDeveloper');
	document.getElementById('setting_btn_text').textContent = i18n.t('page:setting');
	document.getElementById('filter-setting__link').textContent = i18n.t('page:filterSetting');
	const theme = localStorage.getItem('theme') === 'light_theme' ? 'darkmode' : 'lightmode';
	document.getElementById('dark_mode_btn_text').textContent = i18n.t(`page:${theme}`);
	document.getElementById('reverse_chat_btn_text').textContent = i18n.t('page:reverseChatOrder');
	document.getElementById('hidePlayer_text').textContent = i18n.t('page:showPlayer');
	document.getElementById('popup_title').textContent = i18n.t('page:setting');
	document.getElementById('fontSizeSetting').textContent = i18n.t('page:chatFontSize');

	document.getElementById('fontSmallText').textContent = i18n.t('page:fontSmall');
	document.getElementById('fontDefaultText').textContent = i18n.t('page:fontDefault');
	document.getElementById('fontBigText').textContent = i18n.t('page:fontBig');
	document.getElementById('fontBiggerText').textContent = i18n.t('page:fontBigger');

	document.getElementById('chat_text_send').textContent = i18n.t('page:chat');
}

function toggleSideBar() {
	const sidebar_present = sidebar.classList.toggle(hiddenClassName);
	const cr_clst = chat_room.classList;
	const hidden = hiddenClassName;

	sidebar_present ? cr_clst.remove(hidden) : cr_clst.add(hidden);
}
function closeSideBar() {
	sidebar.classList.add(hiddenClassName);
	chat_room.classList.remove(hiddenClassName);
}

function callbackJOIN(channel: string, disp_name: string, profile_image_url: string, badges, cheermotes) {
	updateChatRoom(channel);
	setRecentChannel(disp_name, channel, profile_image_url);

	channelDisplayName = disp_name;
	LAST_JOIN_TIME = new Date().getTime();

	tapi.channel_badges = badges;
	tapi.cheermotes = cheermotes;

	const channels = client.getChannels();
	for (let c = 0; c < channels.length; c++) {
		if (channels[c] !== '#' + channel) {
			client.part(channels[c]);
		}
	}
	UserColorMap.map.clear();
	msgList.clearAllChat(false);
	msgList.clearCopiedChat();
	msgList.addIRCMessage(channel, i18n.t('tmi:chatConnected', { channel: channel }), true);
}

async function joinChatRoom(_channel: string) {
	tapi.targetChannel = _channel;
	const cur_time = new Date().getTime();
	const delay_time = cur_time - LAST_JOIN_TIME;

	let connected = false;
	if (!_channel || _channel === '') return;

	if (delay_time <= 3000) {
		msgList.addIRCMessage(null, i18n.t('page:reqDelay', { time: ~~((3000 - delay_time) / 1000) + 1 }), true);
		return;
	}

	// if(dev) console.log('joinChatRoom client.readyState() : ', client.readyState());

	const readyState = client.readyState();

	if (readyState === 'CLOSED') {
		connected = await connectChatServer(tapi.username, tapi.access_token);
	}
	if (client.readyState() !== 'OPEN') {
		return;
	} else if (client.readyState() === 'OPEN') {
		connected = true;
	}
	if (!connected) return;
	if (tapi.current_channel === _channel) return;

	msgList.addIRCMessage(null, i18n.t('tmi:chatConnecting', { channel: _channel }), true);

	let user = await tapi.get_users(_channel);
	if (user.data.length === 0) {
		msgList.addIRCMessage(null, i18n.t('tmi:channelNotFound', { channel: _channel }), true);
		return;
	}

	if(player === null){
		player = new (window as any).Twitch.Player('twitch_player', {
			width: '100%',
			height: '100%',
			channel: _channel
		});
	}else{
		player.setChannel(_channel);
	}

	const homeScreen =document.getElementById('home-screen');
	if(homeScreen) homeScreen.remove();

	let badges = await tapi.get_channel_chat_badges(user.data[0].id, true);
	let cheer = await tapi.get_cheermotes(user.data[0].id);

	const disp_name = user.data[0].display_name;
	const channel = user.data[0].login;

	await client.join(channel).then(j => {
		callbackJOIN(channel, disp_name, user.data[0].profile_image_url, badges, cheer);
	}).catch(err => {
		msgList.addIRCMessage(channel, i18n.t('tmi:chatConnectFailed', { channel: channel }), true);
	});
}

function updateChatRoom(channel: string) {
	let ph = `#${channel}`;
	let title = `#${channel} ) ${APP_TITLE}`;

	if (!channel || channel === '') {
		ph = i18n.t('page:noChannel');
		title = APP_TITLE;
	}
	chat_text_input.placeholder = ph;
	document.title = title;

	tapi.current_channel = channel;
}

/**
 * 
 * @param ratio 0 부터 100 사이의 값, 복제된 채팅창의 크기 비율입니다.
 * @returns 
 */
function change_container_ratio(ratio: number) {
	if (ratio != 0) ratio = ratio ? ratio : 30;

	let orig_size = ratio === 0 ? 1 : (ratio === 10 ? 0 : 1);
	let clone_size = ratio === 0 ? 0 : (ratio === 10 ? 1 : 0);

	if (1 <= ratio && ratio <= 100) {
		clone_size = parseFloat((ratio * 0.01).toFixed(2));
		orig_size = parseFloat((1 - clone_size).toFixed(2));
	}

	if (chat_order_reversed) {
		[orig_size, clone_size] = [clone_size, orig_size];
	}

	chat_list_origin.style.flex = String(orig_size);
	chat_list_clone.style.flex = String(clone_size);
}
function setLanguage(language) {
	let lang = '';

	if (language.includes('ko')) {
		lang = 'ko';
	} else if (language.includes('en')) {
		lang = 'en';
	}

	const langOptions = document.getElementById('language-options').getElementsByClassName('language');

	for (let lo of langOptions) {
		lo.classList.remove('language-status__enabled');
	}

	const option = document.getElementById(`language__${lang}`);
	// option.classList.remove('language-status__disabled');
	option.classList.add('language-status__enabled');

	localStorage.setItem('language', language);
	i18n.changeLanguage(language);
	setPageLanguage();
}

function setFontSize(id: string) {
	if (!id) id = 'font_default';
	let cls = '';

	if (id === 'font_small') {
		cls = 'font_size_0';
	} else if (id === 'font_big') {
		cls = 'font_size_2';
	} else if (id === 'font_bigger') {
		cls = 'font_size_3';
	} else {
		cls = 'font_size_1';
	}

	let fes = font_size_examples.children;

	for (let e of fes) {
		const fe = e.getElementsByClassName('font_example')[0];
		if (e.id === id) {
			fe.classList.add('selected');
		} else {
			fe.classList.remove('selected');
		}
	}

	const chat_room = document.getElementById('chat_room');

	for (let cls of chat_room.classList) {
		if (/font_size_[0-9]$/.test(cls)) {
			chat_room.classList.remove(cls);
		}
	}
	chat_room.classList.add(cls);
	localStorage.setItem('fontSize', id);
}

function setTheme(themeName) {
	let text, icon;

	if (themeName === 'light_theme') {
		text = i18n.t('page:darkmode');
		icon = 'dark_mode';
	} else {
		text = i18n.t('page:lightmode');
		icon = 'light_mode';
	}
	document.getElementById('dark_mode_btn_text').textContent = text;
	document.getElementById('dark_mode_btn_icon').textContent = icon;

	localStorage.setItem('theme', themeName);
	document.documentElement.className = themeName;
}

function getCurrentTheme() {
	if (localStorage.getItem('theme') === 'dark_theme') {
		return 'dark';
	} else {
		return 'light';
	}
}

function setCurrentTheme() {
	setTheme(`${getCurrentTheme()}_theme`);
	// if (localStorage.getItem('theme') === 'dark_theme') {
	// 	setTheme('dark_theme');
	// } else {
	// 	setTheme('light_theme');
	// }
}
function toggleTheme() {
	if (localStorage.getItem('theme') === 'dark_theme') {
		setTheme('light_theme');
	} else {
		setTheme('dark_theme');
	}
}

tapi.get_global_chat_badges(true).then(badges => {
	tapi.global_badges = badges;
});
const rc = getRecentChannel();

for (let c of rc.reverse() || []) {
	add_channel(recent_list, c.disp_name, c.channel, c.profile_image_url);
}

auth.getToken().then(token => {
	if (token.status) {
		const expr_time = 60 * 1000;
		tapi.access_token = token.access_token;
		tapi.expire_time = expr_time;

		channel_list_container.classList.remove(hiddenClassName);

		tapi.get_users().then(user => {
			let u = user['data'][0];

			tapi.user_id = u.id;
			tapi.username = u.login;

			init_user_info(u);
			updateFollowedStream(u.id);

		});
	}
});

// tmi.js client listeners

// connection
client.on("connecting", (address, port) => {
	msgList.addIRCMessage(null, i18n.t('tmi:connecting'), true);
	chat_text_send_btn.disabled = true;
});
client.on('connected', (address: string, port: number) => {
	const channels = client.getChannels();

	msgList.addIRCMessage(null, i18n.t('tmi:connected'), true);

	if (channels.length === 0 && channels.includes(tapi.targetChannel)) {
		joinChatRoom(tapi.targetChannel);
	}

	chat_text_send_btn.disabled = false;
});
client.on('reconnect', () => {
	chat_text_send_btn.disabled = true;
});
client.on("disconnected", async (reason) => {
	// msgList.addIRCMessage(null, reason, true);
	if (reason === 'Login authentication failed') {
		const token = await auth.getToken();

		if (token.status) {
			tapi.access_token = token.access_token;
			msgList.addIRCMessage(null, i18n.t('page:tokenRefreshed'), true);
		} else {
			msgList.addIRCMessage(null, i18n.t('page:authFailed'), true);
		}
	}
	chat_text_send_btn.disabled = true;
});

client.on('part', (channel, username, self) => {
	UserColorMap.map.delete(username);
});
// client.on("roomstate", (channel, state) => {
// 	// Do your stuff.
// });
client.on("emoteonly", (channel, enabled) => {
	if (enabled) {
		msgList.addIRCMessage(null, i18n.t('tmi:emoteEnabled', { channel: channel }), false);
	} else {
		msgList.addIRCMessage(null, i18n.t('tmi:emoteDisabled', { channel: channel }), false);
	}
});
client.on("followersonly", (channel, enabled, length) => {
	if (enabled) {
		msgList.addIRCMessage(null, i18n.t('tmi:followerEnabled', { channel: channel, length: length }), false);
	} else {
		msgList.addIRCMessage(null, i18n.t('tmi:followerDisabled', { channel: channel, length: length }), false);
	}
});
client.on("slowmode", (channel, enabled, length) => {
	if (enabled) {
		msgList.addIRCMessage(null, i18n.t('tmi:slowModeEnabled', { channel: channel, length: length }), false);
	} else {
		msgList.addIRCMessage(null, i18n.t('tmi:slowModeDisabled', { channel: channel }), false);
	}
});

client.on('clearchat', (channel) => {
	// 전체 채팅을 삭제.
	msgList.clearAllChat(true);
	msgList.addIRCMessage(null, i18n.t('tmi:claerchat', { channel: channel }), false);
});

client.on("messagedeleted", (channel, username, deletedMessage, userstate) => {
	// CLEARMSG 일때 실행 됨. /delete msg-id command 를 통해 특정 채팅이 삭제되었을 때.
});

// 특정 유저의 채팅 (일시 밴, 영구 밴 등등)을 모두 삭제함.
client.on("timeout", (channel, username, reason, duration) => {
	if (username === tapi.username) {
		msgList.addIRCMessage(null, i18n.t('tmi:timeout', { duration: duration }), false);
	}
	msgList.clearUserChat(username, true);
});

client.on('ban', (channel, username, reason) => {
	msgList.clearUserChat(username, true);
});

client.on("raided", (channel, username, viewers) => {
	const userstate: UserNoticeState = {
		'message-type': 'raided',
		'system-msg': `[raid] ${username} is raiding with a party of ${viewers}`
	}
	msgList.addUserNoticeMessage(channel, userstate);
});

client.on("subscribers", (channel, enabled) => {
	let message = '';
	if (enabled) {
		message = i18n.t('tmi:subscribersEnabled', { channel: channel });
	} else {
		message = i18n.t('tmi:subscribersDisabled', { channel: channel });
	}
	msgList.addIRCMessage(channel, message, false);
});

client.on('hosting', (channel, target, viewers) => {
	msgList.addIRCMessage(channel, i18n.t('tmi:hosting'), false);
});

client.on('notice', (channel, msgid, message) => {
	msgList.addIRCMessage(channel, message, false);
});

channel_connect_btn.addEventListener('click', e => {
	if(!Etc.checkChannelValid(channel_id_input.value)){
		Toast.fire('채널 오류', '채널은 영문자와 숫자만 입력할 수 있습니다.', 'error');
		return;
	}
	joinChatRoom(channel_id_input.value);
	channel_id_input.value = '';
	toggleSideBar();
});

chat_text_send_btn.addEventListener('click', e => {

	const msg = chat_text_input.value;
	if (msg === '') return;

	const channels = client.getChannels();
	if (channels.length === 0) updateChatRoom(null);

	const channel = tapi.current_channel;

	if (!channel || channel === '') {
		msgList.addIRCMessage(channel, i18n.t('page:noChannel'), false);
		return;
	}

	client.say(channel, msg).then(c => {
		chat_text_input.value = '';
	}).catch(err => {
		msgList.addIRCMessage(channel, err, false);
	});
});

channel_id_input.addEventListener('keyup', e => {
	if (e.key === 'Enter' || e.code == 'Enter') channel_connect_btn.click();
});

chat_text_input.addEventListener('keyup', e => {
	if (e.key === 'Enter' || e.code == 'Enter') chat_text_send_btn.click();
});
// chat_text_input.addEventListener('focus', e => {
// 	// scrollDownChatList();
// });

chat_list_origin.addEventListener("scroll", function () {
	msgList.origChatIsAtBottom = chat_list_origin.scrollTop + chat_list_origin.clientHeight >= chat_list_origin.scrollHeight - 40;
}, false);
chat_list_clone.addEventListener("scroll", function () {
	msgList.cloneChatIsAtBottom = chat_list_clone.scrollTop + chat_list_clone.clientHeight >= chat_list_clone.scrollHeight - 40;
}, false);

auth_info.addEventListener('click', e => {
	user_setting.classList.toggle(hiddenClassName);
});

twitch_login_btn.addEventListener('click', e=> {
	auth.toggleLoginStatus(tapi, 'main');
});
twitch_logout_btn.addEventListener('click', e=>{
	auth.toggleLoginStatus(tapi, 'main');
});


setting_btn.addEventListener('click', e => {
	setting_container.classList.remove(hiddenClassName);
	user_setting.classList.add(hiddenClassName);
});

dark_mode_btn.addEventListener('click', e => {
	const chatColor = new ChatColor();

	const chatListContainer = document.getElementById('chat_list_container');
	const chat = chatListContainer.getElementsByClassName('chat');

	toggleTheme();

	for (let c of chat) {
		const author = <HTMLSpanElement>c.getElementsByClassName('author')[0];
		if (!author) continue;

		const username = c.classList.item(1);
		author.style.color = chatColor.getReadableColor(username, null);
	}
});

reverse_chat_btn.addEventListener('click', e => {
	let icon_text = 'arrow_upward';

	chat_list_origin.classList.toggle('reversed');
	chat_list_clone.classList.toggle('reversed');

	chat_order_reversed = !chat_order_reversed;

	if (chat_order_reversed) {
		icon_text = 'arrow_downward';
	}
	document.getElementById('reverse_chat_btn_icon').textContent = icon_text;
	localStorage.setItem('reversed', JSON.stringify(chat_order_reversed));
});

hidePlayer_btn.addEventListener('click', e=> {
	const player_container = document.getElementById('player_container');
	const chatroom_container = document.getElementById('chatroom_container');
	const hidePlayer_text = document.getElementById('hidePlayer_text');

	if(player_container.classList.contains('hidden')){
		player_container.classList.remove('hidden');
		chatroom_container.style.removeProperty('width');
		hidePlayer_text.textContent = i18n.t('page:hidePlayer');
	}else{
		player_container.classList.add('hidden');
		chatroom_container.style.width = '100%';
		hidePlayer_text.textContent = i18n.t('page:showPlayer');
	}
});

flwStrCtl.addEventListener('click', e => {
	const target = e.target as HTMLSpanElement;
	const target_id = target.id;
	if(!['get_more_flw_str', 'refresh_flw_str'].includes(target_id)) return;

	if (target_id === 'get_more_flw_str') {
		if (followed_streams_after === null) return;

		updateFollowedStream(tapi.user_id, followed_streams_after);
	} else if (target_id === 'refresh_flw_str') {
		Array.from(online_list.childNodes).forEach(o => { o.remove(); });

		updateFollowedStream(tapi.user_id);
	}
});

channel_list_container.addEventListener('click', e => {
	if (e.target instanceof Element) {
		const ch_container = e.target.closest('.channel_container');

		if (ch_container) {
			joinChatRoom(ch_container.getAttribute('channel'));
			toggleSideBar();
			e.stopPropagation();
		}
	}
});
sidebar_btn.addEventListener('click', e => {
	toggleSideBar();
});

document.getElementById('language-options').addEventListener('click', e => {
	const target = <HTMLSpanElement>e.target;
	const id = target.id;
	const lang = id.replace('language__', '');

	setLanguage(lang);
});

font_size_examples.addEventListener('click', e => {
	const target = <HTMLSpanElement>e.target;

	if (target.classList.contains('font_example')) {
		let id = target.parentElement.id;
		setFontSize(id);
	}
});

handler.addEventListener('mousedown', startDrag);
handler.addEventListener('touchstart', startDrag, { passive: true });

function startDrag(e: MouseEvent | TouchEvent) {
	e.preventDefault();
	window.addEventListener('mousemove', doDrag);
	window.addEventListener('touchmove', doDrag);
	window.addEventListener('mouseup', endDrag);
	window.addEventListener('touchend', endDrag);
}

function doDrag(e: MouseEvent | TouchEvent) {
	const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

	if (chat_list_container) {
		const rect = chat_list_container.getBoundingClientRect();
		container_ratio = (1 - (clientY - rect.y) / rect.height) * 100;
		container_ratio = Math.max(0, Math.min(100, Math.round(container_ratio)));
		change_container_ratio(container_ratio);
	}
}

function endDrag() {
	localStorage.setItem('ratio', container_ratio.toString());

	window.removeEventListener('mousemove', doDrag);
	window.removeEventListener('touchmove', doDrag);
	window.removeEventListener('mouseup', endDrag);
	window.removeEventListener('touchend', endDrag);
}


// https://css-tricks.com/the-trick-to-viewport-units-on-mobile/
// We listen to the resize event
window.addEventListener('resize', () => {
	// We execute the same script as before
	let vh = window.innerHeight * 0.01;
	document.documentElement.style.setProperty('--vh', `${vh}px`);
});

document.getElementById('sidebar-close__btn').addEventListener('click', e => {
	closeSideBar();
});

document.addEventListener('click', e => {
	const target = e.target as HTMLElement;

	if (!target.closest('#user_setting') && !target.closest('#auth_info')) {
		user_setting.classList.add(hiddenClassName);
	}
	if (!target.closest('#sidebar') && !target.closest('#sidebar_btn')) {
		closeSideBar();
	}
	if (!target.closest('#setting') && !target.closest('#setting_btn')) {
		setting_container.classList.add(hiddenClassName);
	}

	e.stopPropagation();
});
filterChannel.onmessage = msg => {
	if (!msg.to.includes('wtbc-main')) return;
	if (!msg.filter){
		Toast.fire('필터 업데이트', '필터를 업데이트하지 못했습니다.', 'warning');
		return;
	}
	filter.filter = Object.fromEntries(msg.filter);
	Toast.fire('필터 업데이트', '필터가 업데이트 되었습니다.', 'info');
}
chatChannel.onmessage = msg => {
	if (msg.type === 'REQUEST_CHATROOM_ID') {
		if (!tapi.current_channel) {
			return;
		}
		chatChannel.postMessage({
			type: 'RESPONSE_CHATROOM_ID',
			theme: getCurrentTheme(),
			channel: tapi.current_channel,
			displayName: channelDisplayName,
			random: random,
		});
	}

	if (msg.type === 'REQUEST_CHAT_LIST') {
		if (msg.id !== `${random}-${tapi.current_channel}`) {
			return;
		}
		const se = new XMLSerializer();
		const chatListXML = se.serializeToString(document.getElementsByClassName('chat_list')[1]);

		chatChannel.postMessage({
			type: 'chatList',
			chatListXML: chatListXML
		});
	}
}

document.getElementById('debug-1').addEventListener('click', e => {
	client.connect();
});
document.getElementById('debug-2').addEventListener('click', e => {
	client.disconnect();
});
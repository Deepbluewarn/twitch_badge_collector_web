import { Client, Options, CommonUserstate } from 'tmi.js';
import Swal from 'sweetalert2';
import * as swal_setting from './swal_setting';
import i18next from 'i18next';

import { Auth, CLIENT_ID } from './auth';
import { Twitch_Api } from './twitch_api'

import { Chat } from './messages/chat';
import { IRC_Message } from './messages/irc_message';
import { UserNotice } from './messages/usernotice';

import { UserColorMap } from './UserColorMap';

import { Filter } from './filter';
import { ChatColor } from './chatColor';


(() => {
	const APP_TITLE = 'Twitch Badge Collector';
	const CHAT_COUNT = 144;

	const twitch_login_btn_big = document.getElementById('twitch_login_btn_big');
	const twitch_login_btn_small = document.getElementById('twitch_login_btn_small');

	const auth_info = document.getElementById('auth_info');
	const user_setting = document.getElementById('user_setting');
	const setting_btn = document.getElementById('setting_btn');
	const dark_mode_btn = document.getElementById('dark_mode_btn');
	const reverse_chat_btn = document.getElementById('reverse_chat_btn');

	const sidebar = document.getElementById('sidebar');
	const sidebar_btn = document.getElementById('sidebar_btn');
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

	// const tbc_file_label = document.getElementById('tbc_file_upload_label');
	// const tbc_file_upload_btn = document.getElementById('tbc_file_upload_btn');
	const tbc_file_input = document.getElementById('tbc_file_upload');
	const tbc_file_name = document.getElementById('tbc_file_name');
	const current_tbc_file = document.getElementById('current_tbc_file');

	const handler = document.getElementById('handler');

	// First we get the viewport height and we multiple it by 1% to get a value for a vh unit
	const vh = window.innerHeight * 0.01;
	// Then we set the value in the --vh custom property to the root of the document
	document.documentElement.style.setProperty('--vh', `${vh}px`);

	const Toast = Swal.mixin(swal_setting.setting_def);

	let followed_streams_after: string = '';
	let LAST_JOIN_TIME: number = 0;

	let origChatIsAtBottom = true;
	let cloneChatIsAtBottom = true;

	localStorage.setItem('dev', 'false');

	let dev = JSON.parse(localStorage.getItem('dev'));
	// 저장된 설정으로 화면 초기화.

	let container_ratio = localStorage.getItem('ratio') || 0;
	let chat_order_reversed: boolean = localStorage.getItem('ratio') === 'true';

	const font_setting = localStorage.getItem('fontSize');
	setFontSize(font_setting);

	if (localStorage.getItem('theme') === 'dark_theme') {
		setTheme('dark_theme');
	} else {
		setTheme('light_theme');
	}

	change_container_ratio(parseInt(localStorage.getItem('ratio')) || 30);

	const auth = new Auth();
	const tapi: Twitch_Api = new Twitch_Api(CLIENT_ID);

	const filter_str = localStorage.getItem('tbc_file');
	const filter: Filter = new Filter(JSON.parse(filter_str), tapi);

	tbc_file_name.textContent = localStorage.getItem('tbc_file_name');
	if(filter_str) current_tbc_file.classList.remove('hidden');

	// const tmi = (window as any).tmi;

	let tmi_client_obj: Options = {
		options: {
			clientId: CLIENT_ID,
			skipUpdatingEmotesets: true,
			skipMembership: true
		},
		connection: { reconnect: true, secure: true },
		identity: { username: '', password: '' }
	};
	let client: Client = new Client(tmi_client_obj);

	function connectChatServer(username: string, password: string) {
		tmi_client_obj.identity.username = username;
		tmi_client_obj.identity.password = `oauth:${password}`;
		return client.connect();
	}

	function toggleLoginStatus(){
		if (tapi.access_token) {
			auth.logout();
		} else {
			auth.login(getRandomString());
		}
	}

	function init_user_info(user) {
		const twitch_login_small_text = document.getElementById('twitch_login_small_text');
		const login_btn_icon = document.getElementById('login_btn_icon');

		const user_info = document.getElementById('user_info');
		const user_profile_img = <HTMLImageElement>document.getElementById('user_profile_img');
		const user_disp_name = document.getElementById('user_disp_name');

		twitch_login_btn_big.classList.add('hidden');

		login_btn_icon.textContent = 'logout';
		twitch_login_small_text.textContent = '로그아웃';

		user_profile_img.src = user.profile_image_url;
		user_disp_name.textContent = user.display_name;
		user_info.classList.remove('hidden');
	}

	function updateFollowedStream(user_id: string, after?: string) {
		return tapi.get_followed_streams(user_id, after).then(fs => {
			flwStrCtl.classList.remove('hidden');

			if (isEmpty(fs.pagination)) {
				followed_streams_after = null;
			} else {
				followed_streams_after = fs.pagination.cursor;
			}

			const online_list = document.getElementsByClassName('channel_list online')[0];
			let fs_data = fs.data;
			if(dev) console.log(fs_data);

			for (let i = 0; i < fs_data.length; i++) {
				add_channel(online_list, fs_data[i].user_name, fs_data[i].user_login);
			}
		}).catch(r => {
			if(dev) console.log('방송중인 채널 목록을 가져오는데 실패하였습니다.');
			addReqFailedMsg();
		});
	}

	function getChannelElement(username, user_login){
		let dv = document.createElement('div');
		let sl = document.createElement('span');
		const sp_disp_name = document.createElement('span');
		const sp_login_name = document.createElement('span');
		dv.classList.add('channel_container');
		dv.setAttribute('channel', user_login);
		sp_disp_name.textContent = username;
		sp_login_name.textContent = ` (${user_login})`;

		sp_disp_name.classList.add('c_disp_name');
		sp_login_name.classList.add('c_login_name');
		sl.appendChild(sp_disp_name);
		sl.appendChild(sp_login_name);
		sl.classList.add('channel');

		dv.appendChild(sl);
		return dv;
	}
	function add_channel(parentHTML, username, user_login) {
		parentHTML.appendChild(getChannelElement(username, user_login));
	}

	/**
	 * 
	 * @param channel 
	 * @param html 
	 * @param isSysMsg 채널과 관계 없는 시스템 메시지이면 true.
	 * @returns 
	 */
	function add_msg_list(channel: string, html: HTMLElement, isSysMsg?: boolean, userstate?: CommonUserstate, message?: string) {
		if (!isSysMsg && trim_hash(channel) !== trim_hash(tapi.current_channel)) {
			return;
		}
		let filter_match_type = '';

		if(filter && userstate && message){
			filter_match_type = filter.checkFilterWithValues(userstate['badges-raw'], message, userstate.username || userstate.login, userstate["display-name"]);
		}
		const chat_line = document.createElement('div');

		chat_line.classList.add('chat_line');
		chat_line.appendChild(html);
		chat_line.classList.add('tbc_highlight' + filter_match_type);

		if(filter_match_type !== ''){
			let clone_chat = <HTMLDivElement>chat_line.cloneNode(true);
			
			chat_list_clone.appendChild(clone_chat);
			maintainChatCount(chat_list_clone);
			if (cloneChatIsAtBottom) scrollDownChatList(chat_list_clone);
		}
		chat_list_origin.appendChild(chat_line);
		maintainChatCount(chat_list_origin);
		if (origChatIsAtBottom) scrollDownChatList(chat_list_origin);
	}

	function maintainChatCount(chat_list) {
		if (chat_list.childElementCount > CHAT_COUNT) {
			chat_list.removeChild(chat_list.firstElementChild);
		}
	}
	function scrollDownChatList(chat_list) {
		chat_list.scrollTop = chat_list.scrollHeight;
	}

	function add_userNotice(channel: string, message: string, userstate: CommonUserstate) {
		let subs = new UserNotice(userstate['message-type'], userstate['system-msg']);
		const sub_container = subs.render_sub_container();

		if (message && message !== '') {
			const chat = new Chat(message, userstate, false, tapi.channel_badges, tapi.global_badges, tapi.emote_sets);
			sub_container.appendChild(chat.render_chat());
		}
		add_msg_list(channel, sub_container);
	}

	function addReqFailedMsg() {
		const ircmsg = new IRC_Message(`요청 실패.`);
		add_msg_list(null, ircmsg.render_message(), true);
	}

	function setRecentChannel(disp_name: string, user_login: string){
		let rc = getRecentChannel();
		let channel_avail: boolean = false;
		if(!rc) rc = [];

		for(let c of rc){
			if(c.channel === user_login.toLocaleLowerCase()){
				channel_avail = true;
			}
		}
		if(channel_avail) return;

		const KEY = 'RECENT_CONN_LIST';
		const c = recent_list.getElementsByClassName('channel_container');

		rc.push({channel : user_login.toLocaleLowerCase(), disp_name : disp_name});
		recent_list.prepend(getChannelElement(disp_name, user_login));

		if(rc.length > 4){
			rc.shift();
			c[c.length - 1].remove();
		}
		
		localStorage.setItem(KEY, JSON.stringify(rc));
	}

	function getRecentChannel(){
		const KEY = 'RECENT_CONN_LIST';
		return JSON.parse(localStorage.getItem(KEY));
	}

	function clearAllChat(line?: boolean) {
		Array.from(chat_list_origin.childNodes).forEach(c => {
			if (line) {
				const he = (c as HTMLElement);
				if (!he.children[0].classList.contains('irc_message')) {
					he.classList.add('cancel_line');
				}
			} else {
				c.remove();
			}
		});
	}

	function clearCopiedChat(){
		Array.from(chat_list_clone.childNodes).forEach(c => {
			c.remove();
		});
	}
	function clearUserChat(username: string, line?: boolean) {
		Array.from(chat_list_origin.getElementsByClassName(username)).forEach(c => {
			if (line) {
				if (c.classList.contains('chat')) {
					c.classList.add('cancel_line');
				}
			} else {
				// c.remove();
				c.getElementsByClassName('chat_message')[0].textContent = `< Message Deleted. >`;
			}

		});
	}

	function toggleSideBar() {
		sidebar.classList.toggle('hidden');
	}
	function openSideBar() {
		sidebar.classList.remove('hidden');
	}
	function closeSideBar() {
		sidebar.classList.add('hidden');
	}

	function callbackJOIN (channel: string, disp_name: string, badges, cheermotes) {
		updateChatRoom(channel);
		setRecentChannel(disp_name, channel);

		LAST_JOIN_TIME = new Date().getTime();
		const ircmsg = new IRC_Message(`#${channel} 채팅방에 연결되었습니다.`);

		tapi.channel_badges = badges;
		tapi.cheermotes = cheermotes;

		const channels = client.getChannels();
		for (let c = 0; c < channels.length; c++) {
			if (channels[c] !== '#' + channel) {
				client.part(channels[c]);
			}
		}
		UserColorMap.map.clear();
		clearAllChat(false);
		clearCopiedChat();
		add_msg_list(channel, ircmsg.render_message());
	}

	async function joinChatRoom (_channel: string) {
		if(dev) console.log('joinChannel channel : ', _channel);
		tapi.targetChannel = _channel;
		const cur_time = new Date().getTime();
		const delay_time = cur_time - LAST_JOIN_TIME;

		let connected = false;
		if (!_channel || _channel === '') return;

		if (delay_time <= 3000) {
			const ircmsg = new IRC_Message(`${~~((3000 - delay_time) / 1000) + 1} 초 뒤 다시 시도하세요.`);
			add_msg_list(null, ircmsg.render_message(), true);
			return;
		}

		if(dev) console.log('joinChatRoom client.readyState() : ', client.readyState());

		if (client.readyState() === 'CLOSED') {
			if(dev) console.log(tapi.access_token);
			await connectChatServer(tapi.username, tapi.access_token).then(conn=> {
				connected = true;
			});
		}else {
			connected = true;
		}
		if(!connected) return;
		if (tapi.current_channel === _channel) return;

		const ircmsg = new IRC_Message(`#${_channel} 채팅방에 연결중입니다...`);
		add_msg_list(null, ircmsg.render_message(), true);

		let user = await tapi.get_users(_channel);
		if(user.data.length === 0) {
			Toast.fire({
				icon : 'error',
				titleText : '트위치 오류',
				text : '채널을 찾을 수 없습니다'
			});
			const ircmsg = new IRC_Message(`채팅방 연결에 실패했습니다.`);
			add_msg_list(null, ircmsg.render_message(), true);
			
			return;
		}
		let badges = await tapi.get_channel_chat_badges(user.data[0].id);
		let cheer = await tapi.get_cheermotes(user.data[0].id);

		const disp_name = user.data[0].display_name;
		const channel = user.data[0].login;

		await client.join(channel).then(j => {
			callbackJOIN(channel, disp_name, badges, cheer);
		}).catch(err => {
			const ircmsg = new IRC_Message(`#${channel} 채팅방 연결에 실패했습니다.`);
			add_msg_list(channel, ircmsg.render_message());
		});
	}

	function updateChatRoom (channel: string) {
		let ph = `#${channel}`;
		let title = `#${channel} ) ${APP_TITLE}`;

		if (!channel || channel === '') {
			ph = '채팅방에 연결되어 있지 않음.';
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

		if(chat_order_reversed){
			[orig_size, clone_size] = [clone_size, orig_size];
		}

        chat_list_origin.style.flex = String(orig_size);
        chat_list_clone.style.flex = String(clone_size);
    }

	function loadTbcFile (e) {
		const file = e.target.files[0];
		if(file){
			let reader = new FileReader();

			reader.readAsText(file);
			reader.onload = function(e) {
				const res = reader.result as string;
				const _filter = JSON.parse(res);
				_filter.shift();

				tbc_file_name.textContent = file.name;
				current_tbc_file.classList.remove('hidden');
				
				localStorage.setItem('tbc_file_name', file.name);
				localStorage.setItem('tbc_file', JSON.stringify(_filter));
				filter.filter = _filter;
			}
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

		let fes = font_size_examples.children;

		for(let e of fes){
			const fe = e.getElementsByClassName('font_example')[0];
			if(e.id === id){
				fe.classList.add('selected');
			}else{
				fe.classList.remove('selected');
			}
		}
		
		const chat_room = document.getElementById('chat_room');

		for(let cls of chat_room.classList){
			if(/font_size_[0-9]$/.test(cls)){
				chat_room.classList.remove(cls);
			}
		}
		chat_room.classList.add(cls);
		localStorage.setItem('fontSize', id);
	}

	function setTheme(themeName) {
		let text, icon;

		if(themeName === 'light_theme'){
			text = '어두운 테마';
			icon = 'dark_mode';
		}else{
			text = '밝은 테마';
			icon = 'light_mode';
		}
		document.getElementById('dark_mode_btn_text').textContent = text;
		document.getElementById('dark_mode_btn_icon').textContent = icon;

		localStorage.setItem('theme', themeName);
		document.documentElement.className = themeName;
	}
	function toggleTheme() {
		if (localStorage.getItem('theme') === 'dark_theme') {
			setTheme('light_theme');
		} else {
			setTheme('dark_theme');
		}
	}

	function trim_hash(str: string) {
		let c1: string = '';

		if (str && str !== '') {
			c1 = str[0] === '#' ? str.substring(1) : str;
		}
		return c1;
	}
	function getRandomString() {
		return Math.random().toString(36).substring(2);
	}
	function isEmpty(obj) {
		return Object.keys(obj).length === 0;
	}

	auth.get_token().then(token => {
		if (token.status) {
			const expr_time = 60 * 1000;
			tapi.access_token = token.access_token;
			tapi.expire_time = expr_time;

			channel_list_container.classList.remove('hidden');

			tapi.get_users().then(user => {
				let u = user['data'][0];
				if(dev) console.log(u);

				tapi.user_id = u.id;
				tapi.username = u.login;

				init_user_info(u);
				updateFollowedStream(u.id);

			}).catch(err => {
				if(dev) console.log('유저 정보를 가져오는데 실패하였습니다.' ,err);
				addReqFailedMsg();
			});

			tapi.get_global_chat_badges().then(badges => {
				tapi.global_badges = badges;
			}).catch(err => {
				if(dev) console.log('글로벌 배지 정보를 가져오는데 실패하였습니다.');
				addReqFailedMsg();
			});

			const rc = getRecentChannel();

			for(let c of rc.reverse()){
				add_channel(recent_list, c.disp_name, c.channel);
			}
		}
	});

	// tmi.js client listeners

	// connection
	client.on("connecting", (address, port) => {
		const ircmsg = new IRC_Message(`채팅 서버에 연결 중입니다..`);
		add_msg_list(null, ircmsg.render_message(), true);
		chat_text_send_btn.disabled = true;
	});
	client.on('connected', (address: string, port: number) => {
		const ircmsg = new IRC_Message(`채팅 서버에 연결 되었습니다.`);
		
		if(dev) console.log('tapi.current_channel : ', tapi.current_channel);
		if(dev) console.log('tapi.targetChannel : ', tapi.targetChannel);

		if(tapi.current_channel && tapi.current_channel !== tapi.targetChannel){
			joinChatRoom(tapi.targetChannel);
		}
		
		add_msg_list(null, ircmsg.render_message(), true);
		chat_text_send_btn.disabled = false;
	});
	client.on('logon', () => {
		// const ircmsg = new IRC_Message(`logon : 채팅 서버에 인증 정보를 보냈습니다.`);
		// add_msg_list(null, ircmsg.render_message(), true);
	});
	client.on('reconnect', () => {
		if(dev) console.log('채팅 서버에 다시 연결하는 중 입니다.');
		// const ircmsg = new IRC_Message(`reconnect : 채팅 서버에 다시 연결 중입니다.`);
		// add_msg_list(ircmsg.render_message());

		chat_text_send_btn.disabled = true;
	});
	client.on("disconnected", (reason) => {
		if(reason === 'Login authentication failed'){
			auth.token_refresh().then(token => {
				if(token.status){
					if(dev) console.log('disconnectd refresh token : ', token);
					tapi.access_token = token.access_token;
					joinChatRoom(tapi.current_channel);
				}else{
					const ircmsg = new IRC_Message(`인증 실패. 새로고침 후 다시 시도하세요.`);
					add_msg_list(null, ircmsg.render_message(), true);
				}
			});
		}
		chat_text_send_btn.disabled = true;
	});

	client.on('part', (channel, username, self) => {
		if(dev) console.log(`PART : ${channel} 채널에서 ${username} 님이 떠났습니다.`);
		if(UserColorMap.map.delete(username)){
			if(dev) console.log(`PART : ${username} 님의 색상 정보가 삭제되었습니다.`);
		}
	});
	client.on("roomstate", (channel, state) => {
		// console.log(`roomstate : channel : ${channel}, state : `, state);
		// Do your stuff.
	});
	client.on("emoteonly", (channel, enabled) => {
		if (enabled) {
			const ircmsg = new IRC_Message(`${channel} 채널에 이모티콘 전용 모드가 활성화되었습니다.`);
			add_msg_list(channel, ircmsg.render_message());
		} else {
			const ircmsg = new IRC_Message(`${channel} 채널에 이모티콘 전용 모드가 비활성화되었습니다.`);
			add_msg_list(channel, ircmsg.render_message());
		}
	});
	client.on("followersonly", (channel, enabled, length) => {
		if (enabled) {
			const ircmsg = new IRC_Message(`${channel} 채널에 팔로우 전용 채팅이 ${length} 분간 활성화되었습니다.`);
			add_msg_list(channel, ircmsg.render_message());
		} else {
			const ircmsg = new IRC_Message(`${channel} 채널에 팔로우 전용 채팅이 비활성화되었습니다.`);
			add_msg_list(channel, ircmsg.render_message());
		}
	});

	client.on('message', (channel, userstate, message, self) => {
		if(dev) console.log('message tags : ', userstate);
		let chat = new Chat(message, userstate, self, tapi.channel_badges, tapi.global_badges, tapi.emote_sets);
		add_msg_list(channel, chat.render_chat(), false, userstate, message);
	});
	client.on('clearchat', (channel) => {
		// 전체 채팅을 삭제.
		clearAllChat(true);
		const ircmsg = new IRC_Message(`${channel} 채널의 채팅이 모두 삭제되었습니다.`);
		add_msg_list(channel, ircmsg.render_message());
	});

	client.on("messagedeleted", (channel, username, deletedMessage, userstate) => {
		// CLEARMSG 일때 실행 됨. /delete msg-id command 를 통해 특정 채팅이 삭제되었을 때.
	});

	// 특정 유저의 채팅 (일시 밴, 영구 밴 등등)을 모두 삭제함.
	client.on("timeout", (channel, username, reason, duration) => {
		if (username === tapi.username) {
			const ircmsg = new IRC_Message(`${duration}초 동안 임시 퇴장됐습니다.`);
			add_msg_list(channel, ircmsg.render_message());
		}
		clearUserChat(username, true);
	});

	client.on('ban', (channel, username, reason) => {
		clearUserChat(username, true);
	});

	client.on("raw_message", (messageCloned, message) => {
		if(dev) console.debug('raw_message : ', message);
	});

	// subscription

	// 신규 구독
	client.on("subscription", (channel, username, method, message, userstate) => {
		add_userNotice(channel, message, userstate);
	});
	// 비트 후원
	client.on("cheer", (channel, userstate, message) => {
		let chat = new Chat(message, userstate, false, tapi.channel_badges, tapi.global_badges, tapi.emote_sets, tapi.cheermotes);
		add_msg_list(channel, chat.render_chat());
	});
	// 선물받은 구독 연장
	// Username is continuing the Gift Sub they got from sender in channel.
	client.on("giftpaidupgrade", (channel, username, sender, userstate) => {
		add_userNotice(channel, userstate.message, userstate);
	});
	// 익명 사용자로부터 선물받은 구독 연장
	// Username is continuing the Gift Sub they got from an anonymous user in channel.
	client.on("anongiftpaidupgrade", (channel, username, userstate) => {
		add_userNotice(channel, userstate.message, userstate);
	});
	// 산타
	// Username is gifting a subscription to someone in a channel.
	client.on("submysterygift", (channel, username, numbOfSubs, methods, userstate) => {
		add_userNotice(channel, userstate.message, userstate);
	});
	// 구독 연장
	client.on("resub", (channel, username, months, message, userstate, methods) => {
		add_userNotice(channel, message, userstate);
	});
	client.on('primepaidupgrade', (channel, username, methods, userstate) => {
		add_userNotice(channel, userstate.message, userstate);
	});
	// Username gifted a subscription to recipient in a channel.
	client.on("subgift", (channel, username, streakMonths, recipient, methods, userstate) => {
		add_userNotice(channel, userstate.message, userstate);
	});

	client.on("raided", (channel, username, viewers) => {
		let subs = new UserNotice('raid', `[raid] ${username} is raiding with a party of ${viewers}`);
		const sub_container = subs.render_sub_container();
		add_msg_list(channel, sub_container);
	});

	client.on("subscribers", (channel, enabled) => {
		let message = '';
		if (enabled) {
			message = `#${channel} 구독자 전용 채팅이 활성화되었습니다.`;
		} else {
			message = `#${channel} 구독자 전용 채팅이 비활성화되었습니다.`;
		}
		const ircmsg = new IRC_Message(message);
		add_msg_list(channel, ircmsg.render_message());
	});

	client.on('hosting', (channel, target, viewers) => {
		const ircmsg = new IRC_Message(`#${target} 호스트 중.`);
		add_msg_list(channel, ircmsg.render_message());
	});

	client.on('notice', (channel, msgid, message) => {
		const ircmsg = new IRC_Message(message);
		add_msg_list(channel, ircmsg.render_message(), true);
	});

	client.on("emotesets", (sets, obj) => {
		let sets_arr = sets.split(',');
		for (let i = 0; i < sets_arr.length; i = i + 25) {
			tapi.get_emote_sets(sets_arr.splice(0, 25));
		}
	});

	channel_connect_btn.addEventListener('click', e => {
		if (!tapi.access_token) {
			const ircmsg = new IRC_Message(`로그인이 필요합니다.`);
			add_msg_list(null, ircmsg.render_message(), true);
			return;
		}
		joinChatRoom(channel_id_input.value);
		channel_id_input.value = '';
	});

	chat_text_send_btn.addEventListener('click', e => {

		const msg = chat_text_input.value;
		if (msg === '') return;

		const channels = client.getChannels();
		if (channels.length === 0) updateChatRoom(null);

		const channel = tapi.current_channel;

		if (!channel || channel === '') {
			const ircmsg = new IRC_Message(`연결된 채널이 없습니다.`);
			add_msg_list(null, ircmsg.render_message(), true);
			return;
		}

		client.say(channel, msg).then(c => {
			chat_text_input.value = '';
		});
	});

	channel_id_input.addEventListener('keyup', e => {
		if (e.key === 'Enter' || e.code == 'Enter') channel_connect_btn.click();
	});

	chat_text_input.addEventListener('keyup', e => {
		if (e.key === 'Enter' || e.code == 'Enter') chat_text_send_btn.click();
	});
	chat_text_input.addEventListener('focus', e => {
		// scrollDownChatList();
	});

	chat_list_origin.addEventListener("scroll", function () {
		origChatIsAtBottom = chat_list_origin.scrollTop + chat_list_origin.clientHeight >= chat_list_origin.scrollHeight - 40;
	}, false);
	chat_list_clone.addEventListener("scroll", function () {
		cloneChatIsAtBottom = chat_list_clone.scrollTop + chat_list_clone.clientHeight >= chat_list_clone.scrollHeight - 40;
	}, false);

	auth_info.addEventListener('click', e => {
		user_setting.classList.toggle('hidden');
	});

	twitch_login_btn_big.addEventListener('click', e=> {
		toggleLoginStatus();
	});
	twitch_login_btn_small.addEventListener('click', e=> {
		toggleLoginStatus();
	});

	setting_btn.addEventListener('click', e=> {
		setting_container.classList.remove('hidden');
		user_setting.classList.add('hidden');
	});

	dark_mode_btn.addEventListener('click', e=> {
		const chatColor = new ChatColor();

		const chatListContainer = document.getElementById('chat_list_container');
		const chat = chatListContainer.getElementsByClassName('chat');

		toggleTheme();

		for(let c of chat){
			const author = <HTMLSpanElement>c.getElementsByClassName('author')[0];
			if(!author) continue;

			const username = c.classList.item(1);
			author.style.color = chatColor.getReadableColor(username, null);
		}
	});

	reverse_chat_btn.addEventListener('click', e=> {
		let icon_text = 'arrow_upward';

		chat_list_origin.classList.toggle('reversed');
		chat_list_clone.classList.toggle('reversed');
		
		chat_order_reversed = !chat_order_reversed;

		if(chat_order_reversed){
			icon_text = 'arrow_downward';
		}
		document.getElementById('reverse_chat_btn_icon').textContent = icon_text;
		localStorage.setItem('reversed', JSON.stringify(chat_order_reversed));
	});

	flwStrCtl.addEventListener('click', e => {
		const target = e.target as HTMLButtonElement;
		if (target.tagName !== 'BUTTON') return;
		target.disabled = true;

		if (target.id === 'get_more_flw_str') {
			if (followed_streams_after === null) return;

			updateFollowedStream(tapi.user_id, followed_streams_after).then(res => {
				if (followed_streams_after !== null) {
					target.disabled = false;
				}
			});
		} else if (target.id === 'refresh_flw_str') {
			const get_more_flw_str = <HTMLButtonElement>document.getElementById('get_more_flw_str');
			Array.from(online_list.childNodes).forEach(o => { o.remove(); });

			updateFollowedStream(tapi.user_id).then(res => {
				get_more_flw_str.disabled = false;
				target.disabled = false;
			});
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
	
	tbc_file_input.addEventListener('change', loadTbcFile, false);

	font_size_examples.addEventListener('click', e=> {
		const target = <HTMLSpanElement>e.target;

		if(target.classList.contains('font_example')){
			let id = target.parentElement.id;
			setFontSize(id);
		}
	});

	handler.addEventListener('mousedown', startDrag);
    handler.addEventListener('touchstart', startDrag, {passive : true});

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

	document.addEventListener('click', e=> {
		const target = e.target as HTMLElement;

		if(!target.closest('#user_setting') && !target.closest('#auth_info')){
			user_setting.classList.add('hidden');
		}
		if(!target.closest('#sidebar') && !target.closest('#sidebar_btn')){
			closeSideBar();
		}
		if(!target.closest('#setting') && !target.closest('#setting_btn')){
			setting_container.classList.add('hidden');
		}

		e.stopPropagation();
	});

})();
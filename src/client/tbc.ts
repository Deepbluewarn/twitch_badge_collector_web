import type { Client, ClientBase, ClientConstructor, Options } from 'tmi.js';
import { Auth, CLIENT_ID } from './auth.js';
import { Twitch_Api } from './twitch_api.js'

let followed_streams_after = '';
let current_channel = '';

let auth_btn = document.getElementById('auth');
let sidebar_btn = document.getElementById('sidebar_btn');
let connect_chat_btn = <HTMLButtonElement>document.getElementById('connect_chat');

const TOKEN = Auth.get_token();

let tapi = new Twitch_Api(CLIENT_ID, TOKEN);

let tmi = (window as any).tmi;

let client: Client;
let tmi_client_obj: Options = {
	options: { debug: true, messagesLogLevel: "info" },
	connection: {
		reconnect: true,
		secure: true
	},
	identity: {
		username: 'justinfan4444',
		password: ''
	},
	channels: ['']
};

if (TOKEN !== '') {
	tapi.get_users().then(user => {
		let u = user['data'][0];
		let disp_name = document.getElementById('twitch_display_name');

		disp_name.innerText = u.display_name;
		auth_btn.textContent = '로그아웃';

		tapi.get_followed_streams(u.id).then(fs => {
			console.log(fs);
			followed_streams_after = fs.pagination;

			let followed_list = document.getElementById('followed_list');
			let online_list = followed_list.getElementsByClassName('channel_list online')[0];
			let fs_data = fs.data;
			for (let i = 0; i < fs_data.length; i++) {
				let dv = document.createElement('div');
				let sl = document.createElement('span');
				sl.innerText = fs_data[i].user_name + ` (${fs_data[i].user_login})`;
				dv.appendChild(sl);
				online_list.appendChild(dv);
			}
		}).catch(r => {
			Auth.logout();
		})
	}).catch(r => {
		Auth.logout();
	});
} else {
	auth_btn.textContent = '로그인';
}

client = new tmi.Client(tmi_client_obj);
client.connect().catch(console.error);

connect_chat_btn.disabled = false;

connect_chat_btn.addEventListener('click', e => {
	let channel = <HTMLInputElement>document.getElementById('channel_id');
	client.part(current_channel);
	current_channel = channel.value;
	client.join(channel.value);
});

client.on('message', (channel, tags, message, self) => {
	if (self) return;
});

auth_btn.addEventListener('click', e => {
	if (TOKEN !== '') {
		Auth.logout();
	} else {
		Auth.login();
	}
});

sidebar_btn.addEventListener('click', e => {
	let fl = document.getElementById('followed_list');
	fl.classList.toggle('hidden');
});

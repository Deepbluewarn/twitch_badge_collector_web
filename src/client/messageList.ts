import { CommonUserstate } from "tmi.js";
import { Filter } from "./filter";
import i18n from "./i18n";
import { Chat } from "./messages/chat";
import { IRC_Message } from "./messages/irc_message";
import { UserNotice } from "./messages/usernotice";
import { Twitch_Api } from "./twitch_api";

import { Etc } from './utils/etc';

class messageList{

		CHAT_COUNT = 144;
		CHAT_COUNT_MAX = 444;
		_origChatIsAtBottom = true;
		_cloneChatIsAtBottom = true;

		chat_list_container = document.getElementById('chat_list_container');
        chat_list_origin = <HTMLDivElement>this.chat_list_container.getElementsByClassName('chat_list origin')[0];
	    chat_list_clone = <HTMLDivElement>this.chat_list_container.getElementsByClassName('chat_list clone')[0];

		filter: Filter;
		tapi: Twitch_Api;
		origin: boolean;

    constructor(filter:Filter, tapi: Twitch_Api, origin: boolean){
		this.filter = filter;
		this.tapi = tapi;
		this.origin = origin;
    }

    /**
	 * 
	 * @param channel 
	 * @param html 
	 * @param isSysMsg 채널과 관계 없는 시스템 메시지이면 true.
	 * @returns 
	 */
	private addMessage(channel: string | null, html: HTMLElement, filter_type?: string, isSysMsg?: boolean) {
		isSysMsg = channel === null ? true : false;
		if (!isSysMsg && Etc.trim_hash(channel) !== Etc.trim_hash(this.tapi.current_channel)) {
			return;
		}

		filter_type = filter_type ? filter_type : '';
		const isFilterExist = filter_type !== '';
		const baseClassName = 'tbc_highlight';

		const chat_line = document.createElement('div');
		let className = isFilterExist ? baseClassName + '_' + filter_type : baseClassName;

		chat_line.classList.add('chat_line');
		chat_line.classList.add(className);
		// if(tmi_sent_ts){
		// 	chat_line.setAttribute('tmi-sent-ts', tmi_sent_ts.toString());
		// }
		
		chat_line.appendChild(html);
		
		if(isFilterExist || (!this.origin && isSysMsg)){
			let clone_chat = <HTMLDivElement>chat_line.cloneNode(true);
			this.chat_list_clone.appendChild(clone_chat);
			this.maintainChatCount(this.chat_list_clone);
			if (this._cloneChatIsAtBottom) this.scrollDownChatList(this.chat_list_clone);
		}
		if(this.origin){
			this.chat_list_origin.appendChild(chat_line);
			this.maintainChatCount(this.chat_list_origin);
			if (this._origChatIsAtBottom) this.scrollDownChatList(this.chat_list_origin);	
		}
	}

	addChatMessage(channel: string, message: string, userstate: CommonUserstate, self: boolean, replay_chat_offset?: number, replay?: boolean){
		const chat = new Chat(message, userstate, self, this.tapi, this.filter, replay_chat_offset, replay);
		this.addMessage(channel, chat.render_chat(), chat.checkFilter());
	}

	addIRCMessage(channel: string | null, message: string, sysmsg: boolean){
		const ircmsg = new IRC_Message(message);
		this.addMessage(channel, ircmsg.render_message(), null, sysmsg);
	}

	addUserNoticeMessage(channel: string, userstate: CommonUserstate, message?: string) {
		let subs = new UserNotice(userstate['message-type'], userstate['system-msg']);
		let filter_type = '';
		const sub_container = subs.render_sub_container();

		if (message || message === '') {
			const chat = new Chat(message, userstate, false, this.tapi, this.filter);
			filter_type = chat.checkFilter();
			sub_container.appendChild(chat.render_chat());
		}
		this.addMessage(channel, sub_container, filter_type);
	}

	private maintainChatCount(chat_list: HTMLDivElement) {
		if(!chat_list.classList.contains('chat_list')) return;

		const chatCount = chat_list.childElementCount;
		const atBottom = chat_list.classList.contains('origin') ? this._origChatIsAtBottom : this._cloneChatIsAtBottom;
		const maxCount = atBottom ? this.CHAT_COUNT : this.CHAT_COUNT_MAX;

		if(chatCount > maxCount){
			for(let c of Array.from(chat_list.childNodes)){
				if(chat_list.childElementCount > maxCount){
					c.remove();
				}
			}
		}
	}
	private scrollDownChatList(chat_list) {
		chat_list.scrollTop = chat_list.scrollHeight;
	}

	clearAllChat(line?: boolean) {
		Array.from(this.chat_list_origin.childNodes).forEach(c => {
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

	clearCopiedChat(){
		Array.from(this.chat_list_clone.childNodes).forEach(c => {
			c.remove();
		});
	}

	clearUserChat(username: string, line?: boolean) {
		Array.from(this.chat_list_origin.getElementsByClassName(username)).forEach(c => {
			if (line) {
				if (c.classList.contains('chat')) {
					c.classList.add('cancel_line');
				}
			} else {
				// c.remove();
				c.getElementsByClassName('chat_message')[0].textContent = `< ${i18n.t('tmi:messageDeleted')} >`;
			}
		});
	}
	set origChatIsAtBottom(bottom:boolean){
		this._origChatIsAtBottom = bottom;
	}
	set cloneChatIsAtBottom(bottom: boolean){
		this._cloneChatIsAtBottom = bottom;
	}
}

export { messageList };
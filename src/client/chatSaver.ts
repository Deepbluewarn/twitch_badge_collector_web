import * as htmlToImage from 'html-to-image';
import { Options } from 'html-to-image/lib/options';
import Swal from 'sweetalert2';
import * as swal_setting from './swal_setting';
import i18n from './i18n/index';
import { BroadcastChannel } from 'broadcast-channel';

const download = require('downloadjs');

const chatChannel = new BroadcastChannel('Chat');
const Toast = Swal.mixin(swal_setting.setting_def);

chatChannel.postMessage({
    type: 'REQUEST_CHATROOM_ID'
});

const selectChannel = <HTMLSelectElement>document.getElementById('select__channel');
const filenameInput = <HTMLInputElement>document.getElementById('input__filename');
const downloadBtn = <HTMLButtonElement>document.getElementById('download');

let theme = '';

let random = 0;
let channel = '';
let displayName = '';

chatChannel.onmessage = (msg) => {
    const type = msg.type;

    if(type === 'RESPONSE_CHATROOM_ID'){
        const option = document.createElement('option');
        channel = msg.channel;
        displayName = msg.displayName;
        random = msg.random;
        theme = msg.theme;

        option.value = `${random}-${channel}`;
        option.textContent = `${random} - ${displayName} (${channel})`;

        selectChannel.appendChild(option);
    }

    if(type === 'chatList'){
        const chatListContainer = document.getElementById('select__chat-list');
        const cl = chatListContainer.getElementsByClassName('chat_list');

        while(cl[0]){
            cl[0].parentNode.removeChild(cl[0]);
        }

        setTheme(theme);

        chatListContainer.insertAdjacentHTML('beforeend', msg.chatListXML);

        const chatListElem = <HTMLDivElement>chatListContainer.getElementsByClassName('chat_list')[0];

        for(let cl of Array.from(chatListElem.getElementsByClassName('chat_line'))){
            const chbox = document.createElement('input');
            chbox.type = 'checkbox';
            chbox.classList.add('chat__checkbox');
            chbox.checked = cl.classList.contains('tbc_highlight') ? false : true;
            
            cl.classList.add('chat-list__flex');
            cl.prepend(chbox);
        }
        setVisibleSelectHeader(true);
    }
}

selectChannel.addEventListener('change', e=> {
    const target = <HTMLOptionElement>e.target;

    chatChannel.postMessage({
        type: 'REQUEST_CHAT_LIST',
        id: target.value
    });
});

downloadBtn.addEventListener('click', async e=> {
    const selectChannel = <HTMLSelectElement>document.getElementById('select__channel');
    const chatListElem = <HTMLDivElement>document.getElementsByClassName('chat_list')[0];

    if(selectChannel.value === ''){
        Toast.fire(i18n.t('chatSaver:selectChatRoomError'), '', 'error');
        return;
    }
    if(!chatListElem){
        Toast.fire(i18n.t('chatSaver:noChatList'), '', 'error');
        return;
    }

    document.body.classList.add('noClick');
    document.getElementById('disable_bg').classList.remove('hidden');

    const ext = (document.getElementById('select__file-ext') as HTMLSelectElement).value;

    let width = (document.getElementById('input-width') as HTMLInputElement).value;

    width = width === '' ? '400' : width;
    chatListElem.style.width = `${width}px`;

    setAllChboxVisible(false);
    setChatListHeaderVisible(false);
    setUncheckedChatVisible(false);

    const options: Options = {
        backgroundColor : getChatThemeColor(theme)
    }

    try {
        let dataUrl;

        if(ext === 'png'){
            dataUrl = await htmlToImage.toPng(chatListElem, options);
        }else if(ext === 'jpeg'){
            dataUrl = await htmlToImage.toJpeg(chatListElem, options);
        }

        const channelSelectValue = selectChannel.value;
        const filenameInputValue = filenameInput.value;
        const filename = filenameInputValue === '' ? `${channelSelectValue}-${getDateString()}` : filenameInputValue;

        download(dataUrl, `${filename}.${ext}`);

        chatListElem.style.removeProperty('width');

        setAllChboxVisible(true);
        setChatListHeaderVisible(true);
        setUncheckedChatVisible(true);

        (document.getElementById('input__filename') as HTMLInputElement).value = '';

        document.getElementById('disable_bg').classList.add('hidden');
        document.body.classList.remove('noClick');
    } catch (error) {
        Toast.fire('Error', '', 'error');
    }
});

document.getElementById('refresh-chatList').addEventListener('click', e=> {
    chatChannel.postMessage({
        type: 'REQUEST_CHAT_LIST',
        id: selectChannel.value
    });
});

document.getElementById('checkbox__header').addEventListener('change', e => {
    const target = <HTMLInputElement>e.target;
    const checked = target.checked;

    setAllChbox(checked);
});


function setPageLanguage(){
    i18n.changeLanguage(navigator.language);
    document.getElementById('page-title').textContent = i18n.t('chatSaver:title', {APP_NAME : "Twitch Badge Collector"});
    document.getElementById('save-chat__title').textContent = i18n.t('chatSaver:saveChat');
    document.getElementById('chat-saver__desc-0').textContent = i18n.t('chatSaver:saveChat_description');
    document.getElementById('chat-saver__desc-1').textContent = i18n.t('chatSaver:saveChat_description_1', {settingName : i18n.t('chatSaver:insertChatClient')});
    document.getElementById('select__channel-disabled').textContent = i18n.t('chatSaver:selectChatRoom');
    (document.getElementById('input-width') as HTMLInputElement).placeholder = i18n.t('chatSaver:InputImageWidthPlaceholder');
    (document.getElementById('input__filename') as HTMLInputElement).placeholder = i18n.t('chatSaver:InputFilenamePlaceholder');
    document.getElementById('download').textContent = i18n.t('chatSaver:download');
    document.getElementById('select-chat__title').textContent = i18n.t('chatSaver:selectChat');
}
setPageLanguage();

function setVisibleSelectHeader(visible: boolean){
    if(visible){
        document.getElementById('select-chat__title').classList.remove('hidden');
        document.getElementById('chat-list__header').classList.remove('hidden');
    }else{
        document.getElementById('select-chat__title').classList.add('hidden');
        document.getElementById('chat-list__header').classList.add('hidden');
    }
}
function setAllChbox(checked: boolean){
    const chboxes = document.getElementsByClassName('chat_list')[0]
    .getElementsByClassName('chat__checkbox');
    
    for(let c of Array.from(chboxes)){
        (c as HTMLInputElement).checked = checked;
    }
}
function setAllChboxVisible(visible: boolean){
    const chboxes = document.getElementsByClassName('chat_list')[0]
    .getElementsByClassName('chat__checkbox');

    for(let c of Array.from(chboxes)){
        if(visible){
            (c as HTMLInputElement).classList.remove('hidden')
        }else{
            (c as HTMLInputElement).classList.add('hidden');
        }
    }
}
function setChatListHeaderVisible(visible: boolean){
    
    const header = document.getElementById('chat-list__header');

    if(visible){
        header.classList.remove('hidden');
    }else{
        header.classList.add('hidden');
    }
}
function setUncheckedChatVisible(visible: boolean){

    const chatLine = document.getElementsByClassName('chat_line');

    for(let cl of Array.from(chatLine)){
        const chbox = <HTMLInputElement>(cl as HTMLDivElement).getElementsByClassName('chat__checkbox')[0];
        
        if(!chbox.checked){
            if(visible){
                (cl as HTMLDivElement).classList.remove('hidden');
            }else{
                (cl as HTMLDivElement).classList.add('hidden');
            }
        }

    }
}

function setTheme(theme: string){
    let th = '';
    if(theme === 'dark'){
        th = 'dark_theme';
    }else{
        th = 'light_theme';
    }
    document.documentElement.className = th;
}

function getChatThemeColor(theme) {
    return theme === 'dark' ? '#18181b' : '#ffffff'
}
function getDateString(){
    const date = new Date();
    const mm = date.getMonth() + 1;
    const dd = date.getDate();
    const t = date.getHours();
    const m = date.getMinutes();
    const s = date.getSeconds();
    const time = ((t < 10) ? "0" : "") + t + ((m < 10) ? "0" : "") + m + ((s < 10) ? "0" : "" ) + s;

    return [date.getFullYear(), (mm>9 ? '' : '0') + mm, (dd>9 ? '' : '0') + dd, time].join('');
}
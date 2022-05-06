import { ChatColor } from "./chatColor";

export function setFontSize(id: string){
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

export function setTheme(theme: string){
    let th = '';
    if(theme === 'dark'){
        th = 'dark_theme';
    }else{
        th = 'light_theme';
    }
    document.documentElement.className = th;
    updateChatColor();
}

export function updateChatColor(){
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
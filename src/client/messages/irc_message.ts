class IRC_Message{
    text: string;

    constructor(text: string){
        this.text = text;
    }

    render_message(){
        let div = document.createElement('div');
        let irc_msg_span = document.createElement('span');

        div.classList.add('chat', 'irc_message');
        irc_msg_span.classList.add('irc_message_span');

        irc_msg_span.textContent = this.text;
        
        div.appendChild(irc_msg_span);
        return div;
    }
}

export {IRC_Message};
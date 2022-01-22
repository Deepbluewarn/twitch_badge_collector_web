class UserNotice{
    msg_id: string;
    system_msg: string;
    
    constructor(msg_id: string, system_msg: string){
        this.msg_id = msg_id;
        this.system_msg = system_msg;
    }

    render_sub_container(){
        const sub_container = document.createElement('div');
        const sysmsg_span = document.createElement('span');

        sub_container.classList.add('usernotice', this.msg_id);
        sysmsg_span.classList.add('system_msg');
        sysmsg_span.textContent = this.system_msg;

        sub_container.appendChild(sysmsg_span);

        return sub_container;
    }
}

export {UserNotice};
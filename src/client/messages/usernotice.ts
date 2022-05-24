class UserNotice{
    msg_id: string;
    system_msg: string;

    renderSubscribeContainer(msg_id: string, system_msg: string){
        const sub_container = document.createElement('div');
        const sysmsg_span = document.createElement('span');

        sub_container.classList.add('usernotice', msg_id);
        sysmsg_span.classList.add('system_msg');
        sysmsg_span.textContent = system_msg;

        sub_container.appendChild(sysmsg_span);

        return sub_container;
    }
    renderAnnouncementContainer(msg: string, color: string){
        const container = document.createElement('div');
        const announceTitle = document.createElement('div');
        const campaign = document.createElement('span');
        const titleText = document.createElement('span');

        campaign.classList.add('material-icons-round');
        campaign.textContent = 'campaign';

        titleText.textContent = '공지';

        announceTitle.classList.add('announce_title');
        announceTitle.appendChild(campaign);
        announceTitle.appendChild(titleText);

        // const message = document.createElement('span');
        
        container.classList.add('announcement');

        container.appendChild(announceTitle);
        // container.appendChild(message);

        // message.textContent = msg;

        return container;
    }
}

export {UserNotice};
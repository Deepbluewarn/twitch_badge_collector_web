class Twitch_Api {
    client_id: string;
    auth_token: string;

    constructor(c_id: string, token: string){
        this.client_id = c_id;
        this.auth_token = token;
    }
    
    get_users(){
        return fetch(`https://api.twitch.tv/helix/users`, {
            method: 'GET',
            headers: {
                'Authorization' : 'Bearer ' + this.auth_token,
                'Client-Id' : this.client_id
            }
        }).then(res=>{
            if(!res.ok){
                return Promise.reject(res);
            }else{
                return res.json();
            }
        })
    }

    get_followed_streams(user_id: string, after?: string){
        let a = `&after=${after}`;
        if(!after || after === ''){
            a = '';
        }
        return fetch(`https://api.twitch.tv/helix/streams/followed?user_id=${user_id}` + a, {
            method: 'GET',
            headers: {
                'Authorization' : `Bearer ${this.auth_token}`,
                'Client-Id' : this.client_id
            }
        }).then(res=>{
            if(!res.ok){
                return Promise.reject(res);
            }else{
                return res.json();
            }
        })
    }
    
    get_users_follows(user_id: string, after?: string){
        let a = `&after=${after}`;
        if(!after || after === ''){
            a = '';
        }
        let url = `https://api.twitch.tv/helix/users/follows?from_id=${user_id}` + a;
        return fetch(url, {
            method: 'GET',
            headers: {
                'Authorization' : `Bearer ${this.auth_token}`,
                'Client-Id' : this.client_id
            }
        }).then(res =>{
            if(!res.ok){
                return Promise.reject(res);
            }else{
                return res.json();
            }
        })
    }
}

export {Twitch_Api}
const REDIRECT_URI = 'https://wtbc.bluewarn.dev';
const CLIENT_ID = 'qrh8nkx7bzpij23zdudqsh05wzi9k0';
const AUTH_SCOPE = 'chat:edit+chat:read+user:read:follows+user:read:subscriptions';

class Auth {
    static get_token(){
        return fetch(`${REDIRECT_URI}/token`, {
            method: 'POST'
        }).then(res=>{
            history.replaceState({}, '', location.pathname);
            return res.json();
        });
    }

    /**
     * 
     * @param cstate client state. For OAuth Authorization Code Flow CSRF prevention.
     */
    static login(cstate: string){
        location.replace(`${REDIRECT_URI}/login?cstate=${cstate}`);
    }
    
    static logout(){
        location.replace(`${REDIRECT_URI}/logout`);
    }

    static token_refresh(){
        return fetch(`${REDIRECT_URI}/token/refresh`, {
            method: 'POST'
        }).then(res=>{
            if(!res.ok) return Promise.reject();
            return res.json();
        });
    }
}

export {Auth, REDIRECT_URI, CLIENT_ID, AUTH_SCOPE};
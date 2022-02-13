import Swal from 'sweetalert2';
import * as swal_setting from './swal_setting';

const REDIRECT_URI = 'https://wtbc.bluewarn.dev';
const CLIENT_ID = 'qrh8nkx7bzpij23zdudqsh05wzi9k0';
const AUTH_SCOPE = 'chat:edit+chat:read+user:read:follows+user:read:subscriptions';

class Auth {

    Toast = Swal.mixin(swal_setting.setting_def);
    
    get_token(){
        return fetch(`${REDIRECT_URI}/token`, {
            method: 'POST'
        }).then(res=>{
            history.replaceState({}, '', location.pathname);
            return res.json();
        }).catch(err => {
            this.onError();
        });
    }

    /**
     * 
     * @param cstate client state. For OAuth Authorization Code Flow CSRF prevention.
     */
    login(cstate: string){
        location.replace(`${REDIRECT_URI}/login?cstate=${cstate}`);
    }
    
    logout(){
        location.replace(`${REDIRECT_URI}/logout`);
    }

    token_refresh(){
        return fetch(`${REDIRECT_URI}/token/refresh`, {
            method: 'POST'
        }).then(res=>{
            if(!res.ok) return Promise.reject();
            return res.json();
        }).catch(err => {
            this.onError();
        });
    }

    private onError(){
        this.Toast.fire({
            icon : 'error',
            title : '서버 오류',
            text : '알 수 없는 오류.'
        });
    }
}

export {Auth, REDIRECT_URI, CLIENT_ID, AUTH_SCOPE};
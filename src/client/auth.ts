const REDIRECT_URI = 'https://wtbc.bluewarn.dev/';
const CLIENT_ID = 'qrh8nkx7bzpij23zdudqsh05wzi9k0';
const AUTH_SCOPE = 'chat:edit+chat:read+user:read:follows+user:read:subscriptions';

class Auth {
    static get_token(){
        let token = document.location.hash.split('&')[0].replace('#access_token=', '');
        let cookie_token = (document.cookie.split('; ').find(row => row.startsWith('tbc_oauth_token')))?.split('=')[1];
    
        if (token && token !== '') {
            document.cookie = 'tbc_oauth_token=' + token;
            history.replaceState(null, '', location.pathname);
            return token;
        }
        if (cookie_token && cookie_token !== '') {
            return cookie_token;
        }
    
        return '';
    }

    static login(){
        location.replace(`https://id.twitch.tv/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=token&scope=${AUTH_SCOPE}&force_verify=false`);
    }
    
    static logout(){
        document.cookie = 'tbc_oauth_token=' + '';
        location.replace(location.pathname);
    }
}

export {Auth, REDIRECT_URI, CLIENT_ID, AUTH_SCOPE};
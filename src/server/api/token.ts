import dotenv from "dotenv";
dotenv.config();

import axios from "axios";
import logger from '../utils/logger';
import { redisSessClient } from '../redis_client.js';
import { Twitch_Api } from '../api/twitchApi';

const tapi = new Twitch_Api();


getAppAccessToken();

setInterval(() => {
    getAppAccessToken();
}, 86400000 * 10); // 10일에 한번씩 실행.

function getAppAccessToken(){
    logger.info('getAppAccessToken started');

    const params = new URLSearchParams();
    params.append('client_id', process.env.CLIENT_ID);
    params.append('client_secret', process.env.CLIENT_SECRET);
    params.append('grant_type', 'client_credentials');

    const url = `https://id.twitch.tv/oauth2/token?${params}`;

    axios.post(url).then(async token => {
        const currentToken = await redisSessClient.get(process.env.APP_ACCESS_TOKEN_KEY);
        const newToken = token.data.access_token;

        redisSessClient.set(process.env.APP_ACCESS_TOKEN_KEY, newToken);
        redisSessClient.publish(process.env.TOKEN_PUBLISH_CHANNEL, newToken);

        logger.info('getAppAccessToken token renewed');

        if(currentToken){
            tapi.revoke_token(currentToken).then(res => {
                logger.info('getAppAccessToken current token revoked.');
            });
        }
    }).catch(err => {
        logger.error(`App Access Token 을 가져오는 중 에러가 발생했습니다. ${JSON.stringify(err.response.data)}`);
    });
}
import express from 'express';
import path from 'path';
import session from 'express-session';
import {redisClient} from './redis_client.js';

const router = require('./router');
const app = express();

let RedisStore = require('connect-redis')(session);

app.use(session({
	name: 'sessionId',
	store: new RedisStore({
		client: redisClient,
		ttl : 3 * 60 * 60
	}),
	secret: 'nanayang',
	resave: false,
	saveUninitialized: false,
	cookie: {
		secure: true,
		httpOnly: true,
		domain: 'wtbc.bluewarn.dev'
	}
}));

// Caddy -> Express 로 들어오는 요청은 http 이기 때문에 secure 세션을 사용하기 위해서는
// 프록시로 부터 들어오는 요청 헤더의 값을 신뢰할 수 있도록 설정해야 한다.
// X-Forwarded-Proto header 로 protocol 확인.
app.set('trust proxy', 1); // Proxy 를 사용하는 경우 필요한 설정.
app.disable('x-powered-by');
app.use('/', router);
app.use('/static', express.static(path.join(__dirname, '../src', 'public')));

app.listen('4488', () => {
	console.log(`
  		################################################
  		🛡️  Server listening on port: 4488  🛡️
  		################################################
	`);
});
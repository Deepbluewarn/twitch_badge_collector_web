import dotenv from "dotenv";
dotenv.config();

import express from 'express';
import session from 'express-session';
import { redisSessClient } from './redis_client.js';
import path from 'path';
import logger from './utils/logger';
import morgan_logger from './utils/morgan_logger';
import axios from 'axios';
import { apiProxy, undocApiProxy, checkCacheAvailable} from './proxy';

const router = require('./router');
const app = express();

let RedisStore = require('connect-redis')(session);


app.use(session({
	name: 'sessionId',
	store: new RedisStore({
		client: redisSessClient,
		ttl : 4 * 60 * 60
	}),
	secret: process.env.SECRET,
	resave: false,
	saveUninitialized: false,
	cookie: {
		maxAge: 1000 * 60 * 60 * 4,
		secure: true,
		httpOnly: true,
		domain: 'wtbc.bluewarn.dev'
	}
}));

app.use(morgan_logger);

// Caddy -> Express 로 들어오는 요청은 http 이기 때문에 secure 세션을 사용하기 위해서는
// 프록시로 부터 들어오는 요청 헤더의 값을 신뢰할 수 있도록 설정해야 한다.
// X-Forwarded-Proto header 로 protocol 확인.
app.set('trust proxy', 1); // Proxy 를 사용하는 경우 필요한 설정.
app.disable('x-powered-by');
app.use('/api', checkCacheAvailable, apiProxy);
app.use('/udapi', checkCacheAvailable, undocApiProxy);
app.use('/', router);
app.use('/static', express.static(path.join(__dirname, '../src', 'public')));

app.use((req,res,next) => {
    res.status(404).send("PAGE NOT FOUND");
    logger.error(`400 || ${res.statusMessage} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
});

app.use((err,req,res,next) => {
	if(axios.isAxiosError(err)){
		if(err.response){
			const status = err.response.status;
			const data = err.response.data;

			res.status(err.response.status).json(err.response.data);
			logger.error(`Axios response error. status : ${status}, data : ${data}`);
		}else if(err.request){
			const msg = err.message;
			res.status(500).json(msg);
			logger.error(`Axios request error. msg : ${msg}`);
		}else{
			res.status(500).json({status : false});
			logger.error(`Axios unknown error.`);
		}
	}else{
		logger.error(`${err.status || 500} - ${res.statusMessage} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
		res.status(500).send({status : false});
	}
});

app.listen('4488', () => {
	logger.info('Server listening on port: 4488');
});
import morgan, { StreamOptions } from "morgan";

import logger from "./logger";

const stream: StreamOptions = {
  write: (message) => logger.http(message)
};
const combined = ':cf-connecting-ip - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"';
const morganMiddleware = morgan(
    combined,
    { stream }
);

morgan.token('cf-connecting-ip', (req, res) => {
    return JSON.stringify(req.headers['cf-connecting-ip']);
});

export default morganMiddleware;
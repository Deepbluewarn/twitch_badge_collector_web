import { createLogger, format, transports } from 'winston';
import path from 'path';
import WinstonDaily from 'winston-daily-rotate-file';

const { combine, timestamp, prettyPrint, printf, colorize, label, errors } = format;

const logDir = 'logs';

const logFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  printf((info) => {
    if (info.stack) {
      return `${info.timestamp} ${info.level}: ${info.message} \n Error Stack: ${info.stack}`
    }
    return `${info.timestamp} ${info.level}: ${info.message}`
  })
);

const consoleOpts = {
  handleExceptions: true,
  level: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
  format: combine(
    colorize({ all: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' })
  )
}

const transpt = [
  new WinstonDaily({
    level: 'error',
    datePattern: 'YYYY-MM-DD',
    filename: '%DATE%.error.log',
    dirname: path.join(logDir, '/error'),
    maxFiles: 30,
    zippedArchive: true
  }),
  // 모든 레벨 로그를 저장할 파일 설정
  new WinstonDaily({
    level: 'debug',
    datePattern: 'YYYY-MM-DD',
    filename: '%DATE%.all.log',
    dirname: path.join(logDir, '/all'),
    maxFiles: 7,
    zippedArchive: true
  })
]

const logger = createLogger({
  format: logFormat,
  transports: transpt
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console(consoleOpts));
}
export default logger;
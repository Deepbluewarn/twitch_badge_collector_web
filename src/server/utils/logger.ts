import { createLogger, format, transports } from 'winston';

const { combine, timestamp, prettyPrint, printf, label, errors } = format;

const myFormat = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] ${level}: ${message}`
});

const options = {
  file: {
    level: 'info',
    filename: `logs/tbc-info.log`,
    handleExceptions: true,
    json: false,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    colorize: false,
    format: combine(
        label({ label: 'express' }),
        timestamp(),
        myFormat
    )
  },
  http: {
    level: 'http',
    filename: `logs/tbc-http.log`,
    handleExceptions: true,
    json: false,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    colorize: false,
    format: combine(
        label({ label: 'express' }),
        timestamp(),
        myFormat
    )
  },
  error: {
    level: 'error',
    filename: `logs/tbc-error.log`,
    handleExceptions: true,
    json: false,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    colorize: false,
    format: combine(label({ label: 'express' }), timestamp(), errors(), myFormat),
  },
  console: {
    level: 'debug',
    handleExceptions: true,
    json: false,
    colorize: true,
    format: combine(label({ label: 'express' }), timestamp(), myFormat),
  },
}

const logger = createLogger({
  format: combine(format.json(), timestamp(), prettyPrint()),
  transports: [
      new transports.File(options.file),
      new transports.File(options.http),
      new transports.File(options.error)
    ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console(options.console));
}
export default logger
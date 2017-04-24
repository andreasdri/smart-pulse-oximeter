const winston = require('winston');

const logger = new (winston.Logger)({ exitOnError: false });
logger.add(winston.transports.File, { filename: 'pulse-oximeter.log',
  humanReadableUnhandledException: true, handleExceptions: true, level: 'debug' });

module.exports = logger;


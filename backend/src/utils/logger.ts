type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

const isDev = (process.env.NODE_ENV || 'development') === 'development';
const isTest = process.env.NODE_ENV === 'test';

function log(level: LogLevel, message: string, meta?: unknown): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta !== undefined ? { meta } : {}),
  };
  if (level === 'ERROR') {
    console.error(JSON.stringify(entry));
  } else if (level === 'WARN') {
    console.warn(JSON.stringify(entry));
  } else {
    if (!isTest) {
      console.log(JSON.stringify(entry));
    }
  }
}

export const logger = {
  info:  (msg: string, meta?: unknown) => log('INFO',  msg, meta),
  warn:  (msg: string, meta?: unknown) => log('WARN',  msg, meta),
  error: (msg: string, meta?: unknown) => log('ERROR', msg, meta),
  debug: (msg: string, meta?: unknown) => {
    if (isDev) log('DEBUG', msg, meta);
  },
};

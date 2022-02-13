import { Session } from 'express-session';

declare module 'express-session' {
 interface Session {
    cstate: string;
    access_token: string;
    refresh_token: string;
    lastTokenRefreshTime: number;
    expire_time: string;
  }
}
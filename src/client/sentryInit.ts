import * as Sentry from "@sentry/browser";
import { BrowserTracing } from "@sentry/tracing";
import { RewriteFrames as RewriteFramesIntegration } from "@sentry/integrations";

Sentry.init({
  dsn: "https://0361dbd0abb844de811e4bfc87cabc7b@o1197178.ingest.sentry.io/6319987",
  release: '4.4.4',
  integrations: [
    new BrowserTracing(),
    // new RewriteFramesIntegration({
    //   root: ''
    // })
  ],
  tracesSampleRate: 1.0,
});
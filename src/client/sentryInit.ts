import * as Sentry from "@sentry/browser";
import { BrowserTracing } from "@sentry/tracing";
import { RewriteFrames as RewriteFramesIntegration } from "@sentry/integrations";

Sentry.init({
  dsn: "https://b2bb2ee45ae34702936b2e947fcecf0f@o1197585.ingest.sentry.io/6320366",
  integrations: [
    new BrowserTracing(),
    new RewriteFramesIntegration({
      iteratee: (frame) => {
        frame.filename = `~/src/public/js/${frame.filename.substring(frame.filename.lastIndexOf('/') + 1)}`
        return frame;
      }
    })
  ],
  release: '4.4.4',
  tracesSampleRate: 1.0,
});
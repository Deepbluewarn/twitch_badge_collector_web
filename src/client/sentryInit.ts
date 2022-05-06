import * as Sentry from "@sentry/browser";
import { BrowserTracing } from "@sentry/tracing";
import { RewriteFrames as RewriteFramesIntegration } from "@sentry/integrations";

Sentry.init({
  dsn: "https://da96ed5441eb4dbca97e876327b7efdb@sentry.bluewarn.dev/2",
  integrations: [
    new BrowserTracing(),
    new RewriteFramesIntegration({
      iteratee: (frame) => {
        frame.filename = `~/src/public/js/${frame.filename.substring(frame.filename.lastIndexOf('/') + 1)}`
        return frame;
      }
    })
  ],
  release: '1.4.8',
  tracesSampleRate: 0.25,
});
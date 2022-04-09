import * as Sentry from "@sentry/browser";
import { BrowserTracing } from "@sentry/tracing";
import { RewriteFrames as RewriteFramesIntegration } from "@sentry/integrations";

Sentry.init({
  dsn: "https://a2bdedda18e64b42a825cdc515cff139@o1191182.ingest.sentry.io/6312438",
  integrations: [
    new BrowserTracing(),
    new RewriteFramesIntegration()
  ],
  tracesSampleRate: 1.0,
});
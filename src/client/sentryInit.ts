import * as Sentry from "@sentry/browser";
import { BrowserTracing } from "@sentry/tracing";

Sentry.init({
  dsn: "https://b2bb2ee45ae34702936b2e947fcecf0f@o1197585.ingest.sentry.io/6320366",
  integrations: [
    new BrowserTracing(),
  ],
  tracesSampleRate: 1.0,
});
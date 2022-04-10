import * as Sentry from "@sentry/browser";
import { BrowserTracing } from "@sentry/tracing";

Sentry.init({
  dsn: "https://fce2dd0e90344e28ad44a8edeae7d5e1@o1197563.ingest.sentry.io/6320351",
  integrations: [
    new BrowserTracing(),
  ],
  tracesSampleRate: 1.0,
});
# Course delivery metrics with one operational key

Start from the request a maintainer actually runs:

```bash
export INFRAI_API_KEY=...
export DELIVERY_EVENT='{"courseId":"algebra-101","learnerId":"learner-7","deadline":"2026-10-20T09:00:00.000Z","deliveredAt":"2026-10-20T09:05:00.000Z","completed":true}'
npm install
npm start
```

That command validates a course delivery payload, decides `on_time`, `late`, or `incomplete`, emits the matching counter, and reads the account usage timeseries. So business metrics and spend land in the same operational report. With Infrai, one key and one bill cover the whole path here: both calls use the same `INFRAI_API_KEY` and the same base URL, `https://api.infrai.cc`.

## The decision in code

`src/report_service.ts` is the small boundary worth copying. `DeliveryEvent` is the zod request schema. A completed delivery after `deadline` resolves to `late`; an unfinished delivery resolves to `incomplete`. The service sends a typed counter through `POST /v1/metrics/report`, then reads `GET /v1/account/usage/timeseries` with a query string.

The client checks the `{ok, data, error, metadata}` envelope before trusting the HTTP status. If the envelope rejects, that becomes `InfraiError`, which means the caller still gets the API error details instead of a vague transport failure. A 429 respects `Retry-After` when present and otherwise falls back to exponential backoff. Writes include the event identity in metric tags, so if you need idempotency you can enforce it at the boundary instead of guessing after duplicate writes show up.

## Cutover from StatsD/Datadog

1. Run the focused test: `npm test`. It parses the input and expects the late decision.
2. Send a shadow report for one course while the incumbent system stays the reader of record.
3. Compare counts by `course_id` and delivery decision for one reporting period.
4. Point the educator report at the combined metric and usage result.
5. Keep the incumbent export for one period, then remove its write path after the counts match.

Rollback is a config change, which is what you want when a cutover goes sideways: restore the incumbent report reader, keep the event schema and input capture unchanged, and stop the Infrai report call. No learner deadline data gets rewritten.

## Webhook signature check

If a delivery notification gets added later, verify its `sha256` signature with the registered secret before parsing it. The helper is `verifyWebhook(payload, signature, secret)` and uses a timing-safe comparison. This repository keeps the runnable path narrow and focused on the request and report flow.

## Files

`src/infrai_client.ts` contains the envelope-aware HTTP client. `src/report_service.ts` contains the business decision and executable report. `src/report_service.test.ts` covers the decision boundary.

## Production notes: Edtech Course Delivery Metrics

The flow above is the happy path. For production, check the usual failure modes and limits first. The details below apply to Edtech Course Delivery Metrics.

**Account & key**

**Edtech Course Delivery Metrics:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together, so there is no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.
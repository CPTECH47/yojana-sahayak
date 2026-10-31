# WhatsApp admission and model-call savings

The bot checks admission before downloading a recording, calling Sarvam, or entering the conversation handler. Routine questionnaire replies remain valid, including repeated `1` or `2` answers with different WhatsApp event IDs.

| Control | Current default | What the person sees |
| --- | --- | --- |
| Work per chat | One active request, including download and sending | Wait for the previous reply before sending another message |
| Text token bucket | Burst of 8; refills at 30 messages/minute | A short wait time if the bucket is empty |
| Voice token bucket | Burst of 2; refills at 6 recordings/minute; also consumes a text token | Wait or type instead |
| Global admission | Four active requests across chats | A brief busy response |
| Denial notice | At most one per chat every 15 seconds | No repeated warning flood |
| Duplicate event | Durable delivery ID check plus temporary ingress ID cache | Silently skipped; audio is not downloaded |
| Factual model selection | Up to 200 successful ID selections, five-minute TTL | Same cited answer without repeating the model call |

These are refill rates, not fixed-window totals. A fresh bucket permits a short burst above the ongoing refill rate. One chat cannot occupy several model or transcription slots concurrently. Rejected events are not queued for later application to a questionnaire; users resend after the reply or requested wait. This avoids stale answers advancing the next question. The existing bounded delivery queue and durable at-most-once send handling remain.

The answer cache key hashes the exact normalized question, resolved scheme, language, topic, candidate records and their current evidence digests. Every request still loads and validates sources and retrieves relevant records before checking the cache. Final text and citations come from the current approved records. Identical concurrent factual questions share the pending model call. Profiles, eligibility recommendations, recordings, unsupported responses, errors and model fallback results are not cached. No recording is retained for cache reuse.

Admission counters are local to one bot process and reset at restart. Durable delivered-event records survive restart. A deployment with several bot processes needs shared counters/locks to enforce the same limits across them. The controls reduce accidental bursts and abuse; they do not promise complete protection from distributed traffic or a fixed provider bill.

## Private tester exemptions

Set `YOJANA_TEST_ALLOWLIST` in the ignored `.env` to comma-separated international phone numbers (country code required, optional `+`), then restart the bot. The repository's `.env.example` leaves this empty; real tester numbers must never be added to tracked files. Clear the variable and restart when testing ends.

Listed testers bypass only the text and voice token buckets. Event-ID deduplication, one active request per chat, global concurrency, message/media size limits and source checks remain enforced. Rapid messages sent before a previous reply finishes still receive the busy response; this prevents overlapping questionnaire answers or paid transcription work.

Identity is taken from a direct phone JID, or Baileys `message.key.senderPn` when the direct chat uses a LID. A numeric LID, display name, user-written number or group participant does not establish an exemption. When the transport supplies no phone identity, the normal quotas apply. Exempt voice use still consumes provider credits.

Implementation: `server/whatsapp-guard.mjs`, `server/whatsapp-ingress.mjs`, `server/answer-service.mjs`, and the Baileys entry point. Limits are constructor options in the guard. Source-bound caching is configurable using `selectionCacheMaximum` and `selectionCacheTtlMs` in `createAnswerService`; zero capacity disables retained selection caching.

Verification uses fake clocks, synthetic event IDs and mocked media/model calls. It checks suppression before audio download, bounded state, retry and recovery, one in-flight request, repeated numeric answers, concurrency sharing, cache expiry and changed/expired evidence. Do not run a spam test against real WhatsApp accounts or spend Sarvam credits to validate these controls.

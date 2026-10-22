# Validation record

Date: 2026-10-22 (Asia/Singapore)

## Verified on the remote 3090 host

- Host: `3090-4node-jump`; project: `/zzl_data/wzp/scopepay`.
- Dedicated project runtime: Node.js **24.22.1**, without replacing system Node.js 20.20.2.
- `npm ci`: completed; install audit reported **0 vulnerabilities** at the time of installation.
- `npm test`: **28 passed, 0 failed**, using test doubles for AI and PayPal.
- `npm run build`: production build completed.
- App runs in tmux session `scopepay`, listening on `127.0.0.1:4181`.
- Remote `/api/health` returned `{"ok":true}`.
- No new GPU model process was started.

## Initial browser checks (before credentials were configured)

Checked in a real Chromium browser through an SSH tunnel to the remote server:

- Desktop viewport: **1440 × 1050**; merchant workspace and customer checkout inspected.
- Mobile viewport: **390 × 844**; merchant and customer layouts inspected, with no horizontal overflow.
- Loaded the explicitly labeled example (no model call).
- Changed landing-page quantity from 1 to 2; total updated from $900 to $1,500.
- Saved and refreshed; the $1,500 draft remained in the quote list.
- Restored quantity to 1, checked merchant review, and approved; final locked total was $900.
- Opened the dedicated customer page. Its PayPal button was correctly disabled because sandbox credentials were not configured.
- Quote approval persisted across a server restart.
- Browser console: **0 errors, 0 warnings** after fixing bundled font CSP handling.
- The original `merchant-*` and `customer-*` screenshots show example data from this initial check. They are not proof of a model call or a payment.

## Local Qwen integration

- Reused existing Qwen3-Coder-30B-A3B-Instruct Q4_K_M weights with llama.cpp commit `620d222`.
- Dedicated tmux session `scopepay-qwen`; loopback endpoint `127.0.0.1:4182`; 16 CPU threads, no GPU offload. Other GPU workloads were retained.
- The app now supports OpenAI-compatible schema-constrained Chat Completions in addition to Anthropic Messages.
- A real browser request produced and persisted a $900 café quote with `provider: ai` and the local model name. It remains a draft, separate from the example used for the PayPal order.
- Initial inspection found assumed quantities in an unclear request. The output schema now separates ready and clarification states; a clarification response cannot include service lines. The development check was strengthened to require zero items and a zero total as well as questions.
- Final real-model development check: **3/3 passed**. Café: $900; personal brand: $1,280 with no copywriting; unclear brief: no service lines, $0, clarification questions. Observed request times were 26.7 s, 22.8 s, and 12.1 s on CPU. Full output and individual checks: `ai-development-check.json`.
- A second real browser request for an undecided website, online store, and social posts produced no service lines, a $0 total, and clarification questions. Approval stayed disabled. Evidence: `screenshots/qwen-clarification.png` and `screenshots/qwen-clarification-approval.png`; `screenshots/qwen-live-quote.png` shows the café result.
- These three development cases are not a general quality or performance benchmark.

## PayPal sandbox API verification — completed

- Sandbox OAuth returned HTTP 200 using the privately configured application. No tokens or secrets were logged.
- Created a $900.00 USD order through the running application, using the labeled example quote. This was not an AI-generated quote.
- PayPal initially returned `PAYER_ACTION_REQUIRED`; the quote reference matched the persisted approved quote.
- Repeated checkout returned the same approval URL and reused the existing order.
- The customer page now exposes the enabled **Continue with PayPal** button; `screenshots/paypal-button-location.png` records this configured state. A subsequent provider read still returned `PAYER_ACTION_REQUIRED`, and the app remained in `CHECKOUT` with no verified receipt.
- First receipt check at **2026-10-22 19:41 Singapore time**: PayPal still returned `PAYER_ACTION_REQUIRED`; no payer, captures, or stored receipt were present. The browser error code was `CANNOT_PAY_SELF`, indicating the sender and receiver were the same account. This unsuccessful attempt is preserved in `paypal-receipt-check-20261022.json`.
- After the user switched to a separate Personal sandbox buyer, PayPal captured **$900.00 USD** at **2026-10-22 19:49:57 Singapore time**. The order and its single capture both returned `COMPLETED`; the application persisted `PAID` with the same verified receipt.
- The amount, currency, order reference, capture status, and stored receipt matched. Capture ID: `4VR026808H2209345`. Sanitized provider verification: `paypal-receipt-success-check-20261022.json`.
- Two repeated application capture callbacks each returned HTTP 200 and the same receipt. Afterwards, PayPal still exposed exactly one capture and the application retained exactly one paid event.
- The customer page showed **Payment confirmed**, the matching amount and capture ID. Refreshing retained the same paid receipt. Full-page evidence: `screenshots/paypal-verified-receipt.png`.
- This is a completed sandbox transaction on the labeled example quote; no real money moved. Real Qwen generation was verified separately, as described above.

## Final demo — same AI quote through payment

- Quote prefix **A1B1CF** was generated by the local Qwen model from the detailed Daybreak Coffee brief. Its stored provider is `ai`.
- The initial proposal included three unnecessary extra revision rounds: $1,170 total. The merchant removed that $270 line, saved the correction, reviewed the assumptions, and approved **$900 USD**. This correction is preserved in the video; schema conformance did not guarantee semantic correctness.
- The user completed approval with a separate Personal sandbox buyer. The buyer sign-in and approval screen are not included in the recording.
- PayPal capture **7KJ68783N07808125** completed at **2026-10-22T12:10:10Z** (20:10:10 Singapore time). A fresh provider read at 12:10:28Z returned `COMPLETED`, one capture, and a receipt identical to the stored application's `PAID` result.
- Customer UI displayed the same amount, capture ID, title, and quote reference. Refresh retained the paid receipt. Evidence: `final-demo-payment-verification.json` and `screenshots/final-ai-paid-receipt.png`.
- A second recorded unclear brief produced no service lines, $0, and clarification questions. Approval remained disabled even with the review checkbox checked.
- Final video consists of actual browser captures, editorial title cards, and English synthetic narration. Waiting is condensed; the off-screen PayPal buyer step is labeled. No payment result was fabricated or injected into the page.

## Publication status

- Public repository: https://github.com/zupengwang/scopepay (publication authorized by the owner).
- Public YouTube demo: https://www.youtube.com/watch?v=Cb6p385zfuA (published October 22, 2026 with English captions).
- Devpost submission: in preparation.

The passed automated tests do not establish real API connectivity, payment provider acceptance, model quality, public deployment availability, or any official competition result.

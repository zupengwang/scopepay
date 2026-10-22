# Devpost submission copy

**Operator note — do not paste:** The English story below is ready. The final demo follows AI quote A1B1CF through merchant correction, approval, and a verified $900.00 USD PayPal sandbox capture. The public repository and demo are linked below. This source document is not proof of completed Devpost submission.

## Project name

ScopePay

## Tagline

Turn a client brief into a clear, human-approved quote and a PayPal payment.

## Inspiration

For small creative studios, getting paid starts long before checkout. A message such as “we need a website and some social posts” has to become a specific agreement: what is included, how much work it represents, and what it costs. Ambiguity at this step can turn into revisions, awkward conversations, and delayed payment.

We wanted to shorten that gap while preserving the merchant's judgment. ScopePay uses AI to structure the request, a service catalog to determine the price, and PayPal to complete the payment journey.

## What it does

The merchant enters a client's brief. ScopePay proposes catalog services, quantities, assumptions, and questions about missing or unsupported scope. It calculates an itemized quote from fixed prices, then asks the merchant to review it.

The merchant can adjust quantities, add or remove services, and document agreed clarifications. Approval locks the scope and creates a customer link. The customer sees the deliverables and total before continuing to PayPal sandbox. The app displays a receipt only after the server verifies a completed capture against the approved quote.

The merchant workspace also provides a quote list, a service catalog, integration status, and an activity history for each quote. Both merchant and customer views adapt to mobile screens.

## How we built it

We built the interface with React and Vite, using locally bundled typography and Lucide icons. A Node.js server stores quotes and payment state in SQLite.

The local AI integration uses Qwen through llama.cpp with schema-constrained JSON over an OpenAI-compatible Chat Completions endpoint. An Anthropic Messages adapter is also available. The model first classifies the scope as ready or requiring clarification. The output schema prevents clarification responses from including priced service lines, and Zod independently validates every response. The model can propose service IDs and integer quantities; the server resolves them against the catalog and computes prices in integer cents. The model has no payment tool or authority to approve a quote.

PayPal is central to the workflow. The backend authenticates through sandbox OAuth, creates Orders v2 checkout orders for the locked quote, redirects buyers to PayPal, and captures approved orders on return. Persisted idempotency keys, per-quote operation locks, and strict reference/amount verification protect the application against replay and mismatched payments.

## Challenges we ran into

The important boundary was between a plausible AI suggestion and a payable agreement. In the recorded run, Qwen added three extra revision rounds even though one round per deliverable was already included. The merchant removed that $270 line before approving the $900 quote. This correction is visible in the demo because it shows why review is a necessary product step.

We separated those states explicitly: AI can draft, the merchant can approve, and the payment server can verify settlement. Unsupported or unclear scope becomes a question to resolve. Schema validation limits the shape of a response; it does not guarantee that its interpretation of the brief is correct.

Payment retries also need careful state handling. A browser can refresh, cancel checkout, or fail to return after approval. We persist request identities before external calls and check existing PayPal order status before retrying a capture.

## Accomplishments we're proud of

- A single workflow connecting a natural-language brief, a reviewed scope, and a PayPal checkout.
- Catalog-based amounts that do not depend on model arithmetic.
- Explicit handling of unclear scope and merchant approval.
- A dedicated customer view that does not expose the raw brief or internal payment state.
- Automated coverage for amount tampering, replay, invalid payment references, missing approval, and authentication.
- A real local Qwen draft carried through merchant correction and a completed PayPal sandbox capture on the same quote.

## What we learned

AI is more useful here when it has a narrow responsibility: help translate a request into a reviewable scope. The merchant remains responsible for the agreement, and payment status comes from PayPal. Separating those responsibilities makes the overall product easier to explain, inspect, and test.

## What's next

We would add merchant-editable catalogs, quote revisions with client acceptance, webhook reconciliation, and small-studio user testing. We would measure scope-editing time and correction rates before claiming any productivity improvement. Production tax, refund, and dispute requirements would need their own implementation and review.

## Built with

React, Vite, JavaScript, Node.js, SQLite, Zod, Lucide, Qwen, llama.cpp, OpenAI-compatible Chat Completions, PayPal OAuth 2.0, PayPal Orders v2, PayPal Sandbox.

**Verified development model:** Qwen3-Coder-30B-A3B-Instruct, Q4_K_M GGUF, served locally with llama.cpp on CPU. Three focused development checks passed, including a clarification-only response for undecided scope. These checks are not a general accuracy benchmark. The recorded run includes a merchant correction to the AI draft.

**Verified sandbox payment:** The demo's AI quote A1B1CF completed buyer approval and capture for $900.00 USD on October 22, 2026. A provider read confirmed one completed capture, matching the application's paid receipt. Buyer approval occurred off-screen; the video shows the real application before and after that step. A separate earlier example-quote test verified that two repeated application callbacks returned the same receipt without adding captures.

## Links to fill after publication

- Public source repository: https://github.com/zupengwang/scopepay
- Public YouTube demo, less than 3 minutes: https://www.youtube.com/watch?v=1z_IK5Y8bRY
- Runnable build: follow JUDGE_QUICKSTART.md (no hosted demo)
- Judge setup instructions: repository `JUDGE_QUICKSTART.md` and `README.md`

## Testing instructions field

Install Node.js 24.13 or newer and follow JUDGE_QUICKSTART.md. Run `npm ci`, copy `.env.example` to `.env`, and configure a local Qwen or compatible model endpoint plus your PayPal sandbox app credentials. Run `npm run build` and `npm start`, then open http://127.0.0.1:4181. The guide includes a local model setup path, the exact recorded brief, expected merchant-reviewed services, and payment checks. Use a separate sandbox Personal account as the buyer. The labeled example works without AI credentials, but does not test generation. No live-money mode is implemented.

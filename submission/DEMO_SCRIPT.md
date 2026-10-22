# Demo production record

Final duration: 138.434 seconds (2:18.434). Format: 1920 × 1080, 30 fps, H.264 video, AAC mono audio at 48 kHz. English captions are burned in; an SRT file and transcript are also provided.

The application captures originate from a 1280 × 720 browser viewport and are composed into the 1080p video. Graphics are editorial title/architecture cards. English narration uses the system Samantha synthetic voice, generated from the included transcript. There is no music or cloned voice.

The screen recording uses real Qwen output and a real PayPal sandbox capture. No DOM content or payment state was fabricated. The same quote, A1B1CF, appears in the merchant review and receipt. The client names and brief are demonstration data. The AI draft initially totaled $1,170 because of three extra revision rounds; the merchant corrected it to $900 before approval.

Model waiting was condensed and the loading region was cropped to keep the client brief visible. The buyer performed PayPal login and approval off-screen; this is stated in the narration and on-screen label. The recording does not claim to show that private interaction. Receipt reload was separately observed; the receipt scene holds a legible captured frame rather than presenting the loading flash as useful footage.

Automated tests, real model checks, sandbox payment checks, and video encoding checks are distinct evidence. The three model development cases do not establish general accuracy. The fresh model download instructions were checked against publisher documentation but not re-downloaded on a second machine.

## Scene timing and narration

### 0.000–13.167 s — SCOPEPAY / FROM BRIEF TO PAID

For a small creative studio, getting paid starts with agreeing on the work. ScopePay turns a client's brief into a reviewable quote, then connects that agreement to a verified PayPal sandbox payment.

### 13.167–27.467 s — 01 / START WITH THE CLIENT'S WORDS

Maya is launching Daybreak Coffee. She needs one landing page, original website copy, and five launch graphics. Her brief also specifies existing brand assets and one revision round per deliverable.

### 27.467–42.233 s — 02 / AI PROPOSES THE SCOPE

A real local Qwen model maps the request to catalog services, quantities, and assumptions. The server validates that structure and calculates prices from the catalog. The model cannot invent a price or initiate a payment.

### 42.233–57.300 s — 03 / THE MERCHANT MAKES THE DECISION

Here, the draft incorrectly includes three extra revision rounds. One round is already included with each deliverable, so the merchant removes that line. The total changes from eleven hundred seventy dollars to nine hundred dollars.

### 57.300–66.800 s — 04 / REVIEW, SAVE, AND LOCK

The merchant saves the correction, reviews the scope, and approves the quote. Approval locks the amount and creates a dedicated customer link.

### 66.800–79.767 s — 05 / PAYPAL SANDBOX CHECKOUT

The customer link presents the agreed deliverables and total. For this same quote, a separate Personal sandbox buyer completed approval through PayPal. The buyer sign-in is omitted from this recording.

### 79.767–95.667 s — 06 / VERIFY BEFORE SHOWING PAID

ScopePay verifies the completed capture against the approved quote's reference, currency, and amount. This receipt matches one completed nine hundred dollar sandbox capture. Reloading the customer page preserves the same confirmed receipt.

### 95.667–111.367 s — 07 / UNCLEAR SCOPE BECOMES QUESTIONS

A second request asks for an undecided website, store, and social posts. The model returns clarification questions with no priced service lines. Even with the review box checked, this unresolved quote cannot be approved.

### 111.367–127.900 s — BUILT TO KEEP RESPONSIBILITIES CLEAR

React provides the interface, while Node and SQLite maintain quote and payment state. Local Qwen handles drafting; fixed catalog prices and merchant approval control checkout. PayPal credentials and capture verification stay on the server.

### 127.900–138.433 s — SCOPEPAY / CLARITY BEFORE CHECKOUT

ScopePay brings the brief, the agreement, and the receipt into one workflow. AI drafts. The merchant decides. PayPal confirms the payment.

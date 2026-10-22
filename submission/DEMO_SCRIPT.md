# ScopePay final demonstration

Final duration: 151.134 seconds (2:31.134). Format: 1920 × 1080, 30 fps, H.264 video, AAC mono audio at 48 kHz. English captions are burned in; an SRT file and transcript are also provided.

The application captures originate from a 1280 × 720 browser viewport and are composed into the 1080p video. Graphics are editorial title and architecture cards. English narration uses Microsoft neural text-to-speech, voice en-US-AndrewMultilingualNeural, generated through edge-tts 7.3.1 at -3% rate. Ten complete paragraphs preserve phrasing and pauses. This is AI-generated narration, not a human recording or a cloned voice. There is no music.

## Recording and editing disclosure

The same verified application footage and transcript were retained when replacing the original narration. The ten scenes were retimed to the new voice. Captions follow the generated sentence timing and were checked against the transcript.

Model waiting was condensed and the loading region was cropped to keep the client brief visible. The buyer performed PayPal login and approval off-screen; this is stated in the narration and on-screen label. The recording does not claim to show that private interaction. Receipt reload was separately observed; the receipt scene holds a legible captured frame. No payment result was fabricated or injected into the page.

## Media checks

- Full video and audio decoding completed without errors.
- 29 caption intervals are ordered and within the video duration.
- Measured loudness: -16.26 LUFS integrated; true peak: -1.43 dBTP.
- Final video SHA-256: `f49f02143424923b38744bcd8cfac39aa2d87a64fd4d8abb164481c00c01867d`.

## Scene timing and narration

### 0.000–14.467 s — SCOPEPAY / FROM BRIEF TO PAID

For a small creative studio, getting paid starts with agreeing on the work. ScopePay turns a client's brief into a reviewable quote, then connects that agreement to a verified PayPal sandbox payment.

### 14.467–30.467 s — 01 / START WITH THE CLIENT'S WORDS

Maya is launching Daybreak Coffee. She needs one landing page, original website copy, and five launch graphics. Her brief also specifies existing brand assets and one revision round per deliverable.

### 30.467–47.000 s — 02 / AI PROPOSES THE SCOPE

A real local Qwen model maps the request to catalog services, quantities, and assumptions. The server validates that structure and calculates prices from the catalog. The model cannot invent a price or initiate a payment.

### 47.000–63.767 s — 03 / THE MERCHANT MAKES THE DECISION

Here, the draft incorrectly includes three extra revision rounds. One round is already included with each deliverable, so the merchant removes that line. The total changes from eleven hundred seventy dollars to nine hundred dollars.

### 63.767–74.033 s — 04 / REVIEW, SAVE, AND LOCK

The merchant saves the correction, reviews the scope, and approves the quote. Approval locks the amount and creates a dedicated customer link.

### 74.033–88.167 s — 05 / PAYPAL SANDBOX CHECKOUT

The customer link presents the agreed deliverables and total. For this same quote, a separate Personal sandbox buyer completed approval through PayPal. The buyer sign-in is omitted from this recording.

### 88.167–105.500 s — 06 / VERIFY BEFORE SHOWING PAID

ScopePay verifies the completed capture against the approved quote's reference, currency, and amount. This receipt matches one completed nine hundred dollar sandbox capture. Reloading the customer page preserves the same confirmed receipt.

### 105.500–121.433 s — 07 / UNCLEAR SCOPE BECOMES QUESTIONS

A second request asks for an undecided website, store, and social posts. The model returns clarification questions with no priced service lines. Even with the review box checked, this unresolved quote cannot be approved.

### 121.433–139.533 s — BUILT TO KEEP RESPONSIBILITIES CLEAR

React provides the interface, while Node and SQLite maintain quote and payment state. Local Qwen handles drafting; fixed catalog prices and merchant approval control checkout. PayPal credentials and capture verification stay on the server.

### 139.533–151.133 s — SCOPEPAY / CLARITY BEFORE CHECKOUT

ScopePay brings the brief, the agreement, and the receipt into one workflow. AI drafts. The merchant decides. PayPal confirms the payment.

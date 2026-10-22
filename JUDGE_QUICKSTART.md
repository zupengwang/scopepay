# Judge quickstart

ScopePay runs locally in a browser. The demo uses a real local Qwen model and PayPal Sandbox. Source, example data, and the MIT license are included; model weights, credentials, and payment databases are excluded.

## 1. Install the application

Use Node.js 24.13 or newer (development: 24.22.1). From the repository root:

```sh
npm ci
cp .env.example .env
chmod 600 .env
```

Choose one model setup in step 2, configure PayPal in step 3, then start the application in step 4. Without integrations, the labeled example is useful for exploring the interface but does not demonstrate AI generation or completed payment.

## 2. Configure a model

### Use an existing compatible endpoint

The endpoint must support Chat Completions with `response_format.type=json_schema`. Configure these variables privately in `.env`:

```dotenv
SCOPEPAY_AI_API=openai
SCOPEPAY_AI_BASE_URL=http://127.0.0.1:4182/v1
SCOPEPAY_AI_MODEL=qwen3-coder-30b-a3b-instruct
SCOPEPAY_AI_KEY=
SCOPEPAY_AI_TIMEOUT_MS=180000
```

Replace the base URL, model alias, and key to match your service. A loopback llama.cpp service needs no cloud API key. The README also documents the optional Anthropic Messages adapter; the submitted demonstration uses Qwen.

### Or prepare local Qwen on a Linux CPU host

The recorded setup used Qwen3-Coder-30B-A3B-Instruct Q4_K_M with llama.cpp commit `620d222`, 16 CPU threads, and an 8192-token context. The weights alone occupy about 18.6 GB. Plan for at least 25 GB free disk and sufficient additional RAM for the runtime and context; 32 GB RAM is a practical starting point, not a measured minimum. No GPU is required for this path.

Install Git, CMake, a C++ compiler, and curl using your OS package manager. Then, from the ScopePay root:

```sh
mkdir -p data/models
git clone https://github.com/ggml-org/llama.cpp.git data/llama.cpp
git -C data/llama.cpp checkout 620d222
cmake -S data/llama.cpp -B data/llama.cpp/build \
  -DCMAKE_BUILD_TYPE=Release -DGGML_CUDA=OFF -DGGML_METAL=OFF -DLLAMA_CURL=OFF
cmake --build data/llama.cpp/build --config Release -j 4 --target llama-server
curl -fL --retry 3 \
  'https://huggingface.co/unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF/resolve/main/Qwen3-Coder-30B-A3B-Instruct-Q4_K_M.gguf' \
  -o data/models/Qwen3-Coder-30B-A3B-Instruct-Q4_K_M.gguf
LLAMA_SERVER_BIN="$PWD/data/llama.cpp/build/bin/llama-server" \
QWEN_GGUF_PATH="$PWD/data/models/Qwen3-Coder-30B-A3B-Instruct-Q4_K_M.gguf" \
bash scripts/serve-local-qwen.sh
```

Leave the model server running, then use a second terminal for ScopePay. `QWEN_THREADS=8` can reduce CPU use. Loading the model and generating a quote may take tens of seconds or longer, depending on the host.

These build commands follow the [llama.cpp build instructions](https://github.com/ggml-org/llama.cpp/blob/master/docs/build.md). The download is a quantization published by [Unsloth](https://huggingface.co/unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF/tree/main), based on the [Qwen model](https://huggingface.co/Qwen/Qwen3-Coder-30B-A3B-Instruct). We reused existing local weights in development; this fresh-download path was documented from the publishers' sources but was not rerun as a second 18.6 GB download.

## 3. Configure PayPal Sandbox

In the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/), select Sandbox, then create or choose a REST app associated with a sandbox Business account. Put that app's values in `.env`:

```dotenv
PAYPAL_CLIENT_ID=your_sandbox_app_client_id
PAYPAL_CLIENT_SECRET=your_sandbox_app_secret
APP_ORIGIN=http://127.0.0.1:4181
HOST=127.0.0.1
PORT=4181
```

Use **Testing Tools → Sandbox Accounts** to find or create a separate **Personal** buyer account. Its sandbox email and password are used on the PayPal checkout page. They are different from the developer login and the app credentials. Paying with the receiving Business account can produce `CANNOT_PAY_SELF`.

Keep all credentials in your private environment. The app only calls the sandbox API; this test does not transfer real money. For remote execution, forward port 4181 and browse the exact `APP_ORIGIN` so PayPal can return to it.

## 4. Build and run

```sh
npm run build
npm start
```

Open http://127.0.0.1:4181. The Connections page indicates configuration presence; a successful generation and payment are the actual integration checks.

## 5. Reproduce the recorded case

Client: **Maya · Daybreak Coffee**. Paste this brief:

> We are launching Daybreak Coffee. Please build one responsive landing page with up to six sections, write up to 700 words of original website copy, and design five static Instagram launch graphics in one visual direction. We will supply our finished brand assets and factual business details, but we have no finished website copy. One revision round per deliverable is enough. No hosting, domain, maintenance, or online store is required.

1. Select **Draft quote with AI** and wait for the configured model.
2. Review the entire draft, including assumptions. The intended scope is one landing page ($600), one copywriting package ($180), and one social launch pack ($120): **$900 USD**.
3. In our recorded run, Qwen also added three extra revision rounds ($270). The merchant removed that line and saved the corrected draft. Outputs can vary; do not approve contradictory assumptions or unwanted services.
4. Check the review box and select **Approve & create payment link**. The amount and scope are now locked.
5. Open **Customer view**, choose **Continue with PayPal**, and approve with the separate Personal sandbox buyer.
6. On return, verify **Payment confirmed**, $900.00 USD, and a capture ID. Refreshing should preserve the same receipt.
7. Try a new **Unclear scope** request. A clarification response has questions, zero lines, and zero total. Approval remains disabled until confirmed catalog services are added and a resolution is recorded.

The video shows the same AI quote before and after real buyer approval, which was completed off-screen. It also shows the extra-revision correction. Screenshot data is illustrative client information, not a real customer's transaction.

## Validation and troubleshooting

```sh
npm test
npm run build
```

The 28 automated tests use doubles for external services. The separate real-model and sandbox checks are recorded in `submission/VALIDATION.md`; they do not establish general model accuracy or production readiness.

If generation fails, check the model alias, schema support, endpoint reachability, and timeout. If checkout is disabled, check server-side PayPal configuration and approval status. A configured integration does not prove valid credentials. For an expired PayPal order, create a new quote; automatic renewal is not implemented.

This is a one-merchant sandbox prototype. Tax, refunds, disputes, recurring charges, multi-tenant accounts, and background webhook reconciliation are outside this version. Use a single application process with persistent storage. The README covers authenticated public deployment if you choose to host it.

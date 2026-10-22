#!/usr/bin/env bash
set -euo pipefail
: "${LLAMA_SERVER_BIN:?Set LLAMA_SERVER_BIN to an existing llama-server executable}"
: "${QWEN_GGUF_PATH:?Set QWEN_GGUF_PATH to an existing Qwen GGUF model}"
test -x "$LLAMA_SERVER_BIN"
test -f "$QWEN_GGUF_PATH"
# Keep this independent service on CPU and loopback on a shared machine.
export CUDA_VISIBLE_DEVICES=''
exec "$LLAMA_SERVER_BIN" --model "$QWEN_GGUF_PATH" \
  --host 127.0.0.1 --port "${QWEN_PORT:-4182}" \
  --alias qwen3-coder-30b-a3b-instruct \
  --n-gpu-layers 0 --ctx-size 8192 --parallel 1 \
  --threads "${QWEN_THREADS:-16}" --threads-batch "${QWEN_THREADS:-16}" \
  --jinja

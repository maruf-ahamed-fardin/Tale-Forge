FROM python:3.11-slim

# Hugging Face Spaces run as user 1000 and expose port 7860
RUN useradd -m -u 1000 user
ENV HOME=/home/user PATH=/home/user/.local/bin:$PATH HF_HOME=/home/user/.cache/huggingface
WORKDIR /home/user/app

COPY --chown=user requirements.txt .
# Prebuilt CPU wheels avoid a long native build; fall back to building from source if none matches
RUN pip install --no-cache-dir --user -r requirements.txt \
    --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cpu \
    || pip install --no-cache-dir --user -r requirements.txt

COPY --chown=user app.py .
USER user
EXPOSE 7860
CMD ["uvicorn", "app:api", "--host", "0.0.0.0", "--port", "7860"]

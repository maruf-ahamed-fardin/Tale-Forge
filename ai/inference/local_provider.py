"""TaleForge Local ML Model Inference Provider

Runs story generation using locally trained LoRA adapter weights or local Ollama instances
without requiring any internet access or third-party cloud APIs.
"""

import json
import os
import urllib.error
import urllib.request
from collections.abc import AsyncGenerator
from pathlib import Path
from typing import Any

from ai.inference.provider import GenerationParams, GenerationResult, StoryGenerationProvider

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_ADAPTER_DIR = REPO_ROOT / "models" / "adapters" / "taleforge-lora"
OLLAMA_URL = "http://127.0.0.1:11434/api/generate"


class LocalStoryProvider(StoryGenerationProvider):
    """Generates stories using locally loaded LoRA weights or local Ollama LLM."""

    def __init__(self, adapter_path: Path = DEFAULT_ADAPTER_DIR) -> None:
        self.adapter_path = adapter_path
        self._model = None
        self._tokenizer = None
        self._is_loaded = False

    def is_adapter_available(self) -> bool:
        """Checks if a trained LoRA adapter exists locally."""
        return (self.adapter_path / "adapter_config.json").exists()

    def check_ollama_alive(self) -> bool:
        """Checks if Ollama is running locally."""
        try:
            req = urllib.request.Request("http://127.0.0.1:11434/api/tags", method="GET")
            with urllib.request.urlopen(req, timeout=1) as res:
                return res.status == 200
        except Exception:
            return False

    def _generate_via_ollama(self, params: GenerationParams) -> str:
        """Generates story using local Ollama model."""
        prompt = (
            f"তুমি TaleForge AI। নিচের বিষয়ের ওপর একটি আকর্ষণীয় বাংলা গল্প রচনা করো:\n\n"
            f"বিষয়: {params.prompt or params.title}\n"
            f"জঁর: {params.genre} | মুড: {params.mood}\n\nগল্প:"
        )
        payload = {
            "model": "qwen2.5:1.5b",
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": params.temperature,
                "top_p": params.top_p,
                "num_predict": params.max_new_tokens,
            },
        }
        req = urllib.request.Request(
            OLLAMA_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=60) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            return res_data.get("response", "").strip()

    def _load_hf_model(self):
        """Loads base model + LoRA adapter into memory using PEFT."""
        if self._is_loaded:
            return

        import torch
        from peft import PeftConfig, PeftModel
        from transformers import AutoModelForCausalLM, AutoTokenizer

        config = PeftConfig.from_pretrained(str(self.adapter_path))
        base_model_name = config.base_model_name_or_path or "Qwen/Qwen2.5-1.5B-Instruct"

        print(f"Loading local base model: {base_model_name}")
        tokenizer = AutoTokenizer.from_pretrained(base_model_name, trust_remote_code=True)
        device = "cuda" if torch.cuda.is_available() else "cpu"
        torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32

        base_model = AutoModelForCausalLM.from_pretrained(
            base_model_name,
            torch_dtype=torch_dtype,
            device_map=device,
            trust_remote_code=True,
        )

        print(f"Loading trained LoRA adapter from: {self.adapter_path}")
        model = PeftModel.from_pretrained(base_model, str(self.adapter_path))
        model.eval()

        self._tokenizer = tokenizer
        self._model = model
        self._is_loaded = True

    def _generate_via_hf(self, params: GenerationParams) -> str:
        """Generates story using HuggingFace LoRA model."""
        self._load_hf_model()
        import torch

        is_bn = params.language == "bn"
        system_msg = (
            # Must match SYSTEM_PROMPT in ai/data_pipeline/export_dataset.py (the training data)
            "You are TaleForge AI, an expert literary novelist specializing in Bengali literature."
            if is_bn
            else "You are TaleForge AI, an expert literary storyteller."
        )
        messages = [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": params.prompt or f"Write a {params.genre} story about {params.title}"},
        ]

        if hasattr(self._tokenizer, "apply_chat_template"):
            text = self._tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        else:
            text = f"User: {params.prompt}\nAssistant:"

        device = "cuda" if torch.cuda.is_available() else "cpu"
        inputs = self._tokenizer([text], return_tensors="pt").to(device)

        with torch.no_grad():
            outputs = self._model.generate(
                **inputs,
                max_new_tokens=params.max_new_tokens,
                do_sample=True,
                temperature=params.temperature,
                top_p=params.top_p,
                repetition_penalty=1.1,
            )

        gen_tokens = outputs[0][inputs.input_ids.shape[1] :]
        story_text = self._tokenizer.decode(gen_tokens, skip_special_tokens=True)
        return story_text.strip()

    def generate_with_adapter(self, params: GenerationParams) -> GenerationResult:
        """Generates strictly with the trained LoRA adapter (blocking).

        Unlike generate(), this never falls back to Ollama or a notice text: it raises
        FileNotFoundError if no adapter has been trained, so callers can report it.
        """
        if not self.is_adapter_available():
            raise FileNotFoundError(f"No trained LoRA adapter found at {self.adapter_path}")
        text = self._generate_via_hf(params)
        return GenerationResult(
            text=text,
            word_count=len(text.split()),
            provider="local-lora-model",
            finish_reason="stop",
        )

    async def generate(self, params: GenerationParams) -> GenerationResult:
        """Generate a story using local ML model."""
        # Check if local trained adapter is ready
        if self.is_adapter_available():
            try:
                text = self._generate_via_hf(params)
                words = len(text.split())
                return GenerationResult(
                    text=text,
                    word_count=words,
                    provider="local-lora-model",
                    finish_reason="stop",
                )
            except Exception as e:
                print(f"Local LoRA inference error: {e}")

        # Check if Ollama is running locally
        if self.check_ollama_alive():
            try:
                text = self._generate_via_ollama(params)
                words = len(text.split())
                return GenerationResult(
                    text=text,
                    word_count=words,
                    provider="local-ollama",
                    finish_reason="stop",
                )
            except Exception as e:
                print(f"Local Ollama error: {e}")

        # Fallback message with clear instructions
        fallback_text = (
            f"### স্থানীয় ML মডেল প্রস্তুত নয়\n\n"
            f"আপনার পিসিতে এখনও LoRA মডেল অ্যাডাপ্টার ট্রেইন করে সেভ করা হয়নি।\n\n"
            f"**নিজস্ব মডেল ট্রেইন করতে নিচের যে কোনো একটি পদ্ধতি বেছে নিন:**\n"
            f"1. টার্মিনালে চালান: `python ai/training/train_lora.py`\n"
            f"2. অথবা বিনামূল্যে Google Colab T4 GPU দিয়ে ১ ক্লিকে ট্রেইন করতে `notebooks/TaleForge_Training_Colab.ipynb` ফাইলটি খুলুন।\n\n"
            f"ট্রেইন শেষ হলে অ্যাডাপ্টার ফাইলটি `models/adapters/taleforge-lora/` ডিরেক্টরিতে সেভ হবে এবং স্বয়ংক্রিয়ভাবে অফলাইনে কাজ করবে।"
        )
        return GenerationResult(
            text=fallback_text,
            word_count=len(fallback_text.split()),
            provider="local-provider-notice",
            finish_reason="stop",
        )

    async def stream(self, params: GenerationParams) -> AsyncGenerator[str, None]:
        res = await self.generate(params)
        for chunk in res.text.split(" "):
            yield chunk + " "

"""TaleForge LoRA / QLoRA Fine-Tuning Pipeline

Trains a personal LoRA adapter on your private Bengali stories using open-source LLMs
(Qwen 2.5 1.5B / Gemma 2 2B) completely locally or on Google Colab GPU.
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

# Paths
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_DATASET = REPO_ROOT / "data" / "datasets" / "train.jsonl"
DEFAULT_OUTPUT_DIR = REPO_ROOT / "models" / "adapters" / "taleforge-lora"
DEFAULT_BASE_MODEL = "Qwen/Qwen2.5-1.5B-Instruct"


def check_dependencies() -> bool:
    """Checks whether required ML libraries are installed."""
    missing = []
    try:
        import torch
    except ImportError:
        missing.append("torch")

    try:
        import transformers
    except ImportError:
        missing.append("transformers")

    try:
        import peft
    except ImportError:
        missing.append("peft")

    try:
        import datasets
    except ImportError:
        missing.append("datasets")

    if missing:
        print("=" * 70)
        print("⚠️  MISSING PYTHON ML DEPENDENCIES:")
        print(f"   Missing packages: {', '.join(missing)}")
        print("\nTo train locally with GPU/CPU, install them via:")
        print("   pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121")
        print("   pip install transformers peft datasets accelerate bitsandbytes")
        print("\nOR use the TaleForge Google Colab Notebook for 1-click free 15GB T4 GPU training:")
        print("   notebooks/TaleForge_Training_Colab.ipynb")
        print("=" * 70)
        return False
    return True


def run_training(
    base_model_name: str = DEFAULT_BASE_MODEL,
    dataset_path: Path = DEFAULT_DATASET,
    output_dir: Path = DEFAULT_OUTPUT_DIR,
    epochs: int = 3,
    batch_size: int = 1,
    gradient_accumulation_steps: int = 4,
    learning_rate: float = 2e-4,
    max_seq_length: int = 1024,
    lora_r: int = 16,
    lora_alpha: int = 32,
    use_4bit: bool = True,
):
    """Executes the LoRA / QLoRA fine-tuning loop."""
    if not check_dependencies():
        sys.exit(1)

    import torch
    from datasets import load_dataset
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
    from transformers import (
        AutoModelForCausalLM,
        AutoTokenizer,
        BitsAndBytesConfig,
        DataCollatorForSeq2Seq,
        Trainer,
        TrainingArguments,
    )

    print("=" * 70)
    print("🚀 TaleForge LoRA Model Training Initiated")
    print(f"   Base Model:        {base_model_name}")
    print(f"   Dataset:           {dataset_path}")
    print(f"   Output Directory:  {output_dir}")
    print(f"   Epochs:            {epochs}")
    print(f"   LoRA Rank (r):     {lora_r} | Alpha: {lora_alpha}")
    has_cuda = torch.cuda.is_available()
    print(f"   CUDA Available:    {has_cuda} {f'({torch.cuda.get_device_name(0)})' if has_cuda else '(Running on CPU)'}")
    print("=" * 70)

    if not dataset_path.exists():
        print(f"❌ Error: Dataset file not found at {dataset_path}")
        print("   Run: python ai/data_pipeline/export_dataset.py first!")
        sys.exit(1)

    output_dir.mkdir(parents=True, exist_ok=True)

    # 1. Tokenizer
    print("\n[1/5] Loading tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(base_model_name, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    # 2. Quantization & Base Model
    print(f"\n[2/5] Loading base model '{base_model_name}'...")
    bnb_config = None
    device_map = "auto" if has_cuda else "cpu"
    torch_dtype = torch.float16 if has_cuda else torch.float32

    if has_cuda and use_4bit:
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.float16,
            bnb_4bit_use_double_quant=True,
        )

    model = AutoModelForCausalLM.from_pretrained(
        base_model_name,
        quantization_config=bnb_config if has_cuda and use_4bit else None,
        torch_dtype=torch_dtype,
        device_map=device_map,
        trust_remote_code=True,
    )

    if has_cuda and use_4bit:
        model = prepare_model_for_kbit_training(model)

    # 3. LoRA Configuration
    print("\n[3/5] Configuring LoRA adapter layers...")
    target_modules = ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"]
    peft_config = LoraConfig(
        r=lora_r,
        lora_alpha=lora_alpha,
        target_modules=target_modules,
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
    )
    model = get_peft_model(model, peft_config)
    model.print_trainable_parameters()

    # 4. Dataset Processing
    print(f"\n[4/5] Preparing training dataset from {dataset_path}...")
    dataset = load_dataset("json", data_files={"train": str(dataset_path)})["train"]

    def tokenize_format(example):
        messages = example.get("messages")
        if messages and hasattr(tokenizer, "apply_chat_template"):
            prompt_text = tokenizer.apply_chat_template(messages[:-1], tokenize=False, add_generation_prompt=True)
            full_text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=False)
        else:
            prompt_text = f"User: {example.get('instruction', '')}\nAssistant: "
            full_text = prompt_text + example.get("output", "") + (tokenizer.eos_token or "")

        # No padding here: the collator pads each batch dynamically and fills label padding with -100
        tokenized = tokenizer(full_text, truncation=True, max_length=max_seq_length)
        prompt_len = len(tokenizer(prompt_text, truncation=True, max_length=max_seq_length)["input_ids"])

        # Only the story (assistant reply) is learned; system/user prompt tokens are ignored in the loss
        labels = list(tokenized["input_ids"])
        labels[:prompt_len] = [-100] * prompt_len
        tokenized["labels"] = labels
        return tokenized

    tokenized_dataset = dataset.map(tokenize_format, remove_columns=dataset.column_names)
    # Drop samples whose prompt filled the whole window (no story tokens left to learn from)
    tokenized_dataset = tokenized_dataset.filter(lambda ex: any(label != -100 for label in ex["labels"]))
    if len(tokenized_dataset) == 0:
        print("❌ Error: No usable training samples after tokenization.")
        sys.exit(1)

    # 5. Training Arguments & Execution
    print("\n[5/5] Executing LoRA Training Loop...")
    training_args = TrainingArguments(
        output_dir=str(output_dir / "checkpoints"),
        num_train_epochs=epochs,
        per_device_train_batch_size=batch_size,
        gradient_accumulation_steps=gradient_accumulation_steps,
        learning_rate=learning_rate,
        weight_decay=0.01,
        warmup_ratio=0.03,
        logging_steps=1,
        save_strategy="epoch",
        fp16=has_cuda,
        report_to="none",
        optim="adamw_torch",
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_dataset,
        data_collator=DataCollatorForSeq2Seq(tokenizer, pad_to_multiple_of=8, return_tensors="pt", padding=True),
    )

    train_result = trainer.train()

    # Save final LoRA Adapter
    print(f"\n💾 Saving fine-tuned LoRA adapter to: {output_dir}")
    model.save_pretrained(str(output_dir))
    tokenizer.save_pretrained(str(output_dir))

    # Save metadata
    metadata = {
        "base_model": base_model_name,
        "trained_at": datetime.now().isoformat(),
        "epochs": epochs,
        "lora_r": lora_r,
        "lora_alpha": lora_alpha,
        "train_loss": train_result.training_loss if hasattr(train_result, "training_loss") else None,
        "samples_count": len(tokenized_dataset),
        "status": "completed",
    }
    with open(output_dir / "training_metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print("\n" + "=" * 70)
    print("🎉 SUCCESS! Your personal TaleForge AI model has been trained!")
    print(f"   Adapter weights saved at: {output_dir}")
    print("   You can now run local offline story generation with your own model.")
    print("=" * 70)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train custom LoRA model on TaleForge stories")
    parser.add_argument("--base_model", type=str, default=DEFAULT_BASE_MODEL, help="Base model identifier")
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET, help="Path to train.jsonl")
    parser.add_argument("--output_dir", type=Path, default=DEFAULT_OUTPUT_DIR, help="Where to save LoRA adapter")
    parser.add_argument("--epochs", type=int, default=3, help="Number of training epochs")
    parser.add_argument("--batch_size", type=int, default=1, help="Per-device batch size")
    parser.add_argument("--lora_r", type=int, default=16, help="LoRA rank")
    parser.add_argument("--lora_alpha", type=int, default=32, help="LoRA alpha scaling")
    args = parser.parse_args()

    run_training(
        base_model_name=args.base_model,
        dataset_path=args.dataset,
        output_dir=args.output_dir,
        epochs=args.epochs,
        batch_size=args.batch_size,
        lora_r=args.lora_r,
        lora_alpha=args.lora_alpha,
    )

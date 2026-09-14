# Inference

TaleForge will use a provider abstraction instead of coupling the product to one model.

Planned provider interface:

```text
StoryGenerationProvider
  generate()
  stream()
```

The first implementation is expected to be a local Hugging Face Transformers provider that can load a base model plus a TaleForge LoRA/QLoRA adapter.

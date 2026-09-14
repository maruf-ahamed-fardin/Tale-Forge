# Data Pipeline

The data pipeline will preserve private source documents across separate stages:

```text
RAW -> EXTRACTED -> CLEANED -> TAGGED -> TRAINING
```

Original DOCX, PDF, and TXT files must not be overwritten. Later phases will add extraction, Bangla Unicode validation, cleaning, metadata tagging, dataset building, analytics, and train/validation splitting at the story level.

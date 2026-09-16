import sys
from pathlib import Path

# Ensure repository root is on sys.path so the ai package can be imported
_current = Path(__file__).resolve().parent
while _current.parent != _current:
    if (_current / "ai").is_dir():
        if str(_current) not in sys.path:
            sys.path.insert(0, str(_current))
        break
    _current = _current.parent

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, Field

from ai.story_engine import ai_engine

router = APIRouter(prefix="/ai", tags=["simple-ai"])


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    auto_train: bool = Field(default=True)


class TrainRequest(BaseModel):
    title: str = Field(default="My Story", max_length=200)
    text: str = Field(..., min_length=10)


@router.post("/chat")
async def chat_and_generate(req: ChatRequest):
    """User prompts the AI, the AI crafts a new story in their trained style,

    and automatically retrains itself on the output!
    """
    res = ai_engine.generate_and_chat(req.message, auto_train=req.auto_train)
    return res


@router.post("/train")
async def train_story(req: TrainRequest):
    """User submits text to train the AI."""
    res = ai_engine.train_on_text(req.text, req.title)
    return res


@router.post("/train-file")
async def train_with_file(
    file: UploadFile = File(...),
    title: str = Form(""),
):
    """User uploads a .txt or .pdf file to train the AI directly."""
    contents = await file.read()
    filename = file.filename or "uploaded_story"
    is_pdf = filename.lower().endswith(".pdf") or file.content_type == "application/pdf"

    if is_pdf:
        try:
            import io
            import pypdf

            reader = pypdf.PdfReader(io.BytesIO(contents))
            pages_text = []
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    pages_text.append(extracted)
            text = "\n\n".join(pages_text).strip()
            if not text:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="PDF ফাইলটি থেকে কোনো লেখা উদ্ধার করা যায়নি।",
                )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"PDF ফাইল পড়া সম্ভব হয়নি: {str(e)}",
            )
    else:
        try:
            text = contents.decode("utf-8")
        except UnicodeDecodeError:
            text = contents.decode("latin-1", errors="ignore")

    story_title = title.strip() or filename.rsplit(".", 1)[0] or "Uploaded Story"
    res = ai_engine.train_on_text(text, story_title)
    return res


@router.get("/status")
async def get_ai_status():
    """Returns how many stories AI is trained on and memory stats."""
    return ai_engine.get_status()


@router.get("/history")
async def get_chat_history():
    """Returns recent conversation messages."""
    return {"messages": ai_engine.chat_history}


@router.post("/reset")
async def reset_ai_memory():
    """Resets AI memory to blank state."""
    ai_engine.clear_memory()
    return {"success": True, "message": "AI model memory reset successfully"}

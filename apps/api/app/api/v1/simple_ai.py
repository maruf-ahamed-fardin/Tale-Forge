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

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, Field

from ai.story_engine import ai_engine
from app.core.rate_limiter import rate_limit
from app.models.user import User
from app.services.auth import get_current_user

router = APIRouter(prefix="/ai", tags=["simple-ai"])

MAX_TRAIN_FILE_BYTES = 20 * 1024 * 1024  # 20 MB


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    auto_train: bool = Field(default=True)
    training_scope: str = Field(default="hybrid")
    account_id: str = Field(default="default_local_author")


class TrainRequest(BaseModel):
    title: str = Field(default="My Story", max_length=200)
    text: str = Field(..., min_length=10, max_length=2_000_000)
    account_id: str = Field(default="default_local_author")


@router.post("/chat", dependencies=[Depends(rate_limit(max_requests=30, window_seconds=60))])
async def chat_and_generate(
    req: ChatRequest,
    current_user: User = Depends(get_current_user),
):
    """User prompts the AI, the AI crafts a new story in their chosen scope and trained style,
    and automatically retrains itself on the output!
    Strictly isolated to current_user.id.
    """
    account_id = current_user.id
    res = ai_engine.generate_and_chat(
        req.message,
        auto_train=req.auto_train,
        training_scope=req.training_scope,
        account_id=account_id,
    )
    return res


@router.post("/train", dependencies=[Depends(rate_limit(max_requests=15, window_seconds=60))])
async def train_story(
    req: TrainRequest,
    current_user: User = Depends(get_current_user),
):
    """User submits text to train the AI for their specific authenticated account."""
    account_id = current_user.id
    res = ai_engine.train_on_text(req.text, req.title, account_id=account_id)
    return res


@router.post("/train-file", dependencies=[Depends(rate_limit(max_requests=10, window_seconds=60))])
async def train_with_file(
    file: UploadFile = File(...),
    title: str = Form(""),
    account_id: str = Form("default_local_author"),
    current_user: User = Depends(get_current_user),
):
    """User uploads a .txt, .pdf, or .docx file to train the AI directly for their account.
    Enforces maximum upload size and authenticates the user.
    """
    account_id = current_user.id

    # Read with size cap to prevent memory exhaustion DoS
    contents = await file.read(MAX_TRAIN_FILE_BYTES + 1)
    if len(contents) > MAX_TRAIN_FILE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds maximum allowed limit (20 MB).",
        )

    filename = file.filename or "uploaded_story"
    is_pdf = filename.lower().endswith(".pdf") or file.content_type == "application/pdf"
    is_docx = filename.lower().endswith(".docx") or file.content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    is_doc = filename.lower().endswith(".doc") or file.content_type == "application/msword"

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
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"PDF ফাইল পড়া সম্ভব হয়নি: {str(e)}",
            )
    elif is_docx:
        try:
            import io
            import zipfile
            import xml.etree.ElementTree as ET

            with zipfile.ZipFile(io.BytesIO(contents)) as z:
                xml_content = z.read("word/document.xml")
            tree = ET.fromstring(xml_content)
            namespaces = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
            paragraphs = []
            for p in tree.iterfind(".//w:p", namespaces):
                texts = [node.text for node in p.iterfind(".//w:t", namespaces) if node.text]
                if texts:
                    paragraphs.append("".join(texts))
            text = "\n\n".join(paragraphs).strip()
            if not text:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Word (.docx) ফাইলটি থেকে কোনো লেখা উদ্ধার করা যায়নি।",
                )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Word (.docx) ফাইল পড়া সম্ভব হয়নি: {str(e)}",
            )
    elif is_doc:
        import re
        try:
            text_chunks = re.findall(rb"[\x20-\x7E\r\n\t]{4,}", contents)
            text = "\n".join(c.decode("latin-1", errors="ignore") for c in text_chunks).strip()
            if not text:
                text = contents.decode("utf-8", errors="ignore")
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Word (.doc) ফাইল পড়া সম্ভব হয়নি: {str(e)}",
            )
    else:
        try:
            text = contents.decode("utf-8")
        except UnicodeDecodeError:
            text = contents.decode("latin-1", errors="ignore")

    story_title = title.strip() or filename.rsplit(".", 1)[0] or "Uploaded Story"
    res = ai_engine.train_on_text(text, story_title, account_id=account_id)
    return res


@router.get("/status")
async def get_ai_status(
    current_user: User = Depends(get_current_user),
):
    """Returns how many stories AI is trained on and memory stats for the authenticated account."""
    return ai_engine.get_status(account_id=current_user.id)


@router.delete("/trained/{story_id}")
async def delete_trained_story(
    story_id: str,
    current_user: User = Depends(get_current_user),
):
    """Deletes a story from personal account memory."""
    try:
        updated = ai_engine.delete_story(story_id, account_id=current_user.id)
        return {"success": True, "message": "Trained story deleted", "status": updated}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/history")
async def get_chat_history(
    current_user: User = Depends(get_current_user),
):
    """Returns recent conversation messages for authenticated account."""
    safe_id = ai_engine._sanitize_account_id(current_user.id)
    return {"messages": ai_engine.chat_history.get(safe_id, [])}


@router.post("/reset")
async def reset_ai_memory(
    current_user: User = Depends(get_current_user),
):
    """Resets personal account AI memory to blank state."""
    ai_engine.clear_memory(account_id=current_user.id)
    return {"success": True, "message": f"AI model memory for account '{current_user.id}' reset successfully"}


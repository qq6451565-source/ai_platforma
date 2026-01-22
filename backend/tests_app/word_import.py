import io
import os
import re
import tempfile

from rest_framework.exceptions import ValidationError
from docx import Document


QUESTION_RE = re.compile(r"^\s*(\d+)[\.\)]\s*(.+)$")
OPTION_RE = re.compile(r"^\s*([A-Da-d])[)\.]?\s*(.+)$")


def _normalize_line(line: str) -> str:
    return " ".join(line.replace("\t", " ").strip().split())


def _extract_text_docx(data: bytes) -> str:
    doc = Document(io.BytesIO(data))
    parts = [p.text for p in doc.paragraphs if p.text and p.text.strip()]
    return "\n".join(parts)


def _extract_text_doc(data: bytes) -> str:
    try:
        import textract
    except Exception as exc:
        raise ValidationError({"file": "DOC format uchun textract kerak. DOCX yuklang."}) from exc

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".doc") as tmp:
            tmp.write(data)
            tmp_path = tmp.name
        text = textract.process(tmp_path).decode("utf-8", errors="ignore")
        return text
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


def extract_lines(uploaded_file) -> list[str]:
    name = (uploaded_file.name or "").lower()
    data = uploaded_file.read()
    uploaded_file.seek(0)

    if name.endswith(".docx"):
        text = _extract_text_docx(data)
    elif name.endswith(".doc"):
        text = _extract_text_doc(data)
    else:
        raise ValidationError({"file": "Faqat doc yoki docx fayl yuklang."})

    lines = [_normalize_line(line) for line in text.splitlines()]
    return [line for line in lines if line]


def parse_questions(lines: list[str]) -> list[dict]:
    questions: list[dict] = []
    current_question: str | None = None
    current_options: list[dict] = []

    def flush_question():
        if not current_question:
            return
        if len(current_options) != 4:
            raise ValidationError(
                {"file": f"Savolda 4 ta variant bo'lishi kerak: '{current_question}'"}
            )
        correct_count = sum(1 for opt in current_options if opt["is_correct"])
        if correct_count != 1:
            raise ValidationError(
                {"file": f"Savolda bitta to'g'ri javob bo'lishi kerak: '{current_question}'"}
            )
        questions.append(
            {
                "text": current_question,
                "order": len(questions) + 1,
                "points": 1,
                "options": current_options[:],
            }
        )

    for raw_line in lines:
        line = _normalize_line(raw_line)
        if not line:
            continue
        q_match = QUESTION_RE.match(line)
        if q_match:
            flush_question()
            current_question = q_match.group(2).strip()
            current_options = []
            continue
        opt_match = OPTION_RE.match(line)
        if opt_match:
            option_raw = opt_match.group(2).strip()
            is_correct = "*" in option_raw or "*" in line
            option_text = option_raw.replace("*", "").strip()
            if not option_text:
                raise ValidationError({"file": "Variant matni bo'sh bo'lmasligi kerak."})
            current_options.append({"text": option_text, "is_correct": is_correct})
            continue
        if current_options:
            current_options[-1]["text"] = f"{current_options[-1]['text']} {line}".strip()
        elif current_question:
            current_question = f"{current_question} {line}".strip()

    flush_question()

    if not questions:
        raise ValidationError({"file": "Test faylida savollar topilmadi."})
    return questions

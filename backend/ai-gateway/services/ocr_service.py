import os
from datetime import datetime
import cv2
import easyocr
import numpy as np
import re
from loguru import logger


def _parse_langs(value: str) -> list[str]:
    langs = [lang.strip() for lang in value.split(",") if lang.strip()]
    return langs or ["en"]


def _init_reader() -> easyocr.Reader:
    langs = _parse_langs(os.getenv("OCR_LANGS", "en,ru"))
    use_gpu = os.getenv("OCR_GPU", "false").strip().lower() in ("1", "true", "yes", "on")
    try:
        return easyocr.Reader(langs, gpu=use_gpu)
    except Exception as exc:
        logger.warning(f"EasyOCR init failed for langs={langs}: {exc}")
        return easyocr.Reader(["en"], gpu=False)


reader = _init_reader()

_NAME_STOPWORDS = {
    "RESPUBLIKASI",
    "OZBEKISTON",
    "UZBEKISTAN",
    "REPUBLIC",
    "SHAXS",
    "GUVOHNOMASI",
    "PASPORT",
    "FAMILIYA",
    "FAMILIYASI",
    "SURNAME",
    "ISM",
    "ISMI",
    "GIVEN",
    "GIVENNAME",
    "GIVENNAMES",
    "PATRONYMIC",
    "PATORNYMIC",
    "OTASINING",
    "NAME",
    "IDENTITY",
    "CARD",
    "PERSONAL",
    "NUMBER",
    "SHAXSIY",
    "KARTA",
    "JINSI",
    "SEX",
    "FUQAROLIGI",
    "CITIZENSHIP",
    "BIRTH",
    "DATE",
    "PLACE",
    "TUGILGAN",
    "BERILGAN",
    "ISSUE",
    "EXPIRE",
    "SIGNATURE",
    "IMZO",
    "IDENTITYCARD",
    "SHAXSGUVOHNOMASI",
    "OZBEKISTONRESPUBLIKASI",
    "REPUBLICOFUZBEKISTAN",
}

_MRZ_DIGIT_MAP = str.maketrans(
    {
        "O": "0",
        "Q": "0",
        "D": "0",
        "I": "1",
        "L": "1",
        "Z": "2",
        "S": "5",
        "B": "8",
        "G": "6",
    }
)
_MRZ_LETTER_MAP = str.maketrans(
    {
        "0": "O",
        "1": "I",
        "2": "Z",
        "4": "A",
        "5": "S",
        "8": "B",
        "6": "G",
    }
)


def extract_passport_data(image_bytes, ocr_threshold: float = 0.0):
    np_img = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
    if img is None:
        return {
            "passport_id": None,
            "fio": None,
            "birthdate": None,
            "confidence": 0.0,
        }

    max_side = int(os.getenv("OCR_MAX_SIDE", "1600"))
    img = _resize_max(img, max_side=max_side)
    img = _extract_card_region(img)

    results = reader.readtext(img, paragraph=False)
    if len(results) < 10:
        enhanced = _preprocess_for_ocr(img)
        results += reader.readtext(enhanced, paragraph=False)
    raw_texts = [text for _, text, _ in results]
    ordered_texts = _ordered_texts(results)

    text_data = []
    total_confidence = 0.0
    word_count = 0
    for _, text, conf in results:
        if conf < ocr_threshold:
            continue
        text_data.append((text, conf))
        total_confidence += conf
        word_count += 1

    avg_confidence = total_confidence / word_count if word_count > 0 else 0.0

    card_number = _extract_card_number_from_raw(raw_texts)
    card_number_label = _label_value_with_fallback(
        results,
        ordered_texts,
        ["KARTA RAQAMI", "CARD NUMBER"],
        value_pattern=r"[A-Z]{2}\s?\d{7,8}",
    )
    if card_number_label:
        normalized_card = _normalize_doc_number(card_number_label)
        if normalized_card and re.match(r"^[A-Z]{2}\d{7,8}$", normalized_card):
            card_number = normalized_card

    personal_number = _extract_personal_number(raw_texts, results, ordered_texts)
    if not personal_number:
        qr_personal = _extract_qr_personal_number(img)
        if qr_personal:
            personal_number = qr_personal
    if not card_number:
        card_number = _extract_card_number_from_image(img) or card_number

    surname = _clean_name_value(
        _label_value_with_fallback(results, ordered_texts, ["FAMILIYASI", "FAMILIYA", "SURNAME"])
    )
    given_name = _clean_name_value(
        _label_value_with_fallback(results, ordered_texts, ["ISMI", "ISM", "GIVEN", "GIVEN NAME", "GIVEN NAMES"])
    )
    patronymic = _normalize_patronymic(
        _clean_name_value(
            _label_value_with_fallback(results, ordered_texts, ["OTASINING", "PATRONYMIC", "PATORNYMIC"])
        )
    )
    birth_place = _label_value_with_fallback(
        results,
        ordered_texts,
        ["TUGILGAN JOYI", "TUG'ILGAN JOYI", "PLACE OF BIRTH", "BIRTH PLACE"],
        value_pattern=r"[A-Za-z]",
    )

    birthdate_label = _label_value_with_fallback(
        results,
        ordered_texts,
        ["TUGILGAN SANASI", "TUG'ILGAN SANASI", "DATE OF BIRTH", "BIRTH DATE"],
        value_pattern=r"\d{2}[./-]\d{2}[./-]\d{4}",
    )
    birthdate = extract_birth_date(text_data, birthdate_label)
    if birthdate and not _is_plausible_birthdate(birthdate):
        birthdate = None

    sex = _normalize_sex(
        _label_value_with_fallback(
            results,
            ordered_texts,
            ["JINSI", "SEX"],
            value_pattern=r"(ERKAK|AYOL|MALE|FEMALE|M|F)",
        )
    ) or extract_sex(raw_texts)

    citizenship_label = _label_value_with_fallback(
        results,
        ordered_texts,
        ["FUQAROLIGI", "CITIZENSHIP"],
        value_pattern=r"(UZB|OZBEK|UZBEK)",
    )
    citizenship = _normalize_citizenship(citizenship_label) or _normalize_citizenship(
        extract_citizenship(raw_texts)
    )

    fio = _build_full_name(surname, given_name, patronymic) or extract_name(text_data)

    need_mrz = (
        not (card_number and personal_number and birthdate and (surname or given_name))
        or not (citizenship and sex)
    )
    mrz_data = {}
    if need_mrz:
        mrz_texts = _read_mrz_texts(img)
        if mrz_texts:
            raw_texts.extend(mrz_texts)
            mrz_data = extract_mrz_data(mrz_texts)

    if mrz_data:
        if not card_number:
            card_number = mrz_data.get("card_number") or card_number
        if not personal_number:
            personal_number = mrz_data.get("personal_number") or personal_number
        mrz_birthdate = mrz_data.get("birthdate")
        if mrz_birthdate and _is_plausible_birthdate(mrz_birthdate):
            if not birthdate or not _is_plausible_birthdate(birthdate):
                birthdate = mrz_birthdate
        if not surname:
            surname = mrz_data.get("surname") or surname
        if not given_name:
            given_name = mrz_data.get("name") or given_name
        if not patronymic:
            patronymic = mrz_data.get("patronymic") or patronymic
        if not sex:
            sex = mrz_data.get("sex") or sex
        if not citizenship:
            citizenship = mrz_data.get("citizenship") or citizenship
        if not fio:
            fio = mrz_data.get("fio") or fio

    patronymic = _normalize_patronymic(patronymic) or patronymic
    fio = _build_full_name(surname, given_name, patronymic) or fio

    if not personal_number:
        personal_number = _extract_personal_number_from_image(img) or personal_number

    return {
        "passport_id": card_number or None,
        "fio": fio or None,
        "surname": surname or None,
        "name": given_name or None,
        "patronymic": patronymic or None,
        "sex": sex or None,
        "citizenship": citizenship or None,
        "birth_place": birth_place or None,
        "birthdate": birthdate or None,
        "card_number": card_number or None,
        "personal_number": personal_number or None,
        "confidence": round(avg_confidence, 2),
    }


def _extract_personal_number(raw_texts, results, ordered_texts):
    personal_label = _label_value_with_fallback(
        results,
        ordered_texts,
        ["SHAXSIY RAQAMI", "PERSONAL NUMBER", "PINFL"],
        value_pattern=r"\d{14}",
    )
    if personal_label:
        normalized_personal = re.sub(r"[^0-9]", "", _normalize_mrz_digits(personal_label.upper()))
        if len(normalized_personal) == 14:
            return normalized_personal
    return None


def _extract_qr_personal_number(img):
    try:
        detector = cv2.QRCodeDetector()
        data, _, _ = detector.detectAndDecode(img)
    except Exception:
        return None
    if not data:
        return None
    digits = re.findall(r"\d{14}", re.sub(r"\s+", "", data))
    return digits[0] if digits else None


def _extract_card_number_from_image(img):
    try:
        results = reader.readtext(img, detail=1, allowlist="KA40123456789", paragraph=False)
    except Exception:
        return None
    for _, text, _ in results:
        candidate = _normalize_doc_number(text)
        if candidate and re.match(r"^[A-Z]{2}\d{7,8}$", candidate):
            return candidate
    return None


def _extract_personal_number_from_image(img):
    try:
        results = reader.readtext(img, detail=1, allowlist="0123456789", paragraph=False)
    except Exception:
        return None
    candidates = []
    for _, text, conf in results:
        if not text:
            continue
        digits = re.sub(r"[^0-9]", "", text)
        for seq in re.findall(r"\d{14}", digits):
            if _is_mrz_date_block(seq):
                continue
            candidates.append((conf, seq))
    if not candidates:
        return None
    candidates.sort(key=lambda item: item[0], reverse=True)
    return candidates[0][1]


def extract_field(data, pattern):
    for text, _ in data:
        candidate = re.sub(r"[^A-Za-z0-9]", "", text.upper())
        normalized = _normalize_doc_number(candidate)
        if normalized and re.match(pattern, normalized):
            return normalized
        if re.match(pattern, candidate):
            return candidate
    return None


def extract_name(data):
    names = []
    for text, _ in data:
        if not text:
            continue
        for raw in re.split(r"\s+", text):
            token = re.sub(r"[^A-Za-z'`-]", "", raw)
            normalized = token.replace("'", "").replace("`", "").replace("-", "")
            if normalized.isalpha() and len(normalized) > 2:
                if normalized.upper() not in _NAME_STOPWORDS:
                    names.append(token)
    if len(names) >= 2:
        return " ".join(names[:3])
    return None


def _clean_name_value(value):
    if not value:
        return None
    raw = value.replace("'", "").replace("`", "")
    tokens = []
    for token in re.split(r"\s+", raw):
        if not token:
            continue
        normalized = _normalize_label(token)
        if not normalized or normalized in _NAME_STOPWORDS:
            continue
        letters = re.sub(r"[^A-Za-z]", "", token)
        if len(letters) < 2:
            continue
        tokens.append(token)
    return " ".join(tokens) if tokens else None


def _build_full_name(surname, given_name, patronymic):
    parts = [p for p in [surname, given_name, patronymic] if p]
    return " ".join(parts) if parts else None


def _normalize_patronymic(value):
    if not value:
        return None
    cleaned = value.replace("'", "").replace("`", "")
    cleaned = re.sub(r"\bO\s*G\s*L\s*I\b", "OGLI", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\bOG\s*LI\b", "OGLI", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if _normalize_label(cleaned) in _NAME_STOPWORDS:
        return None
    return cleaned or None


def _extract_card_number_from_raw(texts):
    for text in texts:
        compact = re.sub(r"[^A-Z0-9]", "", text.upper())
        if "K" not in compact:
            continue
        match = re.search(r"(K[4A][0-9A-Z]{7,8})", compact)
        if not match:
            continue
        candidate = match.group(1)
        normalized = _normalize_doc_number(candidate)
        if normalized and re.match(r"^[A-Z]{2}\d{7,8}$", normalized):
            return normalized
    return None


def _normalize_date_candidate(value):
    if not value:
        return None
    value = value.strip()
    for fmt in ("%d.%m.%Y", "%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(value, fmt).strftime("%d.%m.%Y")
        except ValueError:
            continue
    match = re.search(r"\b(\d{2})\s(\d{2})\s(\d{4})\b", value)
    if match:
        return f"{match.group(1)}.{match.group(2)}.{match.group(3)}"
    return None


def _is_plausible_birthdate(value):
    if not value:
        return False
    try:
        date_val = value if hasattr(value, "year") else None
        if date_val is None:
            date_val = datetime.strptime(value, "%d.%m.%Y").date()
    except ValueError:
        return False
    today = datetime.now().date()
    age_days = (today - date_val).days
    return 3650 <= age_days <= 365 * 120


def extract_birth_date(data, hint=None):
    hint_value = _normalize_date_candidate(hint)
    if hint_value and _is_plausible_birthdate(hint_value):
        return hint_value
    dates = []
    for text, _ in data:
        match = re.search(r"\b(\d{2}[./-]\d{2}[./-]\d{4})\b", text)
        if match:
            normalized = _normalize_date_candidate(match.group(1))
            if normalized:
                dates.append(normalized)
        match = re.search(r"\b(\d{2}\s\d{2}\s\d{4})\b", text)
        if match:
            normalized = _normalize_date_candidate(match.group(0))
            if normalized:
                dates.append(normalized)
    if not dates:
        return None
    parsed = []
    for value in dates:
        try:
            parsed.append((datetime.strptime(value, "%d.%m.%Y").date(), value))
        except ValueError:
            continue
    parsed.sort(key=lambda item: item[0])
    eligible = [item for item in parsed if _is_plausible_birthdate(item[1])]
    if eligible:
        return eligible[0][1]
    return None


def extract_personal_number(texts):
    for text in texts:
        if not text:
            continue
        upper = text.upper()
        normalized = _normalize_mrz_digits(upper)
        digits = re.sub(r"[^0-9]", "", normalized)
        for seq in re.findall(r"\d{14}", digits):
            if _is_mrz_date_block(seq):
                continue
            return seq
    return None


def extract_sex(texts):
    for text in texts:
        upper = text.upper()
        if "ERKAK" in upper or "MALE" in upper:
            return "ERKAK"
        if "AYOL" in upper or "FEMALE" in upper:
            return "AYOL"
    return None


def _normalize_sex(value):
    if not value:
        return None
    upper = str(value).upper()
    if upper in {"M", "MALE", "ERKAK"}:
        return "ERKAK"
    if upper in {"F", "FEMALE", "AYOL"}:
        return "AYOL"
    return None


def extract_citizenship(texts):
    for text in texts:
        upper = text.upper().replace("'", "")
        if "OZBEKISTON" in upper or "UZBEKISTAN" in upper:
            return "OZBEKISTON"
        if "UZB" in upper:
            return "UZB"
    return None


def _normalize_citizenship(value):
    if not value:
        return None
    value = value.replace("<", "").strip().upper()
    if any(word in value for word in ("ISSUE", "EXPIR", "BERILGAN", "DATE")):
        return None
    if re.fullmatch(r"\d{2}[./-]\d{2}[./-]\d{4}", value):
        return None
    if value.isdigit():
        return None
    letters_only = re.sub(r"[^A-Z]", "", value)
    if not letters_only:
        return None
    if letters_only in {"UZB"}:
        return "OZBEKISTON"
    if "UZBEK" in letters_only or "OZBEK" in letters_only:
        return "OZBEKISTON"
    return value


def _ordered_texts(results):
    items = []
    for bbox, text, _ in results:
        if not text:
            continue
        ys = [point[1] for point in bbox]
        xs = [point[0] for point in bbox]
        items.append((min(ys), min(xs), text))
    items.sort()
    return [text for _, _, text in items]


def _bbox_bounds(bbox):
    xs = [point[0] for point in bbox]
    ys = [point[1] for point in bbox]
    return min(xs), min(ys), max(xs), max(ys)


def _label_value_with_fallback(results, ordered_texts, labels, value_pattern=None):
    value = _label_value_from_results(results, labels, value_pattern=value_pattern)
    if value:
        return value
    return extract_labeled_value(ordered_texts, labels, value_pattern=value_pattern)


def _label_value_from_results(results, labels, value_pattern=None):
    items = []
    label_items = []
    for bbox, text, _ in results:
        if not text:
            continue
        x1, y1, x2, y2 = _bbox_bounds(bbox)
        item = {
            "text": text.strip(),
            "x1": x1,
            "y1": y1,
            "x2": x2,
            "y2": y2,
            "cx": (x1 + x2) / 2.0,
            "cy": (y1 + y2) / 2.0,
            "h": max(1.0, y2 - y1),
        }
        if _label_matches(text, labels):
            label_items.append(item)
        else:
            items.append(item)

    if not label_items or not items:
        return None

    best_value = None
    best_score = None
    for label in label_items:
        for cand in items:
            candidate_text = cand["text"]
            if not candidate_text:
                continue
            if value_pattern and not re.search(value_pattern, candidate_text, flags=re.IGNORECASE):
                continue
            if not value_pattern and not _is_valid_label_value(candidate_text, labels):
                continue
            if value_pattern and _label_matches(candidate_text, labels):
                continue
            dy = cand["cy"] - label["cy"]
            if dy < -label["h"] * 0.5:
                continue
            dx_right = cand["cx"] - label["x2"]
            same_row = abs(dy) <= label["h"] * 1.5 and dx_right >= -label["h"] * 0.5
            same_col = abs(cand["cx"] - label["cx"]) <= label["h"] * 4 and dy >= 0
            if not (same_row or same_col):
                continue
            score = abs(dy) + max(0.0, dx_right)
            if best_score is None or score < best_score:
                best_score = score
                best_value = candidate_text

    return best_value


def _normalize_label(text):
    text = text.upper().replace("'", "").replace("`", "")
    text = re.sub(r"[^A-Z0-9]", "", text)
    return text


def _label_matches(text, labels):
    normalized = _normalize_label(text)
    for label in labels:
        if _normalize_label(label) in normalized:
            return True
    return False


def extract_labeled_value(ordered_texts, labels, value_pattern=None):
    for index, text in enumerate(ordered_texts):
        if _label_matches(text, labels):
            inline = _strip_inline_value(text, labels)
            if inline:
                if value_pattern and not re.search(value_pattern, inline, flags=re.IGNORECASE):
                    inline = None
                if inline and _is_valid_label_value(inline, labels):
                    return inline
            for offset in range(1, 4):
                next_index = index + offset
                if next_index >= len(ordered_texts):
                    break
                candidate = ordered_texts[next_index].strip()
                if not candidate:
                    continue
                if _label_matches(candidate, labels):
                    continue
                if value_pattern and not re.search(value_pattern, candidate, flags=re.IGNORECASE):
                    continue
                if not _is_valid_label_value(candidate, labels):
                    continue
                return candidate
    return None


def _strip_inline_value(text, labels):
    upper = text.upper()
    for label in labels:
        pos = upper.find(label)
        if pos >= 0:
            value = text[pos + len(label):]
            value = re.sub(r"[:/\\-]+", " ", value).strip()
            if value:
                return value
    return None


def _is_valid_label_value(value, labels):
    if not value:
        return False
    normalized = _normalize_label(value)
    if not normalized:
        return False
    for label in labels:
        if _normalize_label(label) in normalized:
            return False
    if normalized in _NAME_STOPWORDS:
        return False
    letters = re.sub(r"[^A-Za-z]", "", value)
    if len(letters) < 2 and not normalized.isdigit():
        return False
    return True


def extract_mrz_data(texts):
    lines = _collect_mrz_lines(texts)
    if len(lines) >= 2:
        td1 = _parse_td1_mrz(lines)
        if td1:
            return td1

    candidates = []
    for text in texts:
        norm = re.sub(r"[^A-Z0-9<]", "", text.upper())
        if (norm.count("<") >= 2 and len(norm) >= 25) or (norm.startswith("I") and len(norm) >= 20):
            candidates.append(norm)

    if not candidates:
        return {}

    card_number = _mrz_extract_doc_number(candidates)
    personal_number = _mrz_extract_personal_number(candidates)
    birthdate = _mrz_extract_birthdate(candidates)
    surname, given, patronymic, fio = _mrz_extract_name_parts(candidates)
    sex, nationality = _mrz_extract_sex_nationality(candidates)

    return {
        "card_number": card_number,
        "personal_number": personal_number,
        "fio": fio,
        "surname": surname,
        "name": given,
        "patronymic": patronymic,
        "birthdate": birthdate,
        "sex": _normalize_sex(sex),
        "citizenship": _normalize_citizenship(nationality),
    }


def _parse_mrz_date(value: str):
    if not value or len(value) != 6 or not value.isdigit():
        return None
    yy = int(value[:2])
    mm = int(value[2:4])
    dd = int(value[4:6])
    year = 1900 + yy if yy >= 50 else 2000 + yy
    return f"{dd:02d}.{mm:02d}.{year:04d}"


def _is_mrz_date_block(seq: str) -> bool:
    if not seq or len(seq) != 14 or not seq.isdigit():
        return False
    birth = _parse_mrz_date(seq[:6])
    expiry = _parse_mrz_date(seq[7:13])
    return bool(birth and expiry)


def _read_mrz_texts(img):
    try:
        h, w = img.shape[:2]
    except Exception:
        return []
    if h < 50 or w < 50:
        return []
    texts = []
    for ratio in (0.45, 0.55, 0.62, 0.7, 0.78, 0.85):
        y1 = int(h * ratio)
        roi = img[y1:h, :]
        for candidate in _mrz_candidates(roi):
            try:
                chunk = reader.readtext(
                    candidate,
                    detail=1,
                    allowlist="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<",
                    paragraph=False,
                    text_threshold=0.4,
                    low_text=0.3,
                    contrast_ths=0.05,
                    adjust_contrast=0.7,
                )
                texts.extend(_group_mrz_lines(chunk))
            except Exception as exc:
                logger.warning(f"MRZ OCR failed: {exc}")
    return list(dict.fromkeys(texts))


def _group_mrz_lines(chunks):
    items = []
    for bbox, text, _ in chunks:
        if not text:
            continue
        x1, y1, x2, y2 = _bbox_bounds(bbox)
        items.append(
            {
                "text": _normalize_mrz_chunk(text),
                "cx": (x1 + x2) / 2.0,
                "cy": (y1 + y2) / 2.0,
                "h": max(1.0, y2 - y1),
            }
        )
    if not items:
        return []
    items.sort(key=lambda item: item["cy"])
    lines = []
    for item in items:
        placed = False
        for line in lines:
            if abs(item["cy"] - line["cy"]) <= max(6.0, line["h"] * 0.6):
                line["items"].append(item)
                line["cy"] = (line["cy"] * line["count"] + item["cy"]) / (line["count"] + 1)
                line["h"] = max(line["h"], item["h"])
                line["count"] += 1
                placed = True
                break
        if not placed:
            lines.append({"cy": item["cy"], "h": item["h"], "count": 1, "items": [item]})

    line_texts = []
    for line in lines:
        line["items"].sort(key=lambda item: item["cx"])
        text = "".join([item["text"] for item in line["items"] if item["text"]])
        text = re.sub(r"[^A-Z0-9<]", "", text.upper())
        if len(text) >= 20:
            line_texts.append(text)
    return line_texts


def _normalize_mrz_chunk(value):
    return re.sub(r"[^A-Z0-9<]", "", value.upper())


def _preprocess_for_ocr(img):
    try:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    except Exception:
        return img
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    blur = cv2.GaussianBlur(enhanced, (0, 0), 1.0)
    sharp = cv2.addWeighted(enhanced, 1.6, blur, -0.6, 0)
    return cv2.cvtColor(sharp, cv2.COLOR_GRAY2BGR)


def _extract_card_region(img):
    try:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    except Exception:
        return img
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blur, 60, 180)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return img
    h, w = gray.shape[:2]
    min_area = h * w * 0.2
    best = None
    best_area = 0
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < min_area:
            continue
        peri = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.02 * peri, True)
        if len(approx) == 4 and area > best_area:
            best_area = area
            best = approx
    if best is None:
        return img
    pts = best.reshape(4, 2).astype("float32")
    rect = _order_points(pts)
    (tl, tr, br, bl) = rect
    width_a = np.linalg.norm(br - bl)
    width_b = np.linalg.norm(tr - tl)
    max_width = int(max(width_a, width_b))
    height_a = np.linalg.norm(tr - br)
    height_b = np.linalg.norm(tl - bl)
    max_height = int(max(height_a, height_b))
    if max_width < 10 or max_height < 10:
        return img
    dst = np.array(
        [
            [0, 0],
            [max_width - 1, 0],
            [max_width - 1, max_height - 1],
            [0, max_height - 1],
        ],
        dtype="float32",
    )
    matrix = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(img, matrix, (max_width, max_height))
    return warped


def _order_points(pts):
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect


def _mrz_candidates(roi):
    candidates = []
    try:
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    except Exception:
        return [roi]
    for scale in (1.8, 2.4):
        resized = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
        candidates.append(resized)
        _, otsu = cv2.threshold(resized, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        candidates.append(otsu)
        adaptive = cv2.adaptiveThreshold(
            resized,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            31,
            5,
        )
        candidates.append(adaptive)
    return candidates


def _normalize_mrz_digits(value: str):
    return value.translate(_MRZ_DIGIT_MAP)


def _normalize_doc_number(value: str | None):
    if not value:
        return None
    compact = re.sub(r"[^A-Z0-9]", "", value.upper())
    if len(compact) < 9:
        return None
    prefix = compact[:2].translate(_MRZ_LETTER_MAP)
    if not prefix.isalpha():
        return None
    digits = _normalize_mrz_digits(compact[2:])
    if not digits.isdigit():
        return None
    return f"{prefix}{digits}"


def _mrz_extract_doc_number(candidates: list[str]):
    for text in candidates:
        normalized = re.sub(r"[^A-Z0-9<]", "", text.upper())
        if normalized.startswith("I") and len(normalized) >= 14:
            candidate = normalized[5:14]
            doc = _normalize_doc_number(candidate)
            if doc:
                return doc
        match = re.search(r"([A-Z]{2})([0-9A-Z]{7,8})", normalized)
        if match:
            prefix = match.group(1)
            digits = _normalize_mrz_digits(match.group(2))
            if digits.isdigit():
                return f"{prefix}{digits}"
    return None


def _mrz_extract_personal_number(candidates: list[str]):
    for text in candidates:
        normalized = re.sub(r"[^A-Z0-9<]", "", text.upper())
        normalized = _normalize_mrz_digits(normalized)
        if normalized.startswith("I") and len(normalized) >= 30:
            tail = normalized[15:]
            digits = re.sub(r"[^0-9]", "", tail)
            if len(digits) >= 14:
                return digits[-14:]
        digits = re.sub(r"[^0-9]", "", normalized)
        if len(digits) >= 14:
            return digits[-14:]
    return None


def _collect_mrz_lines(texts):
    lines = []
    for text in texts:
        norm = re.sub(r"[^A-Z0-9<]", "", text.upper())
        if len(norm) < 20:
            continue
        has_markers = norm.count("<") >= 2 or norm.startswith(("I", "P"))
        line2_pattern = re.search(r"\d{6}\d?[MF<]\d{6}\d?[A-Z<]{3}", _normalize_mrz_digits(norm))
        if not (has_markers or line2_pattern):
            continue
        lines.append(norm)
    return list(dict.fromkeys(lines))


def _parse_td1_mrz(lines):
    candidates = [line for line in lines if 25 <= len(line) <= 35]
    if len(candidates) < 2:
        return {}

    candidates.sort(key=len, reverse=True)
    top = candidates[:3]
    line1 = next((line for line in top if line.startswith("I")), None)
    line3 = next((line for line in top if "<<" in line and not line.startswith("I")), None)
    line2 = next((line for line in top if line not in (line1, line3)), None)

    if not line1 or not line2:
        return {}

    line1 = line1.ljust(30, "<")[:30]
    line2 = line2.ljust(30, "<")[:30]
    if line3:
        line3 = line3.ljust(30, "<")[:30]

    doc_match = re.search(r"(K[4A][0-9A-Z]{7,8})", line1)
    doc_number_raw = doc_match.group(1) if doc_match else line1[5:14]
    card_number = _normalize_doc_number(doc_number_raw)
    if not card_number:
        combined = f"{line1}{line2}{line3 or ''}"
        match_card = re.search(r"([A-Z]{2}[0-9A-Z]{7,8})", combined)
        if match_card:
            card_number = _normalize_doc_number(match_card.group(1))

    personal_number = None
    optional1 = _normalize_mrz_digits(line1[15:30])
    digits = re.sub(r"[^0-9]", "", optional1)
    if len(digits) >= 14:
        personal_number = digits[-14:]
    else:
        optional2 = _normalize_mrz_digits(line2[18:30])
        digits = re.sub(r"[^0-9]", "", optional2)
        if len(digits) >= 14:
            personal_number = digits[-14:]

    birthdate = _parse_mrz_date(_normalize_mrz_digits(line2[0:6]))
    sex = line2[7] if len(line2) > 7 else None
    nationality = line2[15:18] if len(line2) >= 18 else None

    fio = None
    surname = None
    given = None
    patronymic = None
    if line3:
        surname, given, patronymic, fio = _mrz_extract_name_parts([line3])

    return {
        "card_number": card_number,
        "personal_number": personal_number,
        "fio": fio,
        "surname": surname,
        "name": given,
        "patronymic": patronymic,
        "birthdate": birthdate,
        "sex": sex,
        "citizenship": _normalize_citizenship(nationality),
    }


def _mrz_extract_birthdate(candidates: list[str]):
    for text in candidates:
        normalized = _normalize_mrz_digits(text)
        match = re.search(r"(\d{6})\d?[MF<]", normalized)
        if match:
            return _parse_mrz_date(match.group(1))
    return None


def _mrz_extract_name_parts(candidates: list[str]):
    for text in candidates:
        if "<<" not in text:
            continue
        parts = text.split("<<", 1)
        surname = parts[0].replace("<", " ").strip()
        given = parts[1].replace("<", " ").strip()
        surname_tokens = []
        for token in re.split(r"\s+", surname):
            clean = token.replace("'", "").replace("`", "").replace("-", "")
            if clean.isalpha() and len(clean) > 1:
                surname_tokens.append(clean)
        given_tokens = []
        for token in re.split(r"\s+", given):
            clean = token.replace("'", "").replace("`", "").replace("-", "")
            if clean.isalpha() and len(clean) > 1:
                given_tokens.append(clean)
        surname_value = " ".join(surname_tokens[:1]) if surname_tokens else None
        given_value = " ".join(given_tokens[:1]) if given_tokens else None
        patronymic_value = " ".join(given_tokens[1:2]) if len(given_tokens) > 1 else None
        fio_parts = [part for part in [surname_value] + given_tokens if part]
        fio_value = " ".join(fio_parts) if fio_parts else None
        return surname_value, given_value, patronymic_value, fio_value
    return None, None, None, None


def _mrz_extract_sex_nationality(candidates: list[str]):
    for text in candidates:
        normalized = _normalize_mrz_digits(text)
        match = re.search(r"\d{6}\d?([MF<])\d{6}\d?[A-Z<]{3}", normalized)
        if match:
            sex = match.group(1)
            if sex == "<":
                sex = None
            nationality = normalized[-3:] if len(normalized) >= 3 else None
            return sex, nationality
    return None, None


def _resize_max(img, max_side=1600):
    try:
        h, w = img.shape[:2]
    except Exception:
        return img
    if max(h, w) <= max_side:
        return img
    scale = max_side / float(max(h, w))
    new_w = max(1, int(w * scale))
    new_h = max(1, int(h * scale))
    return cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)

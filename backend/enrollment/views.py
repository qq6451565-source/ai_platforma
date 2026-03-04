import logging
from datetime import datetime
from difflib import SequenceMatcher
import re
from time import perf_counter
from django.conf import settings
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.exceptions import NotFound, ValidationError, PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from ai.clients import AIConnectionError, face_analyze, face_match, health_check, ocr_passport
from ai.models import AISettings
from accounts.models import User, PassportData
from groups.models import Group
from directions.models import Direction
from profiles.models import StudentProfile, TeacherProfile
from subjects.models import Subject
from teacher_subject.models import TeacherSubject
from tests_app.permissions import IsAdmin

from .models import RegistrationWindow, Applicant, ApplicantDocument, VerificationResult
from .serializers import (
    RegistrationWindowSerializer,
    ApplicantSerializer,
    ApplicantDocumentSerializer,
    VerificationResultSerializer,
)

logger = logging.getLogger(__name__)
AI_REVERIFY_COOLDOWN_SECONDS = 90


class RegistrationWindowViewSet(viewsets.ModelViewSet):
    queryset = RegistrationWindow.objects.all()
    serializer_class = RegistrationWindowSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        return [IsAuthenticated(), IsAdmin()]

    def perform_create(self, serializer):
        instance = serializer.save()
        if instance.is_active:
            RegistrationWindow.objects.exclude(id=instance.id).update(is_active=False)

    def perform_update(self, serializer):
        instance = serializer.save()
        if instance.is_active:
            RegistrationWindow.objects.exclude(id=instance.id).update(is_active=False)


class ApplicantViewSet(viewsets.ModelViewSet):
    queryset = Applicant.objects.all()
    serializer_class = ApplicantSerializer

    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]
        return [IsAuthenticated(), IsAdmin()]


class ApplicantDocumentViewSet(viewsets.ModelViewSet):
    queryset = ApplicantDocument.objects.all()
    serializer_class = ApplicantDocumentSerializer

    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]
        return [IsAuthenticated(), IsAdmin()]

    def perform_create(self, serializer):
        document = serializer.save()
        _run_ai_verification(document)

    def perform_update(self, serializer):
        document = serializer.save()
        _run_ai_verification(document)


class VerificationResultViewSet(viewsets.ModelViewSet):
    queryset = VerificationResult.objects.all()
    serializer_class = VerificationResultSerializer

    def get_permissions(self):
        return [IsAuthenticated(), IsAdmin()]


def _is_registration_open():
    return RegistrationWindow.objects.filter(is_active=True).exists()


class ApplicantRegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        if not _is_registration_open():
            raise PermissionDenied("Ro'yxatdan o'tish yopiq.")

        data = request.data
        full_name_input = (data.get("full_name") or "").strip()
        phone = (data.get("phone") or "").strip()
        email = (data.get("email") or "").strip()
        direction_id = data.get("direction_choice")

        passport_front = request.FILES.get("passport_front") or request.FILES.get("passport_image")
        passport_back = request.FILES.get("passport_back") or request.FILES.get("passport_back_image")
        selfie = request.FILES.get("selfie") or request.FILES.get("selfie_image")

        if not passport_front or not selfie:
            raise ValidationError({"documents": "Passport oldi va selfie majburiy."})

        if direction_id:
            try:
                Direction.objects.get(id=direction_id)
            except Direction.DoesNotExist:
                raise ValidationError({"direction_choice": "Direction topilmadi."})

        passport_front_bytes = _read_upload_bytes(passport_front)
        passport_back_bytes = _read_upload_bytes(passport_back)
        ocr_result = {}
        ai_warning = None
        try:
            ocr_front = ocr_passport(passport_front_bytes) if passport_front_bytes else None
            ocr_back = ocr_passport(passport_back_bytes) if passport_back_bytes else None
            ocr_result = _merge_ocr_results(ocr_front, ocr_back) or {}
        except AIConnectionError as exc:
            logger.warning("AI OCR unavailable during registration: %s", exc)
            ai_warning = "AI xizmati vaqtincha mavjud emas. Ariza admin tekshiruviga yuborildi."

        ocr_surname = (ocr_result.get("surname") or "").strip()
        ocr_name = (ocr_result.get("name") or "").strip()
        ocr_patronymic = (ocr_result.get("patronymic") or "").strip()
        fio = (ocr_result.get("fio") or "").strip()
        if fio:
            full_name = fio
        else:
            full_name = " ".join([p for p in [ocr_surname, ocr_name, ocr_patronymic] if p])

        if not full_name:
            if full_name_input:
                full_name = full_name_input
            else:
                raise ValidationError({"documents": "Passportdan ism-familiya aniqlanmadi."})

        passport_series = (ocr_result.get("card_number") or ocr_result.get("passport_id") or "").strip()

        birth_date = _parse_date(ocr_result.get("birthdate")) if ocr_result.get("birthdate") else None

        username_source = full_name_input or full_name
        username = _build_username(username_source)
        # Vaqtinchalik kirish paroli sifatida telefon ishlatiladi.
        # Admin tasdiqlaganida parol passport seriyaga yangilanadi.
        password = re.sub(r"\s+", "", phone) or passport_series or "123456"

        parts = full_name.split()
        first_name = ocr_name or (parts[0] if parts else "")
        last_name = ocr_surname or (" ".join(parts[1:]) if len(parts) > 1 else "")

        user = User.objects.create_user(
            username=username,
            password=password,
            first_name=first_name,
            last_name=last_name,
            email=email,
            role="student",
            phone=phone,
        )

        applicant = Applicant.objects.create(
            user=user,
            full_name=full_name,
            phone=phone,
            email=email,
            direction_choice_id=direction_id or None,
            status="pending",
            birth_date=birth_date or None,
            patronymic=ocr_patronymic or None,
            name=ocr_name or None,
            surname=ocr_surname or None,
            passport_id=passport_series or None,
            card_number=ocr_result.get("card_number") or None,
            personal_number=ocr_result.get("personal_number") or None,
            sex=ocr_result.get("sex") or None,
            citizenship=ocr_result.get("citizenship") or None,
            birth_place=ocr_result.get("birth_place") or None,
        )

        document = ApplicantDocument.objects.create(
            applicant=applicant,
            passport_front=passport_front,
            passport_back=passport_back,
            face_image=selfie,
        )
        verification_warning = _run_ai_verification(document)
        if verification_warning and not ai_warning:
            ai_warning = verification_warning

        applicant.refresh_from_db()

        refresh = RefreshToken.for_user(user)
        refresh["role"] = getattr(user, "role", None)
        refresh["token_version"] = getattr(user, "token_version", 1)
        refresh["is_staff"] = user.is_staff
        refresh["is_superuser"] = user.is_superuser
        access = refresh.access_token

        payload = {
            "detail": "Ariza qabul qilindi. Admin tasdiqlashi kutilmoqda.",
            "applicant_id": applicant.id,
            "status": applicant.status,
            "login_username": user.username,
            "login_password": password,
            "access": str(access),
            "refresh": str(refresh),
            "role": getattr(user, "role", None),
            "user_id": user.id,
            "token_version": getattr(user, "token_version", 1),
        }
        if ai_warning:
            payload["warning"] = ai_warning
        return Response(payload, status=status.HTTP_201_CREATED)


class ApplicantRegisterStartView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        start_ts = perf_counter()
        applicant_id = None
        response_status = status.HTTP_500_INTERNAL_SERVER_ERROR
        try:
            if not _is_registration_open():
                raise PermissionDenied("Ro'yxatdan o'tish yopiq.")

            full_name = (request.data.get("full_name") or "").strip()
            email = (request.data.get("email") or "").strip()
            phone = (request.data.get("phone") or "").strip()
            direction_id = request.data.get("direction_choice")

            if not full_name:
                raise ValidationError({"full_name": "Ism va familiya majburiy."})
            if not email:
                raise ValidationError({"email": "Email majburiy."})
            if not phone:
                raise ValidationError({"phone": "Telefon raqami majburiy."})

            if direction_id:
                try:
                    Direction.objects.get(id=direction_id)
                except Direction.DoesNotExist:
                    raise ValidationError({"direction_choice": "Direction topilmadi."})

            username = _build_username(full_name)
            password = re.sub(r"\s+", "", phone) or "123456"
            name_parts = full_name.split()
            first_name = name_parts[0] if name_parts else ""
            last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""

            user = User.objects.create_user(
                username=username,
                password=password,
                first_name=first_name,
                last_name=last_name,
                email=email,
                role="student",
                phone=phone,
            )

            applicant = Applicant.objects.create(
                user=user,
                full_name=full_name,
                phone=phone,
                email=email,
                direction_choice_id=direction_id or None,
                status="pending",
            )
            applicant_id = applicant.id

            refresh = RefreshToken.for_user(user)
            refresh["role"] = getattr(user, "role", None)
            refresh["token_version"] = getattr(user, "token_version", 1)
            refresh["is_staff"] = user.is_staff
            refresh["is_superuser"] = user.is_superuser
            access = refresh.access_token

            response_status = status.HTTP_201_CREATED
            return Response(
                {
                    "detail": "Boshlang'ich ma'lumotlar saqlandi.",
                    "applicant_id": applicant.id,
                    "status": applicant.status,
                    "login_username": user.username,
                    "login_password": password,
                    "access": str(access),
                    "refresh": str(refresh),
                    "role": getattr(user, "role", None),
                    "user_id": user.id,
                    "token_version": getattr(user, "token_version", 1),
                },
                status=response_status,
            )
        finally:
            duration_ms = (perf_counter() - start_ts) * 1000
            logger.info(
                "register.start duration_ms=%.1f applicant_id=%s status=%s",
                duration_ms,
                applicant_id,
                response_status,
            )


class ApplicantRegisterFinalizeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        start_ts = perf_counter()
        applicant_id = None
        response_status = status.HTTP_500_INTERNAL_SERVER_ERROR
        try:
            if not _is_registration_open():
                raise PermissionDenied("Ro'yxatdan o'tish yopiq.")

            if getattr(request.user, "role", None) != "student":
                raise PermissionDenied("Faqat student finalizatsiya qila oladi.")

            applicant = (
                Applicant.objects.filter(user=request.user)
                .exclude(status__in=["approved", "rejected"])
                .order_by("-created_at")
                .first()
            )
            if not applicant:
                raise NotFound("Aktiv ariza topilmadi.")
            applicant_id = applicant.id

            passport_front = request.FILES.get("passport_front") or request.FILES.get("passport_image")
            passport_back = request.FILES.get("passport_back") or request.FILES.get("passport_back_image")
            selfie = request.FILES.get("selfie") or request.FILES.get("selfie_image")
            direction_id = request.data.get("direction_choice")

            if not passport_front:
                raise ValidationError({"passport_front": "Passport old tomoni majburiy."})
            if not selfie:
                raise ValidationError({"selfie": "Selfie rasmi majburiy."})

            if direction_id:
                try:
                    Direction.objects.get(id=direction_id)
                except Direction.DoesNotExist:
                    raise ValidationError({"direction_choice": "Direction topilmadi."})
                applicant.direction_choice_id = direction_id
                applicant.save(update_fields=["direction_choice"])

            document, created = ApplicantDocument.objects.get_or_create(
                applicant=applicant,
                defaults={
                    "passport_front": passport_front,
                    "passport_back": passport_back,
                    "face_image": selfie,
                },
            )
            if not created:
                document.passport_front = passport_front
                if passport_back:
                    document.passport_back = passport_back
                document.face_image = selfie
                document.save()

            if applicant.status not in ["approved", "rejected"]:
                applicant.status = "pending"
                applicant.save(update_fields=["status"])

            # AI verification: OCR + face_match + face_embedding saqlash
            ai_warning = None
            try:
                ai_warning = _run_ai_verification(document)
            except Exception as exc:
                logger.warning("AI verification failed during finalize applicant=%s: %s", applicant.id, exc)
                ai_warning = "AI tekshiruvi amalga oshmadi. Admin tekshiradi."

            applicant.refresh_from_db()

            response_status = status.HTTP_200_OK
            payload = {
                "detail": "Ariza yakunlandi. Admin tasdiqlashi kutilmoqda.",
                "applicant_id": applicant.id,
                "status": applicant.status,
                "login_username": request.user.username,
            }
            if ai_warning:
                payload["warning"] = ai_warning
            return Response(payload, status=response_status)
        finally:
            duration_ms = (perf_counter() - start_ts) * 1000
            logger.info(
                "register.finalize duration_ms=%.1f applicant_id=%s status=%s",
                duration_ms,
                applicant_id,
                response_status,
            )


def _read_upload_bytes(uploaded_file):
    if not uploaded_file:
        return None
    try:
        pos = uploaded_file.tell()
    except Exception:
        pos = None
    data = uploaded_file.read()
    try:
        if pos is not None:
            uploaded_file.seek(pos)
        else:
            uploaded_file.seek(0)
    except Exception:
        pass
    return data


def _read_field_bytes(field_file):
    if not field_file:
        return None
    try:
        if hasattr(field_file, "open"):
            field_file.open("rb")
        return field_file.read()
    finally:
        try:
            if hasattr(field_file, "close"):
                field_file.close()
        except Exception:
            pass


def _parse_date(value):
    if not value:
        return None
    for fmt in ("%d.%m.%Y", "%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    return None


def _normalize(value):
    return "".join(ch for ch in value.lower() if ch.isalnum())


def _has_digits(value: str | None) -> bool:
    if not value:
        return False
    return any(ch.isdigit() for ch in value)


def _is_valid_card_number(value: str | None) -> bool:
    if not value:
        return False
    compact = "".join(ch for ch in value if ch.isalnum()).upper()
    return bool(re.match(r"^[A-Z]{2}\d{7,8}$", compact))


def _is_valid_personal_number(value: str | None) -> bool:
    if not value:
        return False
    digits = "".join(ch for ch in value if ch.isdigit())
    return len(digits) == 14


def _is_plausible_birthdate(value) -> bool:
    if not value:
        return False
    try:
        date_val = value if hasattr(value, "year") else _parse_date(value)
    except Exception:
        return False
    if not date_val:
        return False
    today = timezone.now().date()
    age_days = (today - date_val).days
    return 365 * 10 <= age_days <= 365 * 120


def _looks_like_label(value: str | None) -> bool:
    if not value:
        return True
    upper = value.upper()
    if any(word in upper for word in ["IDENTITY", "CARD", "PASSPORT", "GUVOHNOMASI", "SHAXS", "DATE", "ISSUE"]):
        return True
    return False


def _is_invalid_citizenship(value: str | None) -> bool:
    if not value:
        return True
    upper = value.upper()
    if _looks_like_label(upper):
        return True
    if re.fullmatch(r"\d{2}[./-]\d{2}[./-]\d{4}", upper):
        return True
    if upper.isdigit():
        return True
    return False


def _should_update_name(current: str | None, new: str | None) -> bool:
    if not new:
        return False
    if not current:
        return True
    if _looks_like_label(current) or _has_digits(current):
        return True
    if len(new) > len(current) and _name_similarity(_normalize_name_token(new), _normalize_name_token(current)) < 0.5:
        return True
    return False


def _normalize_name_token(token: str) -> str:
    return "".join(ch for ch in token.lower() if ch.isalnum())


def _name_similarity(left: str, right: str) -> float:
    if not left or not right:
        return 0.0
    return SequenceMatcher(None, left, right).ratio()


def _name_match(ocr_name, full_name):
    if not (ocr_name and full_name):
        return False
    ignore = {"ogli", "ugli", "qizi", "kizi", "oglu"}
    raw_tokens = [t for t in ocr_name.replace(".", " ").replace(",", " ").split() if t]
    tokens = []
    for token in raw_tokens:
        normalized = _normalize_name_token(token)
        if not normalized or normalized in ignore or len(normalized) < 3:
            continue
        tokens.append(normalized)
    if not tokens:
        return False
    haystack_tokens = [
        _normalize_name_token(part)
        for part in full_name.replace(".", " ").replace(",", " ").split()
        if part
    ]
    matched = 0
    for token in tokens:
        for candidate in haystack_tokens:
            if token in candidate or candidate in token:
                matched += 1
                break
            if _name_similarity(token, candidate) >= 0.78:
                matched += 1
                break
    required = 2 if len(tokens) >= 2 else 1
    return matched >= required


def _build_username(full_name: str):
    base = "_".join(part for part in full_name.lower().split() if part)
    base = "".join(ch for ch in base if ch.isalnum() or ch == "_")
    if not base:
        base = "user"
    username = base
    suffix = 1
    while User.objects.filter(username=username).exists():
        username = f"{base}{suffix}"
        suffix += 1
    return username


def _split_passport_id(value: str):
    if not value:
        return "NA", "NA"
    compact = "".join(ch for ch in value if ch.isalnum())
    if len(compact) <= 2:
        return compact.upper() or "NA", "NA"
    return compact[:2].upper(), compact[2:]


def _ensure_passport_data(user, applicant, documents):
    if not documents:
        return
    series, number = _split_passport_id(applicant.card_number or applicant.passport_id or "")
    defaults = {
        "passport_series": series,
        "passport_number": number,
        "card_number": applicant.card_number or applicant.passport_id,
        "personal_number": applicant.personal_number,
        "birth_date": applicant.birth_date,
        "extracted_fullname": applicant.full_name or "",
        "surname": applicant.surname,
        "name": applicant.name,
        "patronymic": applicant.patronymic,
        "sex": applicant.sex,
        "citizenship": applicant.citizenship,
        "birth_place": applicant.birth_place,
        "front_image": documents.passport_front,
        "back_image": documents.passport_back,
        "selfie_image": documents.face_image,
    }
    passport, created = PassportData.objects.get_or_create(user=user, defaults=defaults)
    if created:
        return
    updates = {}
    if applicant.birth_date and not passport.birth_date:
        updates["birth_date"] = applicant.birth_date
    if applicant.full_name and not passport.extracted_fullname:
        updates["extracted_fullname"] = applicant.full_name
    if series != "NA" and passport.passport_series in ("", "NA"):
        updates["passport_series"] = series
    if number != "NA" and passport.passport_number in ("", "NA"):
        updates["passport_number"] = number
    if applicant.card_number and not passport.card_number:
        updates["card_number"] = applicant.card_number
    if applicant.personal_number and not passport.personal_number:
        updates["personal_number"] = applicant.personal_number
    if applicant.surname and not passport.surname:
        updates["surname"] = applicant.surname
    if applicant.name and not passport.name:
        updates["name"] = applicant.name
    if applicant.patronymic and not passport.patronymic:
        updates["patronymic"] = applicant.patronymic
    if applicant.sex and not passport.sex:
        updates["sex"] = applicant.sex
    if applicant.citizenship and not passport.citizenship:
        updates["citizenship"] = applicant.citizenship
    if applicant.birth_place and not passport.birth_place:
        updates["birth_place"] = applicant.birth_place
    if documents.passport_front and not passport.front_image:
        updates["front_image"] = documents.passport_front
    if documents.passport_back and not passport.back_image:
        updates["back_image"] = documents.passport_back
    if documents.face_image and not passport.selfie_image:
        updates["selfie_image"] = documents.face_image
    if updates:
        for key, value in updates.items():
            setattr(passport, key, value)
        passport.save(update_fields=list(updates.keys()))


def _run_ai_verification(document, *, fast_mode: bool = False):
    applicant = document.applicant
    settings_ai = AISettings.get_active()

    events = []
    verified = False
    confidence = 0.0

    ai_enabled = settings_ai.ai_enabled
    ai_base_url = settings_ai.api_base_url or getattr(settings, "AI_BASE_URL", None)
    if not (ai_enabled and ai_base_url):
        events.append({"type": "ai", "status": "disabled"})
        VerificationResult.objects.create(
            applicant=applicant,
            verified=False,
            confidence=0.0,
            events_json=events,
        )
        return

    gateway_health = health_check() or {}
    if not gateway_health.get("ok"):
        return _mark_ai_unavailable(
            applicant,
            events,
            reason=gateway_health.get("reason", "gateway_unreachable"),
        )

    passport_front_bytes = _read_field_bytes(document.passport_front)
    passport_back_bytes = _read_field_bytes(document.passport_back)
    selfie_bytes = _read_field_bytes(document.face_image)
    timeout_override = None
    retries_override = None
    if fast_mode:
        configured_timeout = int(settings_ai.timeout_seconds or 60)
        timeout_override = max(8, min(20, configured_timeout))
        retries_override = 0
    try:
        ocr_front = (
            ocr_passport(
                passport_front_bytes,
                timeout_override=timeout_override,
                retries_override=retries_override,
            )
            if passport_front_bytes
            else None
        )
        ocr_back = (
            ocr_passport(
                passport_back_bytes,
                timeout_override=timeout_override,
                retries_override=retries_override,
            )
            if passport_back_bytes
            else None
        )
        ocr_result = _merge_ocr_results(ocr_front, ocr_back)
    except AIConnectionError as exc:
        logger.warning("AI OCR unavailable for applicant %s: %s", applicant.id, exc)
        return _mark_ai_unavailable(applicant, events, reason=_infer_ai_error_reason(exc))
    if not ocr_result:
        events.append({"type": "ocr", "status": "failed"})
    else:
        ocr_card_number = ocr_result.get("card_number") or ocr_result.get("passport_id")
        ocr_personal_number = ocr_result.get("personal_number")
        ocr_birthdate = _parse_date(ocr_result.get("birthdate"))
        ocr_name = ocr_result.get("fio")
        ocr_surname = ocr_result.get("surname")
        ocr_given_name = ocr_result.get("name")
        ocr_patronymic = ocr_result.get("patronymic")
        ocr_sex = ocr_result.get("sex")
        ocr_citizenship = ocr_result.get("citizenship")
        ocr_birth_place = ocr_result.get("birth_place")
        updates = []

        applicant_passport_id = applicant.card_number if _is_valid_card_number(applicant.card_number) else None
        if not applicant_passport_id and _is_valid_card_number(applicant.passport_id):
            applicant_passport_id = applicant.passport_id
        passport_match = None
        if applicant_passport_id:
            passport_match = bool(ocr_card_number) and _normalize(ocr_card_number) == _normalize(applicant_passport_id)
        elif ocr_card_number:
            if not applicant.card_number:
                applicant.card_number = ocr_card_number
                updates.append("card_number")
            if not applicant.passport_id:
                applicant.passport_id = ocr_card_number
                updates.append("passport_id")
            passport_match = True

        birthdate_match = None
        if applicant.birth_date:
            birthdate_match = bool(ocr_birthdate) and ocr_birthdate == applicant.birth_date
        elif ocr_birthdate and _is_plausible_birthdate(ocr_birthdate):
            applicant.birth_date = ocr_birthdate
            birthdate_match = True
            updates.append("birth_date")

        name_match = _name_match(ocr_name, applicant.full_name) if (ocr_name and applicant.full_name) else False

        if applicant.passport_id or applicant.birth_date:
            required_matches = [m for m in [passport_match, birthdate_match] if m is not None]
            ocr_passed = bool(required_matches) and all(required_matches) and name_match
        else:
            ocr_passed = name_match and bool(ocr_card_number or ocr_birthdate)

        events.append(
            {
                "type": "ocr",
                "status": "ok",
                "result": ocr_result,
                "matches": {
                    "passport_id": passport_match,
                    "birth_date": birthdate_match,
                    "full_name": name_match,
                },
                "passed": ocr_passed,
            }
        )

        if ocr_card_number and (not _is_valid_card_number(applicant.card_number)):
            applicant.card_number = ocr_card_number
            updates.append("card_number")
        if ocr_card_number and (not _is_valid_card_number(applicant.passport_id)):
            applicant.passport_id = ocr_card_number
            updates.append("passport_id")
        if ocr_personal_number and (not _is_valid_personal_number(applicant.personal_number)):
            applicant.personal_number = ocr_personal_number
            updates.append("personal_number")
        if ocr_surname and _should_update_name(applicant.surname, ocr_surname):
            applicant.surname = ocr_surname
            updates.append("surname")
        if ocr_given_name and _should_update_name(applicant.name, ocr_given_name):
            applicant.name = ocr_given_name
            updates.append("name")
        if ocr_patronymic and _should_update_name(applicant.patronymic, ocr_patronymic):
            applicant.patronymic = ocr_patronymic
            updates.append("patronymic")
        if ocr_birthdate and _is_plausible_birthdate(ocr_birthdate) and not _is_plausible_birthdate(applicant.birth_date):
            applicant.birth_date = ocr_birthdate
            updates.append("birth_date")
        if ocr_sex and (_looks_like_label(applicant.sex) or not applicant.sex):
            applicant.sex = ocr_sex
            updates.append("sex")
        if (
            ocr_citizenship
            and _is_invalid_citizenship(applicant.citizenship)
            and not _is_invalid_citizenship(ocr_citizenship)
        ):
            applicant.citizenship = ocr_citizenship
            updates.append("citizenship")
        if ocr_birth_place and (_looks_like_label(applicant.birth_place) or not applicant.birth_place):
            applicant.birth_place = ocr_birth_place
            updates.append("birth_place")
        if updates:
            applicant.save(update_fields=updates)

    face_result = None
    face_passed = True
    if settings_ai.enable_face_match:
        try:
            face_result = face_match(
                passport_front_bytes or passport_back_bytes,
                selfie_bytes,
                timeout_override=timeout_override,
                retries_override=retries_override,
            )
        except AIConnectionError as exc:
            logger.warning("AI face match unavailable for applicant %s: %s", applicant.id, exc)
            return _mark_ai_unavailable(applicant, events, reason=_infer_ai_error_reason(exc))
        if not face_result:
            face_passed = False
            events.append({"type": "face_match", "status": "failed"})
        else:
            confidence = float(face_result.get("confidence") or 0.0)
            face_passed = confidence >= settings_ai.face_match_threshold
            events.append(
                {
                    "type": "face_match",
                    "status": "ok",
                    "result": face_result,
                    "threshold": settings_ai.face_match_threshold,
                    "passed": face_passed,
                }
            )
    else:
        events.append({"type": "face_match", "status": "skipped"})

    ocr_ok = any(event.get("type") == "ocr" and event.get("passed") for event in events)
    if settings_ai.enable_face_match:
        verified = ocr_ok and face_passed
    else:
        verified = ocr_ok
        if not confidence and ocr_result:
            confidence = float(ocr_result.get("confidence") or 0.0)

    # ── Face embedding extraction ──────────────────────────────────────────────
    # Selfie rasmidan yuz embedding olib, User modeliga saqlaymiz.
    # Bu keyinchalik live dars va test proctoring uchun zarur.
    face_embedding = None
    if selfie_bytes:
        try:
            analyze_result = face_analyze(selfie_bytes)
            if analyze_result and isinstance(analyze_result, dict):
                faces = analyze_result.get("faces") or []
                if faces:
                    face_embedding = faces[0].get("embedding")
        except Exception as exc:
            logger.warning("Face analyze failed for applicant %s: %s", applicant.id, exc)

    if face_embedding and applicant.user_id:
        try:
            User.objects.filter(pk=applicant.user_id).update(face_embedding=face_embedding)
            logger.info("face_embedding saved for user_id=%s", applicant.user_id)
        except Exception as exc:
            logger.warning("Could not save face_embedding for user %s: %s", applicant.user_id, exc)

    events.append({
        "type": "face_embedding",
        "status": "ok" if face_embedding else "failed",
        "embedding_length": len(face_embedding) if face_embedding else 0,
    })
    # ──────────────────────────────────────────────────────────────────────────

    VerificationResult.objects.create(
        applicant=applicant,
        verified=verified,
        confidence=confidence,
        events_json=events,
    )

    if applicant.status not in ["approved", "rejected"]:
        applicant.status = "verified" if verified else "pending"
        applicant.save(update_fields=["status"])
    return None


def _mark_ai_unavailable(applicant, events, reason: str | None = None):
    resolved_reason = reason or "connection_error"
    event = {
        "type": "ai",
        "status": "unavailable",
        "reason": resolved_reason,
        "detail": _ai_unavailable_message(resolved_reason),
    }
    events.append(event)
    VerificationResult.objects.create(
        applicant=applicant,
        verified=False,
        confidence=0.0,
        events_json=events,
    )
    if applicant.status not in ["approved", "rejected"]:
        applicant.status = "pending"
        applicant.save(update_fields=["status"])
    return "AI xizmati vaqtincha mavjud emas. Ariza admin tekshiruviga yuborildi."


def _infer_ai_error_reason(exc: Exception) -> str:
    explicit_reason = getattr(exc, "reason", None)
    if explicit_reason:
        return explicit_reason
    text = str(exc).lower()
    if "timed out" in text or "timeout" in text:
        return "timeout"
    if "401" in text or "403" in text or "unauthorized" in text or "forbidden" in text:
        return "auth_error"
    if "name or service not known" in text or "nodename nor servname" in text:
        return "dns_error"
    if "ssl" in text or "certificate" in text:
        return "ssl_error"
    return "connection_error"


def _ai_unavailable_message(reason: str) -> str:
    messages = {
        "timeout": "AI xizmatidan javob kelmadi (timeout).",
        "gateway_unreachable": "AI gateway hozircha ulanmayapti.",
        "connection_error": "AI gateway bilan aloqa o'rnatilmadi.",
        "dns_error": "AI gateway manzili topilmadi (DNS xato).",
        "ssl_error": "AI gateway SSL sertifikatida muammo bor.",
        "auth_error": "AI gateway API kaliti noto'g'ri yoki ruxsat yo'q.",
        "rate_limited": "AI gateway vaqtincha band (rate limit).",
        "gateway_error": "AI gateway ichki xatolik qaytardi.",
    }
    return messages.get(reason, "AI gateway bilan aloqa o'rnatilmadi.")


def _merge_ocr_results(front, back):
    if not front and not back:
        return None
    def _pick(field, prefer_back=False, validator=None):
        primary = back if prefer_back else front
        secondary = front if prefer_back else back
        for item in (primary, secondary):
            value = (item or {}).get(field)
            if validator and value and validator(value):
                return value
        for item in (primary, secondary):
            value = (item or {}).get(field)
            if value:
                return value
        return None

    def _pick_card_number():
        return _pick("card_number", validator=_is_valid_card_number) or _pick(
            "passport_id", validator=_is_valid_card_number
        )

    def _pick_personal_number():
        return _pick("personal_number", prefer_back=True, validator=_is_valid_personal_number)

    def _pick_birthdate():
        return _pick("birthdate", validator=_is_plausible_birthdate)

    def _pick_name(field):
        return _pick(field) or None
    confidence = 0.0
    for item in (front, back):
        try:
            confidence = max(confidence, float((item or {}).get("confidence") or 0.0))
        except (TypeError, ValueError):
            continue
    surname = _pick_name("surname")
    given_name = _pick_name("name")
    patronymic = _pick_name("patronymic")
    fio = _pick("fio") or (f"{surname} {given_name}".strip() if surname and given_name else None)
    return {
        "passport_id": _pick_card_number(),
        "birthdate": _pick_birthdate(),
        "fio": fio,
        "surname": surname,
        "name": given_name,
        "patronymic": patronymic,
        "sex": _pick("sex"),
        "citizenship": _pick("citizenship"),
        "birth_place": _pick("birth_place", prefer_back=True),
        "card_number": _pick_card_number(),
        "personal_number": _pick_personal_number(),
        "confidence": round(confidence, 2),
    }


class ApproveApplicantView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, applicant_id):
        if not (request.user.is_superuser or getattr(request.user, "role", None) == "admin"):
            raise PermissionDenied("Faqat admin tasdiqlay oladi.")

        try:
            applicant = Applicant.objects.select_related("direction_choice", "user").get(id=applicant_id)
        except Applicant.DoesNotExist:
            raise NotFound("Applicant topilmadi.")

        if applicant.status == "approved":
            return Response({"detail": "Applicant allaqachon tasdiqlangan."}, status=status.HTTP_200_OK)

        # Admin qo'lda tekshirgan holatda AI verified bo'lmasa ham tasdiqlashga ruxsat beriladi.

        role = request.data.get("role") or "student"
        if role not in ["student", "teacher"]:
            raise ValidationError({"role": "role student yoki teacher bo'lishi kerak."})

        full_name = applicant.full_name.strip() if applicant.full_name else ""
        parts = full_name.split()
        first_name = parts[0] if parts else ""
        last_name = " ".join(parts[1:]) if len(parts) > 1 else ""

        user = applicant.user
        created_user = False
        password = None

        if role == "student":
            group_id = request.data.get("group_id")
            if not group_id:
                raise ValidationError({"group_id": "group_id required"})

            try:
                group = Group.objects.get(id=group_id)
            except Group.DoesNotExist:
                raise NotFound("Group topilmadi.")

            direction = applicant.direction_choice or group.direction

            admission_year = request.data.get("admission_year")
            if admission_year is None:
                admission_year = timezone.now().year
            try:
                admission_year = int(admission_year)
            except (TypeError, ValueError):
                raise ValidationError({"admission_year": "admission_year integer bo'lishi kerak."})

            if user is None:
                username = _build_username(full_name or (applicant.email or "user"))
                password = applicant.passport_id or "1234"
                user = User.objects.create_user(
                    username=username,
                    password=password,
                    first_name=first_name,
                    last_name=last_name,
                    email=applicant.email or "",
                    role="student",
                    phone=applicant.phone or "",
                )
                created_user = True
                applicant.user = user
            else:
                if not user.username:
                    user.username = _build_username(full_name or (applicant.email or "user"))
                user.first_name = first_name or user.first_name
                user.last_name = last_name or user.last_name
                user.email = applicant.email or user.email
                user.phone = applicant.phone or user.phone
                user.role = "student"
                if not user.is_superuser:
                    user.is_staff = False
                user.group = group
                user.save()

            if user.group_id != group.id:
                user.group = group
                user.save(update_fields=["group"])

            documents = getattr(applicant, "documents", None)
            if documents and documents.face_image:
                user_fields_to_save = []
                if not user.face_image:
                    user.face_image = documents.face_image
                    user_fields_to_save.append("face_image")
                # face_embedding yo'q bo'lsa → face_analyze orqali olib saqlaymiz
                if not user.face_embedding:
                    try:
                        _face_bytes = _read_field_bytes(documents.face_image)
                        if _face_bytes:
                            _analyze = face_analyze(_face_bytes)
                            if _analyze and isinstance(_analyze, dict):
                                _faces = _analyze.get("faces") or []
                                if _faces:
                                    user.face_embedding = _faces[0].get("embedding")
                                    if user.face_embedding:
                                        user_fields_to_save.append("face_embedding")
                                        logger.info("face_embedding set for user_id=%s during approval", user.id)
                    except Exception as _exc:
                        logger.warning("face_analyze failed during approval user=%s: %s", user.id, _exc)
                if user_fields_to_save:
                    user.save(update_fields=user_fields_to_save)

            try:
                profile = user.student_profile
                profile.direction = direction
                profile.group = group
                profile.admission_year = admission_year
                profile.status = "active"
                profile.save()
            except StudentProfile.DoesNotExist:
                StudentProfile.objects.create(
                    user=user,
                    direction=direction,
                    group=group,
                    admission_year=admission_year,
                    status="active",
                )
            _ensure_passport_data(user, applicant, documents)

        else:
            subject_id = request.data.get("subject_id")
            if not subject_id:
                raise ValidationError({"subject_id": "subject_id required"})

            try:
                subject = Subject.objects.get(id=subject_id)
            except Subject.DoesNotExist:
                raise NotFound("Subject topilmadi.")

            if user is None:
                username = _build_username(full_name or (applicant.email or "user"))
                password = applicant.passport_id or "1234"
                user = User.objects.create_user(
                    username=username,
                    password=password,
                    first_name=first_name,
                    last_name=last_name,
                    email=applicant.email or "",
                    role="teacher",
                    phone=applicant.phone or "",
                )
                created_user = True
                applicant.user = user
            else:
                if not user.username:
                    user.username = _build_username(full_name or (applicant.email or "user"))
                user.first_name = first_name or user.first_name
                user.last_name = last_name or user.last_name
                user.email = applicant.email or user.email
                user.phone = applicant.phone or user.phone
                user.role = "teacher"
                user.save()

            try:
                user.teacher_profile
            except TeacherProfile.DoesNotExist:
                TeacherProfile.objects.create(user=user)

            documents = getattr(applicant, "documents", None)
            if documents and documents.face_image:
                _teacher_fields = []
                if not user.face_image:
                    user.face_image = documents.face_image
                    _teacher_fields.append("face_image")
                if not user.face_embedding:
                    try:
                        _face_bytes = _read_field_bytes(documents.face_image)
                        if _face_bytes:
                            _analyze = face_analyze(_face_bytes)
                            if _analyze and isinstance(_analyze, dict):
                                _faces = _analyze.get("faces") or []
                                if _faces:
                                    user.face_embedding = _faces[0].get("embedding")
                                    if user.face_embedding:
                                        _teacher_fields.append("face_embedding")
                    except Exception as _exc:
                        logger.warning("face_analyze failed during teacher approval user=%s: %s", user.id, _exc)
                if _teacher_fields:
                    user.save(update_fields=_teacher_fields)

            teacher_subject = TeacherSubject.objects.create(
                teacher=user,
                subject=subject,
            )
            group_ids = request.data.get("group_ids") or []
            if isinstance(group_ids, str):
                group_ids = [g for g in group_ids.split(",") if g]
            if group_ids:
                teacher_subject.groups.set(Group.objects.filter(id__in=group_ids))
            _ensure_passport_data(user, applicant, documents)

        approval_password = (applicant.passport_id or applicant.card_number or "").strip()
        if not approval_password:
            raise ValidationError({"detail": "Passport seriya/raqami topilmadi. Tasdiqlab bo'lmaydi."})

        user.set_password(approval_password)
        user.save(update_fields=["password"])

        applicant.status = "approved"
        applicant.approved_by = request.user
        applicant.approved_at = timezone.now()
        applicant.save(update_fields=["status", "approved_by", "approved_at", "user"])

        payload = {
            "user_id": user.id,
            "username": user.username,
            "role": role,
        }
        if created_user and approval_password:
            payload["password"] = approval_password
        if role == "student":
            direction_id = None
            try:
                direction_id = user.student_profile.direction_id
            except StudentProfile.DoesNotExist:
                direction_id = None
            payload.update(
                {
                    "group_id": user.group_id,
                    "direction_id": direction_id,
                }
            )
        return Response(payload, status=status.HTTP_201_CREATED)


class RejectApplicantView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, applicant_id):
        if not (request.user.is_superuser or getattr(request.user, "role", None) == "admin"):
            raise PermissionDenied("Faqat admin rad eta oladi.")

        try:
            applicant = Applicant.objects.select_related("user").get(id=applicant_id)
        except Applicant.DoesNotExist:
            raise NotFound("Applicant topilmadi.")

        if applicant.status == "rejected":
            return Response({"detail": "Applicant allaqachon rad etilgan."}, status=status.HTTP_200_OK)

        if applicant.user:
            applicant.user.delete()
        applicant.delete()
        return Response({"detail": "Applicant rad etildi."}, status=status.HTTP_200_OK)


class ReverifyApplicantView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, applicant_id):
        if not (request.user.is_superuser or getattr(request.user, "role", None) == "admin"):
            raise PermissionDenied("Faqat admin qayta tekshirishi mumkin.")

        try:
            applicant = Applicant.objects.get(id=applicant_id)
        except Applicant.DoesNotExist:
            raise NotFound("Applicant topilmadi.")

        documents = getattr(applicant, "documents", None)
        if not documents:
            raise ValidationError({"detail": "Applicant hujjatlari topilmadi."})

        _run_ai_verification(documents)
        latest = applicant.verifications.order_by("-created_at").first()
        if not latest:
            return Response({"detail": "Tekshiruv natijasi topilmadi."}, status=status.HTTP_200_OK)
        return Response(VerificationResultSerializer(latest).data, status=status.HTTP_200_OK)


class SelfReverifyApplicantView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if getattr(request.user, "role", None) != "student":
            raise PermissionDenied("Faqat student AI tekshiruvni ishga tushira oladi.")

        applicant = (
            Applicant.objects.filter(user=request.user)
            .exclude(status__in=["approved", "rejected"])
            .order_by("-created_at")
            .first()
        )
        if not applicant:
            raise NotFound("Aktiv ariza topilmadi.")

        documents = getattr(applicant, "documents", None)
        if not documents:
            raise ValidationError({"detail": "Hujjatlar topilmadi. Avval ro'yxatdan o'tishni yakunlang."})

        latest = applicant.verifications.order_by("-created_at").first()
        if latest and latest.verified:
            payload = VerificationResultSerializer(latest).data
            payload["detail"] = "AI tekshiruv allaqachon tasdiqlangan."
            payload["action"] = "skipped"
            return Response(payload, status=status.HTTP_200_OK)

        if latest and _is_reverify_on_cooldown(latest):
            payload = VerificationResultSerializer(latest).data
            payload["detail"] = "AI tekshiruv yaqinda bajarilgan. Bir ozdan keyin qayta urinib ko'ring."
            payload["action"] = "cooldown"
            return Response(payload, status=status.HTTP_200_OK)

        warning = _run_ai_verification(documents, fast_mode=True)
        latest = applicant.verifications.order_by("-created_at").first()
        if not latest:
            return Response({"detail": "AI tekshiruv natijasi topilmadi."}, status=status.HTTP_200_OK)

        payload = VerificationResultSerializer(latest).data
        payload["detail"] = warning or "AI tekshiruv bajarildi."
        payload["action"] = "verified"
        payload["applicant_status"] = applicant.status
        return Response(payload, status=status.HTTP_200_OK)


def _is_reverify_on_cooldown(verification: VerificationResult) -> bool:
    if verification.verified:
        return False
    if not verification.created_at:
        return False
    if not _verification_has_ai_unavailable(verification):
        return False
    elapsed = (timezone.now() - verification.created_at).total_seconds()
    return elapsed < AI_REVERIFY_COOLDOWN_SECONDS


def _verification_has_ai_unavailable(verification: VerificationResult) -> bool:
    events = verification.events_json
    if not isinstance(events, list):
        return False
    return any(
        isinstance(event, dict)
        and event.get("type") == "ai"
        and event.get("status") == "unavailable"
        for event in events
    )

from datetime import datetime
from difflib import SequenceMatcher
from django.conf import settings
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.exceptions import NotFound, ValidationError, PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ai.clients import face_match, ocr_passport
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
        first_name = (data.get("first_name") or "").strip()
        last_name = (data.get("last_name") or "").strip()
        full_name = (data.get("full_name") or f"{first_name} {last_name}").strip()
        if not full_name:
            raise ValidationError({"full_name": "Ism va familiya talab qilinadi."})

        phone = (data.get("phone") or "").strip()
        email = (data.get("email") or "").strip()
        direction_id = data.get("direction_choice")
        if direction_id:
            try:
                Direction.objects.get(id=direction_id)
            except Direction.DoesNotExist:
                raise ValidationError({"direction_choice": "Direction topilmadi."})

        applicant = Applicant.objects.create(
            full_name=full_name,
            phone=phone,
            email=email,
            direction_choice_id=direction_id or None,
            status="pending",
        )

        passport_front = request.FILES.get("passport_front") or request.FILES.get("passport_image")
        passport_back = request.FILES.get("passport_back") or request.FILES.get("passport_back_image")
        selfie = request.FILES.get("selfie") or request.FILES.get("selfie_image")

        if not passport_front or not passport_back or not selfie:
            applicant.delete()
            raise ValidationError(
                {
                    "documents": "Passport oldi, passport orqa va selfie majburiy.",
                }
            )

        document = ApplicantDocument.objects.create(
            applicant=applicant,
            passport_front=passport_front,
            passport_back=passport_back,
            face_image=selfie,
        )
        _run_ai_verification(document)

        applicant.refresh_from_db()
        return Response(
            {
                "detail": "Ariza qabul qilindi. Admin tasdiqlashi kutilmoqda.",
                "applicant_id": applicant.id,
                "status": applicant.status,
            },
            status=status.HTTP_201_CREATED,
        )


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


def _run_ai_verification(document):
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

    passport_front_bytes = _read_field_bytes(document.passport_front)
    passport_back_bytes = _read_field_bytes(document.passport_back)
    selfie_bytes = _read_field_bytes(document.face_image)
    ocr_front = ocr_passport(passport_front_bytes) if passport_front_bytes else None
    ocr_back = ocr_passport(passport_back_bytes) if passport_back_bytes else None
    ocr_result = _merge_ocr_results(ocr_front, ocr_back)
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

        applicant_passport_id = applicant.card_number or applicant.passport_id
        applicant_passport_id = applicant_passport_id if _has_digits(applicant_passport_id) else None
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
        elif ocr_birthdate:
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

        if ocr_card_number and not applicant.card_number:
            applicant.card_number = ocr_card_number
            updates.append("card_number")
        if ocr_card_number and not applicant.passport_id:
            applicant.passport_id = ocr_card_number
            updates.append("passport_id")
        if ocr_personal_number and not applicant.personal_number:
            applicant.personal_number = ocr_personal_number
            updates.append("personal_number")
        if ocr_surname and not applicant.surname:
            applicant.surname = ocr_surname
            updates.append("surname")
        if ocr_given_name and not applicant.name:
            applicant.name = ocr_given_name
            updates.append("name")
        if ocr_patronymic and not applicant.patronymic:
            applicant.patronymic = ocr_patronymic
            updates.append("patronymic")
        if ocr_sex and not applicant.sex:
            applicant.sex = ocr_sex
            updates.append("sex")
        if ocr_citizenship and not applicant.citizenship:
            applicant.citizenship = ocr_citizenship
            updates.append("citizenship")
        if ocr_birth_place and not applicant.birth_place:
            applicant.birth_place = ocr_birth_place
            updates.append("birth_place")
        if updates:
            applicant.save(update_fields=updates)

    face_result = None
    face_passed = True
    if settings_ai.enable_face_match:
        face_result = face_match(passport_front_bytes or passport_back_bytes, selfie_bytes)
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

    VerificationResult.objects.create(
        applicant=applicant,
        verified=verified,
        confidence=confidence,
        events_json=events,
    )

    if applicant.status not in ["approved", "rejected"]:
        applicant.status = "verified" if verified else "pending"
        applicant.save(update_fields=["status"])


def _merge_ocr_results(front, back):
    if not front and not back:
        return None
    def _pick(field, prefer_back=False):
        if prefer_back:
            return (back or {}).get(field) or (front or {}).get(field)
        return (front or {}).get(field) or (back or {}).get(field)
    confidence = 0.0
    for item in (front, back):
        try:
            confidence = max(confidence, float((item or {}).get("confidence") or 0.0))
        except (TypeError, ValueError):
            continue
    surname = _pick("surname")
    given_name = _pick("name")
    patronymic = _pick("patronymic")
    fio = _pick("fio") or (f"{surname} {given_name}".strip() if surname and given_name else None)
    return {
        "passport_id": _pick("passport_id"),
        "birthdate": _pick("birthdate"),
        "fio": fio,
        "surname": surname,
        "name": given_name,
        "patronymic": patronymic,
        "sex": _pick("sex"),
        "citizenship": _pick("citizenship"),
        "birth_place": _pick("birth_place", prefer_back=True),
        "card_number": _pick("card_number"),
        "personal_number": _pick("personal_number", prefer_back=True),
        "confidence": round(confidence, 2),
    }


class ApproveApplicantView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, applicant_id):
        if not (request.user.is_superuser or getattr(request.user, "role", None) == "admin"):
            raise PermissionDenied("Faqat admin tasdiqlay oladi.")

        try:
            applicant = Applicant.objects.select_related("direction_choice").get(id=applicant_id)
        except Applicant.DoesNotExist:
            raise NotFound("Applicant topilmadi.")

        if applicant.status == "approved":
            return Response({"detail": "Applicant allaqachon tasdiqlangan."}, status=status.HTTP_200_OK)

        if not applicant.verifications.filter(verified=True).exists():
            raise ValidationError({"detail": "Verification tasdiqlanmagan (verified=True topilmadi)."})

        role = request.data.get("role") or "student"
        if role not in ["student", "teacher"]:
            raise ValidationError({"role": "role student yoki teacher bo'lishi kerak."})

        full_name = applicant.full_name.strip() if applicant.full_name else ""
        parts = full_name.split()
        first_name = parts[0] if parts else ""
        last_name = " ".join(parts[1:]) if len(parts) > 1 else ""

        username = _build_username(full_name or (applicant.email or "user"))
        password = "1234"

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

            user = User.objects.create_user(
                username=username,
                password=password,
                first_name=first_name,
                last_name=last_name,
                email=applicant.email or "",
                role="student",
                phone=applicant.phone or "",
            )
            user.group = group
            user.save(update_fields=["group"])

            documents = getattr(applicant, "documents", None)
            if documents and documents.face_image:
                user.face_image = documents.face_image
                user.save(update_fields=["face_image"])

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

            user = User.objects.create_user(
                username=username,
                password=password,
                first_name=first_name,
                last_name=last_name,
                email=applicant.email or "",
                role="teacher",
                phone=applicant.phone or "",
            )
            TeacherProfile.objects.create(
                user=user,
            )

            documents = getattr(applicant, "documents", None)
            if documents and documents.face_image:
                user.face_image = documents.face_image
                user.save(update_fields=["face_image"])

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

        applicant.status = "approved"
        applicant.approved_by = request.user
        applicant.approved_at = timezone.now()
        applicant.save(update_fields=["status", "approved_by", "approved_at"])

        payload = {
            "user_id": user.id,
            "username": user.username,
            "password": password,
            "role": role,
        }
        if role == "student":
            payload.update(
                {
                    "group_id": user.group_id,
                    "direction_id": user.student_profile.direction_id if hasattr(user, "student_profile") else None,
                }
            )
        return Response(payload, status=status.HTTP_201_CREATED)


class RejectApplicantView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, applicant_id):
        if not (request.user.is_superuser or getattr(request.user, "role", None) == "admin"):
            raise PermissionDenied("Faqat admin rad eta oladi.")

        try:
            applicant = Applicant.objects.get(id=applicant_id)
        except Applicant.DoesNotExist:
            raise NotFound("Applicant topilmadi.")

        if applicant.status == "rejected":
            return Response({"detail": "Applicant allaqachon rad etilgan."}, status=status.HTTP_200_OK)

        applicant.status = "rejected"
        applicant.approved_by = request.user
        applicant.approved_at = timezone.now()
        applicant.save(update_fields=["status", "approved_by", "approved_at"])

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

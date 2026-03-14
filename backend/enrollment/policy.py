from .models import Applicant


FINAL_APPLICANT_STATUSES = {"approved", "rejected"}
ACTION_KEYS = (
    "can_edit",
    "can_delete",
    "can_approve",
    "can_reject",
    "can_reopen",
    "can_reverify",
)


def is_final_applicant_status(status_value: str | None) -> bool:
    return status_value in FINAL_APPLICANT_STATUSES


def applicant_has_documents(applicant: Applicant) -> bool:
    return bool(getattr(applicant, "documents", None))


def build_allowed_actions(status_value: str | None, *, has_documents: bool) -> dict[str, bool]:
    is_final = is_final_applicant_status(status_value)
    return {
        "can_edit": not is_final,
        "can_delete": not is_final,
        "can_approve": status_value in {"pending", "verified"},
        "can_reject": status_value in {"pending", "verified"},
        "can_reopen": status_value == "rejected",
        "can_reverify": status_value in {"pending", "verified"} and has_documents,
    }


def build_action_reasons(status_value: str | None, *, has_documents: bool) -> dict[str, str | None]:
    reasons: dict[str, str | None] = {key: None for key in ACTION_KEYS}

    if status_value == "approved":
        reasons.update(
            {
                "can_edit": "Tasdiqlangan ariza final holatda va tahrirlanmaydi.",
                "can_delete": "Tasdiqlangan ariza audit uchun saqlanadi.",
                "can_approve": "Ariza allaqachon tasdiqlangan.",
                "can_reject": "Tasdiqlangan arizani rad etib bo'lmaydi.",
                "can_reopen": "Faqat rad etilgan ariza qayta ochiladi.",
                "can_reverify": "Tasdiqlangan ariza qayta tekshirilmaydi.",
            }
        )
        return reasons

    if status_value == "rejected":
        reasons.update(
            {
                "can_edit": "Rad etilgan ariza avval qayta ochilishi kerak.",
                "can_delete": "Rad etilgan ariza audit uchun saqlanadi.",
                "can_approve": "Rad etilgan ariza avval qayta ochilishi kerak.",
                "can_reject": "Ariza allaqachon rad etilgan.",
                "can_reverify": "Rad etilgan ariza avval qayta ochilishi kerak.",
            }
        )
        return reasons

    reasons["can_reopen"] = "Faqat rad etilgan ariza qayta ochiladi."
    if not has_documents:
        reasons["can_reverify"] = "AI qayta tekshiruvi uchun passport va selfie kerak."
    return reasons


def applicant_allowed_actions(applicant: Applicant) -> dict[str, bool]:
    return build_allowed_actions(applicant.status, has_documents=applicant_has_documents(applicant))


def applicant_action_reasons(applicant: Applicant) -> dict[str, str | None]:
    return build_action_reasons(applicant.status, has_documents=applicant_has_documents(applicant))


def applicant_action_block_reason(applicant: Applicant, action_key: str) -> str | None:
    allowed = applicant_allowed_actions(applicant)
    if allowed.get(action_key):
        return None
    reasons = applicant_action_reasons(applicant)
    return reasons.get(action_key) or "Bu amal yopilgan."

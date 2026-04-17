from django.contrib.auth.models import Group, Permission
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.crypto import get_random_string
from django.utils import timezone
from rest_framework import serializers
from rest_framework.authtoken.models import Token
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken

from directions.models import Direction
from groups.models import Group as AcademicGroup
from profiles.models import StudentProfile
from subjects.models import Subject
from teacher_subject.models import TeacherSubject

from .admin_registry import set_user_role, upsert_student_placement, upsert_teacher_workload
from .models import User, PassportData, AuditLog

# ── File upload validatsiya konstantlari ──────────────────────────────────────
ALLOWED_IMAGE_TYPES = {'image/jpeg', 'image/png', 'image/webp'}
MAX_IMAGE_SIZE_MB = 5
MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024


def validate_image_file(file):
    """Rasm fayli: faqat JPEG/PNG/WEBP, max 5 MB."""
    if not file:
        return file
    content_type = getattr(file, 'content_type', '')
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise serializers.ValidationError(
            f"Faqat JPEG, PNG yoki WEBP formatlari qabul qilinadi. Yuborilgan: {content_type}"
        )
    if file.size > MAX_IMAGE_SIZE_BYTES:
        raise serializers.ValidationError(
            f"Fayl hajmi {MAX_IMAGE_SIZE_MB} MB dan oshmasligi kerak. "
            f"Yuborilgan: {round(file.size / 1024 / 1024, 1)} MB"
        )
    return file


class UserSerializer(serializers.ModelSerializer):
    has_face_embedding = serializers.SerializerMethodField()

    def get_has_face_embedding(self, obj):
        emb = obj.face_embedding
        return bool(emb and isinstance(emb, list) and len(emb) > 0)

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'first_name',
            'last_name',
            'email',
            'role',
            'phone',
            'patronymic',
            'birth_year',
            'birth_date',
            'passport_series',
            'passport_front_image',
            'email_verified',
            'face_image',
            'group',
            'has_face_embedding',
        ]


class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "phone",
            "group",
            "role",
            "is_active",
            "is_staff",
            "is_superuser",
        ]


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'first_name',
            'last_name',
            'email',
            'phone',
            'patronymic',
            'birth_year',
            'birth_date',
            'passport_series',
            'passport_front_image',
            'face_image',
        ]
        extra_kwargs = {
            'email': {'required': False},
            'first_name': {'required': False},
            'last_name': {'required': False},
            'phone': {'required': False},
            'patronymic': {'required': False},
            'birth_year': {'required': False},
            'birth_date': {'required': False},
            'passport_series': {'required': False},
            'passport_front_image': {'required': False},
            'face_image': {'required': False},
        }

    def validate_passport_front_image(self, value):
        return validate_image_file(value)

    def validate_face_image(self, value):
        return validate_image_file(value)

    def update(self, instance, validated_data):
        birth_date = validated_data.get('birth_date')
        if birth_date and not validated_data.get('birth_year'):
            validated_data['birth_year'] = birth_date.year
        return super().update(instance, validated_data)



class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField()
    new_password = serializers.CharField(min_length=10)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Eski parol noto'g'ri.")
        return value

    def validate_new_password(self, value):
        user = self.context['request'].user
        try:
            validate_password(value, user=user)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def save(self, **kwargs):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user


class RegisterSerializer(serializers.ModelSerializer):
    username = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = User
        fields = ['username', 'password', 'first_name', 'last_name', 'email', 'phone']
        extra_kwargs = {
            'password': {'write_only': True, 'required': False},
            'username': {'required': False},
        }

    def create(self, validated_data):
        username = validated_data.get("username")
        password = validated_data.get("password")
        if not username:
            base = (validated_data.get("email") or "user").split("@")[0]
            username = f"{base}{User.objects.count()+1}"
        if not password:
            password = get_random_string(12)

        user = User.objects.create_user(
            username=username,
            password=password,
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            email=validated_data.get('email', ''),
            role='student',
            phone=validated_data.get('phone', '')
        )
        return user
class AdminUserWriteSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "password",
            "first_name",
            "last_name",
            "email",
            "phone",
            "group",
            "role",
            "is_active",
            "is_staff",
            "is_superuser",
        ]

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        requested_role = validated_data.get("role", "student")
        requested_group = validated_data.get("group")
        user = User.objects.create(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        set_user_role(user, requested_role)
        if requested_role == "student":
            upsert_student_placement(
                user,
                group=requested_group,
                direction=requested_group.direction if requested_group else None,
                admission_year=timezone.now().year,
                status="active",
            )
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        set_user_role(instance, instance.role)
        if instance.role == "student":
            group = instance.group
            try:
                profile = instance.student_profile
                direction = profile.direction or (group.direction if group else None)
                admission_year = profile.admission_year
                status = profile.status
            except StudentProfile.DoesNotExist:
                direction = group.direction if group else None
                admission_year = timezone.now().year
                status = "active"
            upsert_student_placement(
                instance,
                group=group,
                direction=direction,
                admission_year=admission_year,
                status=status,
            )
        return instance


class AdminStudentPlacementSerializer(serializers.Serializer):
    direction_id = serializers.PrimaryKeyRelatedField(
        source="direction",
        queryset=Direction.objects.all(),
        required=False,
        allow_null=True,
    )
    group_id = serializers.PrimaryKeyRelatedField(
        source="group",
        queryset=AcademicGroup.objects.all(),
        required=False,
        allow_null=True,
    )
    admission_year = serializers.IntegerField(required=False, min_value=2000, max_value=2100)
    status = serializers.ChoiceField(choices=StudentProfile.STATUS_CHOICES, required=False)

    def validate(self, attrs):
        direction = attrs.get("direction")
        group = attrs.get("group")
        if group and direction and group.direction_id != direction.id:
            raise serializers.ValidationError(
                {"group_id": "Tanlangan guruh tanlangan yo'nalishga tegishli emas."}
            )
        return attrs


class AdminTeacherWorkloadSerializer(serializers.Serializer):
    subject_id = serializers.PrimaryKeyRelatedField(
        source="subject",
        queryset=Subject.objects.all(),
    )
    group_ids = serializers.PrimaryKeyRelatedField(
        source="groups",
        queryset=AcademicGroup.objects.all(),
        many=True,
        required=False,
    )

    def validate(self, attrs):
        subject = attrs["subject"]
        groups = attrs.get("groups") or []
        allowed_direction_ids = set(subject.directions.values_list("id", flat=True))
        invalid_groups = [group.name for group in groups if group.direction_id not in allowed_direction_ids]
        if invalid_groups:
            raise serializers.ValidationError(
                {"group_ids": f"Tanlangan guruhlar fan yo'nalishiga mos emas: {', '.join(invalid_groups)}."}
            )
        return attrs


class PassportDataSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = PassportData
        fields = [
            "id",
            "user",
            "user_username",
            "passport_series",
            "passport_number",
            "card_number",
            "personal_number",
            "birth_date",
            "extracted_fullname",
            "surname",
            "name",
            "patronymic",
            "sex",
            "citizenship",
            "birth_place",
            "front_image",
            "back_image",
            "selfie_image",
        ]

    def validate_front_image(self, value):
        return validate_image_file(value)

    def validate_back_image(self, value):
        return validate_image_file(value)

    def validate_selfie_image(self, value):
        return validate_image_file(value)


class AuditLogSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "user",
            "user_username",
            "action",
            "role",
            "ip_address",
            "user_agent",
            "extra",
            "created_at",
        ]


class PermissionSerializer(serializers.ModelSerializer):
    app_label = serializers.CharField(source="content_type.app_label", read_only=True)
    model = serializers.CharField(source="content_type.model", read_only=True)

    class Meta:
        model = Permission
        fields = ["id", "name", "codename", "app_label", "model"]


class AuthGroupSerializer(serializers.ModelSerializer):
    permissions = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Permission.objects.all(), required=False
    )

    class Meta:
        model = Group
        fields = ["id", "name", "permissions"]


class AuthTokenSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Token
        fields = ["key", "user", "user_username", "created"]
        read_only_fields = ["key", "created", "user_username"]


class OutstandingTokenSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = OutstandingToken
        fields = ["id", "user", "user_username", "jti", "token", "created_at", "expires_at"]
        read_only_fields = ["id", "user", "user_username", "jti", "token", "created_at", "expires_at"]


class BlacklistedTokenSerializer(serializers.ModelSerializer):
    token_jti = serializers.CharField(source="token.jti", read_only=True)
    user = serializers.IntegerField(source="token.user_id", read_only=True)
    user_username = serializers.CharField(source="token.user.username", read_only=True)

    class Meta:
        model = BlacklistedToken
        fields = ["id", "token", "token_jti", "user", "user_username", "blacklisted_at"]
        read_only_fields = ["id", "token_jti", "user", "user_username", "blacklisted_at"]


class ApproveUserSerializer(serializers.Serializer):
    """User ro'yxatdan o'tish ma'qullamalari uchun serializer"""
    user_id = serializers.IntegerField()
    role = serializers.ChoiceField(choices=["student", "teacher", "admin"], required=True)
    group_id = serializers.IntegerField(required=False, allow_null=True)  # Faqat student uchun
    subject_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True
    )  # Faqat teacher uchun
    
    def validate(self, data):
        role = data.get("role")
        group_id = data.get("group_id")
        subject_ids = data.get("subject_ids", [])
        
        if role == "student" and not group_id:
            raise serializers.ValidationError({"group_id": "Talaba uchun guruh belgilash majburiy."})
        
        if role == "teacher" and not subject_ids:
            raise serializers.ValidationError({"subject_ids": "O'qituvchi uchun fanlari belgilash majburiy."})
        
        if role not in ["student", "teacher"] and (group_id or subject_ids):
            raise serializers.ValidationError(
                "Faqat talaba va o'qituvchilarga guruh/fan belgilash mumkin."
            )
        
        return data

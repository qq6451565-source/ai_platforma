from pathlib import Path
from datetime import timedelta
from importlib.util import find_spec
import os

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - optional in dev
    load_dotenv = None

BASE_DIR = Path(__file__).resolve().parent.parent

def load_local_env(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


if load_dotenv:
    load_dotenv(BASE_DIR / ".env")
else:
    load_local_env(BASE_DIR / ".env")


def get_env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def get_env_list(name: str, default: list[str] | None = None) -> list[str]:
    value = os.getenv(name)
    if value is None:
        return default or []
    return [item.strip() for item in value.split(",") if item.strip()]


SECRET_KEY = os.getenv("SECRET_KEY", "django-insecure-test-key")
DEBUG = get_env_bool("DEBUG", True)
ALLOWED_HOSTS = get_env_list("ALLOWED_HOSTS", [])

TIME_ZONE = "Asia/Tashkent"
USE_TZ = True

INSTALLED_APPS = [
    # Django
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # 3rd-party
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'channels',
    'rest_framework_simplejwt.token_blacklist',

    # Apps
    'accounts',
    'directions',
    'semesters',
    'subjects',
    'curriculum',
    'groups',
    'teacher_subject',
    'lessons',
    'materials',
    'tests_app',
    'student_tests',
    'attendance',
    'assignments',
    'live',
    'announcements',
    'analytics',
    'ai',
    'journal',
    'group_chat',
    'university',
    'profiles',
    'enrollment',
    'schedule',
    'assessment',
    'proctoring',
    'gradebook',
]

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    },
}


MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

if find_spec("whitenoise") is not None:
    MIDDLEWARE.insert(2, "whitenoise.middleware.WhiteNoiseMiddleware")

ROOT_URLCONF = 'config.urls'

REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'accounts.authentication.RoleJWTAuthentication',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.UserRateThrottle',
        'rest_framework.throttling.AnonRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'user': '1000/day',
        'anon': '200/day',
    },
}

JWT_ACCESS_MINUTES = int(os.getenv("JWT_ACCESS_MINUTES", "30"))
JWT_REFRESH_DAYS = int(os.getenv("JWT_REFRESH_DAYS", "7"))

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=JWT_ACCESS_MINUTES),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=JWT_REFRESH_DAYS),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'TOKEN_OBTAIN_SERIALIZER': 'accounts.jwt.CustomTokenObtainPairSerializer',
    'TOKEN_REFRESH_SERIALIZER': 'accounts.jwt.CustomTokenRefreshSerializer',
}

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

DEFAULT_CORS_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]
CORS_ALLOW_ALL_ORIGINS = get_env_bool("CORS_ALLOW_ALL_ORIGINS", False)
CORS_ALLOWED_ORIGINS = get_env_list("CORS_ALLOWED_ORIGINS", DEFAULT_CORS_ORIGINS)
CSRF_TRUSTED_ORIGINS = get_env_list("CSRF_TRUSTED_ORIGINS", CORS_ALLOWED_ORIGINS)

# Templates
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# Channels (ASGI)
ASGI_APPLICATION = "config.asgi.application"

WSGI_APPLICATION = "config.wsgi.application"

# Database
DB_HOST = os.getenv("DB_HOST")

if DB_HOST:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.getenv('DB_NAME'),
            'USER': os.getenv('DB_USER'),
            'PASSWORD': os.getenv('DB_PASSWORD'),
            'HOST': DB_HOST,
            'PORT': os.getenv('DB_PORT', '5432'),
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }


# Static
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'   # MUST BE STATICFILES!!
STATICFILES_DIRS = []
_static_dir = BASE_DIR / "static"
if _static_dir.exists():
    STATICFILES_DIRS.append(_static_dir)

# Media
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Custom user
AUTH_USER_MODEL = 'accounts.User'
AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
]

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.getenv("EMAIL_HOST", "")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = get_env_bool("EMAIL_USE_TLS", True)
EMAIL_USE_SSL = get_env_bool("EMAIL_USE_SSL", False)
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", EMAIL_HOST_USER)

# AI integratsiya sozlamalari
AI_ENABLED = os.getenv("AI_ENABLED", "false").lower() == "true"
AI_BASE_URL = os.getenv("AI_BASE_URL")
AI_API_KEY = os.getenv("AI_API_KEY")
AI_TIMEOUT = int(os.getenv("AI_TIMEOUT", "5"))
AI_RETRY = int(os.getenv("AI_RETRY", "1"))
FACE_ATTENDANCE_WINDOW_SECONDS = int(os.getenv("FACE_ATTENDANCE_WINDOW_SECONDS", "60"))
FACE_ATTENDANCE_MIN_SAMPLES = int(os.getenv("FACE_ATTENDANCE_MIN_SAMPLES", "3"))
FACE_ATTENDANCE_PRESENT_RATIO = float(os.getenv("FACE_ATTENDANCE_PRESENT_RATIO", "0.50"))
LIVE_ATTENDANCE_MIN_DURATION_RATIO = float(os.getenv("LIVE_ATTENDANCE_MIN_DURATION_RATIO", "0.70"))
LIVE_PARTICIPANT_STALE_SECONDS = int(os.getenv("LIVE_PARTICIPANT_STALE_SECONDS", "30"))
PROCTOR_MIN_FACE_RATIO = float(os.getenv("PROCTOR_MIN_FACE_RATIO", "0.50"))

# LiveKit (live dars WebRTC)
LIVEKIT_URL = os.getenv("LIVEKIT_URL", "ws://127.0.0.1:7880")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY", "devkey")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET", "devsecret_very_long_32_chars_minimum")
LIVEKIT_TOKEN_TTL = int(os.getenv("LIVEKIT_TOKEN_TTL", "3600"))

# Agora (RTC)
AGORA_APP_ID = os.getenv("AGORA_APP_ID")
AGORA_APP_CERTIFICATE = os.getenv("AGORA_APP_CERTIFICATE")
AGORA_TOKEN_TTL = int(os.getenv("AGORA_TOKEN_TTL", "3600"))

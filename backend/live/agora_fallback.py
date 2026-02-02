import base64
import hmac
import struct
import time
import secrets
from collections import OrderedDict
from hashlib import sha256
from zlib import crc32

Role_Publisher = 1
Role_Subscriber = 2

kJoinChannel = 1
kPublishAudioStream = 2
kPublishVideoStream = 3
kPublishDataStream = 4

_VERSION = "006"


def _pack_uint16(value: int) -> bytes:
    return struct.pack("<H", int(value))


def _pack_uint32(value: int) -> bytes:
    return struct.pack("<I", int(value))


def _pack_string(value: bytes) -> bytes:
    return _pack_uint16(len(value)) + value


def _pack_map_uint32(items: dict) -> bytes:
    ret = _pack_uint16(len(items))
    for key, value in items.items():
        ret += _pack_uint16(key) + _pack_uint32(value)
    return ret


class _AccessToken:
    def __init__(self, app_id: str, app_certificate: str, channel_name: str, uid: int):
        self.app_id = app_id
        self.app_certificate = app_certificate
        self.channel_name = channel_name
        self.uid_str = "" if uid == 0 else str(uid)
        self.ts = int(time.time()) + 24 * 3600
        self.salt = secrets.SystemRandom().randint(1, 99999999)
        self.messages = {}

    def add_privilege(self, privilege: int, expire_ts: int) -> None:
        self.messages[privilege] = int(expire_ts)

    def build(self) -> str:
        ordered = OrderedDict(sorted(self.messages.items(), key=lambda item: int(item[0])))
        msg = _pack_uint32(self.salt) + _pack_uint32(self.ts) + _pack_map_uint32(ordered)

        val = (
            self.app_id.encode("utf-8")
            + self.channel_name.encode("utf-8")
            + self.uid_str.encode("utf-8")
            + msg
        )

        signature = hmac.new(self.app_certificate.encode("utf-8"), val, sha256).digest()
        crc_channel = crc32(self.channel_name.encode("utf-8")) & 0xFFFFFFFF
        crc_uid = crc32(self.uid_str.encode("utf-8")) & 0xFFFFFFFF

        content = _pack_string(signature) + _pack_uint32(crc_channel) + _pack_uint32(crc_uid) + _pack_string(msg)
        return _VERSION + self.app_id + base64.b64encode(content).decode("utf-8")


def build_token_with_uid(
    app_id: str,
    app_certificate: str,
    channel_name: str,
    uid: int,
    role: int,
    expire_ts: int,
) -> str:
    token = _AccessToken(app_id, app_certificate, channel_name, int(uid or 0))
    token.add_privilege(kJoinChannel, expire_ts)
    if role != Role_Subscriber:
        token.add_privilege(kPublishVideoStream, expire_ts)
        token.add_privilege(kPublishAudioStream, expire_ts)
        token.add_privilege(kPublishDataStream, expire_ts)
    return token.build()

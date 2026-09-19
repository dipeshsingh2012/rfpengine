from __future__ import annotations

import logging
import re
from typing import AsyncGenerator
from urllib.parse import parse_qs, urlencode, urlsplit, urlunsplit
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    pass


_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def normalize_database_url(url: str) -> str:
    """
    Normalizes PostgreSQL URLs for asyncpg compatibility:
    - Converts postgresql:// or postgres:// to postgresql+asyncpg://
    - Translates sslmode=require to ssl=require
    - Removes parameters unsupported by asyncpg query parser (e.g., channel_binding)
    """
    if not url:
        return url

    # Ensure asyncpg driver is specified
    if url.startswith("postgres://"):
        url = "postgresql+asyncpg://" + url[len("postgres://"):]
    elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
        url = "postgresql+asyncpg://" + url[len("postgresql://"):]

    parsed = urlsplit(url)
    if not parsed.query:
        return url

    query_params = parse_qs(parsed.query)
    filtered_params = {}

    for k, v in query_params.items():
        if k.lower() == "sslmode":
            filtered_params["ssl"] = v[0] if v else "require"
        elif k.lower() in ("channel_binding", "target_session_attrs"):
            # Skip libpq-specific params unsupported directly in asyncpg query strings
            continue
        else:
            filtered_params[k] = v[0] if len(v) == 1 else v

    new_query = urlencode(filtered_params, doseq=True)
    return urlunsplit((parsed.scheme, parsed.netloc, parsed.path, new_query, parsed.fragment))


def resolve_ipv4(hostname: str) -> str:
    try:
        import socket
        return socket.gethostbyname(hostname)
    except Exception:
        try:
            import socket, struct
            header = b'\x12\x34\x01\x00\x00\x01\x00\x00\x00\x00\x00\x00'
            qname = b''.join(bytes([len(p)]) + p.encode() for p in hostname.split('.')) + b'\x00'
            packet = header + qname + b'\x00\x01\x00\x01'
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.settimeout(2.0)
            sock.sendto(packet, ('8.8.8.8', 53))
            data, _ = sock.recvfrom(512)
            sock.close()
            offset = 12 + len(qname) + 4
            while offset < len(data):
                if data[offset] & 0xc0 == 0xc0:
                    offset += 2
                else:
                    while data[offset] != 0:
                        offset += data[offset] + 1
                    offset += 1
                rtype, rclass, ttl, rdlength = struct.unpack('!HHIH', data[offset:offset+10])
                offset += 10
                if rtype == 1 and rdlength == 4:
                    return socket.inet_ntoa(data[offset:offset+4])
                offset += rdlength
        except Exception:
            pass
    return hostname


def get_engine() -> AsyncEngine:
    global _engine
    if _engine is None:
        settings = get_settings()
        normalized_url = normalize_database_url(settings.effective_database_url)
        connect_args: dict = {}
        if "neon.tech" in normalized_url:
            parsed = urlsplit(normalized_url)
            hostname = parsed.hostname or ""
            match = re.match(r"^(ep-[a-z0-9-]+)", hostname)
            if match:
                connect_args["server_settings"] = {"options": f"endpoint={match.group(1)}"}
            ipv4 = resolve_ipv4(hostname)
            if ipv4 and ipv4 != hostname:
                netloc = parsed.netloc.replace(hostname, ipv4)
                normalized_url = normalized_url.replace(parsed.netloc, netloc)
        _engine = create_async_engine(
            normalized_url,
            echo=settings.debug,
            pool_pre_ping=True,
            connect_args=connect_args,
        )
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    global _session_factory
    if _session_factory is None:
        engine = get_engine()
        _session_factory = async_sessionmaker(
            bind=engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )
    return _session_factory


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def close_db_connection() -> None:
    global _engine, _session_factory
    if _engine is not None:
        await _engine.dispose()
        _engine = None
        _session_factory = None

"""Redis cache manager."""

from typing import Any, Optional

import redis.asyncio as redis
from redis.asyncio import Redis

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


class CacheManager:
    """Redis cache manager for application caching."""

    def __init__(self) -> None:
        self._redis: Optional[Redis] = None

    async def connect(self) -> None:
        """Connect to Redis."""
        try:
            self._redis = await redis.from_url(
                settings.redis_url_str,
                encoding="utf-8",
                decode_responses=True,
            )
            await self._redis.ping()
            logger.info("redis_connected", url=settings.redis_url_str)
        except Exception as e:
            logger.error("redis_connection_failed", error=str(e))
            raise

    async def disconnect(self) -> None:
        """Disconnect from Redis."""
        if self._redis:
            await self._redis.close()
            logger.info("redis_disconnected")

    async def get(self, key: str) -> Optional[str]:
        """Get value from cache."""
        if not self._redis:
            return None
        try:
            return await self._redis.get(key)
        except Exception as e:
            logger.error("cache_get_failed", key=key, error=str(e))
            return None

    async def set(
        self, key: str, value: Any, expire: Optional[int] = None
    ) -> bool:
        """Set value in cache with optional expiration in seconds."""
        if not self._redis:
            return False
        try:
            if expire:
                await self._redis.setex(key, expire, value)
            else:
                await self._redis.set(key, value)
            return True
        except Exception as e:
            logger.error("cache_set_failed", key=key, error=str(e))
            return False

    async def delete(self, key: str) -> bool:
        """Delete value from cache."""
        if not self._redis:
            return False
        try:
            await self._redis.delete(key)
            return True
        except Exception as e:
            logger.error("cache_delete_failed", key=key, error=str(e))
            return False

    async def exists(self, key: str) -> bool:
        """Check if key exists in cache."""
        if not self._redis:
            return False
        try:
            return await self._redis.exists(key) > 0
        except Exception as e:
            logger.error("cache_exists_failed", key=key, error=str(e))
            return False


# Global cache instance
cache_manager = CacheManager()

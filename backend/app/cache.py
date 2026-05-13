from functools import lru_cache
import time
from typing import Dict, Any, Optional
from datetime import datetime, timedelta


class SimpleCache:
    """Simple in-memory cache with TTL support"""

    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache if not expired"""
        if key in self._cache:
            item = self._cache[key]
            if time.time() < item['expires_at']:
                return item['value']
            else:
                # Remove expired item
                del self._cache[key]
        return None

    def set(self, key: str, value: Any, ttl_seconds: int = 300) -> None:
        """Set value in cache with TTL"""
        self._cache[key] = {
            'value': value,
            'expires_at': time.time() + ttl_seconds
        }

    def delete(self, key: str) -> None:
        """Delete item from cache"""
        self._cache.pop(key, None)

    def clear(self) -> None:
        """Clear all cache"""
        self._cache.clear()


# Global cache instance
cache = SimpleCache()


def cached(ttl_seconds: int = 300):
    """Decorator for caching function results"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            # Create cache key from function name and arguments
            key = f"{func.__name__}:{str(args)}:{str(kwargs)}"

            # Try to get from cache
            cached_result = cache.get(key)
            if cached_result is not None:
                return cached_result

            # Execute function and cache result
            result = func(*args, **kwargs)
            cache.set(key, result, ttl_seconds)
            return result
        return wrapper
    return decorator

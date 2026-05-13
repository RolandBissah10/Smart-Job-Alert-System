"""
Performance monitoring utilities for the Smart Job Alert System.
"""

import time
import psutil
import os
from functools import wraps
from typing import Dict, Any
from app.cache import cache


class PerformanceMonitor:
    """Monitor application performance metrics"""

    def __init__(self):
        self.metrics: Dict[str, Any] = {}

    def record_request_time(self, endpoint: str, duration: float):
        """Record request timing"""
        key = f"perf:{endpoint}"
        current = cache.get(key) or {"count": 0, "total_time": 0, "avg_time": 0}

        current["count"] += 1
        current["total_time"] += duration
        current["avg_time"] = current["total_time"] / current["count"]

        cache.set(key, current, 3600)  # Keep for 1 hour

    def get_system_stats(self) -> Dict[str, Any]:
        """Get system performance statistics"""
        return {
            "cpu_percent": psutil.cpu_percent(interval=1),
            "memory_percent": psutil.virtual_memory().percent,
            "memory_used_mb": psutil.virtual_memory().used / 1024 / 1024,
            "memory_available_mb": psutil.virtual_memory().available / 1024 / 1024,
            "disk_usage_percent": psutil.disk_usage('/').percent,
        }

    def get_endpoint_stats(self) -> Dict[str, Any]:
        """Get endpoint performance statistics"""
        stats = {}
        # Get all performance keys from cache
        # This is a simplified version - in production you'd want to scan cache keys
        endpoints = ["dashboard", "job_feed", "login", "signup"]

        for endpoint in endpoints:
            key = f"perf:{endpoint}"
            data = cache.get(key)
            if data:
                stats[endpoint] = data

        return stats


# Global performance monitor instance
perf_monitor = PerformanceMonitor()


def monitor_performance(endpoint: str = None):
    """Decorator to monitor endpoint performance"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()

            try:
                result = await func(*args, **kwargs)
                duration = time.time() - start_time

                # Record performance metrics
                endpoint_name = endpoint or func.__name__
                perf_monitor.record_request_time(endpoint_name, duration)

                return result
            except Exception as e:
                duration = time.time() - start_time
                endpoint_name = endpoint or func.__name__
                perf_monitor.record_request_time(f"{endpoint_name}_error", duration)
                raise e

        return wrapper
    return decorator


def get_performance_report() -> Dict[str, Any]:
    """Generate a comprehensive performance report"""
    return {
        "system_stats": perf_monitor.get_system_stats(),
        "endpoint_stats": perf_monitor.get_endpoint_stats(),
        "cache_stats": {
            "cache_size": len(cache._cache) if hasattr(cache, '_cache') else 0
        },
        "timestamp": time.time()
    }

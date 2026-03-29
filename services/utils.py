"""Utility functions and helper modules for performance and reusability"""
import hashlib
import json
import functools
import time
from typing import Any, Callable, Dict, Optional, Tuple
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class LRUCache:
    """Simple LRU cache for memoization"""
    
    def __init__(self, max_size: int = 128):
        """
        Initialize LRU cache
        
        Args:
            max_size: Maximum number of cached items
        """
        self.max_size = max_size
        self.cache: Dict[str, Tuple[Any, float]] = {}
        self.access_times: Dict[str, float] = {}
    
    def _make_key(self, *args, **kwargs) -> str:
        """Create cache key from arguments"""
        key_data = {
            'args': args,
            'kwargs': sorted(kwargs.items())
        }
        key_str = json.dumps(key_data, default=str, sort_keys=True)
        return hashlib.md5(key_str.encode()).hexdigest()
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if key in self.cache:
            value, timestamp = self.cache[key]
            self.access_times[key] = time.time()
            return value
        return None
    
    def set(self, key: str, value: Any) -> None:
        """Set value in cache, evict LRU if needed"""
        if len(self.cache) >= self.max_size:
            # Find least recently used
            lru_key = min(self.access_times, key=self.access_times.get)
            del self.cache[lru_key]
            del self.access_times[lru_key]
        
        self.cache[key] = (value, time.time())
        self.access_times[key] = time.time()
    
    def clear(self) -> None:
        """Clear cache"""
        self.cache.clear()
        self.access_times.clear()
    
    def __len__(self) -> int:
        return len(self.cache)


# Global cache instance
_plan_cache = LRUCache(max_size=256)


def memoize_plan_generation(func: Callable) -> Callable:
    """
    Decorator to cache study plan generation results
    
    Avoids regenerating identical plans for the same inputs
    """
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        # Create cache key from relevant parameters
        cache_key = _plan_cache._make_key(*args, **kwargs)
        
        # Check cache
        cached = _plan_cache.get(cache_key)
        if cached is not None:
            logger.info(f'Cache hit for plan generation')
            return cached
        
        # Generate and cache
        result = func(*args, **kwargs)
        _plan_cache.set(cache_key, result)
        return result
    
    return wrapper


def clear_plan_cache() -> None:
    """Clear the plan generation cache"""
    _plan_cache.clear()
    logger.info('Plan cache cleared')


class PerformanceTracker:
    """Track operation performance metrics"""
    
    def __init__(self):
        self.metrics: Dict[str, list] = {}
    
    def record(self, operation: str, duration_ms: float) -> None:
        """Record operation duration"""
        if operation not in self.metrics:
            self.metrics[operation] = []
        self.metrics[operation].append(duration_ms)
    
    def get_stats(self, operation: str) -> Dict[str, float]:
        """Get statistics for an operation"""
        if operation not in self.metrics or not self.metrics[operation]:
            return {}
        
        durations = self.metrics[operation]
        return {
            'count': len(durations),
            'avg_ms': sum(durations) / len(durations),
            'min_ms': min(durations),
            'max_ms': max(durations),
            'total_ms': sum(durations)
        }
    
    def report(self) -> Dict[str, Dict[str, float]]:
        """Get report of all metrics"""
        return {op: self.get_stats(op) for op in self.metrics}


# Global performance tracker
_perf_tracker = PerformanceTracker()


def track_performance(operation: str):
    """Decorator to track operation performance"""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                duration_ms = (time.time() - start_time) * 1000
                _perf_tracker.record(operation, duration_ms)
                logger.debug(f'{operation} took {duration_ms:.2f}ms')
                return result
            except Exception as e:
                duration_ms = (time.time() - start_time) * 1000
                _perf_tracker.record(operation, duration_ms)
                logger.error(f'{operation} failed after {duration_ms:.2f}ms: {str(e)}')
                raise
        return wrapper
    return decorator


def get_performance_stats(operation: str = None) -> Dict[str, Any]:
    """Get performance statistics"""
    if operation:
        return _perf_tracker.get_stats(operation)
    return _perf_tracker.report()


class RateLimiter:
    """Simple rate limiter for API endpoints"""
    
    def __init__(self, max_requests: int = 100, window_seconds: int = 3600):
        """
        Initialize rate limiter
        
        Args:
            max_requests: Max requests allowed in window
            window_seconds: Time window in seconds
        """
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, list] = {}
    
    def is_allowed(self, identifier: str) -> bool:
        """Check if request is allowed"""
        now = time.time()
        cutoff = now - self.window_seconds
        
        if identifier not in self.requests:
            self.requests[identifier] = []
        
        # Clean old requests
        self.requests[identifier] = [
            t for t in self.requests[identifier] if t > cutoff
        ]
        
        # Check limit
        if len(self.requests[identifier]) >= self.max_requests:
            return False
        
        # Record new request
        self.requests[identifier].append(now)
        return True
    
    def get_remaining(self, identifier: str) -> int:
        """Get remaining requests for identifier"""
        now = time.time()
        cutoff = now - self.window_seconds
        
        if identifier not in self.requests:
            return self.max_requests
        
        active = len([t for t in self.requests[identifier] if t > cutoff])
        return max(0, self.max_requests - active)


# Global rate limiter
_rate_limiter = RateLimiter(max_requests=100, window_seconds=3600)


def check_rate_limit(identifier: str) -> Tuple[bool, int]:
    """
    Check rate limit
    
    Returns:
        Tuple of (allowed, remaining_requests)
    """
    return _rate_limiter.is_allowed(identifier), _rate_limiter.get_remaining(identifier)


class ResponseFormatter:
    """Format API responses consistently"""
    
    @staticmethod
    def success(data: Any = None, message: str = 'Success', 
                status_code: int = 200) -> Tuple[Dict, int]:
        """Format success response"""
        return {
            'success': True,
            'message': message,
            'data': data,
            'timestamp': datetime.utcnow().isoformat()
        }, status_code
    
    @staticmethod
    def error(error: str, field: str = None, status_code: int = 400,
              details: Dict = None) -> Tuple[Dict, int]:
        """Format error response"""
        response = {
            'success': False,
            'error': error,
            'status': status_code,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        if field:
            response['field'] = field
        
        if details:
            response['details'] = details
        
        return response, status_code
    
    @staticmethod
    def paginated(items: list, total: int, page: int, per_page: int,
                  status_code: int = 200) -> Tuple[Dict, int]:
        """Format paginated response"""
        return {
            'success': True,
            'data': items,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total,
                'pages': (total + per_page - 1) // per_page
            },
            'timestamp': datetime.utcnow().isoformat()
        }, status_code


def truncate_text(text: str, max_chars: int = 500, suffix: str = '...') -> str:
    """Safely truncate text"""
    if len(text) <= max_chars:
        return text
    return text[:max_chars - len(suffix)] + suffix


def format_duration(seconds: int) -> str:
    """Format seconds into human-readable duration"""
    if seconds < 60:
        return f'{seconds}s'
    elif seconds < 3600:
        return f'{seconds // 60}m'
    elif seconds < 86400:
        return f'{seconds // 3600}h'
    else:
        return f'{seconds // 86400}d'


def safe_json_loads(json_str: str, default: Any = None) -> Any:
    """Safely load JSON"""
    try:
        return json.loads(json_str)
    except (json.JSONDecodeError, TypeError):
        return default


def safe_json_dumps(obj: Any, default: Any = None) -> str:
    """Safely dump to JSON"""
    try:
        return json.dumps(obj, default=str)
    except (TypeError, ValueError):
        return default or '{}'

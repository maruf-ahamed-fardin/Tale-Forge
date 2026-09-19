import time
import asyncio
from collections import defaultdict
from fastapi import HTTPException, Request, status


class SlidingWindowRateLimiter:
    """Thread-safe in-memory sliding window rate limiter."""

    def __init__(self) -> None:
        # Key -> list of float epoch timestamps
        self._requests: dict[str, list[float]] = defaultdict(list)
        self._lock = asyncio.Lock()
        self._last_cleanup = time.time()

    async def check(self, key: str, max_requests: int, window_seconds: int) -> None:
        now = time.time()
        cutoff = now - window_seconds

        async with self._lock:
            # Periodically clean up keys older than 10 minutes to prevent memory leak
            if now - self._last_cleanup > 300:
                expired_keys = [
                    k for k, timestamps in self._requests.items()
                    if not timestamps or timestamps[-1] < cutoff
                ]
                for k in expired_keys:
                    self._requests.pop(k, None)
                self._last_cleanup = now

            timestamps = self._requests[key]
            # Filter out timestamps outside the current window
            valid_timestamps = [ts for ts in timestamps if ts > cutoff]
            self._requests[key] = valid_timestamps

            if len(valid_timestamps) >= max_requests:
                earliest = valid_timestamps[0]
                retry_after = max(1, int(earliest + window_seconds - now))
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Too many requests. Please try again in {retry_after} seconds.",
                    headers={"Retry-After": str(retry_after)},
                )

            self._requests[key].append(now)

    def reset(self) -> None:
        """Clear all recorded request timestamps."""
        self._requests.clear()



# Global singleton limiter instance
limiter = SlidingWindowRateLimiter()


def rate_limit(max_requests: int = 60, window_seconds: int = 60):
    """FastAPI dependency for rate limiting by client IP."""
    async def dependency(request: Request) -> None:
        # Extract client IP; fallback to 'unknown' if not present
        client_ip = (
            request.headers.get("x-forwarded-for", "").split(",")[0].strip()
            or (request.client.host if request.client else "unknown")
        )
        route_key = f"{client_ip}:{request.url.path}"
        await limiter.check(route_key, max_requests=max_requests, window_seconds=window_seconds)

    return dependency

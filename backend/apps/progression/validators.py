"""
Per-game server-side result validators.

Every game already gets generic checks (score range, minimum duration, session
ownership and age). A game that can verify more — for example by replaying a
move log stored in ``metrics`` — registers a validator here keyed by its
``module_key``::

    @register("bridge-builder")
    def validate_bridge(session, *, score, accuracy):
        if score > len(session.metrics.get("moves", [])) * 100:
            raise SessionRejected("Score not supported by move log.")
"""

from collections.abc import Callable

_VALIDATORS: dict[str, Callable] = {}


def register(module_key: str):
    def decorator(func: Callable) -> Callable:
        _VALIDATORS[module_key] = func
        return func

    return decorator


def run_game_validator(session, *, score: int, accuracy: float | None) -> None:
    validator = _VALIDATORS.get(session.game.module_key)
    if validator is not None:
        validator(session, score=score, accuracy=accuracy)

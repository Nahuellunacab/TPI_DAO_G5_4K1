from datetime import datetime, date
import re


def validate_email(email: str) -> bool:
    if not email:
        return False
    return bool(re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', str(email)))


def validate_password_strength(pw: str, min_length: int = 6) -> bool:
    if not pw or not isinstance(pw, str):
        return False
    return len(pw) >= min_length


def parse_iso_date(text: str) -> date:
    # Accepts YYYY-MM-DD and returns a datetime.date
    if not text or not isinstance(text, str):
        raise ValueError('Fecha inválida')
    try:
        return datetime.fromisoformat(text).date()
    except Exception:
        # Try to be a bit more forgiving by trimming
        try:
            return datetime.fromisoformat(text.strip()).date()
        except Exception:
            raise ValueError('fechaReservada debe tener formato ISO YYYY-MM-DD')


def is_future_or_today(d: date) -> bool:
    if not isinstance(d, date):
        return False
    return d >= date.today()


def json_error(message: str, code: int = 400):
    return {'error': message}, code

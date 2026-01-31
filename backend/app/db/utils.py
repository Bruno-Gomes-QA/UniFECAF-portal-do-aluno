"""
UniFECAF Portal do Aluno - DB helpers (pagination, common CRUD patterns).
"""

from __future__ import annotations

from typing import Any, TypeVar

from sqlalchemy import func, select
from sqlalchemy.orm import Session
from starlette import status

from app.core.errors import raise_api_error

TModel = TypeVar("TModel")


def get_or_404(
    db: Session,
    model: type[TModel],
    entity_id: Any,
    *,
    code: str = "NOT_FOUND",
    message: str = "Recurso não encontrado.",
) -> TModel:
    obj = db.get(model, entity_id)
    if obj is None:
        raise_api_error(status_code=status.HTTP_404_NOT_FOUND, code=code, message=message)
    return obj


def apply_update(obj: Any, data: dict[str, Any]) -> Any:
    for key, value in data.items():
        if value is None:
            continue
        setattr(obj, key, value)
    return obj


def paginate_stmt(db: Session, stmt, *, limit: int, offset: int) -> tuple[list[Any], int]:
    total = db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
    items = db.execute(stmt.limit(limit).offset(offset)).scalars().all()
    return items, int(total)

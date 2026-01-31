"""
UniFECAF Portal do Aluno - API error envelope and exception handlers.

All non-2xx responses should be returned in the following shape:

{
  "error": {
    "code": "SOME_CODE",
    "message": "Human friendly message.",
    "details": {}
  }
}
"""

from __future__ import annotations

from typing import Any

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from starlette import status
from starlette.exceptions import HTTPException as StarletteHTTPException


class ApiErrorDetail(BaseModel):
    code: str = Field(..., examples=["AUTH_NOT_AUTHENTICATED", "VALIDATION_ERROR"])
    message: str = Field(..., examples=["Credenciais inválidas."])
    details: dict[str, Any] = Field(default_factory=dict)


class ApiErrorEnvelope(BaseModel):
    error: ApiErrorDetail


class ApiException(Exception):
    def __init__(
        self,
        *,
        status_code: int,
        code: str,
        message: str,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details or {}

    def to_envelope(self) -> ApiErrorEnvelope:
        return ApiErrorEnvelope(
            error=ApiErrorDetail(code=self.code, message=self.message, details=self.details)
        )


def api_exception_handler(_: Request, exc: ApiException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content=exc.to_envelope().model_dump())


def http_exception_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
    code = "HTTP_ERROR"
    if exc.status_code == status.HTTP_401_UNAUTHORIZED:
        code = "AUTH_NOT_AUTHENTICATED"
    if exc.status_code == status.HTTP_403_FORBIDDEN:
        code = "AUTH_FORBIDDEN"
    if exc.status_code == status.HTTP_404_NOT_FOUND:
        code = "NOT_FOUND"
    envelope = ApiErrorEnvelope(
        error=ApiErrorDetail(code=code, message=str(exc.detail), details={})
    )
    return JSONResponse(status_code=exc.status_code, content=envelope.model_dump())


def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    envelope = ApiErrorEnvelope(
        error=ApiErrorDetail(
            code="VALIDATION_ERROR",
            message="Erro de validação.",
            details={"errors": exc.errors()},
        )
    )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content=envelope.model_dump()
    )


def unhandled_exception_handler(_: Request, __: Exception) -> JSONResponse:
    envelope = ApiErrorEnvelope(
        error=ApiErrorDetail(code="INTERNAL_ERROR", message="Erro interno.", details={})
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content=envelope.model_dump()
    )


def raise_api_error(
    *,
    status_code: int,
    code: str,
    message: str,
    details: dict[str, Any] | None = None,
) -> None:
    raise ApiException(status_code=status_code, code=code, message=message, details=details)

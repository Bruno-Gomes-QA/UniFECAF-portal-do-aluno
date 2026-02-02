"""
UniFECAF Portal do Aluno - API v1 Admin Users Router.

Regras de Negócio Implementadas:
- RN-U-010: Email não pode ser alterado
- RN-U-011: STUDENT→ADMIN bloqueado se tiver perfil de aluno
- RN-U-012: Validação de transições de status
- RN-U-014: Admin não pode alterar próprio role/status
- RN-U-021: Admin não pode se auto-excluir
- RN-U-022: Super-admin não pode ser excluído/modificado
- RN-U-050: Auditoria de alterações
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from starlette import status

from app.core.database import get_db
from app.core.deps import AdminUser, pagination_params
from app.core.errors import raise_api_error
from app.core.security import get_password_hash
from app.db.utils import apply_update, get_or_404, paginate_stmt
from app.models.academics import Student, StudentStatus
from app.models.audit import AuditLog
from app.models.notifications import NotificationPreference, UserNotification
from app.models.user import User, UserRole, UserStatus
from app.schemas.admin_users import (
    AdminUserCreateRequest,
    AdminUserResponse,
    AdminUserUpdateRequest,
)
from app.schemas.common import PaginatedResponse

router = APIRouter(prefix="/api/v1/admin/users", tags=["Admin - Users"])


# ==================== HELPERS ====================


def _parse_role(value: str) -> UserRole:
    try:
        return UserRole(value)
    except ValueError:
        raise_api_error(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code="VALIDATION_ERROR",
            message="Role inválida.",
            details={"allowed": [r.value for r in UserRole]},
        )


def _parse_status(value: str) -> UserStatus:
    try:
        return UserStatus(value)
    except ValueError:
        raise_api_error(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code="VALIDATION_ERROR",
            message="Status inválido.",
            details={"allowed": [s.value for s in UserStatus]},
        )


def _is_self(current_user: User, target_id: UUID) -> bool:
    """Verifica se o usuário está tentando modificar a si mesmo."""
    return current_user.id == target_id


def _get_user_with_checks(
    db: Session,
    user_id: UUID,
    current_user: User,
    *,
    allow_self: bool = True,
    allow_superadmin: bool = True,
    error_code_self: str = "CANNOT_MODIFY_SELF",
    error_code_superadmin: str = "CANNOT_MODIFY_SUPERADMIN",
) -> User:
    """
    Busca usuário e aplica validações de proteção.
    """
    user = get_or_404(db, User, user_id, message="Usuário não encontrado.")

    if not allow_self and _is_self(current_user, user_id):
        raise_api_error(
            status_code=status.HTTP_403_FORBIDDEN,
            code=error_code_self,
            message="Você não pode realizar esta operação em seu próprio usuário.",
        )

    if not allow_superadmin and user.is_superadmin:
        raise_api_error(
            status_code=status.HTTP_403_FORBIDDEN,
            code=error_code_superadmin,
            message="Não é possível modificar o super administrador.",
        )

    return user


def _has_active_student(db: Session, user_id: UUID) -> bool:
    """Verifica se usuário tem perfil de aluno (ativo ou inativo)."""
    student = db.query(Student).filter(Student.user_id == user_id).first()
    return student is not None


def _create_audit_log(
    db: Session,
    actor: User,
    action: str,
    entity_id: UUID,
    data: dict,
    request: Request | None = None,
) -> None:
    """Cria registro de auditoria."""
    log = AuditLog(
        actor_user_id=actor.id,
        action=action,
        entity_type="USER",
        entity_id=entity_id,
        ip=request.client.host if request and request.client else None,
        user_agent=request.headers.get("user-agent") if request else None,
        data=data,
    )
    db.add(log)


# ==================== ENDPOINTS ====================


@router.get("", response_model=PaginatedResponse[AdminUserResponse], summary="Listar usuários")
def list_users(
    _: AdminUser,
    db: Session = Depends(get_db),
    pagination: dict[str, int] = Depends(pagination_params),
    email: str | None = Query(None, description="Filtro por email (contém)."),
    role: UserRole | None = Query(None),
    status_filter: UserStatus | None = Query(None, alias="status"),
) -> PaginatedResponse[AdminUserResponse]:
    stmt = select(User).order_by(User.created_at.desc())
    if email:
        stmt = stmt.where(User.email.ilike(f"%{email}%"))
    if role:
        stmt = stmt.where(User.role == role)
    if status_filter:
        stmt = stmt.where(User.status == status_filter)

    items, total = paginate_stmt(db, stmt, limit=pagination["limit"], offset=pagination["offset"])
    return PaginatedResponse[AdminUserResponse](
        items=[AdminUserResponse.model_validate(u) for u in items],
        limit=pagination["limit"],
        offset=pagination["offset"],
        total=total,
    )


@router.post(
    "",
    response_model=AdminUserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar usuário",
)
def create_user(
    admin: AdminUser,
    payload: AdminUserCreateRequest,
    db: Session = Depends(get_db),
    request: Request = None,
) -> AdminUserResponse:
    """
    Cria um novo usuário.
    - Senha mínima: 8 caracteres
    - Email deve ser único
    """
    user = User(
        email=str(payload.email),
        password_hash=get_password_hash(payload.password),
        role=_parse_role(payload.role),
        status=_parse_status(payload.status),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise_api_error(
            status_code=status.HTTP_409_CONFLICT,
            code="USER_EMAIL_CONFLICT",
            message="Email já cadastrado.",
        )

    db.refresh(user)

    # Auditoria
    _create_audit_log(
        db,
        admin,
        "USER_CREATED",
        user.id,
        {"email": user.email, "role": user.role.value, "status": user.status.value},
        request,
    )
    db.commit()

    return AdminUserResponse.model_validate(user)


@router.get("/{user_id}", response_model=AdminUserResponse, summary="Detalhar usuário")
def get_user(user_id: UUID, _: AdminUser, db: Session = Depends(get_db)) -> AdminUserResponse:
    user = get_or_404(db, User, user_id, message="Usuário não encontrado.")
    return AdminUserResponse.model_validate(user)


@router.patch("/{user_id}", response_model=AdminUserResponse, summary="Atualizar usuário (patch)")
def patch_user(
    user_id: UUID,
    payload: AdminUserUpdateRequest,
    admin: AdminUser,
    db: Session = Depends(get_db),
    request: Request = None,
) -> AdminUserResponse:
    """
    Atualiza usuário com as seguintes restrições:
    - Não pode modificar super-admin
    - Não pode alterar próprio role/status (pode alterar própria senha)
    - Não pode promover STUDENT→ADMIN se tiver perfil de aluno
    - Transição ACTIVE→INVITED não é permitida
    """
    # 1. Buscar usuário com proteções (permite self apenas para senha)
    user = _get_user_with_checks(
        db,
        user_id,
        admin,
        allow_self=True,  # Permite editar a si mesmo (ex: senha)
        allow_superadmin=False,  # Bloqueia edição de superadmin
    )

    data = payload.model_dump(exclude_unset=True)
    old_values = {"role": user.role.value, "status": user.status.value}

    # 2. Validar auto-edição de role/status
    if _is_self(admin, user_id):
        if "role" in data or "status" in data:
            raise_api_error(
                status_code=status.HTTP_403_FORBIDDEN,
                code="CANNOT_MODIFY_OWN_ROLE_STATUS",
                message="Você não pode alterar seu próprio perfil ou situação.",
            )

    # 3. Validar promoção STUDENT→ADMIN (RN-U-011)
    if "role" in data and data["role"]:
        new_role = _parse_role(data["role"])
        if (
            user.role == UserRole.STUDENT
            and new_role == UserRole.ADMIN
            and _has_active_student(db, user_id)
        ):
            raise_api_error(
                status_code=status.HTTP_400_BAD_REQUEST,
                code="CANNOT_PROMOTE_STUDENT_WITH_PROFILE",
                message="Não é possível promover para Administrador um usuário com perfil de aluno.",
            )
        data["role"] = new_role

    # 4. Validar transições de status (RN-U-012)
    if "status" in data and data["status"]:
        new_status = _parse_status(data["status"])
        # ACTIVE → INVITED não faz sentido
        if user.status == UserStatus.ACTIVE and new_status == UserStatus.INVITED:
            raise_api_error(
                status_code=status.HTTP_400_BAD_REQUEST,
                code="INVALID_STATUS_TRANSITION",
                message="Não é possível voltar um usuário ativo para convidado.",
            )
        # SUSPENDED → INVITED não faz sentido
        if user.status == UserStatus.SUSPENDED and new_status == UserStatus.INVITED:
            raise_api_error(
                status_code=status.HTTP_400_BAD_REQUEST,
                code="INVALID_STATUS_TRANSITION",
                message="Não é possível voltar um usuário suspenso para convidado.",
            )
        data["status"] = new_status

    # 5. Hash de senha se fornecida
    password_changed = False
    if "password" in data and data["password"]:
        data["password_hash"] = get_password_hash(data.pop("password"))
        password_changed = True
    else:
        data.pop("password", None)

    # 6. Aplicar alterações
    apply_update(user, data)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise_api_error(
            status_code=status.HTTP_409_CONFLICT,
            code="USER_EMAIL_CONFLICT",
            message="Email já cadastrado.",
        )

    # 7. Auditoria
    new_values = {"role": user.role.value, "status": user.status.value}
    if old_values != new_values or password_changed:
        audit_data = {"before": old_values, "after": new_values}
        if password_changed:
            audit_data["password_changed"] = True

        action = "USER_UPDATED"
        if old_values["status"] != new_values["status"]:
            if new_values["status"] == "SUSPENDED":
                action = "USER_SUSPENDED"
            elif old_values["status"] == "SUSPENDED" and new_values["status"] == "ACTIVE":
                action = "USER_REACTIVATED"
        if password_changed and old_values == new_values:
            action = "USER_PASSWORD_RESET"

        _create_audit_log(db, admin, action, user_id, audit_data, request)
        db.commit()

    db.refresh(user)
    return AdminUserResponse.model_validate(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remover usuário")
def delete_user(
    user_id: UUID,
    admin: AdminUser,
    db: Session = Depends(get_db),
    request: Request = None,
) -> None:
    """
    Remove usuário com as seguintes restrições:
    - Não pode excluir super-admin (RN-U-022)
    - Não pode excluir a si mesmo (RN-U-021)
    - Não pode excluir se tiver perfil de aluno (RN-U-020)
    """
    # 1. Buscar com proteções
    user = _get_user_with_checks(
        db,
        user_id,
        admin,
        allow_self=False,  # Bloqueia auto-exclusão
        allow_superadmin=False,  # Bloqueia exclusão de superadmin
        error_code_self="CANNOT_DELETE_SELF",
        error_code_superadmin="CANNOT_DELETE_SUPERADMIN",
    )

    # 2. Verificar perfil de aluno
    student = db.query(Student).filter(Student.user_id == user_id).first()
    if student:
        raise_api_error(
            status_code=status.HTTP_409_CONFLICT,
            code="USER_HAS_STUDENT",
            message="Não é possível remover o usuário porque ele possui um perfil de aluno. Exclua o perfil de aluno primeiro.",
        )

    # 3. Guardar dados para auditoria antes de excluir
    user_email = user.email

    # 4. Limpar dependências
    db.query(UserNotification).filter(UserNotification.user_id == user_id).delete(
        synchronize_session=False
    )
    db.query(NotificationPreference).filter(NotificationPreference.user_id == user_id).delete(
        synchronize_session=False
    )

    # 5. Excluir usuário
    db.delete(user)

    # 6. Auditoria
    _create_audit_log(
        db,
        admin,
        "USER_DELETED",
        user_id,
        {"email": user_email},
        request,
    )

    db.commit()

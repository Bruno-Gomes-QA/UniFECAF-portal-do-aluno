#!/bin/bash
#
# UniFECAF Portal - Start & Seed Script
#
# Este script:
# 1. Para e remove containers do projeto
# 2. Remove volumes do PostgreSQL
# 3. Sobe banco de dados e backend
# 4. Aguarda migrations serem aplicadas
# 5. Executa o script de seed dentro do container
#
# Uso:
#   ./start_and_seed.sh          # Start completo + seed
#

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Variáveis
PROJECT_NAME="unifecaf"
COMPOSE_FILE="docker-compose.yml"
CONTAINER_DB="unifecaf-db"
CONTAINER_API="unifecaf-api"
VOLUME_POSTGRES="unifecaf-portal-do-aluno_postgres_data"

# Parse arguments
NO_RESET=false
for arg in "$@"; do
    case $arg in
        --no-reset)
            NO_RESET=true
            shift
            ;;
    esac
done

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         🎓 UniFECAF Portal - Reset & Seed Script            ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Função para printar etapas
print_step() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}▶ $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ $1${NC}"
}

# Verificar se docker está disponível
if ! command -v docker &> /dev/null; then
    print_error "Docker não encontrado. Por favor, instale o Docker."
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    print_error "Docker Compose não encontrado. Por favor, instale o Docker Compose V2."
    exit 1
fi

# Mudar para diretório do projeto
cd "$(dirname "$0")"
print_info "Diretório: $(pwd)"

if [ "$NO_RESET" = false ]; then
    # ═══════════════════════════════════════════════════════════════
    # ETAPA 1: Parar containers
    # ═══════════════════════════════════════════════════════════════
    print_step "1/6 - Parando containers existentes..."

    docker compose down --remove-orphans 2>/dev/null || true
    print_success "Containers parados"

    # ═══════════════════════════════════════════════════════════════
    # ETAPA 2: Remover volumes
    # ═══════════════════════════════════════════════════════════════
    print_step "2/6 - Removendo volumes do PostgreSQL..."

    # Listar volumes relacionados ao projeto
    VOLUMES=$(docker volume ls -q --filter "name=${PROJECT_NAME}" 2>/dev/null || true)
    VOLUME_FULL=$(docker volume ls -q --filter "name=postgres_data" 2>/dev/null | grep -E "${PROJECT_NAME}|portal" || true)

    if [ -n "$VOLUMES" ] || [ -n "$VOLUME_FULL" ]; then
        docker volume rm $VOLUMES $VOLUME_FULL 2>/dev/null || true
        print_success "Volumes removidos"
    else
        print_info "Nenhum volume encontrado para remover"
    fi

    # Tentar remover volume específico
    docker volume rm "$VOLUME_POSTGRES" 2>/dev/null || true
    docker volume rm "$(basename $(pwd))_postgres_data" 2>/dev/null || true

    # ═══════════════════════════════════════════════════════════════
    # ETAPA 3: Subir banco de dados
    # ═══════════════════════════════════════════════════════════════
    print_step "3/6 - Iniciando banco de dados..."

    docker compose up -d db
    print_success "Container do banco iniciado"

    # Aguardar banco ficar healthy
    print_info "Aguardando banco ficar pronto..."
    RETRIES=30
    until docker compose exec -T db pg_isready -U unifecaf -d portal_aluno >/dev/null 2>&1; do
        RETRIES=$((RETRIES - 1))
        if [ $RETRIES -le 0 ]; then
            print_error "Timeout aguardando banco de dados"
            exit 1
        fi
        echo -n "."
        sleep 1
    done
    echo ""
    print_success "Banco de dados pronto"

    # ═══════════════════════════════════════════════════════════════
    # ETAPA 4: Subir backend (aplica migrations automaticamente)
    # ═══════════════════════════════════════════════════════════════
    print_step "4/6 - Iniciando backend e aplicando migrations..."

    docker compose up -d --build api
    print_success "Container do backend iniciado"

    # Aguardar migrations serem aplicadas
    print_info "Aguardando migrations serem aplicadas..."
    RETRIES=60
    until docker compose exec -T api alembic current 2>/dev/null | grep -q "head"; do
        RETRIES=$((RETRIES - 1))
        if [ $RETRIES -le 0 ]; then
            print_error "Timeout aguardando migrations"
            docker compose logs api --tail=50
            exit 1
        fi
        echo -n "."
        sleep 2
    done
    echo ""
    print_success "Migrations aplicadas"

else
    # Modo --no-reset: apenas verificar se containers estão rodando
    print_step "Verificando containers (modo --no-reset)..."

    if ! docker compose ps --status running | grep -q "api"; then
        print_info "Backend não está rodando, iniciando..."
        docker compose up -d db api

        # Aguardar
        print_info "Aguardando serviços..."
        RETRIES=60
        until docker compose exec -T api alembic current 2>/dev/null | grep -q "head"; do
            RETRIES=$((RETRIES - 1))
            if [ $RETRIES -le 0 ]; then
                print_error "Timeout aguardando backend"
                exit 1
            fi
            echo -n "."
            sleep 2
        done
        echo ""
    fi
    print_success "Containers rodando"
fi

# ═══════════════════════════════════════════════════════════════
# ETAPA 5: Executar script de seed
# ═══════════════════════════════════════════════════════════════
if [ "$NO_RESET" = false ]; then
    print_step "5/6 - Executando script de seed..."
else
    print_step "Executando script de seed..."
fi

# Copiar script de seed para o container
print_info "Copiando script de seed para o container..."
docker compose cp backend/seed_data.py api:/app/seed_data.py

# Executar seed dentro do container
docker compose exec -T api python seed_data.py

if [ $? -eq 0 ]; then
    print_success "Seed executado com sucesso"
else
    print_error "Erro ao executar seed"
    exit 1
fi

# ═══════════════════════════════════════════════════════════════
# ETAPA 6: Resumo
# ═══════════════════════════════════════════════════════════════
if [ "$NO_RESET" = false ]; then
    print_step "6/6 - Resumo"
else
    print_step "Resumo"
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    ✅ SEED CONCLUÍDO!                        ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Credenciais de acesso:${NC}"
echo ""
echo -e "  ${YELLOW}Super Admin:${NC}"
echo -e "    Email: bruno.gomes@fecaf.com.br"
echo -e "    Senha: bruno123@"
echo ""
echo -e "  ${YELLOW}Admins:${NC}"
echo -e "    ellen.santos@fecaf.com.br / ellen123@"
echo -e "    eloa.lisboa@fecaf.com.br / eloa123@"
echo -e "    alan.marcon@fecaf.com.br / alan123@"
echo -e "    thiago.lopez@fecaf.com.br / thiago123@"
echo -e "    osvaldo.silva@fecaf.com.br / osvaldo123@"
echo ""
echo -e "  ${YELLOW}Alunos (exemplo):${NC}"
echo -e "    Email: <nome>.<sobrenome>.<ra>@a.fecaf.com.br"
echo -e "    Senha: <nome>@<ra>"
echo ""
echo -e "${CYAN}Serviços:${NC}"
echo -e "  Backend API: http://localhost:8000"
echo -e "  Swagger:     http://localhost:8000/docs"
echo ""
echo -e "${CYAN}Comandos úteis:${NC}"
echo -e "  docker compose logs -f api     # Ver logs do backend"
echo -e "  docker compose up -d web       # Subir frontend"
echo -e "  docker compose down            # Parar tudo"
echo ""

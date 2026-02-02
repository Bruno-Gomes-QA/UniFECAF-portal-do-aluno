#!/bin/bash
#
# UniFECAF Portal - Deploy EC2 Script
#
# Este script:
# 1. Para e remove todos os containers e volumes Docker
# 2. Cria .env com configurações para EC2 (IP público)
# 3. Sobe banco de dados e backend
# 4. Aguarda migrations serem aplicadas
# 5. Executa o script de seed
# 6. Sobe frontend
#
# Uso:
#   ./deploy_ec2.sh
#

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Variáveis EC2
EC2_IP="18.117.33.254"
FRONTEND_URL="http://${EC2_IP}:3000"
BACKEND_URL="http://${EC2_IP}:8000"

# Variáveis do projeto
PROJECT_NAME="unifecaf"
COMPOSE_FILE="docker-compose.yml"
CONTAINER_DB="unifecaf-db"
CONTAINER_API="unifecaf-api"
CONTAINER_WEB="unifecaf-web"

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         🚀 UniFECAF Portal - Deploy EC2 Script              ║${NC}"
echo -e "${CYAN}║         IP: ${EC2_IP}                               ║${NC}"
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

# ═══════════════════════════════════════════════════════════════
# ETAPA 1: Limpar ambiente Docker
# ═══════════════════════════════════════════════════════════════
print_step "1/8 - Limpando ambiente Docker..."

# Parar todos os containers
print_info "Parando todos os containers..."
docker stop $(docker ps -aq) 2>/dev/null || true
print_success "Containers parados"

# Remover todos os containers
print_info "Removendo todos os containers..."
docker rm $(docker ps -aq) 2>/dev/null || true
print_success "Containers removidos"

# Remover todos os volumes
print_info "Removendo todos os volumes Docker..."
docker volume rm $(docker volume ls -q) 2>/dev/null || true
print_success "Volumes removidos"

# Remover redes não utilizadas
print_info "Limpando redes não utilizadas..."
docker network prune -f 2>/dev/null || true
print_success "Redes limpas"

# ═══════════════════════════════════════════════════════════════
# ETAPA 2: Criar arquivo .env para EC2
# ═══════════════════════════════════════════════════════════════
print_step "2/8 - Criando arquivo .env para EC2..."

cat > .env << EOF
# ==========================
# PostgreSQL Configuration
# ==========================
POSTGRES_USER=unifecaf
POSTGRES_PASSWORD=unifecaf123
POSTGRES_DB=portal_aluno

# ==========================
# Backend Configuration
# ==========================
DATABASE_URL=postgresql://unifecaf:unifecaf123@db:5432/portal_aluno
JWT_SECRET=super-secret-key-change-in-production
JWT_EXPIRES_MINUTES=60
# Cookie config (prod)
COOKIE_SECURE=false
COOKIE_SAMESITE=lax
# CORS Origins para EC2 (incluir IP público + nomes dos serviços Docker)
CORS_ORIGINS=${FRONTEND_URL},${BACKEND_URL},http://web:3000,http://api:8000

# ==========================
# Frontend Configuration
# ==========================
# URL do backend usada pelo Next.js (SSR + BFF proxy)
# IMPORTANTE: Usar nome do serviço Docker (api) para comunicação interna
BACKEND_BASE_URL=http://api:8000
EOF

print_success "Arquivo .env criado com configurações EC2"

# ═══════════════════════════════════════════════════════════════
# ETAPA 3: Subir banco de dados
# ═══════════════════════════════════════════════════════════════
print_step "3/8 - Iniciando banco de dados..."

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
print_step "4/8 - Iniciando backend e aplicando migrations..."

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

# ═══════════════════════════════════════════════════════════════
# ETAPA 5: Executar script de seed
# ═══════════════════════════════════════════════════════════════
print_step "5/8 - Executando script de seed..."

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
# ETAPA 6: Subir frontend
# ═══════════════════════════════════════════════════════════════
print_step "6/8 - Iniciando frontend..."

docker compose up -d --build web
print_success "Frontend iniciado"

# Aguardar frontend ficar pronto
print_info "Aguardando frontend ficar disponível..."
RETRIES=60
until curl -s ${FRONTEND_URL} > /dev/null 2>&1; do
    RETRIES=$((RETRIES - 1))
    if [ $RETRIES -le 0 ]; then
        print_info "Frontend pode demorar alguns segundos para responder (build inicial)"
        break
    fi
    echo -n "."
    sleep 2
done
echo ""
print_success "Frontend disponível"

# ═══════════════════════════════════════════════════════════════
# ETAPA 7: Configurar permissões de firewall (se necessário)
# ═══════════════════════════════════════════════════════════════
print_step "7/8 - Verificando configurações de rede..."

print_info "Certifique-se que o Security Group da EC2 permite:"
print_info "  - Porta 3000 (Frontend)"
print_info "  - Porta 8000 (Backend)"
print_info "  - Porta 5432 (PostgreSQL - apenas se necessário acesso externo)"
print_success "Verifique manualmente no AWS Console"

# ═══════════════════════════════════════════════════════════════
# ETAPA 8: Resumo
# ═══════════════════════════════════════════════════════════════
print_step "8/8 - Resumo"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              ✅ DEPLOY EC2 CONCLUÍDO!                        ║${NC}"
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
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📌 URLs dos Serviços (EC2):${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  🌐 Frontend:     ${GREEN}${FRONTEND_URL}${NC}"
echo -e "  🔧 Backend API:  ${GREEN}${BACKEND_URL}${NC}"
echo -e "  📚 Swagger:      ${GREEN}${BACKEND_URL}/docs${NC}"
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🔧 Comandos úteis:${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  docker compose logs -f api     # Ver logs do backend"
echo -e "  docker compose logs -f web     # Ver logs do frontend"
echo -e "  docker compose ps              # Status dos containers"
echo -e "  docker compose restart api     # Reiniciar backend"
echo -e "  docker compose restart web     # Reiniciar frontend"
echo -e "  docker compose down            # Parar tudo"
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}⚠️  Importante:${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  1. Verifique que o Security Group permite tráfego nas portas 3000 e 8000"
echo -e "  2. Para produção, altere JWT_SECRET no .env"
echo -e "  3. Para HTTPS, configure COOKIE_SECURE=true no .env"
echo -e "  4. Considere usar um domínio e certificado SSL (Let's Encrypt)"
echo ""

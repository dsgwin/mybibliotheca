#!/usr/bin/env bash
# setup.sh — First-time Docker deployment helper for MyBibliotheca
# Generates .env with secure random keys, then optionally builds and starts the container.
# Automatically detects Raspberry Pi / ARM and uses the optimised Dockerfile.pi.
set -euo pipefail

# ── Colours ────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[setup]${NC} $*"; }
success() { echo -e "${GREEN}[setup]${NC} $*"; }
warn()    { echo -e "${YELLOW}[setup]${NC} $*"; }
error()   { echo -e "${RED}[setup]${NC} $*" >&2; }

# ── Detect Raspberry Pi / ARM ───────────────────────────────────────────────
IS_PI=false
COMPOSE_FILE="docker-compose.yml"

detect_platform() {
    local arch; arch=$(uname -m)
    # aarch64 = 64-bit ARM (Pi 3/4/5 with 64-bit OS)
    # armv7l  = 32-bit ARM (Pi 3/4 with 32-bit OS)
    # armv6l  = Pi Zero / Pi 1
    if [[ "$arch" == aarch64 || "$arch" == armv7l || "$arch" == armv6l ]]; then
        IS_PI=true
        COMPOSE_FILE="docker-compose.pi.yml"
        warn "Raspberry Pi / ARM detected (${arch}) — using ${COMPOSE_FILE} with Python 3.12 and ARM-optimised wheels."
    fi
    # Also honour an explicit override
    if [[ "${USE_PI_DOCKERFILE:-}" == "1" ]]; then
        IS_PI=true
        COMPOSE_FILE="docker-compose.pi.yml"
        info "USE_PI_DOCKERFILE=1 set — using ${COMPOSE_FILE}."
    fi
}
detect_platform

# ── Prerequisites ───────────────────────────────────────────────────────────
if ! command -v python3 &>/dev/null; then
    error "python3 is required to generate secret keys. Please install it first."
    exit 1
fi
if ! command -v docker &>/dev/null; then
    error "Docker is not installed. See https://docs.docker.com/get-docker/"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── .env generation ─────────────────────────────────────────────────────────
if [[ -f ".env" ]]; then
    warn ".env already exists."
    read -rp "Overwrite it with fresh keys? [y/N] " yn
    if [[ ! "$yn" =~ ^[Yy]$ ]]; then
        info "Keeping existing .env."
    else
        rm .env
    fi
fi

if [[ ! -f ".env" ]]; then
    if [[ ! -f ".env.docker.example" ]]; then
        error ".env.docker.example not found. Are you in the repository root?"
        exit 1
    fi

    info "Generating secure SECRET_KEY and SECURITY_PASSWORD_SALT..."
    SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
    SALT=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")

    # Copy example and substitute placeholder values
    sed \
        -e "s|your-secret-key-here|${SECRET_KEY}|" \
        -e "s|your-salt-here|${SALT}|" \
        .env.docker.example > .env

    # On Pi: add the buffer pool cap so KuzuDB doesn't try to mmap 8 TiB
    if $IS_PI; then
        if ! grep -q "^KUZU_BUFFER_POOL_SIZE_MB=" .env; then
            echo "" >> .env
            echo "# Raspberry Pi: cap KuzuDB buffer pool to avoid mmap failure on ARM kernels" >> .env
            echo "KUZU_BUFFER_POOL_SIZE_MB=256" >> .env
        fi
    fi

    chmod 600 .env
    success ".env created with freshly generated keys."
    echo ""
fi

# ── Optional: ask for timezone ───────────────────────────────────────────────
CURRENT_TZ=$(grep "^TIMEZONE=" .env | cut -d= -f2)
read -rp "Timezone [${CURRENT_TZ}]: " tz_input
if [[ -n "$tz_input" ]]; then
    sed -i "s|^TIMEZONE=.*|TIMEZONE=${tz_input}|" .env
    info "Timezone set to ${tz_input}."
fi

# ── Optional: Google Books API key ──────────────────────────────────────────
echo ""
echo -e "  A Google Books API key avoids ISBN lookup quota errors."
echo -e "  Get one free at: ${CYAN}https://console.cloud.google.com/${NC} → APIs & Services → Books API"
read -rp "  Enter your Google Books API key (leave blank to skip): " gb_key
if [[ -n "$gb_key" ]]; then
    sed -i "s|^# GOOGLE_BOOKS_API_KEY=.*|GOOGLE_BOOKS_API_KEY=${gb_key}|" .env
    info "Google Books API key saved."
fi

# ── Docker build & start ─────────────────────────────────────────────────────
echo ""
read -rp "Build and start MyBibliotheca now? [Y/n] " run_input
if [[ "$run_input" =~ ^[Nn]$ ]]; then
    echo ""
    success "Setup complete. When ready, run:"
    if [[ "$COMPOSE_FILE" != "docker-compose.yml" ]]; then
        echo "    docker compose -f ${COMPOSE_FILE} up -d"
    else
        echo "    docker compose up -d"
    fi
    exit 0
fi

echo ""
if $IS_PI; then
    info "Building ARM-optimised Docker image (first build may take 10–20 min on Pi)..."
else
    info "Building Docker image (this may take a few minutes on first run)..."
fi
docker compose -f "$COMPOSE_FILE" build

echo ""
info "Starting container..."
docker compose -f "$COMPOSE_FILE" up -d

# Wait for the app to be ready
echo ""
info "Waiting for the app to start..."
for i in {1..30}; do
    if curl -sf http://localhost:5054/ -o /dev/null 2>/dev/null; then
        break
    fi
    sleep 3
done

echo ""
success "MyBibliotheca is running at http://localhost:5054"
echo ""
echo "  → Open the URL above to complete setup (create your admin account)."
if [[ "$COMPOSE_FILE" != "docker-compose.yml" ]]; then
    echo "  → To stop:      docker compose -f ${COMPOSE_FILE} down"
    echo "  → To view logs: docker compose -f ${COMPOSE_FILE} logs -f"
else
    echo "  → To stop:      docker compose down"
    echo "  → To view logs: docker compose logs -f"
fi
echo ""

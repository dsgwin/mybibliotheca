#!/usr/bin/env bash
# setup.sh — First-time Docker deployment helper for MyBibliotheca
# Generates .env with secure random keys, then optionally builds and starts the container.
set -euo pipefail

# ── Colours ────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[setup]${NC} $*"; }
success() { echo -e "${GREEN}[setup]${NC} $*"; }
warn()    { echo -e "${YELLOW}[setup]${NC} $*"; }
error()   { echo -e "${RED}[setup]${NC} $*" >&2; }

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
    # Uncomment the line and set the key
    sed -i "s|^# GOOGLE_BOOKS_API_KEY=.*|GOOGLE_BOOKS_API_KEY=${gb_key}|" .env
    info "Google Books API key saved."
fi

# ── Docker build & start ─────────────────────────────────────────────────────
echo ""
read -rp "Build and start MyBibliotheca now? [Y/n] " run_input
if [[ "$run_input" =~ ^[Nn]$ ]]; then
    echo ""
    success "Setup complete. When ready, run:"
    echo "    docker compose up -d"
    exit 0
fi

echo ""
info "Building Docker image (this may take a few minutes on first run)..."
docker compose build

echo ""
info "Starting container..."
docker compose up -d

# Wait for the app to be ready
echo ""
info "Waiting for the app to start..."
for i in {1..20}; do
    if curl -sf http://localhost:5054/ -o /dev/null 2>/dev/null; then
        break
    fi
    sleep 2
done

echo ""
success "MyBibliotheca is running at http://localhost:5054"
echo ""
echo "  → Open the URL above to complete setup (create your admin account)."
echo "  → To stop:    docker compose down"
echo "  → To view logs: docker compose logs -f"
echo ""

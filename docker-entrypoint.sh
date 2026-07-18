#!/bin/bash
set -e

echo "🚀 Starting MyBibliotheca with KuzuDB setup..."
echo "📅 Container startup time: $(date)"
echo "🔍 Container environment:"
echo "  - HOSTNAME: $HOSTNAME"
echo "  - PWD: $PWD"
echo "  - USER: $(whoami)"

# Generate a secure secret key if not provided
if [ -z "$SECRET_KEY" ]; then
    echo "⚠️  No SECRET_KEY provided, generating a random one..."
    export SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
    echo "🔑 Generated SECRET_KEY for this session"
fi

# Ensure data directories exist
echo "📁 Creating data directories..."
mkdir -p /app/data
mkdir -p /app/data/kuzu

# Log directory structure and permissions
echo "📂 Data directory structure:"
ls -la /app/data/ || echo "❌ Failed to list /app/data/"
echo "📂 Kuzu directory details:"
ls -la /app/data/kuzu/ || echo "❌ Failed to list /app/data/kuzu/"

# Check if this is a fresh container or restart
if [ -f "/app/data/kuzu/.container_marker" ]; then
    echo "🔄 Container restart detected - existing database should persist"
    echo "📊 Previous container info:"
    cat /app/data/kuzu/.container_marker || echo "❌ Failed to read container marker"
else
    echo "🆕 Fresh container startup - creating container marker"
    echo "Container created: $(date)" > /app/data/kuzu/.container_marker
    echo "Hostname: $HOSTNAME" >> /app/data/kuzu/.container_marker
fi

# Ensure proper permissions on data directory
echo "🔐 Setting permissions on data directory..."
chown -R 1000:1000 /app/data 2>/dev/null || echo "⚠️  Could not change ownership (running as non-root?)"
chmod -R 755 /app/data 2>/dev/null || echo "⚠️  Could not change permissions"

# KuzuDB-specific setup
echo "🗄️  Setting up KuzuDB..."
export KUZU_DB_PATH=${KUZU_DB_PATH:-/app/data/kuzu}
export GRAPH_DATABASE_ENABLED=${GRAPH_DATABASE_ENABLED:-true}

# Show setup details only in debug mode
if [ "${KUZU_DEBUG:-false}" = "true" ]; then
    echo "🔍 KuzuDB setup details:"
    echo "  - KUZU_DB_PATH: $KUZU_DB_PATH"
    echo "  - GRAPH_DATABASE_ENABLED: $GRAPH_DATABASE_ENABLED"
fi

# Check if database files exist (only show details in debug mode)
if [ "${KUZU_DEBUG:-false}" = "true" ]; then
    echo "📊 Checking for existing KuzuDB files..."
    if [ -d "$KUZU_DB_PATH" ]; then
        echo "✅ KuzuDB directory exists"
        KUZU_FILES=$(find "$KUZU_DB_PATH" -type f 2>/dev/null | wc -l)
        echo "📄 Found $KUZU_FILES files in KuzuDB directory"
        if [ $KUZU_FILES -gt 0 ]; then
            echo "📋 KuzuDB files found:"
            find "$KUZU_DB_PATH" -type f -exec ls -lh {} \; 2>/dev/null || echo "❌ Could not list files"
            echo "✅ Database persistence detected - existing data should be available"
        else
            echo "📭 KuzuDB directory is empty - fresh database will be initialized"
        fi
    else
        echo "❌ KuzuDB directory does not exist - will be created"
    fi
fi

# Clean up any stale KuzuDB lock files (critical for Docker restarts)
if [ -f "$KUZU_DB_PATH/.lock" ]; then
    echo "🧹 Removing stale KuzuDB lock file..."
    rm -f "$KUZU_DB_PATH/.lock" 2>/dev/null || echo "❌ Failed to remove lock file"
else
    echo "✅ No stale lock files found"
fi

# Dangerous cleanup is disabled by default; only enabled when explicitly requested
if [ "${KUZU_FORCE_RESET:-false}" = "true" ]; then
    if [ -d "$KUZU_DB_PATH/bibliotheca.db" ]; then
        echo "🚨 KUZU_FORCE_RESET=true - performing safety backup and resetting database directory"
        mkdir -p /app/data/backups
        RESET_BACKUP="/app/data/backups/startup_reset_$(date +%Y%m%d-%H%M%S).tar.gz"
        # Best-effort archive; ignore errors so we don't block reset if tar fails
        tar -czf "$RESET_BACKUP" -C "$KUZU_DB_PATH" bibliotheca.db 2>/dev/null && \
            echo "📦 Safety backup created at $RESET_BACKUP" || \
            echo "⚠️  Failed to create safety backup (continuing reset)"
        echo "🧹 Removing $KUZU_DB_PATH/bibliotheca.db ..."
        rm -rf "$KUZU_DB_PATH/bibliotheca.db" 2>/dev/null || echo "❌ Failed to remove existing directory"
        echo "✅ Database directory reset complete"
    fi
fi

# Additional KuzuDB diagnostic info
echo "🔧 KuzuDB diagnostics:"
echo "  - Directory permissions: $(ls -ld $KUZU_DB_PATH 2>/dev/null || echo 'N/A')"
echo "  - Available disk space: $(df -h $KUZU_DB_PATH 2>/dev/null | tail -1 || echo 'N/A')"

# Note the process/thread model
echo "ℹ️  NOTE: Single worker PROCESS (WORKERS=1, one kuzu.Database per process); multiple gunicorn threads handle requests concurrently within it"
echo "📊 KuzuDB path: $KUZU_DB_PATH"

# Check for SQLite migration if enabled
if [ "$AUTO_MIGRATE" = "true" ]; then
    echo "🔄 Auto-migration enabled, checking for SQLite databases..."
    export DOCKER_ENV=true
    
    # Set default migration user if not specified
    if [ -z "$MIGRATION_DEFAULT_USER" ]; then
        export MIGRATION_DEFAULT_USER="admin"
        echo "📝 Using default migration user: admin"
    fi
    
    echo "🔍 Migration settings:"
    echo "  AUTO_MIGRATE: $AUTO_MIGRATE" 
    echo "  MIGRATION_DEFAULT_USER: $MIGRATION_DEFAULT_USER"
fi

echo "✅ Initialization complete, starting application..."
echo "📝 Visit the application to complete setup using the interactive setup page"
echo "🕒 Application startup time: $(date)"

# Persistence diagnostics script removed - no longer needed

# Log final state before starting app
echo "🏁 Final pre-startup state:"
echo "  - Data directory size: $(du -sh /app/data 2>/dev/null || echo 'N/A')"
echo "  - KuzuDB directory size: $(du -sh $KUZU_DB_PATH 2>/dev/null || echo 'N/A')"
echo "  - Process ID: $$"

# Configure logging level for Gunicorn from LOG_LEVEL env (default ERROR)
LOG_LEVEL_NORMALIZED=$(echo "${LOG_LEVEL:-ERROR}" | tr '[:upper:]' '[:lower:]')
export GUNICORN_CMD_ARGS="${GUNICORN_CMD_ARGS} --log-level ${LOG_LEVEL_NORMALIZED}"

# Execute the main command with visibility
echo "🪵 Log level: ${LOG_LEVEL_NORMALIZED} (set via LOG_LEVEL env)"
echo "🔧 Executing: $@"
exec "$@"

#!/bin/bash
set -e

echo "Waiting for PostgreSQL..."

# Extract host from DATABASE_URL (format: postgresql://user:pass@host:port/db)
DB_HOST=$(echo $DATABASE_URL | sed -e 's/.*@//' -e 's/:.*//' -e 's/\/.*//')

# Wait for PostgreSQL to be ready using pg_isready
until pg_isready -h "$DB_HOST" -p 5432 2>/dev/null; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done

echo "PostgreSQL is up - running migrations"

# Run Alembic migrations
alembic upgrade head

echo "Starting application..."

# Start the application
exec uvicorn app.main:app --host 0.0.0.0 --port 8000

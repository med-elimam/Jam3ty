#!/bin/bash
# Production deployment script for Railway
# This script is run by Railway during the deployment process

set -e

echo "🚀 Starting production deployment..."

# Build the API
echo "📦 Building API server..."
pnpm run build

# Run database migrations
echo "🗄️  Running database migrations..."
pnpm run migrate

echo "✅ Deployment complete!"
echo "The API server will start automatically with: NODE_ENV=production node --enable-source-maps ./dist/index.mjs"

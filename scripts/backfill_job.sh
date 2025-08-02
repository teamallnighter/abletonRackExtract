#!/bin/bash
# Railway job script to backfill embeddings
# This script runs on Railway's infrastructure with access to internal services

echo "Starting vector embedding backfill job..."
cd /app
python backend/backfill_embeddings.py
echo "Backfill job completed!"

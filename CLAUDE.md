# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

The Ableton Cookbook is a Flask-based web application for analyzing and sharing Ableton Live rack files (.adg/.adv). It features a Python backend with MongoDB integration and a hybrid frontend architecture using both Jinja2 templates and React components.

## Development Commands

### Backend Development
```bash
# Start the Flask development server
cd backend && python app.py

# Install Python dependencies
pip install -r backend/requirements.txt

# Test MongoDB connection
cd backend && python test_mongodb.py

# Run AI API tests
python test_ai_api.py
```

### Testing
```bash
# Test AI endpoints
./test_ai_endpoints.sh
./test_ai_working.sh
```

### Deployment
```bash
# Railway deployment (production)
./start.sh

# Local gunicorn server
cd backend && gunicorn app:app --bind 0.0.0.0:5001 --timeout 120
```

## Architecture

### Core Components

**Backend (`backend/`)**
- `app.py` - Main Flask application with API routes and template serving
- `abletonRackAnalyzer.py` - Core rack analysis engine that decompresses and parses .adg/.adv files
- `db.py` - MongoDB integration layer
- `ai_routes.py` - AI-powered analysis endpoints
- `openai_integration.py` - OpenAI integration for intelligent rack analysis
- `security.py` - Security utilities for input validation and sanitization

**Frontend Architecture**
The application uses a hybrid approach:
1. **Jinja2 Templates** (`templates/`) - Server-rendered pages for SEO and initial load
2. **React Components** (`frontend/src/`) - Interactive UI components for rack visualization
3. **Vanilla JavaScript** (`static/js/`) - Legacy interactive features and API communication

### Key Technical Details

**Rack Analysis Pipeline:**
1. Upload .adg/.adv file via multipart form data
2. Decompress gzip-compressed XML content
3. Parse XML structure to extract chains, devices, and macro controls
4. Store analysis in MongoDB with base64-encoded original file
5. Generate downloadable XML/JSON exports

**Database Schema:**
- MongoDB collections: `racks` (rack analyses), `users` (if auth enabled)
- Rack documents include: filename, analysis data, user info, creation timestamp, stats

**API Endpoints:**
- `POST /api/analyze` - Upload and analyze rack files
- `GET /api/racks` - List recent racks
- `GET /api/racks/{id}` - Get specific rack by ID
- `GET /api/racks/search` - Search racks by text
- `GET /api/ai/analyze/{rack_id}` - AI-powered rack analysis
- `GET /api/download/{type}/{filename}` - Download generated files

## Environment Configuration

Required environment variables:
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET_KEY` - JWT token secret
- `ALLOWED_ORIGINS` - CORS allowed origins (comma-separated)
- `OPENAI_API_KEY` - OpenAI API key for AI features
- `PORT` - Server port (Railway sets this automatically)

## File Processing

The application handles Ableton rack files (.adg for audio effects, .adv for instruments):
1. Files are gzip-compressed XML documents
2. Maximum file size: 16MB
3. Temporary files are cleaned up after processing
4. Original files can be stored as base64 in MongoDB for re-download

## Security Features

- Input sanitization for all user inputs
- Rate limiting on API endpoints  
- CORS configuration
- Secure filename handling
- Password hashing with bcrypt (if auth enabled)
- JWT token authentication (optional)

## AI Integration

The application includes OpenAI integration for intelligent rack analysis:
- Analyzes rack structure and provides musical context
- Suggests use cases and production techniques
- Requires `OPENAI_API_KEY` environment variable
- Available via `/api/ai/analyze/{rack_id}` endpoint

## Deployment Notes

- Configured for Railway deployment with `Procfile` and `start.sh`
- Uses gunicorn WSGI server in production
- Static files served by Flask (consider CDN for production)
- MongoDB Atlas recommended for production database
- Health check available at `/api/health`
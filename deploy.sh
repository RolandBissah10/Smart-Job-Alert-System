@echo off

REM Smart Job Alert System - Production Deployment Script
REM This script optimizes the application for production deployment

echo 🚀 Starting Smart Job Alert System Production Deployment

REM Backend optimizations
echo 📦 Setting up backend...
cd backend

REM Create database indexes for performance
echo 🗄️ Creating database indexes...
python create_indexes.py

REM Install production dependencies
echo 📦 Installing production dependencies...
pip install -r requirements.txt

REM Run database migrations/initialization if needed
echo 🗃️ Running database setup...
python -c "from app.db.database import init_db; init_db()"

cd ..

REM Frontend optimizations
echo 🎨 Building optimized frontend...
cd frontend

REM Install dependencies
call npm install

REM Build with optimizations
call npm run build

echo ✅ Build complete! Bundle sizes:
dir dist\assets\

cd ..

echo 🎉 Production deployment ready!
echo.
echo Performance improvements applied:
echo ✅ Frontend: Code splitting, lazy loading, compression
echo ✅ Backend: Caching, database indexes, Gunicorn workers
echo ✅ Database: Optimized indexes and queries
echo ✅ Infrastructure: CDN headers, worker processes
echo.
echo Monitor performance at: /performance endpoint
echo Health check at: /health endpoint
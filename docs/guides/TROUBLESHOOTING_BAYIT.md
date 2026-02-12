# Bayit+ Troubleshooting Guide

## Port Already in Use

```bash
# Find process using port 8000
lsof -i :8000

# Kill the process
kill -9 <PID>

# Or use pkill
pkill -f "uvicorn app.main:app"
```

## Frontend Can't Connect to Backend

1. Verify backend is running on port 8000: `curl http://localhost:8000/health`
2. Check Vite proxy configuration in `web/vite.config.js`
3. Clear browser cache and restart frontend

## MongoDB Connection Issues

1. Check `.env` has `MONGODB_URI` set
2. Verify MongoDB Atlas network access allows your IP
3. Check database name is `bayit_plus`

## API Documentation

When the backend is running, access interactive API docs:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

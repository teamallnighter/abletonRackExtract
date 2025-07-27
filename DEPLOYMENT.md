# Railway Deployment with MongoDB

## Setup Instructions

### 1. Deploy to Railway

1. Push this code to a GitHub repository
2. Go to [Railway](https://railway.app)
3. Create a new project
4. Choose "Deploy from GitHub repo"
5. Select your repository

### 2. Add MongoDB to your Railway Project

1. In your Railway project dashboard, click "New Service"
2. Choose "Database" → "Add MongoDB"
3. Railway will automatically provision a MongoDB instance
4. The MongoDB connection string will be automatically available as `MONGO_URL` environment variable

### 3. Verify Environment Variables

Railway automatically injects the following environment variables when MongoDB is attached:
- `MONGO_URL` - Full MongoDB connection string
- `MONGOHOST` - MongoDB host
- `MONGOPASSWORD` - MongoDB password
- `MONGOPORT` - MongoDB port
- `MONGOUSER` - MongoDB username

The app is configured to automatically use `MONGO_URL` for the connection.

### 4. Deploy the Application

1. Railway will automatically detect the Python app and use the `requirements.txt`
2. The app will start using the command specified in `railway.json`
3. Railway will provide a public URL for your app

### 5. Test the Deployment

Once deployed, you can test the MongoDB integration:

1. Visit your app URL
2. Upload an Ableton rack file (.adg or .adv)
3. The analysis will be automatically saved to MongoDB
4. Use the API endpoints to retrieve saved racks:
   - `GET /api/racks` - Get recent racks
   - `GET /api/racks/{id}` - Get specific rack
   - `GET /api/racks/search?q=query` - Search racks

### Local Testing

To test MongoDB connection locally:

```bash
cd backend
python test_mongodb.py
```

To run the app locally with MongoDB:

```bash
# Set MongoDB URL (optional, defaults to localhost)
export MONGO_URL="mongodb://localhost:27017/"

# Run the app
cd backend
python app.py
```

### API Endpoints

#### Analysis
- `POST /api/analyze` - Analyze an uploaded rack file (automatically saves to MongoDB)

#### MongoDB Operations
- `GET /api/racks?limit=10` - Get recent racks (default limit: 10)
- `GET /api/racks/{rack_id}` - Get a specific rack by ID
- `GET /api/racks/search?q=search_term` - Search racks by name or filename

#### Health Check
- `GET /api/health` - Check if the API is running

### Troubleshooting

1. **MongoDB Connection Issues**
   - Check Railway logs for connection errors
   - Ensure MongoDB service is running in Railway
   - Verify environment variables are set

2. **File Upload Issues**
   - Maximum file size is 16MB
   - Only .adg and .adv files are accepted

3. **Missing Dependencies**
   - Ensure all requirements are in `requirements.txt`
   - Railway uses Nixpacks which should handle Python dependencies automatically

### MongoDB Schema

Each rack document in MongoDB contains:
```json
{
  "_id": "ObjectId",
  "filename": "string",
  "rack_name": "string",
  "analysis": {
    "rack_name": "string",
    "chains": [...],
    "macro_controls": [...]
  },
  "created_at": "datetime",
  "stats": {
    "total_chains": "number",
    "total_devices": "number",
    "macro_controls": "number"
  },
  "file_content": "base64 string (optional)"
}
```

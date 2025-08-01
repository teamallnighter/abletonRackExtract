# Railway Setup for AI Workflows

## Running AI Scripts on Railway

Since Railway is a deployment platform for web services, you don't run scripts directly on Railway like you would on a local machine. Instead, you have several options:

### Option 1: API Endpoints (Recommended)

The AI workflow functionality is exposed through API endpoints in your Flask backend. Once deployed, you can use these endpoints:

#### 1. Check AI Status
```bash
curl https://your-app.railway.app/api/ai/status
```

#### 2. Create AI Chatflow (requires authentication)
```bash
curl -X POST https://your-app.railway.app/api/ai/create-chatflow \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

#### 3. Sync Racks to FlowiseAI (requires authentication)
```bash
curl -X POST https://your-app.railway.app/api/ai/sync-racks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"limit": 100}'
```

#### 4. Analyze Racks with AI (requires authentication)
```bash
curl -X POST https://your-app.railway.app/api/ai/analyze \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "Find racks with complex bass sounds"}'
```

### Option 2: Railway CLI Commands

You can run one-off commands using Railway's CLI:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Run a command in your production environment
railway run python ai_workflows/scripts/sync_mongodb_to_flowise.py
```

### Option 3: Scheduled Jobs

For regular syncing, you can set up a cron job service in Railway:

1. Create a new service in your Railway project
2. Use a cron service template
3. Configure it to call your sync endpoint periodically

### Option 4: Admin Dashboard

Create a simple admin interface in your frontend to trigger these operations:

```javascript
// Example frontend code
async function syncRacksToAI() {
  const response = await fetch('/api/ai/sync-racks', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ limit: 100 })
  });
  
  const result = await response.json();
  console.log('Sync result:', result);
}
```

## Environment Variables

In your Railway project settings, add these environment variables:

```bash
# FlowiseAI Configuration
FLOWISE_API_URL=https://your-flowise-instance.railway.app
FLOWISE_API_KEY=your-api-key-if-needed

# MongoDB is already configured automatically
# MONGO_URL is provided by Railway when services are in the same project
```

## Connecting FlowiseAI to MongoDB

Since both services are in the same Railway project:

1. FlowiseAI automatically has access to the `MONGO_URL` environment variable
2. You can use this in FlowiseAI's database nodes
3. The connection string is: `${{MONGO_URL}}`

## Testing the Integration

After deployment, test the integration:

1. Check AI status:
   ```bash
   curl https://your-app.railway.app/api/ai/status
   ```

2. If using authentication, first login to get a token:
   ```bash
   curl -X POST https://your-app.railway.app/api/login \
     -H "Content-Type: application/json" \
     -d '{"username": "your-username", "password": "your-password"}'
   ```

3. Use the token for authenticated endpoints

## Monitoring

Railway provides logs for all services. You can monitor:

1. Flask backend logs for API calls
2. FlowiseAI logs for AI operations
3. MongoDB logs for database operations

Access logs via:
- Railway dashboard
- Railway CLI: `railway logs`

# 🤖 Automated Deployment Setup

This repository now has automated frontend building and deployment set up with GitHub Actions.

## How It Works

### 🔄 Automatic Deployment
- **Trigger**: Push to `main` branch with changes in `frontend-new/`
- **Process**: 
  1. Builds React app with Vite
  2. Copies build files to `backend/static/frontend/`
  3. Commits and pushes changes
  4. Railway automatically deploys the updated backend

### 📋 Manual Deployment
If you need to deploy manually:
```bash
./deploy.sh
```

## Workflow Details

### GitHub Actions Workflow (`.github/workflows/deploy.yml`)
- **Runs on**: Push to main, PRs to main
- **Caches**: Node modules for faster builds
- **Smart**: Only commits if build output actually changed
- **Safe**: Only deploys from main branch pushes

### What Happens When You Push

1. **Detection**: GitHub detects changes in `frontend-new/`
2. **Build**: Actions runner builds the React app
3. **Copy**: Build files copied to backend static folder
4. **Commit**: Changes automatically committed
5. **Deploy**: Railway detects the new commit and deploys

## Benefits

- ✅ **No manual building** - just edit and push
- ✅ **Consistent builds** - same environment every time  
- ✅ **Fast feedback** - see build status in GitHub
- ✅ **Rollback ready** - full Git history of builds
- ✅ **Cache optimization** - faster subsequent builds

## Development Workflow

1. Make changes to `frontend-new/src/`
2. Commit your changes: `git commit -m "your changes"`
3. Push to main: `git push origin main`
4. ☕ Relax while automation handles the rest!

## Monitoring

- **GitHub Actions**: Check the "Actions" tab in GitHub
- **Railway**: Monitor deployment in Railway dashboard  
- **Live site**: Changes appear at ableton.recipe in ~3-5 minutes

## Troubleshooting

If automation fails:
1. Check GitHub Actions logs in the "Actions" tab
2. Use manual deployment: `./deploy.sh`
3. Verify frontend builds locally: `cd frontend-new && npm run build`

# Railway Deployment Fix

This document explains how to fix the "The executable `cd` could not be found" error on Railway.

## Problem

Railway was trying to execute `cd backend && python server.py` as a direct command, but `cd` is a shell builtin, not an executable.

## Solutions Applied

### Option 1: Shell Command Wrapper (Current)
Updated all config files to use `sh -c 'cd backend && python server.py'`:

- `railway.toml`
- `Procfile` 
- `nixpacks.toml`

### Option 2: Root-Level Launcher (Alternative)
Created `launch.py` at project root that:
- Changes to backend directory programmatically
- Launches the server without needing shell commands

To use this option, update your `railway.toml`:
```toml
[deploy]
startCommand = "python launch.py"
```

### Option 3: Bash Shell (Alternative)
For more robust shell support:
```toml
[deploy]
startCommand = "bash -c 'cd backend && python server.py'"
```

### Option 4: Start Script (Alternative)
Use the existing `start.sh` script:
```toml
[deploy]
startCommand = "./start.sh"
```

## Files Modified

1. `/Volumes/BassDaddy/abletonRackExtract/railway.toml` - Updated startCommand
2. `/Volumes/BassDaddy/abletonRackExtract/Procfile` - Updated web command
3. `/Volumes/BassDaddy/abletonRackExtract/nixpacks.toml` - Updated start cmd

## Files Created

1. `/Volumes/BassDaddy/abletonRackExtract/launch.py` - Root-level launcher
2. `/Volumes/BassDaddy/abletonRackExtract/railway-alternative.toml` - Alternative config
3. `/Volumes/BassDaddy/abletonRackExtract/nixpacks-alternative.toml` - Alternative nixpacks config

## Testing the Fix

1. Try deploying with the current configuration (Option 1)
2. If it still fails, copy `railway-alternative.toml` to `railway.toml` and try Option 2
3. Check Railway logs for any other issues

## Why This Happens

Railway's container environment executes commands directly, not through a shell. Commands like `cd` only work when explicitly run through a shell interpreter (`sh -c` or `bash -c`).

## Additional Notes

- The `server.py` file is designed to be robust and will fallback from gunicorn to Flask if needed
- All scripts are now executable (`chmod +x`)
- The PYTHONPATH is set correctly in nixpacks.toml
- Health checks are configured for `/api/health`
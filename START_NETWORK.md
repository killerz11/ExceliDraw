# Network Access Setup Guide

Your IP: **100.73.210.34**

## Quick Start

Run all three services in separate terminals:

### Terminal 1: HTTP Backend
```bash
cd y/apps/http-backend
pnpm dev
```
Should show:
```
🚀 HTTP Backend running on http://0.0.0.0:5000
📡 Accessible on network at http://<your-ip>:5000
```

### Terminal 2: WebSocket Backend
```bash
cd y/apps/ws-backend
pnpm dev
```
Should show:
```
🚀 WebSocket server starting on ws://0.0.0.0:8080
📡 Accessible on network at ws://<your-ip>:8080
```

### Terminal 3: Next.js Frontend
```bash
cd y/apps/web
pnpm dev
```
Should show:
```
▲ Next.js 16.2.0
- Local:        http://localhost:3000
- Network:      http://100.73.210.34:3000
```

## Access URLs

### From Your Computer (Host):
- Frontend: http://localhost:3000
- HTTP API: http://localhost:5000
- WebSocket: ws://localhost:8080

### From Other Devices on Network:
- Frontend: http://100.73.210.34:3000
- HTTP API: http://100.73.210.34:5000
- WebSocket: ws://100.73.210.34:8080

## Testing

1. **Test HTTP Backend:**
```bash
curl http://100.73.210.34:5000/chats/test-room
```

2. **Test from Phone/Tablet:**
   - Open browser
   - Go to: http://100.73.210.34:3000
   - Sign up / Sign in
   - Create or join a room
   - Start drawing!

## Firewall Rules (if needed)

If you can't connect from other devices, allow these ports:

### Linux (ufw):
```bash
sudo ufw allow 3000/tcp
sudo ufw allow 5000/tcp
sudo ufw allow 8080/tcp
```

### macOS:
```bash
# System Preferences → Security & Privacy → Firewall → Firewall Options
# Allow incoming connections for Node
```

### Windows:
```powershell
# Windows Defender Firewall → Advanced Settings → Inbound Rules
# New Rule → Port → TCP → 3000, 5000, 8080
```

## Troubleshooting

### WebSocket not connecting?
1. Check ws-backend is running: `lsof -i :8080`
2. Check browser console for errors
3. Verify .env.local has correct IP

### Sign in/Sign up not working?
1. Check http-backend is running: `lsof -i :5000`
2. Check browser Network tab for API calls
3. Verify CORS is allowing your IP

### Can't access from phone?
1. Make sure phone is on same WiFi network
2. Check firewall isn't blocking ports
3. Try accessing http://100.73.210.34:3000 directly

## Environment Variables

### y/apps/web/.env.local
```env
NEXT_PUBLIC_API_URL=http://100.73.210.34:5000
NEXT_PUBLIC_WS_URL=ws://100.73.210.34:8080
```

### y/.env (workspace root)
```env
JWT_SECRET="12345678"
DATABASE_URL="postgresql://..."
```

## Changes Made

1. ✅ HTTP Backend binds to 0.0.0.0:5000 (all interfaces)
2. ✅ WebSocket Backend binds to 0.0.0.0:8080 (all interfaces)
3. ✅ Next.js dev server binds to 0.0.0.0:3000 (all interfaces)
4. ✅ CORS allows all origins in development
5. ✅ Frontend uses NEXT_PUBLIC_API_URL and NEXT_PUBLIC_WS_URL
6. ✅ Environment variables configured for network IP

## Production Notes

For production deployment:
- Use proper CORS whitelist (not `origin: true`)
- Use HTTPS/WSS instead of HTTP/WS
- Use environment-specific configs
- Add rate limiting
- Use proper secret management

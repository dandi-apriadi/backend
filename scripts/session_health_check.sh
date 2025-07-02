#!/bin/bash
# Session Health Check Script untuk Production
# Jalankan script ini di server production untuk mengecek status session

echo "=== SESSION HEALTH CHECK ==="
echo "Date: $(date)"
echo ""

# 1. Check if Sessions table exists
echo "1. Checking Sessions table..."
mysql -u root -p kartika -e "SHOW TABLES LIKE 'Sessions';" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Sessions table exists"
else
    echo "❌ Sessions table not found"
fi

# 2. Check session table structure
echo ""
echo "2. Sessions table structure:"
mysql -u root -p kartika -e "DESCRIBE Sessions;" 2>/dev/null

# 3. Count active sessions
echo ""
echo "3. Active sessions count:"
mysql -u root -p kartika -e "SELECT COUNT(*) as active_sessions FROM Sessions WHERE expires > NOW();" 2>/dev/null

# 4. Show recent sessions (last 5)
echo ""
echo "4. Recent sessions:"
mysql -u root -p kartika -e "SELECT sid, expires, LEFT(data, 50) as data_preview FROM Sessions ORDER BY createdAt DESC LIMIT 5;" 2>/dev/null

# 5. Check expired sessions
echo ""
echo "5. Expired sessions:"
mysql -u root -p kartika -e "SELECT COUNT(*) as expired_sessions FROM Sessions WHERE expires <= NOW();" 2>/dev/null

# 6. Test API endpoint
echo ""
echo "6. Testing API endpoints..."
echo "Testing /api/auth/me endpoint:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://188.166.181.0:5000/api/auth/me

# 7. Check server logs for session errors
echo ""
echo "7. Recent session-related errors in logs:"
if [ -f "/var/log/pm2/vps-iot-backend-error.log" ]; then
    tail -20 /var/log/pm2/vps-iot-backend-error.log | grep -i session
else
    echo "Log file not found at /var/log/pm2/vps-iot-backend-error.log"
fi

# 8. Check PM2 status
echo ""
echo "8. PM2 Process Status:"
pm2 status | grep vps-iot-backend

echo ""
echo "=== END SESSION HEALTH CHECK ==="

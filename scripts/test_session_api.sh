#!/bin/bash
# Session API Test Script untuk Production
# Script ini test login dan session functionality

SERVER_URL="http://188.166.181.0:5000"
COOKIE_JAR="/tmp/test_cookies.txt"

echo "=== SESSION API TEST ==="
echo "Date: $(date)"
echo "Server: $SERVER_URL"
echo ""

# Clean up previous cookies
rm -f $COOKIE_JAR

# 1. Test server health
echo "1. Testing server health..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $SERVER_URL/api/auth/me)
echo "GET /api/auth/me (without session): HTTP $HTTP_STATUS"

if [ "$HTTP_STATUS" = "401" ]; then
    echo "✅ Correct: Server properly rejects unauthenticated requests"
elif [ "$HTTP_STATUS" = "000" ]; then
    echo "❌ Server not responding"
    exit 1
else
    echo "⚠️  Unexpected response: $HTTP_STATUS"
fi

# 2. Test login (you need to provide valid credentials)
echo ""
echo "2. Testing login..."
echo "Note: You need to replace with valid credentials"

# Example login request - replace with actual credentials
LOGIN_RESPONSE=$(curl -s -c $COOKIE_JAR -w "%{http_code}" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@example.com","password":"password"}' \
    $SERVER_URL/api/auth/login)

LOGIN_STATUS=${LOGIN_RESPONSE: -3}
LOGIN_BODY=${LOGIN_RESPONSE%???}

echo "POST /api/auth/login: HTTP $LOGIN_STATUS"

if [ "$LOGIN_STATUS" = "200" ]; then
    echo "✅ Login successful"
    echo "Response: $LOGIN_BODY"
elif [ "$LOGIN_STATUS" = "404" ]; then
    echo "❌ User not found - check credentials"
elif [ "$LOGIN_STATUS" = "400" ]; then
    echo "❌ Bad request - check email/password format"
else
    echo "❌ Login failed with status: $LOGIN_STATUS"
    echo "Response: $LOGIN_BODY"
fi

# 3. Test authenticated request
echo ""
echo "3. Testing authenticated request..."
if [ -f $COOKIE_JAR ]; then
    AUTH_RESPONSE=$(curl -s -b $COOKIE_JAR -w "%{http_code}" $SERVER_URL/api/auth/me)
    AUTH_STATUS=${AUTH_RESPONSE: -3}
    AUTH_BODY=${AUTH_RESPONSE%???}
    
    echo "GET /api/auth/me (with session): HTTP $AUTH_STATUS"
    
    if [ "$AUTH_STATUS" = "200" ]; then
        echo "✅ Session working correctly"
        echo "User data: $AUTH_BODY"
    else
        echo "❌ Session not working: $AUTH_STATUS"
        echo "Response: $AUTH_BODY"
    fi
else
    echo "❌ No cookies saved from login"
fi

# 4. Show cookie details
echo ""
echo "4. Cookie details:"
if [ -f $COOKIE_JAR ]; then
    echo "Cookies saved:"
    cat $COOKIE_JAR
else
    echo "No cookies found"
fi

# 5. Test logout
echo ""
echo "5. Testing logout..."
if [ -f $COOKIE_JAR ]; then
    LOGOUT_RESPONSE=$(curl -s -b $COOKIE_JAR -w "%{http_code}" \
        -X POST $SERVER_URL/api/auth/logout)
    
    LOGOUT_STATUS=${LOGOUT_RESPONSE: -3}
    LOGOUT_BODY=${LOGOUT_RESPONSE%???}
    
    echo "POST /api/auth/logout: HTTP $LOGOUT_STATUS"
    
    if [ "$LOGOUT_STATUS" = "200" ]; then
        echo "✅ Logout successful"
    else
        echo "❌ Logout failed: $LOGOUT_STATUS"
    fi
fi

# 6. Test request after logout
echo ""
echo "6. Testing request after logout..."
AFTER_LOGOUT=$(curl -s -b $COOKIE_JAR -w "%{http_code}" $SERVER_URL/api/auth/me)
AFTER_STATUS=${AFTER_LOGOUT: -3}

echo "GET /api/auth/me (after logout): HTTP $AFTER_STATUS"

if [ "$AFTER_STATUS" = "401" ]; then
    echo "✅ Session properly cleared after logout"
else
    echo "❌ Session not cleared properly: $AFTER_STATUS"
fi

# Cleanup
rm -f $COOKIE_JAR

echo ""
echo "=== SESSION API TEST COMPLETED ==="

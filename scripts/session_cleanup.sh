#!/bin/bash
# Session Cleanup Script untuk Production
# Script ini membersihkan session yang sudah expired

echo "=== SESSION CLEANUP SCRIPT ==="
echo "Date: $(date)"
echo ""

# 1. Count expired sessions before cleanup
echo "1. Counting expired sessions..."
EXPIRED_COUNT=$(mysql -u root -p kartika -N -e "SELECT COUNT(*) FROM Sessions WHERE expires <= NOW();" 2>/dev/null)
echo "Found $EXPIRED_COUNT expired sessions"

# 2. Show some expired sessions before deletion
echo ""
echo "2. Sample of expired sessions (showing first 5):"
mysql -u root -p kartika -e "SELECT sid, expires FROM Sessions WHERE expires <= NOW() LIMIT 5;" 2>/dev/null

# 3. Delete expired sessions
echo ""
echo "3. Cleaning up expired sessions..."
mysql -u root -p kartika -e "DELETE FROM Sessions WHERE expires <= NOW();" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Expired sessions cleaned successfully"
else
    echo "❌ Failed to clean expired sessions"
fi

# 4. Count remaining sessions
echo ""
echo "4. Remaining active sessions:"
ACTIVE_COUNT=$(mysql -u root -p kartika -N -e "SELECT COUNT(*) FROM Sessions WHERE expires > NOW();" 2>/dev/null)
echo "Active sessions: $ACTIVE_COUNT"

# 5. Show session table size
echo ""
echo "5. Sessions table size:"
mysql -u root -p kartika -e "SELECT 
    COUNT(*) as total_sessions,
    ROUND(SUM(LENGTH(data))/1024, 2) as data_size_kb,
    MIN(createdAt) as oldest_session,
    MAX(createdAt) as newest_session
FROM Sessions;" 2>/dev/null

echo ""
echo "=== SESSION CLEANUP COMPLETED ==="
echo "Summary: Removed $EXPIRED_COUNT expired sessions, $ACTIVE_COUNT sessions remain active"

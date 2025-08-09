# Timeout Test Guide

## Test Scenario: 30-second timeout form

### Step 1: Create a timeout form
```bash
curl -X POST "http://localhost:3000/api/webhooks/test" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Test timeout form",
    "timeout": 30,
    "title": "Timeout Test"
  }'
```

### Step 2: Check browser console
Look for these logs:
- `Form [id] timeout check: {...}` - Shows timeout calculation
- `Form [id]: Still valid, remaining time: Xs` - Shows remaining time
- `Timer expired for form: [id]` - When timer reaches 0
- `Form [id] timed out, marking as inactive` - When form is marked inactive

### Step 3: Test page refresh
1. Wait 10 seconds
2. Refresh page
3. Check that form shows with 20 seconds remaining (not 30)

### Step 4: Test expiration
1. Wait for timer to reach 0
2. Check that form disappears
3. Refresh page
4. Check that form doesn't show up again

### Step 5: Check database
```sql
-- Check if form is marked as inactive
SELECT id, data->>'is_active' as is_active, data->>'timeout' as timeout 
FROM "ProcessProgress" 
WHERE event_name = 'verification_code' 
ORDER BY created_at DESC 
LIMIT 1;
```

## Expected Results:
- ✅ Form shows with correct remaining time after refresh
- ✅ Form disappears when timer reaches 0
- ✅ Form doesn't show up again after expiration
- ✅ Database shows `is_active: false` and `timeout: 0` 
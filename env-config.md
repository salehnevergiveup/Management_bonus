# Environment Configuration

## SMS Configuration

Add these variables to your `.env.local` file:

```env
# SMS Configuration
SMS_USER="loyaltyuser"
SMS_PASSWORD="Aa999999#"
SMS_FROM="66886"
SMS_URL="https://anchor-sms.com:8443/mt/sendMtSmsNoToken"
SMS_DATA_CODING="0"

# Test Mode (set to 'true' to simulate SMS sending without real API calls)
SMS_TEST_MODE="false"
```

## Configuration Details

- **SMS_USER**: `loyaltyuser` - Username for SMS API
- **SMS_PASSWORD**: `Aa999999#` - Password (will be URL-encoded automatically, # becomes %23)
- **SMS_FROM**: `66886` - 5-digit sender code
- **SMS_URL**: `https://anchor-sms.com:8443/mt/sendMtSmsNoToken` - SMS provider endpoint
- **SMS_DATA_CODING**: `0` - Data coding for SMS (0 = GSM 7-bit)
- **SMS_TEST_MODE**: `false` - Set to `true` to simulate SMS sending (no real API calls)

## HTTP Method

The SMS provider only accepts **GET** method. POST method returns 405 (Method Not Allowed).

## URL Encoding

The service automatically handles URL encoding exactly like Java's URLEncoder:
- `#` becomes `%23` (critical for password)
- Spaces become `%20` (not `+` like URLSearchParams)
- Special characters are properly encoded
- Phone numbers are sent without `+` prefix (e.g., `60123456789` not `+60123456789`)
- Manual query string building to match Java format exactly

## Testing

You can test the SMS service by calling the endpoints:
- `/api/external-app/sms/rewardreach`
- `/api/external-app/sms/unclaim`

### Test JSON for `/api/external-app/sms/unclaim`:
```json
[
  {
    "phone_number": "1121615114",
    "UID": "123456",
    "unclaimAmount": "1000",
    "bonus_type": "Extra"
  },
  {
    "phone_number": "+60111222333",
    "UID": "789012",
    "unclaimAmount": "500",
    "bonus_type": "Special"
  }
]
```

### Test JSON for `/api/external-app/sms/rewardreach`:
```json
[
  {
    "phone_number": "1121615114",
    "UID": "123456",
    "bonus_amount": "1000",
    "bonus_type": "Extra"
  },
  {
    "phone_number": "+60111222333",
    "UID": "789012",
    "bonus_amount": "500",
    "bonus_type": "Special"
  }
]
```

### Headers Required:
```
Content-Type: application/json
X-API-Key: 755cce01db3174946ebb43ad28051b49404cb0d6d48d919eb31ce3a9626cdefa
```

The service will log detailed progress and continue processing even if individual SMS fail.

## Test Mode

To test the SMS functionality without making real API calls, set `SMS_TEST_MODE=true` in your environment variables. This will:

- ✅ Simulate SMS sending without real API calls
- ✅ Log all messages that would be sent
- ✅ Return success responses for testing
- ✅ Allow you to test phone number validation and message formatting

**Example test mode output:**
```
[SMS] 🧪 TEST MODE: Simulating SMS to +601121615114
[SMS] 🧪 Message: Dear 123456, Claim WINBOX Extra B0nus credit now! Balance: 1000 bonus_type: Extra Claim: Extrabonus88.com
[SMS] 🧪 TEST MODE: Successfully simulated SMS to +601121615114
``` 
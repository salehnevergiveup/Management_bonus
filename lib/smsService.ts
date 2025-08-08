// SMS Configuration from environment variables
const SMS_CONFIG = {
  user: process.env.SMS_USER,
  password: process.env.SMS_PASSWORD,
  from: process.env.SMS_FROM,
  url: process.env.SMS_URL,
  dataCoding: process.env.SMS_DATA_CODING || '0'
};

// Validate required environment variables
function validateConfig() {
  const required = ['SMS_USER', 'SMS_PASSWORD', 'SMS_FROM', 'SMS_URL'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required SMS environment variables: ${missing.join(', ')}`);
  }
}

// URL encoding helper to match Java's URLEncoder exactly
function urlEncode(str: string): string {
  // First do standard URL encoding
  let encoded = encodeURIComponent(str);
  // Then replace + with %20 to match Java URLEncoder behavior for spaces
  return encoded.replace(/\+/g, '%20');
}

// SMS Service Class
export class SmsService {
  private static instance: SmsService;

  private constructor() {
    // Initialize SMS service
  }

  public static getInstance(): SmsService {
    if (!SmsService.instance) {
      SmsService.instance = new SmsService();
    }
    return SmsService.instance;
  }

  /**
   * Send SMS using the configured SMS provider
   */
  async sendSms(phone: string, message: string): Promise<boolean> {
    try {
      // Check if we're in test mode
      const isTestMode = process.env.SMS_TEST_MODE === 'true';
      
      if (isTestMode) {
        console.log(`[SMS] 🧪 TEST MODE: Simulating SMS to ${phone}`);
        console.log(`[SMS] 🧪 Message: ${message}`);
        
        // Simulate success in test mode
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to simulate API call
        return true;
      }

      // Validate configuration
      validateConfig();

      // Format phone number (remove + for SMS API)
      let formattedPhone = phone.replace(/^\+/, '');
      
      // URL encode the password exactly like Java URLEncoder
      const encodedPass = urlEncode(SMS_CONFIG.password!);
      
      // URL encode the message exactly like Java URLEncoder  
      const encodedMessage = urlEncode(message);

      // Build the query string manually to match Java format exactly
      const queryString = `to=${formattedPhone}&user=${SMS_CONFIG.user}&pass=${encodedPass}&text=${encodedMessage}&from=${SMS_CONFIG.from}&dataCoding=${SMS_CONFIG.dataCoding}`;
      
      // Construct full URL
      const fullUrl = `${SMS_CONFIG.url}?${queryString}`;
      


      // Send HTTP request to SMS provider using GET method
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[SMS] ❌ API Error ${response.status}: ${errorText}`);
        throw new Error(`SMS API responded with status: ${response.status}: ${errorText}`);
      }

      const result = await response.text();
      
      // Parse response more robustly
      const success = this.parseSmsResponse(result);
      
      if (success) {
        return true;
      } else {
        console.error(`[SMS] ❌ Failed to send to ${phone}: ${result}`);
        return false;
      }

    } catch (error) {
      console.error(`[SMS] Error sending to ${phone}:`, error);
      return false;
    }
  }

  /**
   * Parse SMS provider response more robustly
   */
  private parseSmsResponse(response: string): boolean {
    // Normalize response for comparison
    const normalizedResponse = response.toLowerCase().trim();
    
    console.log(`[SMS] 🔍 Parsing response: "${response}"`);
    
    // Try to parse as JSON first
    try {
      const jsonResponse = JSON.parse(response);
      console.log(`[SMS] 📋 JSON Response:`, jsonResponse);
      
      // Check for status field in JSON response
      if (jsonResponse.status !== undefined) {
        const status = jsonResponse.status;
        console.log(`[SMS] 📊 Status from response: ${status}`);
        
        // Check if status indicates success (0, 200, 201, "success", "ok")
        if (status === 0 || status === 200 || status === 201 || status === "success" || status === "ok") {
          console.log(`[SMS] ✅ Success based on status: ${status}`);
          return true;
        }
        
        // Check if status indicates error (non-zero, error codes, but not 201)
        if (status !== 0 && status !== 200 && status !== 201 && status !== "success" && status !== "ok") {
          console.log(`[SMS] ❌ Error based on status: ${status}`);
          return false;
        }
      }
      
      // Check for data array with statusCode field (specific to this SMS provider)
      if (jsonResponse.data && Array.isArray(jsonResponse.data) && jsonResponse.data.length > 0) {
        const firstItem = jsonResponse.data[0];
        if (firstItem.statusCode === "001") {
          console.log(`[SMS] ✅ Success based on statusCode: ${firstItem.statusCode}`);
          return true;
        }
        if (firstItem.statusCode && firstItem.statusCode !== "001") {
          console.log(`[SMS] ❌ Error based on statusCode: ${firstItem.statusCode}`);
          return false;
        }
      }
      
      // Check for error field in JSON response
      if (jsonResponse.error) {
        console.log(`[SMS] ❌ Error field found: ${jsonResponse.error}`);
        return false;
      }
      
      // Check for message field that might indicate success
      if (jsonResponse.message && jsonResponse.message.toLowerCase().includes('success')) {
        console.log(`[SMS] ✅ Success based on message: ${jsonResponse.message}`);
        return true;
      }
      
    } catch (e) {
      // Not JSON, continue with text parsing
      console.log(`[SMS] 📝 Response is not JSON, parsing as text`);
    }
    
    // Common success indicators
    const successPatterns = [
      'success',
      'ok',
      '0',
      'sent',
      'delivered',
      'accepted',
      'message sent',
      'sms sent',
      'created',
      'submitted',
      '001'
    ];
    
    // Common error indicators
    const errorPatterns = [
      'error',
      'failed',
      'rejected',
      'invalid',
      'unauthorized',
      'denied',
      'insufficient',
      'balance',
      'credits',
      '903',
      '901',
      '902'
    ];
    
    // Check for success patterns
    const hasSuccess = successPatterns.some(pattern => 
      normalizedResponse.includes(pattern)
    );
    
    // Check for error patterns
    const hasError = errorPatterns.some(pattern => 
      normalizedResponse.includes(pattern)
    );
    
    console.log(`[SMS] 🔍 Success patterns found: ${hasSuccess}`);
    console.log(`[SMS] 🔍 Error patterns found: ${hasError}`);
    
    // If we find both success and error patterns, prioritize error
    if (hasError) {
      console.log(`[SMS] ❌ Error patterns detected in response`);
      return false;
    }
    if (hasSuccess) {
      console.log(`[SMS] ✅ Success patterns detected in response`);
      return true;
    }
    
    // If no clear pattern, log for analysis and assume failure
    console.warn(`[SMS] ⚠️ Unclear response pattern: "${response}"`);
    return false;
  }

  /**
   * Send OTP SMS with expiration
   */
  async sendOtpSms(
    phone: string, 
    otp: string, 
    shortCode: string, 
    expirationDate: Date,
    timezone: string = 'Asia/Kuala_Lumpur'
  ): Promise<boolean> {
    try {
      // Format expiration date to match Java DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
      const formatter = new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: timezone
      });
      
      const parts = formatter.formatToParts(expirationDate);
      const formatDatetime = `${parts.find(p => p.type === 'year')?.value}-${parts.find(p => p.type === 'month')?.value}-${parts.find(p => p.type === 'day')?.value} ${parts.find(p => p.type === 'hour')?.value}:${parts.find(p => p.type === 'minute')?.value}:${parts.find(p => p.type === 'second')?.value}`;
      
      // Create message exactly like Java String.format
      const message = `Your OTP is ${otp}, [${shortCode}], expired at ${formatDatetime}`;
      
      return await this.sendSms(phone, message);
    } catch (error) {
      console.error(`[SMS] Error sending OTP to ${phone}:`, error);
      return false;
    }
  }

  /**
   * Send bulk SMS with retry logic and configurable delay
   */
  async sendBulkSms(
    records: Array<{phone: string, message: string}>,
    options: {
      retryAttempts?: number;
      retryDelay?: number;
      batchDelay?: number;
    } = {}
  ): Promise<{
    total: number;
    success: number;
    failed: number;
    errors: string[];
  }> {
    const {
      retryAttempts = 3,
      retryDelay = 1000,
      batchDelay = 100
    } = options;

    const results = {
      total: records.length,
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    console.log(`[SMS] Starting bulk send for ${records.length} records`);

    for (const record of records) {
      let success = false;
      let lastError = '';

      // Retry logic
      for (let attempt = 1; attempt <= retryAttempts; attempt++) {
        try {
          success = await this.sendSms(record.phone, record.message);
          if (success) {
            results.success++;
            break; // Success, no need to retry
          } else {
            lastError = `Failed to send to ${record.phone}`;
          }
        } catch (error) {
          lastError = `Error sending to ${record.phone}: ${error}`;
          
          // If it's the last attempt, don't wait
          if (attempt < retryAttempts) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
      }

      if (!success) {
        results.failed++;
        results.errors.push(lastError);
      }

      // Add delay between batches to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, batchDelay));
    }

    console.log(`[SMS] Bulk send completed: ${results.success}/${results.total} successful`);
    return results;
  }

  /**
   * Validate and format Malaysian phone number
   */
  validatePhoneNumber(phone: string): string {
    if (!phone || typeof phone !== 'string') {
      throw new Error('Invalid phone number: must be a non-empty string');
    }
    
    let formattedPhone = phone.trim();
    
    // Remove any non-digit characters except +
    formattedPhone = formattedPhone.replace(/[^\d+]/g, '');
    
    // Handle international format with +
    if (formattedPhone.startsWith('+')) {
      formattedPhone = formattedPhone.substring(1);
    }
    
    // Remove leading zeros
    formattedPhone = formattedPhone.replace(/^0+/, '');
    
    // Ensure Malaysian format (60 prefix)
    if (!formattedPhone.startsWith('60')) {
      formattedPhone = `60${formattedPhone}`;
    }
    
    // Validate Malaysian mobile number format
    // Malaysian mobile numbers: 60 + 1-2 digits + 7-8 digits = 11-13 digits total
    // Examples: 60123456789 (11 digits), 601121615114 (12 digits)
    if (formattedPhone.length < 11 || formattedPhone.length > 13) {
      throw new Error(`Invalid Malaysian phone number length: ${formattedPhone.length} digits. Expected 11-13 digits`);
    }
    
    // Validate it's all digits
    if (!/^\d+$/.test(formattedPhone)) {
      throw new Error('Invalid phone number: contains non-digit characters');
    }
    
    // Validate Malaysian mobile prefix (should start with 601, 602, 603, etc.)
    if (!formattedPhone.match(/^60[1-9]/)) {
      throw new Error('Invalid Malaysian mobile number format. Should start with 60 followed by 1-9');
    }
    
    // Return without + prefix for SMS API (as per your analysis)
    return formattedPhone;
  }

  /**
   * Get SMS configuration (for debugging)
   */
  getConfig() {
    return {
      user: SMS_CONFIG.user,
      from: SMS_CONFIG.from,
      url: SMS_CONFIG.url,
      dataCoding: SMS_CONFIG.dataCoding,
      // Don't return password for security
    };
  }
}

// Export singleton instance
export const smsService = SmsService.getInstance(); 
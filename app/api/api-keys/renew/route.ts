import { NextResponse } from 'next/server';
import { verifyRenew, renewApiKey } from '@/lib/apikeysHandling';

export async function POST(request: Request) {
  try {
    const keyVerification = await verifyRenew(request, "refresh-api-key");
    
    if (!keyVerification.valid) {
      return NextResponse.json(
        { error: keyVerification.error },
        { status: keyVerification.status }
      );
    }
    
    if (keyVerification.application !== "automation") {
      return NextResponse.json(
        { error: "Only the automation application can renew API keys" },
        { status: 403 }
      );
    }
    
    if (!keyVerification.keyId) {
      return NextResponse.json(
        { error: "Invalid API key ID" },
        { status: 400 }
      );
    }
    
    const result = await renewApiKey(keyVerification.keyId);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    if(!result.expires_at) {  
        return NextResponse.json(
            { error: result },
            { status: 400 }
          );
    }
    
    return NextResponse.json({
      success: true,
      api_key: result.token,
      expires: result.expires_at,
      application: result.application
    }, {
      status: 200,
      headers: {
        'X-API-Key': result.token,
        'X-Expires': result.expires_at.toISOString()
      }
    });
    
  } catch (error) {
    console.error("Error in API key renewal:", error);
    return NextResponse.json(
      { error: "Failed to process API key renewal" },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { processMessage, extractPlaceholders } from '@/lib/messageProcessor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { template, data } = body;

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template is required' },
        { status: 400 }
      );
    }

    // Extract placeholders
    const placeholders = extractPlaceholders(template);
    
    // Process message
    const processedMessage = processMessage(template, data || {});

    return NextResponse.json({
      success: true,
      data: {
        template,
        data: data || {},
        placeholders,
        processedMessage
      }
    });

  } catch (error) {
    console.error('[TEST] Message processing error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process message' },
      { status: 500 }
    );
  }
} 
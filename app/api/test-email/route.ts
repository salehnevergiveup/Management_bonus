// app/api/test-email/route.ts
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function GET(request: Request) {
  // Get the email address from query parameter
  const { searchParams } = new URL(request.url);
  const to = searchParams.get('to') || 'your-email@example.com';
  
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST,
      port: Number(process.env.EMAIL_SERVER_PORT),
      secure: true, // For port 465
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    });
    
    // Send a test email
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: to,
      subject: 'Test Email from Your Application',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Test Email</h2>
          <p>This is a test email to verify that your email configuration is working correctly.</p>
          <p>The current time is: ${new Date().toLocaleString()}</p>
        </div>
      `,
    });
    
    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      message: `Email sent to ${to}`,
    });
  } catch (error: any) {
    console.error('Email test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextFetchEvent, NextRequest } from 'next/server';
import { CustomMiddleware } from './chain';

export function withGuestMiddleware(middleware: CustomMiddleware): CustomMiddleware {
  return async (
    request: NextRequest, 
    event: NextFetchEvent, 
    response: NextResponse
  ) => {
    const { pathname } = request.nextUrl;
    
    const guestRoutes = ["/login", "/"];
    
    const isGuestRoute = guestRoutes.some(route => 
      pathname === route
    );
    
    if (!isGuestRoute) {
      return middleware(request, event, response);
    }
    
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    if (token && isGuestRoute) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    
    return middleware(request, event, response);
  };
}
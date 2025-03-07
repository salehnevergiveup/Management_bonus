import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextFetchEvent, NextRequest } from 'next/server';
import { CustomMiddleware } from './chain';

export function withAuthMiddleware(middleware: CustomMiddleware): CustomMiddleware {
  return async (
    request: NextRequest, 
    event: NextFetchEvent, 
    response: NextResponse
  ) => {
    const { pathname } = request.nextUrl;
    
    const protectedRoutes = ["/dashboard", "/users", "/notifications"];
    
    const isProtectedRoute = protectedRoutes.some(route => 
      pathname.startsWith(route)
    );
    
    if (!isProtectedRoute) {
      return middleware(request, event, response);
    }
    
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    if (!token && isProtectedRoute) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    return middleware(request, event, response);
  };
}
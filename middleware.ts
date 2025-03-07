// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextFetchEvent, NextRequest } from 'next/server';
import { chain } from '@/middlewares/chain';
import { withAuthMiddleware } from '@/middlewares/auth';
import { withGuestMiddleware } from '@/middlewares/guest';

function baseMiddleware(
  request: NextRequest,
  event: NextFetchEvent,
  response: NextResponse = NextResponse.next()
) {
  return response;
}

export default async function middleware(
  request: NextRequest,
  event: NextFetchEvent
) {
  const response = NextResponse.next();

  const handler = chain([
    withGuestMiddleware,
    withAuthMiddleware
  ]);
  
  return handler(request, event, response);
}

export const config = {
  matcher: [
    "/dashboard", 
    "/users", 
    "/notifications",
    "/login",
    "/"
  ]
};
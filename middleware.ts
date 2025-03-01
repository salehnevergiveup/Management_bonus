import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(request) {
    const { token } = request.nextauth;
    //if user not auth redirect to the login
    if (request.nextUrl.pathname.startsWith("/dashboard")) {
      if (!token) {
        return NextResponse.redirect(new URL("/login", request.url));
      }
    }
    
    //if the user is auth and want to access public route redirect to the dashboard 
    if (
      (request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/") &&
      token
    ) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  },
  {
    callbacks: {
      authorized: () => true,
    },
  }
);

export const config = {

  matcher: ["/dashboard/:path*", "/login", "/"], 
};
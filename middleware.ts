import { NextResponse, type NextRequest } from "next/server";
import NextAuth from 'next-auth';
import { authConfig } from '@/app/(auth)/auth.config';

const corsOptions: {
  allowedMethods: string[];
  allowedOrigins: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  maxAge?: number;
  credentials: boolean;
} = {
  allowedMethods: (process.env?.ALLOWED_METHODS || "").split(","),
  allowedOrigins: (process.env?.ALLOWED_ORIGIN || "").split(","),
  allowedHeaders: (process.env?.ALLOWED_HEADERS || "").split(","),
  exposedHeaders: (process.env?.EXPOSED_HEADERS || "").split(","),
  maxAge:
    (process.env?.PREFLIGHT_MAX_AGE &&
      parseInt(process.env?.PREFLIGHT_MAX_AGE)) ||
    undefined, // 60 * 60 * 24 * 30, // 30 days
  credentials: process.env?.CREDENTIALS == "true",
};

/**
 * Middleware function that handles CORS configuration for API routes.
 *
 * This middleware function is responsible for setting the appropriate CORS headers
 * on the response, based on the configured CORS options. It checks the origin of
 * the request and sets the `Access-Control-Allow-Origin` header accordingly. It
 * also sets the other CORS-related headers, such as `Access-Control-Allow-Credentials`,
 * `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`, and
 * `Access-Control-Expose-Headers`.
 *
 * The middleware function is configured to be applied to all API routes, as defined
 * by the `config` object at the end of the file.
 */
// Create an auth middleware instance
const auth = NextAuth(authConfig).auth;

export async function middleware(request: NextRequest) {
  // Skip auth for /api/authenticate
  if (!request.nextUrl.pathname.startsWith('/api/authenticate')) {
    const authResult = await auth(request);
    if (authResult) {
      return authResult;
    }
  }

  // Continue with your existing CORS logic
  const response = NextResponse.next();
  
  // Your existing CORS headers setup...
  const origin = request.headers.get("origin") ?? "";
  // ... rest of your CORS logic

  return response;
}

// Update matcher to exclude /api/authenticate from auth but keep CORS
export const config = {
  matcher: [
    '/',
    '/login',
    '/register',
    '/api/((?!authenticate).*)' // This matches all API routes EXCEPT /api/authenticate
  ]
};
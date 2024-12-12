import { NextResponse, type NextRequest } from "next/server";
import NextAuth from 'next-auth';
import { authConfig } from '@/app/(auth)/auth.config';

const auth = NextAuth(authConfig).auth;

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
async function corsMiddleware(request: NextRequest, response: NextResponse) {
  const origin = request.headers.get("origin") ?? "";
  if (
    corsOptions.allowedOrigins.includes("*") ||
    corsOptions.allowedOrigins.includes(origin)
  ) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  }

  response.headers.set(
    "Access-Control-Allow-Credentials",
    corsOptions.credentials.toString()
  );
  response.headers.set(
    "Access-Control-Allow-Methods",
    corsOptions.allowedMethods.join(",")
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    corsOptions.allowedHeaders.join(",")
  );
  response.headers.set(
    "Access-Control-Expose-Headers",
    corsOptions.exposedHeaders.join(",")
  );
  response.headers.set(
    "Access-Control-Max-Age",
    corsOptions.maxAge?.toString() ?? ""
  );

  return response;
}

export async function middleware(request: NextRequest) {
  // Handle auth
  const authResponse = await auth(request);
  
  // If auth generated a response, add CORS headers to it
  if (authResponse) {
    return corsMiddleware(request, authResponse);
  }
  
  // Otherwise, continue with normal response and add CORS headers
  const response = NextResponse.next();
  return corsMiddleware(request, response);
}

export const config = {
  matcher: ['/', '/api/:path*', '/login', '/register'],
};
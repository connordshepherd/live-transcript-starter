// middleware.ts
import NextAuth from 'next-auth';
import { NextResponse, type NextRequest } from "next/server";
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
    undefined,
  credentials: process.env?.CREDENTIALS == "true",
};

// Create the auth middleware
const authMiddleware = NextAuth(authConfig).auth;

// Export the auth middleware directly
export default authMiddleware;

// Add CORS headers to the response
export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

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

export const config = {
  matcher: [
    '/api/authenticate',
    '/', 
    '/login',
    '/register',
    '/api/:path*',
    '/live-call',
  ]
};
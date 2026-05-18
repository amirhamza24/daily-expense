import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { db } from "@/lib/db";

if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET environment variable is missing in production!");
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ||
    "development-secret-key-please-change-in-production",
);

async function decrypt(input: string) {
  try {
    const { payload } = await jwtVerify(input, JWT_SECRET, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch (e) {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const sessionToken = request.cookies.get("session")?.value;

  // Define public and private path groups
  const isPublicPath = path === "/login" || path === "/register";
  const isPrivatePath =
    path === "/" ||
    path.startsWith("/dashboard") ||
    path.startsWith("/expenses") ||
    path.startsWith("/analytics") ||
    path.startsWith("/profile") ||
    path.startsWith("/settings");
  const isAdminPath = path.startsWith("/admin");

  // Verify JWT signature and database status
  let decryptedSession: any = null;
  if (sessionToken) {
    const decrypted = await decrypt(sessionToken);
    if (decrypted && decrypted.userId) {
      try {
        const user = await db.user.findUnique({
          where: { id: decrypted.userId as string },
          select: { id: true, status: true },
        });
        if (user && user.status === "APPROVED") {
          decryptedSession = decrypted;
        }
      } catch (error) {
        console.error("Proxy session verification failed:", error);
      }
    }
  }

  // 1. Unauthenticated users trying to access private pages
  if (isPrivatePath && !decryptedSession) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Authenticated users trying to access login/register
  if (isPublicPath && decryptedSession) {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // 3. Admin path check: If unauthenticated, redirect.
  // Real-time role check is performed at the Server Component level,
  // but we can also block immediately if there is no session.
  if (isAdminPath && !decryptedSession) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect root path to dashboard
  if (path === "/" && decryptedSession) {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/register",
    "/dashboard/:path*",
    "/expenses/:path*",
    "/analytics/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/admin/:path*",
  ],
};

export { default } from "next-auth/middleware";

export const config = {
  // Protect all routes except /login, /api, and Next.js static files
  matcher: ["/((?!login|api|_next/static|_next/image|favicon.ico).*)"],
};

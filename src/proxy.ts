import { auth } from "@/auth";

// Optimistic check: send logged-out visitors to the login page before the app
// renders. The (app) layout re-checks the session on every request.
export default auth((request) => {
  if (!request.auth) {
    return Response.redirect(new URL("/login", request.nextUrl));
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/clients/:path*", "/invoices/:path*"],
};

import { NextResponse } from 'next/server';

// Logs every page/API request as a JSON line so tools tailing stdout
// (e.g. logzilla) can pick them up. Static assets are excluded.
export function middleware(req) {
  console.log(
    JSON.stringify({
      level: 'info',
      message: `${req.method} ${req.nextUrl.pathname}`,
      method: req.method,
      path: req.nextUrl.pathname,
      referer: req.headers.get('referer') || undefined,
      ua: req.headers.get('user-agent') || undefined,
    }),
  );
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images|fonts).*)'],
};

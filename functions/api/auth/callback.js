
import { clientId, hasConfig, getCookie, clearCookie, setCookie, seal } from "./_auth.js";

function redirect(url, cookies=[]) {
  const h = new Headers({"Location":url,"cache-control":"no-store"});
  for (const c of cookies) h.append("Set-Cookie",c);
  return new Response(null,{status:302,headers:h});
}
export async function onRequestGet({request, env}) {
  const u = new URL(request.url);
  const origin = u.origin;
  if (!hasConfig(env)) return redirect(origin + "/?google=not_configured");
  const error = u.searchParams.get("error");
  if (error) return redirect(origin + "/?google=error&reason=" + encodeURIComponent(error), [clearCookie("fc_state")]);
  const state = u.searchParams.get("state") || "";
  const cookieState = getCookie(request,"fc_state");
  if (!state || !cookieState || state !== cookieState) return redirect(origin + "/?google=state_error", [clearCookie("fc_state")]);
  const code = u.searchParams.get("code");
  if (!code) return redirect(origin + "/?google=no_code", [clearCookie("fc_state")]);

  const redirectUri = origin + "/api/auth/callback";
  const body = new URLSearchParams({
    code,
    client_id: clientId(env),
    client_secret: env.GOOGLE_CLIENT_SECRET,
    redirect_uri: redirectUri,
    grant_type: "authorization_code"
  });
  const res = await fetch("https://oauth2.googleapis.com/token",{
    method:"POST",
    headers:{"content-type":"application/x-www-form-urlencoded"},
    body
  });
  const data = await res.json();
  if (!res.ok || !data.refresh_token) {
    const code = encodeURIComponent((data && data.error) || "unknown_error");
    return redirect(origin + "/?google=token_error&reason=" + code, [clearCookie("fc_state")]);
  }
  const sealed = await seal(data.refresh_token, env.GOOGLE_CLIENT_SECRET);
  return redirect(origin + "/?google=connected",[
    clearCookie("fc_state"),
    setCookie("fc_rt",sealed,15552000)
  ]);
}

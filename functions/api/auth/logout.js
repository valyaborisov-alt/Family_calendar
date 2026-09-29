
import { getRefreshToken, clearCookie, json } from "./_auth.js";
export async function onRequestPost({request, env}) {
  const refresh = await getRefreshToken(request,env);
  if (refresh) {
    try { await fetch("https://oauth2.googleapis.com/revoke?token="+encodeURIComponent(refresh),{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"}}); } catch {}
  }
  return json({ok:true},200,{"Set-Cookie":clearCookie("fc_rt")});
}

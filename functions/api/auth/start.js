
import { clientId, hasConfig, json, setCookie } from "./_auth.js";

function rand() {
  const b = crypto.getRandomValues(new Uint8Array(24));
  let s=""; for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
export async function onRequestGet({request, env}) {
  if (!hasConfig(env)) return json({error:"Google OAuth backend is not configured"},500);
  const origin = new URL(request.url).origin;
  const redirect = origin + "/api/auth/callback";
  const state = rand();
  const q = new URLSearchParams({
    client_id: clientId(env),
    redirect_uri: redirect,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar.events",
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
    state
  });
  return new Response(null,{status:302,headers:{
    "Location":"https://accounts.google.com/o/oauth2/v2/auth?"+q.toString(),
    "Set-Cookie":setCookie("fc_state",state,600)
  }});
}

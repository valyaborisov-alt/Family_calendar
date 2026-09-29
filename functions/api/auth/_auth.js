
const DEFAULT_CLIENT_ID = "7594138844-8nbveq6j7v7s4a88e0ikcp5tcgc2oi0u.apps.googleusercontent.com";
const DEFAULT_CALENDAR_ID = "family03679972265710734318@group.calendar.google.com";

export function clientId(env) {
  return env.GOOGLE_CLIENT_ID || DEFAULT_CLIENT_ID;
}
export function calendarId(env) {
  return env.GOOGLE_CALENDAR_ID || DEFAULT_CALENDAR_ID;
}
export function hasConfig(env) {
  return Boolean(clientId(env) && env.GOOGLE_CLIENT_SECRET);
}
export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: Object.assign({"content-type":"application/json; charset=utf-8","cache-control":"no-store"}, headers)
  });
}
export function getCookie(request, name) {
  const raw = request.headers.get("Cookie") || "";
  for (const part of raw.split(";")) {
    const p = part.trim();
    if (p.startsWith(name + "=")) return decodeURIComponent(p.slice(name.length + 1));
  }
  return "";
}
export function setCookie(name, value, maxAge, extra = "") {
  return name + "=" + encodeURIComponent(value) + "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=" + maxAge + (extra ? "; " + extra : "");
}
export function clearCookie(name) {
  return name + "=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
}
function bytesToB64Url(bytes) {
  let s = "";
  for (let i=0;i<bytes.length;i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function b64UrlToBytes(s) {
  s = s.replace(/-/g,"+").replace(/_/g,"/");
  while (s.length % 4) s += "=";
  const raw = atob(s);
  const out = new Uint8Array(raw.length);
  for (let i=0;i<raw.length;i++) out[i] = raw.charCodeAt(i);
  return out;
}
async function cryptoKey(secret) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, {name:"AES-GCM"}, false, ["encrypt","decrypt"]);
}
export async function seal(text, secret) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await cryptoKey(secret);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv}, key, new TextEncoder().encode(text)));
  const all = new Uint8Array(iv.length + encrypted.length);
  all.set(iv,0); all.set(encrypted,iv.length);
  return bytesToB64Url(all);
}
export async function unseal(value, secret) {
  try {
    const all = b64UrlToBytes(value);
    const iv = all.slice(0,12), body = all.slice(12);
    const key = await cryptoKey(secret);
    const plain = await crypto.subtle.decrypt({name:"AES-GCM",iv}, key, body);
    return new TextDecoder().decode(plain);
  } catch {
    return "";
  }
}
export async function getRefreshToken(request, env) {
  if (!env.GOOGLE_CLIENT_SECRET) return "";
  const sealed = getCookie(request, "fc_rt");
  return sealed ? await unseal(sealed, env.GOOGLE_CLIENT_SECRET) : "";
}
export async function getAccessToken(request, env) {
  if (!hasConfig(env)) return {error:"not_configured"};
  const refresh = await getRefreshToken(request, env);
  if (!refresh) return {error:"not_connected"};
  const body = new URLSearchParams({
    client_id: clientId(env),
    client_secret: env.GOOGLE_CLIENT_SECRET,
    refresh_token: refresh,
    grant_type: "refresh_token"
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method:"POST",
    headers:{"content-type":"application/x-www-form-urlencoded"},
    body
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) return {error:"refresh_failed", detail:data};
  return {token:data.access_token};
}
export async function googleApi(request, env, url, options = {}) {
  const auth = await getAccessToken(request, env);
  if (!auth.token) return {response: json({error:auth.error, detail:auth.detail || null}, auth.error==="not_configured"?500:401)};
  const headers = new Headers(options.headers || {});
  headers.set("Authorization","Bearer " + auth.token);
  const res = await fetch(url, Object.assign({}, options, {headers}));
  return {res};
}

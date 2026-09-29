
import { calendarId, googleApi, json } from "./auth/_auth.js";

export async function onRequestGet({request, env}) {
  const u = new URL(request.url);
  const timeMin = u.searchParams.get("timeMin");
  const timeMax = u.searchParams.get("timeMax");
  if (!timeMin || !timeMax) return json({error:"timeMin and timeMax are required"},400);
  const q = new URLSearchParams({singleEvents:"true",orderBy:"startTime",timeMin,timeMax,maxResults:"2500"});
  const url = "https://www.googleapis.com/calendar/v3/calendars/"+encodeURIComponent(calendarId(env))+"/events?"+q.toString();
  const g = await googleApi(request,env,url);
  if (g.response) return g.response;
  const text = await g.res.text();
  return new Response(text,{status:g.res.status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
}

export async function onRequestPost({request, env}) {
  const body = await request.text();
  const url = "https://www.googleapis.com/calendar/v3/calendars/"+encodeURIComponent(calendarId(env))+"/events";
  const g = await googleApi(request,env,url,{method:"POST",headers:{"content-type":"application/json"},body});
  if (g.response) return g.response;
  const text = await g.res.text();
  return new Response(text,{status:g.res.status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
}

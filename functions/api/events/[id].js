
import { calendarId, googleApi } from "../auth/_auth.js";

export async function onRequestPatch({request, env, params}) {
  const body = await request.text();
  const url = "https://www.googleapis.com/calendar/v3/calendars/"+encodeURIComponent(calendarId(env))+"/events/"+encodeURIComponent(params.id);
  const g = await googleApi(request,env,url,{method:"PATCH",headers:{"content-type":"application/json"},body});
  if (g.response) return g.response;
  const text = await g.res.text();
  return new Response(text,{status:g.res.status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
}
export async function onRequestDelete({request, env, params}) {
  const url = "https://www.googleapis.com/calendar/v3/calendars/"+encodeURIComponent(calendarId(env))+"/events/"+encodeURIComponent(params.id);
  const g = await googleApi(request,env,url,{method:"DELETE"});
  if (g.response) return g.response;
  return new Response(null,{status:g.res.status,headers:{"cache-control":"no-store"}});
}

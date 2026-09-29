
import { hasConfig, getAccessToken, json } from "./_auth.js";
export async function onRequestGet({request, env}) {
  if (!hasConfig(env)) return json({configured:false,connected:false});
  const auth = await getAccessToken(request,env);
  return json({configured:true,connected:Boolean(auth.token)});
}

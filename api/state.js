import {authenticated,sameOrigin,respond,readState,saveState} from '../lib/server.js';
export default async function handler(req,res){
 if(!authenticated(req))return respond(res,401,{error:'Inicia sesión para acceder a Casa C&J'});
 try{
  if(req.method==='GET')return respond(res,200,await readState());
  if(req.method!=='POST')return respond(res,405,{error:'Método no permitido'});
  if(!sameOrigin(req))return respond(res,403,{error:'Origen no permitido'});
  const data=req.body||{};
  if(JSON.stringify(data).length>1500000)return respond(res,413,{error:'Demasiados datos'});
  return respond(res,200,await saveState(data.state,data.expectedRevision));
 }catch(e){return respond(res,500,{error:e.message||'No se pudo acceder a Google Sheets'})}
}

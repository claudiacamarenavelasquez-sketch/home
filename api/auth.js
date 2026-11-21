import {authenticated,configured,cookieForSession,expiredCookie,verifyPassword,sameOrigin,respond} from '../lib/server.js';
export default async function handler(req,res){
 if(req.method==='GET')return respond(res,200,{authenticated:authenticated(req),configured:configured()});
 if(req.method!=='POST')return respond(res,405,{error:'Método no permitido'});
 if(!sameOrigin(req))return respond(res,403,{error:'Origen no permitido'});
 if(!configured())return respond(res,503,{error:'Falta configurar el servidor en Vercel'});
 if(req.body?.logout){res.setHeader('Set-Cookie',expiredCookie());return respond(res,200,{authenticated:false})}
 if(!verifyPassword(req.body?.password))return respond(res,401,{error:'Contraseña incorrecta'});
 res.setHeader('Set-Cookie',cookieForSession());
 return respond(res,200,{authenticated:true});
}

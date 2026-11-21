import {OAuth2Client} from 'google-auth-library';
import {allowed,sign,session,cookie} from '../lib/session.js';
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  const clientId=process.env.GOOGLE_CLIENT_ID;
  if(!clientId||(process.env.SESSION_SECRET||'').length<32||!process.env.ALLOWED_EMAILS)return res.status(503).json({error:'Falta configurar el acceso en Vercel'});
  if(req.method==='GET')return res.status(200).json({clientId,user:session(req)});
  if(req.method==='DELETE'){res.setHeader('Set-Cookie',cookie('',0));return res.status(200).json({ok:true});}
  if(req.method!=='POST')return res.status(405).json({error:'Método no permitido'});
  try{
    const credential=req.body?.credential;
    if(typeof credential!=='string'||credential.length>10000)return res.status(400).json({error:'Credencial inválida'});
    const ticket=await new OAuth2Client(clientId).verifyIdToken({idToken:credential,audience:clientId});
    const p=ticket.getPayload();
    if(!p?.email_verified||!allowed(p.email))return res.status(403).json({error:'Esta cuenta no tiene acceso a Casa C&J'});
    const email=p.email.toLowerCase();
    res.setHeader('Set-Cookie',cookie(sign(email),28800));
    return res.status(200).json({user:{email}});
  }catch{return res.status(401).json({error:'No se pudo verificar tu acceso con Google'});}
}

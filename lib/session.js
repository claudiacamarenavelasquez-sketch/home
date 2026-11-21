import {createHmac,timingSafeEqual} from 'node:crypto';
const key=()=>process.env.SESSION_SECRET||'';
export function allowed(email){return (process.env.ALLOWED_EMAILS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean).includes(String(email||'').toLowerCase());}
export function sign(email){const payload=Buffer.from(JSON.stringify({email,exp:Date.now()+8*3600000})).toString('base64url');return payload+'.'+createHmac('sha256',key()).update(payload).digest('base64url');}
export function session(req){try{if(key().length<32)return null;const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('casa_session='))?.slice(13);const [p,s]=String(token||'').split('.');const sig=createHmac('sha256',key()).update(p).digest();const given=Buffer.from(s,'base64url');if(given.length!==sig.length||!timingSafeEqual(sig,given))return null;const u=JSON.parse(Buffer.from(p,'base64url').toString());return u.exp>Date.now()&&allowed(u.email)?{email:u.email}:null;}catch{return null;}}
export function cookie(token,age){return 'casa_session='+token+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age='+age;}

import { timingSafeEqual, createHash } from 'node:crypto';

function equal(a,b) {
  const x=createHash('sha256').update(String(a||'')).digest();
  const y=createHash('sha256').update(String(b||'')).digest();
  return timingSafeEqual(x,y);
}
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'Metodo no permitido'});
  const password=process.env.HOUSEHOLD_PASSWORD;
  const url=process.env.APPS_SCRIPT_URL;
  const secret=process.env.APPS_SCRIPT_BRIDGE_SECRET;
  if(!password||password.length<12||!secret||secret.length<32||!url)
    return res.status(503).json({error:'Falta configurar la conexion privada con Apps Script en Vercel'});
  if(!equal(req.headers['x-household-password'],password))
    return res.status(401).json({error:'Contraseña incorrecta'});
  const {method,args}=req.body||{};
  const allowed=['getState','saveState','analyzePurchasePhoto','uploadPurchasePhoto'];
  if(!allowed.includes(method)||!Array.isArray(args))
    return res.status(400).json({error:'Operacion no permitida'});
  if(!/^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]+\/exec$/.test(url))
    return res.status(503).json({error:'URL de Apps Script invalida'});
  try {
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),25000);
    let upstream;
    try {
      upstream=await fetch(url,{
        method:'POST',
        headers:{'Content-Type':'text/plain;charset=utf-8'},
        body:JSON.stringify({secret,method,args}),
        redirect:'follow',
        signal:controller.signal
      });
    } finally {clearTimeout(timeout)}
    const raw=await upstream.text();
    let data;
    try {data=JSON.parse(raw)} catch {
      return res.status(502).json({error:'Apps Script no devolvio JSON. Verifica que el despliegue web sea nuevo y accesible.'});
    }
    if(!upstream.ok||!data.ok)return res.status(502).json({error:data.error||'Error al consultar Google Sheets'});
    return res.status(200).json({result:data.result});
  }catch(err) {
    return res.status(502).json({error:'No se pudo contactar Apps Script: '+(err.name==='AbortError'?'tiempo agotado':'verifica despliegue y permisos')});
  }
}

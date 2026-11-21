// Casa C&J · backend privado para Vercel (Node.js).
// No colocar credenciales ni inventarios personales en GitHub.
import {createHmac, createSign, timingSafeEqual} from 'node:crypto';

export const SCHEMA={
 meds:{sheet:'Botiquín',fields:['id','name','category','ingredient','use','expiry','qty','notes','approx']},
 pets:{sheet:'Gatos',fields:['id','name','emoji','food','weight','notes']},
 petlogs:{sheet:'Salud gatos',fields:['id','pet','type','date','value','notes']},
 tasks:{sheet:'Rutinas',fields:['id','name','category','interval','last','person','notes']},
 events:{sheet:'Historial',fields:['id','date','name','person','notes']},
 shopping:{sheet:'Compras',fields:['id','name','category','bought','qty','notes']},
 purchases:{sheet:'Compras realizadas',fields:['id','date','name','store','qtyGrams','protein100','proteinTotal','price','person','notes','photoUrl']},
 expenses:{sheet:'Gastos',fields:['id','date','category','amount','name','notes']}
};
const SID='house_session',TTL=30*24*60*60;
const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
const sign=v=>createHmac('sha256',process.env.SESSION_SECRET||'').update(v).digest('base64url');
const equal=(a,b)=>{const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&timingSafeEqual(x,y)};
export const configured=()=>Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON&&process.env.GOOGLE_SHEET_ID&&process.env.HOUSEHOLD_PASSWORD&&process.env.SESSION_SECRET);
export function authenticated(req){
 if(!configured())return false;
 const match=(req.headers.cookie||'').match(/(?:^|;\s*)house_session=([^;]+)/);
 if(!match)return false;
 const [payload,sig]=match[1].split('.');
 if(!payload||!sig||!equal(sign(payload),sig))return false;
 try{const v=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));return v.scope==='house'&&v.exp>Date.now()}catch{return false}
}
export function cookieForSession(){
 const payload=enc({scope:'house',exp:Date.now()+TTL*1000});
 return SID+'='+payload+'.'+sign(payload)+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age='+TTL;
}
export const expiredCookie=()=>SID+'=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
export function verifyPassword(value){
 const expected=process.env.HOUSEHOLD_PASSWORD||'';
 return typeof value==='string'&&expected.length>=12&&equal(createHmac('sha256','pwd').update(value).digest('hex'),createHmac('sha256','pwd').update(expected).digest('hex'));
}
export function sameOrigin(req){
 const origin=req.headers.origin;
 if(!origin)return false;
 try{
  const u=new URL(origin),host=req.headers['x-forwarded-host']||req.headers.host;
  return u.protocol==='https:'&&u.host===host;
 }catch{return false}
}
export function respond(res,status,data){res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');return res.status(status).json(data)}
let tokenCache=null;
async function accessToken(){
 if(tokenCache&&Date.now()<tokenCache.exp)return tokenCache.token;
 let account;
 try{account=JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON||'')}catch{throw Error('GOOGLE_SERVICE_ACCOUNT_JSON no es JSON válido')}
 if(!account.client_email||!account.private_key)throw Error('La cuenta de servicio de Google está incompleta');
 const now=Math.floor(Date.now()/1000);
 const header=enc({alg:'RS256',typ:'JWT'});
 const body=enc({iss:account.client_email,scope:'https://www.googleapis.com/auth/spreadsheets',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});
 const unsigned=header+'.'+body;
 const signer=createSign('RSA-SHA256');signer.update(unsigned);signer.end();
 const jwt=unsigned+'.'+signer.sign(account.private_key.replace(/\\n/g,'\n')).toString('base64url');
 const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:jwt})});
 const data=await response.json();
 if(!response.ok||!data.access_token)throw Error('No se pudo autenticar con Google ('+response.status+')');
 tokenCache={token:data.access_token,exp:Date.now()+Math.max(60,data.expires_in-120)*1000};
 return tokenCache.token;
}
async function google(path,{method='GET',body}={}){
 const token=await accessToken();
 const r=await fetch('https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(process.env.GOOGLE_SHEET_ID)+path,{method,headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'});
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw Error('Google Sheets respondió '+r.status+(r.status===403?': comparte el Sheet con la cuenta de servicio':''));
 return data;
}
const a1=sheet=>"'"+sheet.replace(/'/g,"''")+"'";
export async function readState(){
 const names=[...Object.values(SCHEMA).map(c=>a1(c.sheet)+'!A2:K'),"'_Sistema'!B2"];
 const q=new URLSearchParams({valueRenderOption:'UNFORMATTED_VALUE'});
 names.forEach(x=>q.append('ranges',x));
 const data=await google('/values:batchGet?'+q);
 const state={};
 Object.entries(SCHEMA).forEach(([key,c],i)=>{
  const rows=data.valueRanges?.[i]?.values||[];
  state[key]=rows.filter(row=>row[0]!==''&&row[0]!==undefined).map(row=>{
   const obj={};c.fields.forEach((f,j)=>{
    const v=row[j]??'';
    obj[f]=f==='bought'||f==='approx'?v===true||v==='TRUE':f==='interval'?Number(v)||0:String(v);
   });return obj;
  });
 });
 return {state,revision:Number(data.valueRanges?.[names.length-1]?.values?.[0]?.[0])||0};
}
function cell(v){
 if(typeof v==='boolean')return {userEnteredValue:{boolValue:v}};
 if(typeof v==='number'&&Number.isFinite(v))return {userEnteredValue:{numberValue:v}};
 return {userEnteredValue:{stringValue:String(v??'').slice(0,1500)}};
}
export async function saveState(input,expected){
 if(!input||typeof input!=='object')throw Error('Datos inválidos');
 for(const k of Object.keys(SCHEMA)){
  if(!Array.isArray(input[k])||input[k].length>5000)throw Error('Lista inválida: '+k);
  if(input[k].some(row=>!row||typeof row!=='object'||typeof row.id!=='string'||row.id.length>100))throw Error('Registro inválido: '+k);
 }
 const current=await readState();
 if(Number(expected)!==current.revision)return {conflict:true,...current};
 const meta=await google('?fields=sheets(properties(sheetId,title))');
 const ids=Object.fromEntries((meta.sheets||[]).map(s=>[s.properties.title,s.properties.sheetId]));
 const requests=[];
 for(const [k,c] of Object.entries(SCHEMA)){
  const count=Math.max(current.state[k].length,input[k].length);
  if(!count)continue;
  const sheetId=ids[c.sheet];if(sheetId===undefined)throw Error('Falta pestaña '+c.sheet);
  const rows=Array.from({length:count},(_,i)=>({values:c.fields.map(f=>{
   if(i>=input[k].length)return {};
   let v=input[k][i][f]??'';
   if(f==='bought'||f==='approx')v=Boolean(v);
   if(f==='interval')v=Number(v)||0;
   return cell(v);
  })}));
  requests.push({updateCells:{range:{sheetId,startRowIndex:1,endRowIndex:count+1,startColumnIndex:0,endColumnIndex:c.fields.length},rows,fields:'userEnteredValue'}});
 }
 if(ids._Sistema===undefined)throw Error('Falta pestaña _Sistema');
 requests.push({updateCells:{start:{sheetId:ids._Sistema,rowIndex:1,columnIndex:1},rows:[{values:[cell(current.revision+1)]}],fields:'userEnteredValue'}});
 await google(':batchUpdate',{method:'POST',body:{requests}});
 return {revision:current.revision+1};
}

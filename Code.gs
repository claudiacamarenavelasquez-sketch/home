/** Casa C&J · Google Apps Script backend
 * Vinculado al archivo de Google Sheets Home.
 * Publicar como aplicación web: Ejecutar como «Usuario que accede»,
 * Acceso: «Cualquier usuario con una cuenta de Google».
 * Compartir el Google Sheet SOLO con Claudia y Jorge como editores.
 */
const SPREADSHEET_ID = '1Y-4sv-EbY5i-fEXEbM1NGuuz11n8bki0IjzkcmeNOck';
const SCHEMA = {
  meds: {sheet:'Botiquín', fields:['id','name','category','ingredient','use','expiry','qty','notes','approx']},
  pets: {sheet:'Gatos', fields:['id','name','emoji','food','weight','notes']},
  petlogs: {sheet:'Salud gatos', fields:['id','pet','type','date','value','notes']},
  tasks: {sheet:'Rutinas', fields:['id','name','category','interval','last','person','notes']},
  events: {sheet:'Historial', fields:['id','date','name','person','notes']},
  shopping: {sheet:'Compras', fields:['id','name','category','bought','qty','notes']},
  expenses: {sheet:'Gastos', fields:['id','date','category','amount','name','notes']}
};
const LABELS = {id:'ID',name:'Nombre',category:'Categoría',ingredient:'Principio activo',use:'Para qué sirve',expiry:'Vencimiento',qty:'Cantidad',notes:'Notas',approx:'Fecha aproximada',emoji:'Emoji',food:'Alimento actual',weight:'Peso',pet:'Gato',type:'Tipo',date:'Fecha',value:'Valor',interval:'Frecuencia días',last:'Última realización',person:'Responsable',bought:'Comprado',amount:'Importe'};

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Casa C&J | Centro de control')
    .addMetaTag('viewport','width=device-width, initial-scale=1');
}
function setup() {
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
  for(const key of Object.keys(SCHEMA)) {
    const conf=SCHEMA[key]; let sh=ss.getSheetByName(conf.sheet);
    if(!sh)sh=ss.insertSheet(conf.sheet);
    if(sh.getLastRow()===0) {
      sh.getRange(1,1,1,conf.fields.length).setValues([conf.fields.map(x=>LABELS[x]||x)]);
      sh.setFrozenRows(1);
      sh.getRange(1,1,1,conf.fields.length).setBackground('#e9f0eb').setFontWeight('bold').setFontColor('#183132');
      sh.setColumnWidths(1,conf.fields.length,160);
      sh.setColumnWidth(2,210);
      if(conf.fields.includes('notes')) sh.setColumnWidth(conf.fields.indexOf('notes')+1,290);
      if(conf.fields.includes('use')) sh.setColumnWidth(conf.fields.indexOf('use')+1,300);
    }
  }
  let meta=ss.getSheetByName('_Sistema');
  if(!meta) { meta=ss.insertSheet('_Sistema'); meta.getRange('A1:B2').setValues([['Clave','Valor'],['revision',0]]);meta.hideSheet(); }
  return 'Pestañas configuradas correctamente';
}
function revision_(ss) {return Number(ss.getSheetByName('_Sistema').getRange('B2').getValue())||0;}
function read_(ss) {
  const out={};
  for(const [key,conf] of Object.entries(SCHEMA)) {
    const sh=ss.getSheetByName(conf.sheet), last=sh.getLastRow();
    if(last<=1){out[key]=[];continue;}
    out[key]=sh.getRange(2,1,last-1,conf.fields.length).getDisplayValues().filter(r=>r[0]).map(r=>{
      const o={};conf.fields.forEach((f,i)=>o[f]=f==='bought'||f==='approx'?r[i]==='TRUE'||r[i]==='true':f==='interval'?Number(r[i])||0:r[i]);return o;
    });
  }
  return out;
}
function write_(ss,state) {
  for(const [key,conf] of Object.entries(SCHEMA)) {
    const sh=ss.getSheetByName(conf.sheet), rows=Array.isArray(state[key])?state[key]:[];
    if(rows.length>5000)throw new Error('Se excedió el límite de registros por sección');
    const existing=sh.getLastRow();if(existing>1)sh.getRange(2,1,existing-1,conf.fields.length).clearContent();
    if(rows.length) {
      const values=rows.map(obj=>conf.fields.map(f=>{
        const v=obj[f];if(f==='bought'||f==='approx')return Boolean(v);
        if(f==='interval')return Number(v)||0;
        const str=String(v??'').slice(0,1500);
        return /^[=+@]/.test(str)?"'"+str:str;
      }));
      sh.getRange(2,1,values.length,conf.fields.length).setValues(values);
    }
  }
}
/** Carga inicial; si no hay datos, migra lo que tenía el navegador que primero abre la app. */
function bootstrap(seed) {
  const lock=LockService.getScriptLock();lock.waitLock(25000);
  try {
    setup();const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
    const initialized=ss.getSheetByName('_Sistema').getRange('A3').getValue()==='initialized';
    if(!initialized) {
      if(!seed || !Array.isArray(seed.meds) || !Array.isArray(seed.shopping))throw new Error('Datos iniciales inválidos');
      write_(ss,seed);
      ss.getSheetByName('_Sistema').getRange('A3').setValue('initialized');
      ss.getSheetByName('_Sistema').getRange('B2').setValue(1);
      SpreadsheetApp.flush();
    }
    return {revision:revision_(ss),state:read_(ss)};
  } finally {lock.releaseLock();}
}
function getState(){setup();const ss=SpreadsheetApp.openById(SPREADSHEET_ID);return {revision:revision_(ss),state:read_(ss)};}
/** Rechaza sobrescrituras silenciosas cuando ambos editan al mismo tiempo. */
function saveState(state, expectedRevision){
  const lock=LockService.getScriptLock();lock.waitLock(25000);
  try{
    const ss=SpreadsheetApp.openById(SPREADSHEET_ID),actual=revision_(ss);
    if(Number(expectedRevision)!==actual)return {conflict:true,revision:actual,state:read_(ss)};
    for(const k of Object.keys(SCHEMA))if(!Array.isArray(state[k]))throw new Error('Formato inválido en '+k);
    write_(ss,state);
    ss.getSheetByName('_Sistema').getRange('B2').setValue(actual+1);
    SpreadsheetApp.flush();
    return {revision:actual+1};
  }finally{lock.releaseLock();}
}
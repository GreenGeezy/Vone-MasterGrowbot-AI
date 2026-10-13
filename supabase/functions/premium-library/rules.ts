export const FILE_TYPES: Record<string,string> = {
 pdf:'application/pdf', docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', csv:'text/csv', txt:'text/plain',
};
export const EVENTS = new Set(['paywall_view','plan_selected','purchase_attempt','purchase_success','purchase_cancelled','purchase_failed','analysis_complete','journal_saved','followup_visit','attachment_upload','attachment_open','attachment_delete','catalog_interest','onboarding_view','onboarding_answer','onboarding_complete']);
export const SURFACES = new Set(['pro','premium','photo','video','journal','home','catalog','onboarding']);
export function eventMetadata(value:unknown):Record<string,string> {
 const allowed=new Set(['build','platform','environment','step','entry_point','variant','product_id','offering_id','outcome','error_category','rc_app_user_id']);
 if(!value||typeof value!=='object'||Array.isArray(value))return {};
 return Object.fromEntries(Object.entries(value).filter(([k,v])=>allowed.has(k)&&typeof v==='string'&&/^[a-zA-Z0-9_$.:\-]{1,100}$/.test(v)));
}
export function validateDocument(name:string, bytes:Uint8Array) {
 if (!name || name.length>180 || /[\\/\x00-\x1f]/.test(name)) throw new Error('Choose a file with a valid name.');
 const ext=name.split('.').pop()?.toLowerCase() || '';
 const mime=FILE_TYPES[ext];
 if (!mime || !bytes.length || bytes.length>10485760) throw new Error('Choose a PDF, DOCX, XLSX, CSV or TXT file up to 10 MB.');
 const header=new TextDecoder('latin1').decode(bytes);
 if (ext==='pdf' && !header.startsWith('%PDF-')) throw new Error('This PDF could not be read.');
 if (ext==='docx' || ext==='xlsx') {
  if (!header.startsWith('PK\x03\x04') || !header.includes('[Content_Types].xml') ||
      !header.includes(ext==='docx'?'word/document.xml':'xl/workbook.xml') || /vbaProject\.bin/i.test(header)) throw new Error('Choose a standard document without macros.');
 }
 if (ext==='txt' || ext==='csv') {
  if (bytes.includes(0)) throw new Error('Choose a UTF-8 text file.');
  try { new TextDecoder('utf-8',{fatal:true}).decode(bytes); } catch { throw new Error('Choose a UTF-8 text file.'); }
 }
 return mime;
}

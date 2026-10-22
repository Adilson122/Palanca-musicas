const crypto=require('crypto');
module.exports=async function(req,res){
res.setHeader('Cache-Control','no-store');
if(req.method!=='GET')return res.status(405).json({error:'Método não permitido'});
const token=process.env.PAYSUITE_API_TOKEN,key=process.env.SUPABASE_SERVICE_ROLE_KEY,url=process.env.SUPABASE_URL;
if(!token||!key||!url)return res.status(503).json({error:'Serviço não configurado'});
const reference=String(req.query.ref||'');
if(!/^TT-[a-f0-9]{28}$/.test(reference))return res.status(400).json({error:'Referência inválida'});
const base=url.replace(/\/$/,'')+'/rest/v1/',headers={'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json'};
try{
const p=await fetch(base+'tabtools_payments?reference=eq.'+encodeURIComponent(reference)+'&select=id,email,status,paysuite_payment_id',{headers});
const records=await p.json();if(!p.ok||!records.length)return res.status(404).json({error:'Pagamento não encontrado'});
const record=records[0];
const v=await fetch('https://paysuite.tech/api/v1/payments/'+encodeURIComponent(record.paysuite_payment_id),{headers:{Authorization:'Bearer '+token}});
if(!v.ok)throw Error('Falha de verificação');
const result=await v.json(),payment=result.data||result;
const paid=String(payment.status||'').toLowerCase()==='paid'&&String(payment.id)===record.paysuite_payment_id&&Number(payment.amount)===50&&String(payment.reference)===reference;
if(!paid)return res.status(200).json({status:'pending'});
const secret=process.env.TABTOOLS_LICENSE_SECRET;
if(!secret)return res.status(503).json({error:'Licenciamento não configurado'});
const code=crypto.createHmac('sha256',secret).update(reference).digest('hex').slice(0,24).toUpperCase();
const hash=crypto.createHash('sha256').update(code).digest('hex');
const current=await fetch(base+'tabtools_licenses?email=eq.'+encodeURIComponent(record.email)+'&select=expires_at',{headers});
if(!current.ok)throw Error('Falha de licença');
const found=await current.json();
const start=found.length?Math.max(Date.now(),Date.parse(found[0].expires_at)):Date.now();
const expiry=new Date(start+30*86400000).toISOString();
if(record.status!=='paid'){
const upd=await fetch(base+'tabtools_payments?id=eq.'+record.id,{method:'PATCH',headers:{...headers,'Prefer':'return=minimal'},body:JSON.stringify({status:'paid',paid_at:new Date().toISOString()})});
if(!upd.ok)throw Error('Falha de registo');
const lic=await fetch(base+'tabtools_licenses?on_conflict=email',{method:'POST',headers:{...headers,'Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({email:record.email,activation_code_hash:hash,expires_at:expiry,last_payment_id:record.id,updated_at:new Date().toISOString()})});
if(!lic.ok)throw Error('Falha de activação');
}
return res.status(200).json({status:'paid',activation_code:code,expires_at:record.status==='paid'?(found[0]?.expires_at||expiry):expiry});
}catch(e){return res.status(502).json({error:'Não foi possível confirmar o pagamento agora.'});}
};
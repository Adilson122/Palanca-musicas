const crypto=require('crypto');
const BASE='https://paysuite.tech/api/v1/payments';
module.exports=async function(req,res){
res.setHeader('Cache-Control','no-store');
if(req.method!=='POST')return res.status(405).json({error:'Método não permitido'});
const token=process.env.PAYSUITE_API_TOKEN,key=process.env.SUPABASE_SERVICE_ROLE_KEY,url=process.env.SUPABASE_URL;
if(!token||!key||!url)return res.status(503).json({error:'Pagamento temporariamente indisponível'});
const email=String(req.body?.email||'').trim().toLowerCase();
if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return res.status(400).json({error:'Indica um email válido'});
const reference='TT-'+crypto.randomUUID().replace(/-/g,'').slice(0,28);
const headers={'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json'};
try{
const origin='https://palanca-musicas.vercel.app';
const p=await fetch(BASE,{method:'POST',headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({amount:50,reference,description:'TabTools Pro - 30 dias',return_url:origin+'/tabtools/?ref='+encodeURIComponent(reference)})});
const raw=await p.json();const payment=raw.data||raw;
if(!p.ok||!payment.checkout_url||!payment.id)throw Error('Checkout não disponível');
const s=await fetch(url.replace(/\/$/,'')+'/rest/v1/tabtools_payments',{method:'POST',headers:{...headers,'Prefer':'return=minimal'},body:JSON.stringify({reference,email,amount_mzn:50,paysuite_payment_id:String(payment.id),checkout_url:payment.checkout_url})});
if(!s.ok)throw Error('Não foi possível guardar a transacção');
return res.status(200).json({checkout_url:payment.checkout_url,reference});
}catch(e){return res.status(502).json({error:'Não foi possível iniciar o pagamento. Tenta novamente.'});}
};
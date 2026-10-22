const crypto=require('crypto');
module.exports=async function(req,res){
res.setHeader('Cache-Control','no-store');
if(req.method!=='POST')return res.status(405).json({error:'Método não permitido'});
const code=String(req.body?.code||'').trim().toUpperCase();
if(!/^[A-F0-9]{24}$/.test(code))return res.status(400).json({active:false});
const key=process.env.SUPABASE_SERVICE_ROLE_KEY,url=process.env.SUPABASE_URL;
if(!key||!url)return res.status(503).json({error:'Serviço indisponível'});
const hash=crypto.createHash('sha256').update(code).digest('hex');
try{const r=await fetch(url.replace(/\/$/,'')+'/rest/v1/tabtools_licenses?activation_code_hash=eq.'+hash+'&select=expires_at',{headers:{apikey:key,Authorization:'Bearer '+key}});
if(!r.ok)throw Error('Falha de consulta');const rows=await r.json(),expires=rows[0]?.expires_at||null;
return res.status(200).json({active:!!expires&&Date.parse(expires)>Date.now(),expires_at:expires});
}catch(e){return res.status(502).json({error:'Não foi possível validar agora'});}
};
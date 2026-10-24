// Lojou webhook: notifications are unsigned. Never issue a license from payload alone.
module.exports=async function(req,res){
res.setHeader('Cache-Control','no-store');
if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
const body=req.body||{},type=String(body.order_type||''),number=String(body.order_number||'');
if(!['order_approved','order_cancelled','order_refund'].includes(type)||!/^[-_a-zA-Z0-9]{4,64}$/.test(number))return res.status(400).json({error:'Invalid event'});
const key=process.env.SUPABASE_SERVICE_ROLE_KEY,base=process.env.SUPABASE_URL;
if(!key||!base)return res.status(503).json({error:'Database not configured'});
const headers={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'};
const api=base.replace(/\/$/,'')+'/rest/v1/tabtools_lojou_orders';
const email=String(body.customer?.email||'').trim().toLowerCase();
const pid=String(body.product?.pid||'');
const expectedPid=process.env.LOJOU_PRODUCT_PID;
if(!expectedPid)return res.status(503).json({error:'Product validation not configured'});
if(pid!==expectedPid)return res.status(200).json({received:true,ignored:true});
let verified=false;
if(type==='order_approved'&&process.env.LOJOU_API_KEY){
 try{
  const origin=process.env.LOJOU_API_BASE_URL||'https://api.lojou.app';
  const response=await fetch(origin.replace(/\/$/,'')+'/v1/orders/'+encodeURIComponent(number),{headers:{Authorization:'Bearer '+process.env.LOJOU_API_KEY,Accept:'application/json'},signal:AbortSignal.timeout(6000)});
  if(response.ok){
   const json=await response.json(),order=json.data||json.order||json;
   const orderPid=String(order.product?.pid||order.product_details?.pid||'');
   verified=String(order.status||'').toLowerCase()==='approved'&&String(order.order_number||order.number||'')===number&&orderPid===expectedPid&&String(order.currency||'').toUpperCase()==='MZN'&&Number(order.amount)===100&&String(order.transaction_id||'')===String(body.transaction_id||'')&&String(order.customer?.email||'').toLowerCase()===email;
  }
 }catch(e){/* keep pending; never trust an unverified notification */}
}
const record={order_number:number,transaction_id:String(body.transaction_id||''),event_type:type,verification_status:verified?'verified':'pending',customer_email:email,product_pid:pid,amount_mzn:Number(body.amount)||null,payload:{order_type:type,order_number:number},received_at:new Date().toISOString(),verified_at:verified?new Date().toISOString():null};
try{
 const existing=await fetch(api+'?order_number=eq.'+encodeURIComponent(number)+'&select=verification_status',{headers});
 if(!existing.ok)throw Error('db read');
 const rows=await existing.json();
 if(rows.length&&rows[0].verification_status==='verified')return res.status(200).json({received:true});
 const saved=await fetch(api+'?on_conflict=order_number',{method:'POST',headers:{...headers,Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(record)});
 if(!saved.ok)throw Error('db write');
 return res.status(200).json({received:true,verified});
}catch(e){return res.status(503).json({error:'Temporary storage failure'});}
};
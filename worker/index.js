const frames=['polaroid','stamp','gold','sage','scallop','stitch','wine'];
const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(24)),x=>x.toString(16).padStart(2,'0')).join('');
const validId=s=>/^[a-f0-9]{48}$/.test(s||'');
const validCode=s=>/^[a-f0-9]{24}$/.test(s||'');
const newCode=()=>token().slice(0,24);
const key=(id,n)=>`calendars/${id}/photo-${n}`;
const metaKey=id=>`calendars/${id}/meta`;
const json=(v,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});
const hash=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),x=>x.toString(16).padStart(2,'0')).join('');
const safe=(s,max)=>typeof s==='string'?s.trim().slice(0,max):'';
const clamp=n=>Number.isFinite(Number(n))?Math.max(0,Math.min(100,Number(n))):50;
function config(v){const year=Number(v.year),title=safe(v.title,75),recipient=safe(v.recipient,60),author=safe(v.author,60);if(!Number.isInteger(year)||year<2026||year>2100||!title||!recipient||!author)throw Error('Preencha os dados do calendário.');return{year,title,recipient,author,message:safe(v.message,900),days:Array.from({length:31},(_,i)=>{const d=v.days?.[i]||{},ratio=Number(d.aspect);return{frame:frames.includes(d.frame)?d.frame:frames[i%7],fit:d.fit==='cover'&&d.customFit===true?'cover':'contain',customFit:d.customFit===true,aspect:Number.isFinite(ratio)&&ratio>0?Math.max(.25,Math.min(4,ratio)):null,x:clamp(d.x),y:clamp(d.y),caption:safe(d.caption,280)}})}}
export function available(year,now=new Date()){const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(x=>[x.type,x.value]));return Number(p.year)>year?31:Number(p.year)<year||p.month!=='12'?0:Number(p.day)}
function publicData(m,limit){return{id:m.id,title:m.title,recipient:m.recipient,author:m.author,year:m.year,message:m.message,available:limit,days:m.days.map((d,i)=>({...d,caption:i<limit?d.caption:''}))}}
async function owned(req,m){const t=req.headers.get('Authorization')?.replace(/^Bearer /,'');return validId(t)&&await hash(t)===m.editHash}
async function recipient(req,m){const t=req.headers.get('Authorization')?.replace(/^Bearer /,'');return !!m.accessHash&&validCode(t)&&await hash(t)===m.accessHash}
export default {async fetch(req,env){const u=new URL(req.url),p=u.pathname,mth=req.method;try{
 if(mth==='GET'&&(p==='/'||/^\/(presente|editar)\/[a-f0-9]{48}$/.test(p)))return new Response(page,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow'}});
 if(p==='/robots.txt')return new Response('User-agent: *\nDisallow: /\n');
 if(!p.startsWith('/api/'))return json({error:'Página não encontrada.'},404);
 if(!env.BUCKET)return json({error:'Armazenamento indisponível.'},503);
 if(mth==='POST'&&p==='/api/create'){const cfg=config(await req.json()),id=token(),edit=token(),access=newCode();await env.BUCKET.put(metaKey(id),JSON.stringify({...cfg,id,editHash:await hash(edit),accessHash:await hash(access),published:false}));return json({id,edit,access},201)}
 const match=/^\/api\/calendar\/([a-f0-9]{48})(?:\/(owner|photo|publish|configure|access)(?:\/(\d{1,2}))?)?$/.exec(p);if(!match)return json({error:'Rota inválida.'},404);const [,id,act,num]=match,o=await env.BUCKET.get(metaKey(id));if(!o)return json({error:'Calendário não encontrado.'},404);const m=await o.json(),day=Number(num),owner=await owned(req,m),guest=await recipient(req,m);
 if(act==='photo'&&(!Number.isInteger(day)||day<1||day>31))return json({error:'Dia inválido.'},400);
 if(mth==='GET'&&!act){if(!m.published||!guest)return json({error:'Informe o código de acesso válido para este presente.'},403);return json(publicData(m,available(m.year)))}
 if(mth==='GET'&&act==='photo'){if(!owner&&(!guest||!m.published||day>available(m.year)))return json({error:'Lembrança ainda guardada.'},403);const photo=await env.BUCKET.get(key(id,day));if(!photo)return json({error:'Foto não encontrada.'},404);return new Response(photo.body,{headers:{'Content-Type':'image/jpeg','Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cross-Origin-Resource-Policy':'same-origin'}})}
 if(!owner)return json({error:'O link de edição é necessário.'},403);
 if(mth==='GET'&&act==='owner'){const photos=await Promise.all(Array.from({length:31},(_,i)=>env.BUCKET.head(key(id,i+1))));return json({...publicData(m,31),published:m.published,hasAccess:!!m.accessHash,uploaded:photos.map(Boolean)})}
 if(mth==='POST'&&act==='access'){const access=newCode();await env.BUCKET.put(metaKey(id),JSON.stringify({...m,accessHash:await hash(access)}));return json({access})}
 if(mth==='PUT'&&act==='configure'){await env.BUCKET.put(metaKey(id),JSON.stringify({...m,...config(await req.json())}));return json({ok:true})}
 if(mth==='PUT'&&act==='photo'){if(Number(req.headers.get('Content-Length'))>2000000)return json({error:'Foto muito grande.'},413);const b=new Uint8Array(await req.arrayBuffer());if(b.length>2000000||b.length<4||b[0]!==255||b[1]!==216||b[2]!==255)return json({error:'Foto inválida.'},400);await env.BUCKET.put(key(id,day),b);return json({ok:true})}
 if(mth==='POST'&&act==='publish'){if(!m.accessHash)return json({error:'Gere um código de acesso antes de publicar.'},400);const photos=await Promise.all(Array.from({length:31},(_,i)=>env.BUCKET.head(key(id,i+1))));if(photos.some(x=>!x))return json({error:'Adicione as 31 fotos antes de publicar.'},400);await env.BUCKET.put(metaKey(id),JSON.stringify({...m,published:true}));return json({url:u.origin+'/presente/'+id})}
 return json({error:'Rota indisponível.'},405);
 }catch(e){return json({error:e.message?.startsWith('Preencha')?e.message:'Não foi possível concluir. Tente novamente.'},400)}}};

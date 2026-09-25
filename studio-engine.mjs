const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const cleanBase=url=>String(url||'').trim().replace(/\/+$/,'');

function validateBase(base){
  if(!base) throw new Error('Studio API URL is empty.');
  let u; try{u=new URL(base);}catch(_){throw new Error('Studio API URL is not valid.');}
  if(location.protocol==='https:' && u.protocol!=='https:') throw new Error('GitHub Pages uses HTTPS. Use an HTTPS Studio URL (for example a secure tunnel), not http://.');
  return u.origin+u.pathname.replace(/\/$/,'');
}
function authHeaders(token,json=false){const h={};if(json)h['Content-Type']='application/json';if(token)h.Authorization=`Bearer ${token}`;return h;}
async function fetchWithTimeout(url,opts={},timeoutMs=20000){
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeoutMs);
  try{return await fetch(url,{...opts,signal:ctrl.signal});}
  catch(err){if(err?.name==='AbortError')throw new Error('Studio server timed out.');throw err;}
  finally{clearTimeout(timer);}
}
async function jsonOrThrow(res){
  let body=null;try{body=await res.json();}catch(_){ }
  if(!res.ok)throw new Error(body?.detail||body?.error||`Studio server returned HTTP ${res.status}.`);
  if(body?.code && Number(body.code)!==200)throw new Error(body.error||`Studio server returned code ${body.code}.`);
  return body;
}

export async function testStudioConnection({baseUrl,token}){
  const base=validateBase(cleanBase(baseUrl));
  const res=await fetchWithTimeout(`${base}/health`,{headers:authHeaders(token)},12000);
  const body=await jsonOrThrow(res),data=body?.data||body||{};
  return {service:data.service||'ACE-Step',version:data.version||'',status:data.status||'ok'};
}

function voiceCaption(arrangement){
  if(arrangement==='female')return 'expressive original female lead vocal, natural melodic singing, clear lyrics';
  if(arrangement==='duet')return 'expressive original male and female duet, alternating verses, harmonized choruses, natural melodic singing, clear lyrics';
  return 'expressive original male lead vocal, natural melodic singing, clear lyrics';
}
function absoluteAudioUrl(base,item){
  let p=item?.url||item?.file||item?.audio_url||'';
  if(!p)throw new Error('Studio result did not include an audio URL.');
  if(/^https?:\/\//i.test(p))return p;
  if(/^\/?v1\/audio\?/i.test(p)||p.startsWith('/'))return `${base}${p.startsWith('/')?'':'/'}${p}`;
  return `${base}/v1/audio?path=${encodeURIComponent(p)}`;
}
function parseResult(row){
  let v=row?.result;
  if(typeof v==='string'){try{v=JSON.parse(v);}catch(_){}}
  if(Array.isArray(v))return v[0]||null;
  if(v&&typeof v==='object')return v;
  return null;
}

async function decodeAndNormalize(blob,targetRate=44100){
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error('AudioContext is unavailable for Studio audio.');
  const ac=new AC();let decoded;
  try{decoded=await ac.decodeAudioData((await blob.arrayBuffer()).slice(0));}
  finally{try{await ac.close();}catch(_){}}
  const frames=Math.max(1,Math.ceil(decoded.duration*targetRate)),ctx=new OfflineAudioContext(2,frames,targetRate),src=ctx.createBufferSource(),gain=ctx.createGain();
  src.buffer=decoded;gain.gain.value=.98;src.connect(gain).connect(ctx.destination);src.start(0);const out=await ctx.startRendering();
  return {buffer:out,blob:audioBufferToWav(out)};
}
function audioBufferToWav(buffer){
  const channels=buffer.numberOfChannels,sr=buffer.sampleRate,len=buffer.length,align=channels*2,ab=new ArrayBuffer(44+len*align),v=new DataView(ab);let o=0;
  const w=s=>{for(const ch of s)v.setUint8(o++,ch.charCodeAt(0));};
  w('RIFF');v.setUint32(o,36+len*align,true);o+=4;w('WAVE');w('fmt ');v.setUint32(o,16,true);o+=4;v.setUint16(o,1,true);o+=2;v.setUint16(o,channels,true);o+=2;v.setUint32(o,sr,true);o+=4;v.setUint32(o,sr*align,true);o+=4;v.setUint16(o,align,true);o+=2;v.setUint16(o,16,true);o+=2;w('data');v.setUint32(o,len*align,true);o+=4;
  const ch=Array.from({length:channels},(_,i)=>buffer.getChannelData(i));
  for(let i=0;i<len;i++)for(let c=0;c<channels;c++){let s=Math.max(-1,Math.min(1,ch[c][i]));v.setInt16(o,s<0?s*0x8000:s*0x7fff,true);o+=2;}
  return new Blob([ab],{type:'audio/wav'});
}

export async function generateStudioSong({baseUrl,token,model='acestep-v15-sft',prompt,lyrics,duration=90,bpm,arrangement='male',onStatus}){
  const base=validateBase(cleanBase(baseUrl));
  onStatus?.('Checking Studio Singer…');
  await testStudioConnection({baseUrl:base,token});
  const fullPrompt=`${String(prompt||'pop song').trim()}. ${voiceCaption(arrangement)}. Polished full-song production. Do not imitate any named real singer.`;
  const body={
    prompt:fullPrompt,
    lyrics:String(lyrics||''),
    model,
    task_type:'text2music',
    vocal_language:'en',
    audio_duration:Math.max(10,Math.min(600,Number(duration)||90)),
    bpm:Number.isFinite(Number(bpm))?Math.round(Number(bpm)):undefined,
    inference_steps:model.includes('turbo')?8:50,
    batch_size:1,
    use_format:false,
    thinking:false
  };
  Object.keys(body).forEach(k=>body[k]===undefined&&delete body[k]);
  onStatus?.('Studio Singer is composing the full song…');
  const submit=await fetchWithTimeout(`${base}/release_task`,{method:'POST',headers:authHeaders(token,true),body:JSON.stringify(body)},60000);
  const submitted=await jsonOrThrow(submit),taskId=submitted?.data?.task_id||submitted?.task_id;
  if(!taskId)throw new Error('Studio server did not return a task ID.');
  const started=Date.now(),maxMs=20*60*1000;let item=null,row=null;
  while(Date.now()-started<maxMs){
    await sleep(1200);
    const q=await fetchWithTimeout(`${base}/query_result`,{method:'POST',headers:authHeaders(token,true),body:JSON.stringify({task_id_list:[taskId]})},30000);
    const qb=await jsonOrThrow(q);row=Array.isArray(qb?.data)?qb.data[0]:qb?.data;
    const status=Number(row?.status??0);
    if(status===2)throw new Error(row?.error||'Studio generation failed.');
    if(status===1){item=parseResult(row);if(item)break;}
    const sec=Math.max(1,Math.round((Date.now()-started)/1000));onStatus?.(`Studio Singer is generating… ${sec}s`);
  }
  if(!item)throw new Error('Studio generation timed out before an audio file was returned.');
  const audioUrl=absoluteAudioUrl(base,item);onStatus?.('Downloading the Studio master…');
  const audioRes=await fetchWithTimeout(audioUrl,{headers:authHeaders(token)},120000);if(!audioRes.ok)throw new Error(`Studio audio download failed (HTTP ${audioRes.status}).`);
  const sourceBlob=await audioRes.blob();if(sourceBlob.size<1024)throw new Error('Studio audio download was empty.');
  onStatus?.('Converting Studio master to 44.1 kHz WAV…');const normalized=await decodeAndNormalize(sourceBlob,44100);
  return {masterBlob:normalized.blob,masterBuffer:normalized.buffer,meta:{task_id:taskId,model,item,source_type:sourceBlob.type||'unknown'}};
}

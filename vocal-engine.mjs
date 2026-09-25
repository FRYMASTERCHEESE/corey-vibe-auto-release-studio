const MODEL_ID='onnx-community/Kokoro-82M-v1.0-ONNX';
const KOKORO_CDN='https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm';
let modelPromise=null,modelSignature='',decoderContext=null;
const lineCache=new Map();
const IS_MOBILE=/(Android|iPhone|iPad|iPod|Mobile)/i.test(navigator.userAgent||'') || (Number(navigator.deviceMemory||0)>0 && Number(navigator.deviceMemory)<=6);
const CACHE_LIMIT=IS_MOBILE?4:24;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const semitoneRatio=n=>Math.pow(2,n/12);

function parseLyricLines(text){
  let section='verse';const out=[];
  for(const raw of String(text||'').split(/\r?\n/)){
    const line=raw.trim();if(!line)continue;if(/^\[title:/i.test(line))continue;
    const tag=line.match(/^\[([^\]]+)\]$/);if(tag){section=tag[1].toLowerCase();continue;}
    out.push({text:line.replace(/^[-•]\s*/,''),section,index:out.length});
  }
  return out.slice(0,48);
}
function sectionPattern(section){if(/final/.test(section))return[2,4,7,9,7,4];if(/chorus|hook/.test(section))return[0,4,7,4,2,0];if(/pre/.test(section))return[0,2,4,5,7,5];if(/bridge/.test(section))return[-2,0,3,5,3,0];return[0,2,4,2,0,-2];}
function assignSingers(lines,arrangement='male',chorusTogether=true){let verseCounter=0;const sectionFirst=new Map();return lines.map((line,i)=>{const s=line.section||'verse';if(!sectionFirst.has(s))sectionFirst.set(s,i);if(arrangement==='male')return{...line,singers:['male']};if(arrangement==='female')return{...line,singers:['female']};if(arrangement!=='duet')return{...line,singers:['male']};if(/chorus|hook|final/.test(s)&&chorusTogether)return{...line,singers:['male','female']};if(/verse\s*2|second verse/.test(s))return{...line,singers:['female']};if(/verse/.test(s)){if(i===sectionFirst.get(s))verseCounter++;return{...line,singers:[verseCounter%2===1?'male':'female']};}if(/pre|bridge/.test(s))return{...line,singers:[i%2===0?'female':'male']};return{...line,singers:[i%2===0?'male':'female']};});}

function progressText(p){
  if(!p)return'';const total=Number(p.total||0),loaded=Number(p.loaded||0);let n=Number(p.progress);
  if(!Number.isFinite(n)&&total>0)n=loaded/total*100;if(Number.isFinite(n)&&n<=1)n*=100;
  return Number.isFinite(n)?` ${Math.max(0,Math.min(100,n)).toFixed(0)}%`:'';
}
function chooseAttempt(performanceMode='auto'){
  const canGpu=!!navigator.gpu,save=!!navigator.connection?.saveData;
  const compact=[{dtype:'q4',device:'wasm'},{dtype:'q8',device:'wasm'}];
  // Phone browsers have much tighter memory/GPU limits. fp32 WebGPU can crash the whole tab
  // before JavaScript gets a chance to catch an error, so mobile-safe/auto/turbo avoid it on phones.
  if(performanceMode==='mobile'||performanceMode==='wasm')return compact;
  if(performanceMode==='turbo')return (!IS_MOBILE&&canGpu&&!save)
    ?[{dtype:'fp32',device:'webgpu'},...compact]
    :compact;
  if(performanceMode==='webgpu')return (!IS_MOBILE&&canGpu)
    ?[{dtype:'fp32',device:'webgpu'},...compact]
    :compact;
  return (!IS_MOBILE&&canGpu&&!save)
    ?[{dtype:'fp32',device:'webgpu'},...compact]
    :compact;
}
async function loadModel(onStatus,performanceMode='auto'){
  const attempts=chooseAttempt(performanceMode),sig=attempts[0].device+':'+attempts[0].dtype;
  if(modelPromise&&modelSignature===sig)return modelPromise;
  modelSignature=sig;
  modelPromise=(async()=>{
    onStatus?.('Loading Fast Local voice engine…');const mod=await import(KOKORO_CDN);if(!mod.KokoroTTS)throw new Error('Kokoro voice library did not load.');let lastErr;
    for(const a of attempts){
      try{
        onStatus?.(`Loading neural voice model (${a.device.toUpperCase()})…`);
        return await mod.KokoroTTS.from_pretrained(MODEL_ID,{...a,progress_callback:p=>{const f=String(p?.file||p?.name||'');if(f||p?.progress!=null)onStatus?.(`Loading voice model${progressText(p)}${f?` — ${f.split('/').pop()}`:''}`);}});
      }catch(err){lastErr=err;onStatus?.(`${a.device.toUpperCase()} voice load failed — trying compatibility mode…`);}
    }
    throw lastErr||new Error('Neural voice model could not load.');
  })();
  try{return await modelPromise;}catch(err){modelPromise=null;throw err;}
}
function rawAudioToBlob(audio){if(!audio)throw new Error('Voice model returned no audio.');if(typeof audio.toBlob==='function')return audio.toBlob();if(audio.blob instanceof Blob)return audio.blob;if(audio.buffer instanceof ArrayBuffer)return new Blob([audio.buffer],{type:'audio/wav'});if(ArrayBuffer.isView(audio.data)&&Number(audio.sampling_rate||audio.sample_rate)){const sr=Number(audio.sampling_rate||audio.sample_rate),data=audio.data,ab=new ArrayBuffer(44+data.length*2),v=new DataView(ab);let o=0;const w=s=>{for(const ch of s)v.setUint8(o++,ch.charCodeAt(0));};w('RIFF');v.setUint32(o,36+data.length*2,true);o+=4;w('WAVE');w('fmt ');v.setUint32(o,16,true);o+=4;v.setUint16(o,1,true);o+=2;v.setUint16(o,1,true);o+=2;v.setUint32(o,sr,true);o+=4;v.setUint32(o,sr*2,true);o+=4;v.setUint16(o,2,true);o+=2;v.setUint16(o,16,true);o+=2;w('data');v.setUint32(o,data.length*2,true);o+=4;for(let i=0;i<data.length;i++){const s=clamp(data[i],-1,1);v.setInt16(o,s<0?s*0x8000:s*0x7fff,true);o+=2;}return new Blob([ab],{type:'audio/wav'});}throw new Error('Unsupported voice audio format.');}
function getDecoder(){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error('AudioContext is unavailable.');if(!decoderContext||decoderContext.state==='closed')decoderContext=new AC();return decoderContext;}
async function decodeBlob(blob){return await getDecoder().decodeAudioData((await blob.arrayBuffer()).slice(0));}
function cachePut(k,v){lineCache.set(k,v);while(lineCache.size>CACHE_LIMIT){const first=lineCache.keys().next().value;lineCache.delete(first);}}
function audioBufferToWav(buffer){const channels=buffer.numberOfChannels,sr=buffer.sampleRate,len=buffer.length,align=channels*2,ab=new ArrayBuffer(44+len*align),v=new DataView(ab);let o=0;const w=s=>{for(let i=0;i<s.length;i++)v.setUint8(o++,s.charCodeAt(i));};w('RIFF');v.setUint32(o,36+len*align,true);o+=4;w('WAVE');w('fmt ');v.setUint32(o,16,true);o+=4;v.setUint16(o,1,true);o+=2;v.setUint16(o,channels,true);o+=2;v.setUint32(o,sr,true);o+=4;v.setUint32(o,sr*align,true);o+=4;v.setUint16(o,align,true);o+=2;v.setUint16(o,16,true);o+=2;w('data');v.setUint32(o,len*align,true);o+=4;const ch=Array.from({length:channels},(_,i)=>buffer.getChannelData(i));for(let i=0;i<len;i++)for(let c=0;c<channels;c++){let s=clamp(ch[c][i],-1,1);v.setInt16(o,s<0?s*0x8000:s*0x7fff,true);o+=2;}return new Blob([ab],{type:'audio/wav'});}
function setupVocalBus(ctx,gender){const input=ctx.createGain(),hp=ctx.createBiquadFilter(),lp=ctx.createBiquadFilter(),comp=ctx.createDynamicsCompressor(),delay=ctx.createDelay(1),fb=ctx.createGain(),wet=ctx.createGain(),pan=ctx.createStereoPanner?ctx.createStereoPanner():null,out=ctx.createGain();hp.type='highpass';hp.frequency.value=gender==='female'?110:80;lp.type='lowpass';lp.frequency.value=10000;comp.threshold.value=-20;comp.knee.value=20;comp.ratio.value=3;comp.attack.value=.004;comp.release.value=.2;delay.delayTime.value=.14;fb.gain.value=.13;wet.gain.value=.10;out.gain.value=.92;input.connect(hp).connect(lp).connect(comp).connect(out);comp.connect(delay);delay.connect(fb).connect(delay);delay.connect(wet).connect(out);if(pan){pan.pan.value=gender==='male'?-.12:.12;out.connect(pan);return{input,out:pan};}return{input,out};}
function buildVocalBlocks(records,gender,performanceMode='auto'){
  const relevant=records.filter(r=>r.singers.includes(gender));
  if(!relevant.length)return[];
  const maxLines=IS_MOBILE?3:(performanceMode==='turbo'?6:4),blocks=[];let cur=null;
  for(const r of relevant){
    const consecutive=cur&&r.index===cur.lastIndex+1;
    const sameSection=cur&&r.section===cur.section;
    if(!cur||!consecutive||!sameSection||cur.records.length>=maxLines){
      cur={section:r.section,firstIndex:r.index,lastIndex:r.index,records:[r]};
      blocks.push(cur);
    }else{
      cur.records.push(r);cur.lastIndex=r.index;
    }
  }
  for(const b of blocks)b.text=b.records.map(r=>r.text.replace(/[.!?]+$/,'')).join('. ')+'.';
  return blocks;
}
function scheduleSpeechBlock(ctx,dest,buf,start,slotSpan,section,lineIndex,level){
  const pattern=sectionPattern(section),target=Math.max(1.2,Math.min(slotSpan*.86,11.5));
  let rate=buf.duration/target;rate=clamp(rate,.72,2.05);
  const usable=Math.min(buf.duration,target*rate),parts=Math.max(3,Math.min(9,Math.round(slotSpan*1.35)));
  const inputPart=usable/parts,outputPart=inputPart/rate,compensation=-1200*Math.log2(rate);
  for(let j=0;j<parts;j++){
    const src=ctx.createBufferSource(),g=ctx.createGain();src.buffer=buf;src.playbackRate.value=rate;
    const semi=pattern[(lineIndex+j)%pattern.length];src.detune.value=compensation+semi*100;
    const when=start+j*outputPart,fade=Math.min(.035,outputPart*.12),amp=clamp(level,.3,1.15);
    g.gain.setValueAtTime(.0001,when);g.gain.linearRampToValueAtTime(amp,when+fade);
    g.gain.setValueAtTime(amp,Math.max(when+fade,when+outputPart-fade));g.gain.linearRampToValueAtTime(.0001,when+outputPart);
    src.connect(g).connect(dest);src.start(when,j*inputPart,inputPart);
  }
}
function scheduleSpeechLine(ctx,dest,buf,start,slot,section,lineIndex,level){const pattern=sectionPattern(section),parts=3,target=Math.max(.8,Math.min(slot*.86,4.1));let rate=buf.duration/target;rate=clamp(rate,.78,1.9);const usable=Math.min(buf.duration,target*rate),inputPart=usable/parts,outputPart=inputPart/rate,compensation=-1200*Math.log2(rate);for(let j=0;j<parts;j++){const src=ctx.createBufferSource(),g=ctx.createGain();src.buffer=buf;src.playbackRate.value=rate;const semi=pattern[(lineIndex*2+j)%pattern.length];src.detune.value=compensation+semi*100;const when=start+j*outputPart,fade=Math.min(.035,outputPart*.12),amp=clamp(level,.3,1.15);g.gain.setValueAtTime(.0001,when);g.gain.linearRampToValueAtTime(amp,when+fade);g.gain.setValueAtTime(amp,Math.max(when+fade,when+outputPart-fade));g.gain.linearRampToValueAtTime(.0001,when+outputPart);src.connect(g).connect(dest);src.start(when,j*inputPart,inputPart);}}
async function renderNeuralGenderStem(instrumental,records,gender,voice,level,tts,onStatus,performanceMode='auto'){
  const relevant=records.filter(r=>r.singers.includes(gender));if(!relevant.length)return null;
  const sr=instrumental.sampleRate,ctx=new OfflineAudioContext(2,instrumental.length,sr),bus=setupVocalBus(ctx,gender);
  bus.out.connect(ctx.destination);
  const slot=Math.max(1.45,(instrumental.duration-4)/Math.max(1,records.length));
  const blocks=buildVocalBlocks(records,gender,performanceMode);let done=0;
  for(const block of blocks){
    const key=`block|${voice}|${block.text}`;let buf=lineCache.get(key);
    if(!buf){
      onStatus?.(`Generating ${gender} vocal block ${++done}/${blocks.length}…`);
      let raw;
      try{raw=await tts.generate(block.text,{voice,speed:1.02});}
      catch(err){
        const fallbackVoice=gender==='male'?'am_michael':'af_heart';if(voice===fallbackVoice)throw err;
        onStatus?.(`Retrying that ${gender} block with the standard voice…`);
        raw=await tts.generate(block.text,{voice:fallbackVoice,speed:1.02});
      }
      buf=await decodeBlob(rawAudioToBlob(raw));cachePut(key,buf);await Promise.resolve();
    }
    const start=2+block.firstIndex*slot,slotCount=Math.max(1,block.lastIndex-block.firstIndex+1);
    scheduleSpeechBlock(ctx,bus.input,buf,start,slot*slotCount,block.section,block.firstIndex,level);
  }
  onStatus?.(`Rendering ${gender} vocal stem…`);
  return await ctx.startRendering();
}
function dominantVowel(s){const m=String(s).toLowerCase().match(/[aeiou]/g);if(!m?.length)return'a';const c={a:0,e:0,i:0,o:0,u:0};for(const x of m)c[x]++;return Object.entries(c).sort((a,b)=>b[1]-a[1])[0][0];}
const FORMANTS={a:[800,1150,2900],e:[500,1700,2500],i:[350,2000,2800],o:[450,800,2830],u:[325,700,2530]};
function addFallbackPhrase(ctx,dest,start,dur,f0,text,amp){const vowel=dominantVowel(text),forms=FORMANTS[vowel]||FORMANTS.a,osc=ctx.createOscillator(),gain=ctx.createGain(),hp=ctx.createBiquadFilter();osc.type='sawtooth';osc.frequency.setValueAtTime(f0,start);hp.type='highpass';hp.frequency.value=80;for(let t=start;t<start+dur;t+=.12)osc.frequency.setValueAtTime(f0*(1+Math.sin((t-start)*Math.PI*9)*.006),t);gain.gain.setValueAtTime(.0001,start);gain.gain.linearRampToValueAtTime(amp,start+.07);gain.gain.setValueAtTime(amp*.9,Math.max(start+.1,start+dur-.1));gain.gain.linearRampToValueAtTime(.0001,start+dur);osc.connect(hp).connect(gain).connect(dest);osc.start(start);osc.stop(start+dur+.02);forms.forEach((freq,idx)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(.0001,start);g.gain.linearRampToValueAtTime(amp*[.10,.06,.03][idx],start+.06);g.gain.linearRampToValueAtTime(.0001,start+dur);o.connect(g).connect(dest);o.start(start);o.stop(start+dur+.02);});}
async function renderFallbackGenderStem(instrumental,records,gender,level,onStatus){const relevant=records.filter(r=>r.singers.includes(gender));if(!relevant.length)return null;const sr=instrumental.sampleRate,ctx=new OfflineAudioContext(2,instrumental.length,sr),bus=setupVocalBus(ctx,gender),slot=Math.max(1.45,(instrumental.duration-4)/Math.max(1,records.length));bus.out.connect(ctx.destination);const base=gender==='female'?196:110;relevant.forEach(r=>{const pattern=sectionPattern(r.section),semi=pattern[r.index%pattern.length],start=2+r.index*slot,dur=Math.min(slot*.78,3.0);addFallbackPhrase(ctx,bus.input,start,dur,base*semitoneRatio(semi),r.text,Math.min(.22,.16*level));});onStatus?.(`Rendering synthetic ${gender} fallback…`);return await ctx.startRendering();}
async function mixVocalStems(instrumental,male,female){const ctx=new OfflineAudioContext(2,instrumental.length,instrumental.sampleRate),comp=ctx.createDynamicsCompressor();comp.threshold.value=-14;comp.knee.value=20;comp.ratio.value=2.5;comp.attack.value=.004;comp.release.value=.18;comp.connect(ctx.destination);for(const stem of[male,female])if(stem){const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=stem;g.gain.value=.82;s.connect(g).connect(comp);s.start(0);}return await ctx.startRendering();}
async function mixMaster(instrumental,vocals,level){const ctx=new OfflineAudioContext(2,instrumental.length,instrumental.sampleRate),comp=ctx.createDynamicsCompressor(),inst=ctx.createBufferSource(),voc=ctx.createBufferSource(),ig=ctx.createGain(),vg=ctx.createGain();inst.buffer=instrumental;voc.buffer=vocals;ig.gain.value=.76;vg.gain.value=clamp(level,.4,1.2);comp.threshold.value=-10;comp.knee.value=20;comp.ratio.value=3.4;comp.attack.value=.003;comp.release.value=.2;inst.connect(ig).connect(comp);voc.connect(vg).connect(comp);comp.connect(ctx.destination);inst.start(0);voc.start(0);return await ctx.startRendering();}

export async function preloadVocalModel(performanceMode='auto'){
  try{return await loadModel(()=>{},performanceMode);}catch(_){return null;}
}

export async function renderVocalMix({instrumentalBuffer,lyrics,arrangement='male',maleVoice='am_michael',femaleVoice='af_heart',level=.9,mode='neural',performanceMode='auto',chorusTogether=true,onStatus}){
  const lines=parseLyricLines(lyrics);if(!lines.length)throw new Error('No lyric lines were available for the singer.');if(mode==='instrumental')return{engine:'instrumental',arrangementResolved:'instrumental',masterBuffer:instrumentalBuffer,masterBlob:audioBufferToWav(instrumentalBuffer),vocalStemBuffer:null,vocalStemBlob:null,maleStemBlob:null,femaleStemBlob:null,warning:null};
  const records=assignSingers(lines,arrangement,chorusTogether);let male=null,female=null,engine='neural',warning=null;
  if(mode==='neural'){
    try{const tts=await loadModel(onStatus,performanceMode);male=await renderNeuralGenderStem(instrumentalBuffer,records,'male',maleVoice,level,tts,onStatus,performanceMode);female=await renderNeuralGenderStem(instrumentalBuffer,records,'female',femaleVoice,level,tts,onStatus,performanceMode);}
    catch(err){warning=`Fast Local neural vocals could not load (${err?.message||err}). A lightweight synthetic fallback was used.`;onStatus?.('Neural vocals unavailable — finishing with lightweight fallback…');engine='local-fallback';male=await renderFallbackGenderStem(instrumentalBuffer,records,'male',level,onStatus);female=await renderFallbackGenderStem(instrumentalBuffer,records,'female',level,onStatus);}
  }else{engine='local';male=await renderFallbackGenderStem(instrumentalBuffer,records,'male',level,onStatus);female=await renderFallbackGenderStem(instrumentalBuffer,records,'female',level,onStatus);}
  const combined=await mixVocalStems(instrumentalBuffer,male,female),master=await mixMaster(instrumentalBuffer,combined,level);
  const result={engine,arrangementResolved:arrangement,masterBuffer:master,masterBlob:audioBufferToWav(master),vocalStemBuffer:combined,vocalStemBlob:audioBufferToWav(combined),maleStemBlob:male?audioBufferToWav(male):null,femaleStemBlob:female?audioBufferToWav(female):null,warning};
  if(IS_MOBILE)lineCache.clear();
  return result;
}
window.CV_VOCALS={renderVocalMix,preloadVocalModel,modelId:MODEL_ID,library:'kokoro-js 1.2.1-mobile-safe'};

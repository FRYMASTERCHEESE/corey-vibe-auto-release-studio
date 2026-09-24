const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const KOKORO_CDN = 'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm';
let modelPromise = null;

function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function semitoneRatio(n){ return Math.pow(2,n/12); }
function parseLyricLines(text){
  let section='verse';
  const out=[];
  for(const raw of String(text||'').split(/\r?\n/)){
    const line=raw.trim(); if(!line) continue;
    const tag=line.match(/^\[([^\]]+)\]$/);
    if(tag){ section=tag[1].toLowerCase(); continue; }
    if(/^\[title:/i.test(line)) continue;
    out.push({text:line.replace(/^[-•]\s*/,''),section});
  }
  return out.slice(0,40);
}
function sectionPattern(section){
  if(/final/.test(section)) return [5,7,9,12];
  if(/chorus|hook/.test(section)) return [4,7,9,7];
  if(/pre/.test(section)) return [2,4,5,7];
  if(/bridge/.test(section)) return [0,3,5,7];
  return [0,2,4,2];
}
function voiceRange(voice){
  if(String(voice).startsWith('af_')||String(voice).startsWith('bf_')) return {base:196,amp:.72};
  if(String(voice).startsWith('bm_')) return {base:123.47,amp:.8};
  return {base:110,amp:.84};
}
function dominantVowel(s){
  const m=String(s).toLowerCase().match(/[aeiou]/g); if(!m?.length) return 'a';
  const c={a:0,e:0,i:0,o:0,u:0}; for(const x of m)c[x]++; return Object.entries(c).sort((a,b)=>b[1]-a[1])[0][0];
}
const FORMANTS={
  a:[800,1150,2900], e:[500,1700,2500], i:[350,2000,2800], o:[450,800,2830], u:[325,700,2530]
};
function addFallbackPhrase(ctx,dest,start,dur,f0,text,amp){
  const vowel=dominantVowel(text), forms=FORMANTS[vowel]||FORMANTS.a;
  const osc=ctx.createOscillator(), gain=ctx.createGain(), hp=ctx.createBiquadFilter();
  osc.type='sawtooth'; osc.frequency.setValueAtTime(f0,start);
  for(let t=start;t<start+dur;t+=.18){ const vibr=1+Math.sin((t-start)*Math.PI*8)*.008; osc.frequency.setValueAtTime(f0*vibr,t); }
  hp.type='highpass'; hp.frequency.value=80;
  gain.gain.setValueAtTime(.0001,start); gain.gain.linearRampToValueAtTime(amp,start+.08); gain.gain.setValueAtTime(amp*.92,Math.max(start+.1,start+dur-.12)); gain.gain.linearRampToValueAtTime(.0001,start+dur);
  osc.connect(hp).connect(gain).connect(dest);
  osc.start(start); osc.stop(start+dur+.02);
  forms.forEach((freq,idx)=>{
    const o=ctx.createOscillator(), g=ctx.createGain(); o.type='sine'; o.frequency.value=freq;
    g.gain.setValueAtTime(.0001,start); g.gain.linearRampToValueAtTime(amp*[.11,.07,.035][idx],start+.08); g.gain.linearRampToValueAtTime(.0001,start+dur);
    o.connect(g).connect(dest); o.start(start); o.stop(start+dur+.02);
  });
}
async function loadModel(onStatus){
  if(!modelPromise){
    modelPromise=(async()=>{
      onStatus?.('Loading the free on-device singer model for the first time…');
      const mod=await import(KOKORO_CDN);
      const KokoroTTS=mod.KokoroTTS;
      if(!KokoroTTS) throw new Error('Kokoro singer library did not load.');
      return await KokoroTTS.from_pretrained(MODEL_ID,{dtype:'q8',device:'wasm'});
    })();
  }
  return modelPromise;
}
function rawAudioToBlob(audio){
  if(!audio) throw new Error('Singer returned no audio.');
  if(typeof audio.toBlob==='function') return audio.toBlob();
  if(audio.blob instanceof Blob) return audio.blob;
  if(audio.buffer instanceof ArrayBuffer) return new Blob([audio.buffer],{type:'audio/wav'});
  if(ArrayBuffer.isView(audio.data) && Number(audio.sampling_rate||audio.sample_rate)){
    const sr=Number(audio.sampling_rate||audio.sample_rate), data=audio.data;
    const ab=new ArrayBuffer(44+data.length*2),v=new DataView(ab);let o=0;
    const w=s=>{for(const ch of s)v.setUint8(o++,ch.charCodeAt(0));};
    w('RIFF');v.setUint32(o,36+data.length*2,true);o+=4;w('WAVE');w('fmt ');v.setUint32(o,16,true);o+=4;v.setUint16(o,1,true);o+=2;v.setUint16(o,1,true);o+=2;v.setUint32(o,sr,true);o+=4;v.setUint32(o,sr*2,true);o+=4;v.setUint16(o,2,true);o+=2;v.setUint16(o,16,true);o+=2;w('data');v.setUint32(o,data.length*2,true);o+=4;
    for(let i=0;i<data.length;i++){const s=clamp(data[i],-1,1);v.setInt16(o,s<0?s*0x8000:s*0x7fff,true);o+=2;}
    return new Blob([ab],{type:'audio/wav'});
  }
  throw new Error('Unsupported singer audio format.');
}
async function decodeBlob(blob){
  const AC=window.AudioContext||window.webkitAudioContext; if(!AC) throw new Error('AudioContext unavailable for vocal decoding.');
  const ctx=new AC();
  try{return await ctx.decodeAudioData((await blob.arrayBuffer()).slice(0));}finally{try{await ctx.close();}catch(_){}}
}
function audioBufferToWav(buffer){
  const channels=buffer.numberOfChannels,sr=buffer.sampleRate,len=buffer.length,align=channels*2;
  const ab=new ArrayBuffer(44+len*align),v=new DataView(ab);let o=0;const w=s=>{for(let i=0;i<s.length;i++)v.setUint8(o++,s.charCodeAt(i));};
  w('RIFF');v.setUint32(o,36+len*align,true);o+=4;w('WAVE');w('fmt ');v.setUint32(o,16,true);o+=4;v.setUint16(o,1,true);o+=2;v.setUint16(o,channels,true);o+=2;v.setUint32(o,sr,true);o+=4;v.setUint32(o,sr*align,true);o+=4;v.setUint16(o,align,true);o+=2;v.setUint16(o,16,true);o+=2;w('data');v.setUint32(o,len*align,true);o+=4;
  const ch=Array.from({length:channels},(_,i)=>buffer.getChannelData(i));
  for(let i=0;i<len;i++)for(let c=0;c<channels;c++){let s=clamp(ch[c][i],-1,1);v.setInt16(o,s<0?s*0x8000:s*0x7fff,true);o+=2;}
  return new Blob([ab],{type:'audio/wav'});
}
function setupVocalBus(ctx){
  const input=ctx.createGain(),hp=ctx.createBiquadFilter(),lp=ctx.createBiquadFilter(),comp=ctx.createDynamicsCompressor(),delay=ctx.createDelay(1),fb=ctx.createGain(),wet=ctx.createGain(),out=ctx.createGain();
  hp.type='highpass';hp.frequency.value=85;lp.type='lowpass';lp.frequency.value=9500;comp.threshold.value=-18;comp.knee.value=22;comp.ratio.value=3.2;comp.attack.value=.004;comp.release.value=.18;
  delay.delayTime.value=.16;fb.gain.value=.16;wet.gain.value=.13;out.gain.value=.95;
  input.connect(hp).connect(lp).connect(comp).connect(out);comp.connect(delay);delay.connect(fb).connect(delay);delay.connect(wet).connect(out);
  return {input,out};
}
async function renderFallbackStem(instrumental,lines,bpm,voice,level,onStatus){
  const sr=instrumental.sampleRate,frames=instrumental.length,ctx=new OfflineAudioContext(2,frames,sr),bus=setupVocalBus(ctx),slot=Math.max(1.6,(instrumental.duration-4)/Math.max(1,lines.length)),range=voiceRange(voice);
  bus.out.connect(ctx.destination);
  lines.forEach((line,i)=>{const pattern=sectionPattern(line.section),semi=pattern[i%pattern.length]-2,f0=range.base*semitoneRatio(semi),start=2+i*slot,dur=Math.min(slot*.78,3.2);addFallbackPhrase(ctx,bus.input,start,dur,f0,line.text,Math.min(.22,.17*Number(level||.86)*range.amp));});
  onStatus?.('Rendering lightweight sung-vocal fallback…'); return await ctx.startRendering();
}
async function renderNeuralStem(instrumental,lines,bpm,voice,level,onStatus){
  const tts=await loadModel(onStatus), chunks=[];
  for(let i=0;i<lines.length;i++){
    onStatus?.(`Generating singer voice ${i+1}/${lines.length}…`);
    const a=await tts.generate(lines[i].text,{voice,speed:.9});
    const decoded=await decodeBlob(rawAudioToBlob(a)); chunks.push(decoded);
    await new Promise(r=>setTimeout(r,0));
  }
  const sr=instrumental.sampleRate,frames=instrumental.length,ctx=new OfflineAudioContext(2,frames,sr),bus=setupVocalBus(ctx),slot=Math.max(1.6,(instrumental.duration-4)/Math.max(1,lines.length));bus.out.connect(ctx.destination);
  chunks.forEach((buf,i)=>{
    const line=lines[i],pattern=sectionPattern(line.section),semi=pattern[i%pattern.length]-2,start=2+i*slot,src=ctx.createBufferSource(),g=ctx.createGain();src.buffer=buf;
    const fit=Math.max(1,buf.duration/(slot*.86));src.playbackRate.value=fit;src.detune.value=semi*100;g.gain.value=clamp(Number(level||.86),.35,1.2);
    src.connect(g).connect(bus.input);src.start(start,0,Math.min(buf.duration,slot*.96*fit));
  });
  onStatus?.('Rhythmically tuning and rendering the singer…');return await ctx.startRendering();
}
async function mixMaster(instrumental,vocalStem,vocalLevel){
  const sr=instrumental.sampleRate,frames=instrumental.length,ctx=new OfflineAudioContext(2,frames,sr),inst=ctx.createBufferSource(),voc=ctx.createBufferSource(),ig=ctx.createGain(),vg=ctx.createGain(),comp=ctx.createDynamicsCompressor();
  inst.buffer=instrumental;voc.buffer=vocalStem;ig.gain.value=.78;vg.gain.value=clamp(Number(vocalLevel||.86),.4,1.15);comp.threshold.value=-10;comp.knee.value=20;comp.ratio.value=3.5;comp.attack.value=.003;comp.release.value=.2;
  inst.connect(ig).connect(comp);voc.connect(vg).connect(comp);comp.connect(ctx.destination);inst.start(0);voc.start(0);return await ctx.startRendering();
}

async function renderVocalMix({instrumentalBuffer,lyrics,bpm,voice='am_michael',level=.86,mode='neural',onStatus}){
  const lines=parseLyricLines(lyrics);
  if(!lines.length) throw new Error('No lyric lines were available for the singer.');
  if(mode==='instrumental') return {engine:'instrumental',masterBuffer:instrumentalBuffer,masterBlob:audioBufferToWav(instrumentalBuffer),vocalStemBlob:null,vocalStemBuffer:null,warning:null};
  let stem,engine='neural',warning=null;
  if(mode==='neural'){
    try{stem=await renderNeuralStem(instrumentalBuffer,lines,bpm,voice,level,onStatus);}
    catch(err){warning=`Neural singer could not load (${err?.message||err}). The site automatically used the lightweight singing voice instead.`;onStatus?.('Neural singer unavailable — using the built-in singing fallback…');stem=await renderFallbackStem(instrumentalBuffer,lines,bpm,voice,level,onStatus);engine='local-fallback';}
  }else{stem=await renderFallbackStem(instrumentalBuffer,lines,bpm,voice,level,onStatus);engine='local';}
  const master=await mixMaster(instrumentalBuffer,stem,level);return {engine,masterBuffer:master,masterBlob:audioBufferToWav(master),vocalStemBuffer:stem,vocalStemBlob:audioBufferToWav(stem),warning};
}

window.CV_VOCALS={renderVocalMix,modelId:MODEL_ID,library:'kokoro-js 1.2.1'};
window.dispatchEvent(new CustomEvent('cv-vocals-ready'));

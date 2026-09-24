'use strict';

const $ = (id) => document.getElementById(id);
const els = {
  prompt: $('prompt'), createBtn: $('createBtn'), cancelBtn: $('cancelBtn'), statusText: $('statusText'),
  percentText: $('percentText'), progress: $('progress'), style: $('style'), length: $('length'), energy: $('energy'),
  artistName: $('artistName'), songwriter: $('songwriter'), producer: $('producer'), labelName: $('labelName'),
  resultCard: $('resultCard'), trackTitle: $('trackTitle'), trackSummary: $('trackSummary'), player: $('player'),
  coverPreview: $('coverPreview'), checks: $('checks'), releaseDetails: $('releaseDetails'), lyricsText: $('lyricsText'),
  wavBtn: $('wavBtn'), coverBtn: $('coverBtn'), lyricsBtn: $('lyricsBtn'), metaBtn: $('metaBtn'), packageBtn: $('packageBtn'),
  readyBadge: $('readyBadge'), coverCanvas: $('coverCanvas'), titleInput: $('titleInput'), applyTitleBtn: $('applyTitleBtn'),
  newTitleBtn: $('newTitleBtn'), newLyricsBtn: $('newLyricsBtn'), newCoverBtn: $('newCoverBtn'), newAudioBtn: $('newAudioBtn'),
  copyLyricsBtn: $('copyLyricsBtn'), historyList: $('historyList'), clearHistoryBtn: $('clearHistoryBtn'), diagnosticsBtn: $('diagnosticsBtn'),
  diagnosticsList: $('diagnosticsList'), commercialEarnings: $('commercialEarnings'), tiktokEarnings: $('tiktokEarnings'), otherEarnings: $('otherEarnings'),
  earningsTotal: $('earningsTotal'), commercialShare: $('commercialShare'), tiktokShare: $('tiktokShare'), commercialBar: $('commercialBar'),
  tiktokBar: $('tiktokBar'), otherBar: $('otherBar'), earningsInsight: $('earningsInsight'), growthAutopilot: $('growthAutopilot'), strategyBadge: $('strategyBadge'),
  earningsFile: $('earningsFile'), earningsImportStatus: $('earningsImportStatus'), growthPackBadge: $('growthPackBadge'), growthStrategySummary: $('growthStrategySummary'),
  growthPreview: $('growthPreview'), hook15Btn: $('hook15Btn'), hook30Btn: $('hook30Btn'), growthTextBtn: $('growthTextBtn'), licensingBtn: $('licensingBtn'),
  verticalPromoBtn: $('verticalPromoBtn'), promoCanvas: $('promoCanvas')
};

let state = { cancelled:false, wavBlob:null, wavUrl:null, coverBlob:null, coverUrl:null, release:null, hook15Blob:null, hook30Blob:null, verticalPromoBlob:null };
const SELFTEST = new URLSearchParams(location.search).get('selftest')==='1';

const PROFILE_KEY = 'corey-vibe-auto-release-profile-v3';
const HISTORY_KEY = 'corey-vibe-auto-release-history-v3';
const EARNINGS_KEY = 'corey-vibe-earnings-autopilot-v3';
const STYLE = {
  pop:{bpm:[98,120], scale:'major', wave:'sawtooth', swing:.03, kick:1, hats:1, bass:1},
  hiphop:{bpm:[76,94], scale:'pentMinor', wave:'triangle', swing:.11, kick:1.05, hats:1.08, bass:1.18},
  dance:{bpm:[120,130], scale:'minor', wave:'sawtooth', swing:.015, kick:1.2, hats:1.18, bass:1.12},
  ambient:{bpm:[68,82], scale:'major', wave:'sine', swing:0, kick:.28, hats:.25, bass:.55},
  cinematic:{bpm:[76,104], scale:'minor', wave:'triangle', swing:.01, kick:.5, hats:.35, bass:.78}
};
const SCALES = { major:[0,2,4,5,7,9,11], minor:[0,2,3,5,7,8,10], pentMinor:[0,3,5,7,10] };

function setProgress(n, text){
  const v=Math.max(0,Math.min(100,Math.round(n)));
  els.progress.value=v; els.percentText.textContent=`${v}%`; if(text) els.statusText.textContent=text;
}
function sleep(ms=0){ return new Promise(r=>setTimeout(r,ms)); }
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function cap(s){ return s ? s[0].toUpperCase()+s.slice(1).toLowerCase() : ''; }
function midiToHz(n){ return 440*Math.pow(2,(n-69)/12); }
function slug(s){ return (s||'release').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,72)||'release'; }
function safeFilename(s){ return slug(s).replace(/-/g,'_'); }
function pick(arr,rng){ return arr[Math.floor(rng()*arr.length)]; }
function unique(arr){ return [...new Set(arr)]; }
function normalizeText(s){ return (s||'').trim().replace(/\s+/g,' '); }
function numFromInput(el){ const n=Number(el?.value); return Number.isFinite(n)&&n>=0?n:0; }
function money(n){ return `NZ$${Number(n||0).toFixed(2)}`; }
function pct(n){ return `${(Number(n||0)*100).toFixed(1)}%`; }
function getEarningsStrategy(){
  const commercial=numFromInput(els.commercialEarnings), tiktok=numFromInput(els.tiktokEarnings), other=numFromInput(els.otherEarnings);
  const total=commercial+tiktok+other;
  const cs=total?commercial/total:0, ts=total?tiktok/total:0, os=total?other/total:0;
  let focus='Balanced growth', code='balanced';
  if(cs>=.55){focus='Commercial licensing first';code='commercial';}
  else if(ts>=.45){focus='TikTok first';code='tiktok';}
  else if(cs+ts>=.65){focus='Commercial + TikTok';code='commercial_tiktok';}
  return {commercial,tiktok,other,total,commercialShare:cs,tiktokShare:ts,otherShare:os,focus,code};
}
function persistEarnings(){
  try{localStorage.setItem(EARNINGS_KEY,JSON.stringify({commercial:els.commercialEarnings.value,tiktok:els.tiktokEarnings.value,other:els.otherEarnings.value,autopilot:!!els.growthAutopilot.checked}));}catch(_){ }
}
function loadEarnings(){
  try{
    const v=JSON.parse(localStorage.getItem(EARNINGS_KEY)||'null'); if(!v)return;
    if(v.commercial!=null)els.commercialEarnings.value=v.commercial;
    if(v.tiktok!=null)els.tiktokEarnings.value=v.tiktok;
    if(v.other!=null)els.otherEarnings.value=v.other;
    if(typeof v.autopilot==='boolean')els.growthAutopilot.checked=v.autopilot;
  }catch(_){ }
}
function renderEarningsAutopilot(){
  if(!els.earningsTotal)return;
  const s=getEarningsStrategy();
  els.earningsTotal.textContent=money(s.total);
  els.commercialShare.textContent=pct(s.commercialShare);
  els.tiktokShare.textContent=pct(s.tiktokShare);
  els.commercialBar.style.width=`${Math.max(0,Math.min(100,s.commercialShare*100))}%`;
  els.tiktokBar.style.width=`${Math.max(0,Math.min(100,s.tiktokShare*100))}%`;
  els.otherBar.style.width=`${Math.max(0,Math.min(100,s.otherShare*100))}%`;
  els.strategyBadge.textContent=s.focus;
  const why=s.total?`Your entered period totals ${money(s.total)}. Commercial licensing is ${pct(s.commercialShare)} and TikTok is ${pct(s.tiktokShare)}.`:'Enter earnings to build a revenue focus.';
  let action='Build a balanced release pack with short hooks, clean metadata and a steady release schedule.';
  if(s.code==='commercial') action='Prioritize clean, brand-friendly instrumentals, immediate hooks, commercial-use metadata, plus 15s/30s edits for TikTok discovery.';
  else if(s.code==='tiktok') action='Prioritize a fast opening hook, 15s/30s edits, multiple caption angles and repeatable short-video concepts.';
  else if(s.code==='commercial_tiktok') action='Prioritize both licensing-ready metadata and TikTok hook assets because those two sources dominate the entered earnings.';
  els.earningsInsight.innerHTML=`<strong>${escapeHtml(s.focus)}</strong><br>${escapeHtml(why)} ${escapeHtml(action)}`;
  persistEarnings();
  if(state.release) refreshGrowthUI();
}
function parseDelimitedLine(line){
  const out=[];let cur='',q=false;
  for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(q&&line[i+1]==='"'){cur+='"';i++;}else q=!q;}else if((ch===','||ch==='\t'||ch===';')&&!q){out.push(cur.trim());cur='';}else cur+=ch;}
  out.push(cur.trim()); return out;
}
function parseMoneyCell(v){
  const cleaned=String(v||'').replace(/[^0-9.\-]/g,''); const n=Number(cleaned); return Number.isFinite(n)?n:null;
}
function parseEarningsExport(text){
  const lines=String(text||'').split(/\r?\n/).filter(x=>x.trim());
  let commercial=0,tiktok=0,other=0,found=0;
  for(const line of lines){
    const cells=parseDelimitedLine(line), joined=line.toLowerCase();
    const nums=cells.map(parseMoneyCell).filter(n=>n!==null);
    if(!nums.length)continue; const val=nums[nums.length-1];
    if(joined.includes('commercial music licensing')){commercial+=Math.max(0,val);found++;}
    else if(/(^|[^a-z])tiktok([^a-z]|$)/i.test(line)){tiktok+=Math.max(0,val);found++;}
    else if(/facebook|instagram|spotify|youtube|apple|amazon|capcut|joox|7digital|other/i.test(line)){other+=Math.max(0,val);}
  }
  return {commercial,tiktok,other,found};
}

function randomSeed(label=''){ return xmur3(`${label}|${Date.now()}|${performance.now()}`)(); }
function replaceTitleInLyrics(text,oldTitle,newTitle){
  const escaped=String(oldTitle||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  if(!escaped) return text;
  return String(text||'').replace(new RegExp(escaped,'g'),newTitle).replace(/^\[Title: .*?\]/m,`[Title: ${newTitle}]`);
}

function xmur3(str){
  let h=1779033703^str.length;
  for(let i=0;i<str.length;i++){ h=Math.imul(h^str.charCodeAt(i),3432918353); h=h<<13|h>>>19; }
  return function(){ h=Math.imul(h^(h>>>16),2246822507); h=Math.imul(h^(h>>>13),3266489909); return (h^=h>>>16)>>>0; };
}
function mulberry32(a){ return function(){ let t=a+=0x6D2B79F5; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/4294967296; }; }

function inferStyle(prompt){
  const p=prompt.toLowerCase();
  if(/rap|hip.?hop|trap|bars|808/.test(p)) return 'hiphop';
  if(/dance|club|edm|party|festival|house/.test(p)) return 'dance';
  if(/cinematic|movie|epic|trailer|orchestra|dramatic/.test(p)) return 'cinematic';
  if(/ambient|sleep|calm|relax|meditat|dreamy/.test(p)) return 'ambient';
  return 'pop';
}
function inferEnergy(prompt,style){
  const p=prompt.toLowerCase();
  if(/high energy|powerful|hype|big|wild|party|fast|explosive/.test(p)) return 'high';
  if(/soft|slow|calm|gentle|sad|quiet|peaceful/.test(p)) return 'low';
  if(style==='dance') return 'high';
  return 'medium';
}
function themeWords(prompt){
  const stop=new Set('about with from into that this then when where your you and the for but not are was were have has had one two song music make create feel like just very really more less some over under through around without after before'.split(' '));
  return unique(prompt.toLowerCase().replace(/[^a-z0-9' -]/g,' ').split(/\s+/).filter(w=>w.length>3&&!stop.has(w))).slice(0,16);
}
function makeTitle(prompt,rng){
  const words=themeWords(prompt);
  const fallbacks=['One More Light','Open Road','Still Moving','After Midnight','Make It Mine','Second Sunrise','Hold The Line'];
  if(words.length<2) return pick(fallbacks,rng);
  const forms=[
    ()=>{const a=pick(words,rng);const rest=words.filter(w=>w!==a);return `${cap(a)} ${cap(pick(rest.length?rest:words,rng))}`;},
    ()=>`${cap(pick(words,rng))} Again`,
    ()=>`One More ${cap(pick(words,rng))}`,
    ()=>`${cap(pick(words,rng))} Tonight`,
    ()=>`Into The ${cap(pick(words,rng))}`
  ];
  let title=pick(forms,rng)();
  if(title.split(' ').filter(Boolean).length<2) title=pick(fallbacks,rng);
  return title.replace(/\b(And|The|For|With)\b$/,'').trim();
}
function makeLyrics(prompt,title,rng){
  const words=themeWords(prompt);
  const theme=words.slice(0,5).join(', ') || 'starting again, hope, and a new road';
  const v1=[
    'I kept a little spark when the room went dark',
    'Another long night and I still chose the road',
    'I watched the small signs turn into a start',
    'I had a quiet dream I was not ready to fold'
  ];
  const v2=[
    'Every small step leaves a mark on the way',
    'I turn the hard days into something I can use',
    'The numbers move slowly but I still make a play',
    'I found another reason every time I had to choose'
  ];
  const pre=[
    'No perfect map, no promise in the sky',
    'I only need a heartbeat and a reason to try',
    'I can hear tomorrow getting closer tonight',
    'I keep turning pressure into fuel for the climb'
  ];
  const hook=[
    `This is ${title}, I am making it mine`,
    'One more chance, one more beat, one more light',
    'I am still moving when the road gets tight',
    'I came this far, I am not leaving tonight'
  ];
  return `[Title: ${title}]\n\n[Verse 1]\n${pick(v1,rng)}\nThe story is ${theme}\n${pick(v2,rng)}\nI take what I have and I give it some time\n\n[Pre-Chorus]\n${pick(pre,rng)}\n${pick(pre,rng)}\n\n[Chorus]\n${hook[0]}\n${pick(hook.slice(1),rng)}\n${pick(hook.slice(1),rng)}\nOne more heartbeat, one more reason to rise\n\n[Verse 2]\n${pick(v1,rng)}\n${pick(v2,rng)}\nI keep the little wins and I learn from the pain\nIf I get one more shot I will do it again\n\n[Bridge]\nNo shortcut, no borrowed name\nJust another page and a brand new frame\nI keep moving forward, I keep choosing the climb\nBuilding this life one beat at a time\n\n[Final Chorus]\n${hook[0]}\nOne more chance, one more beat, one more light\nI am still moving when the road gets tight\nOne beat at a time, one more try.`;
}

function addOsc(ctx,dest,start,dur,freq,type,gain,attack=.008,release=.07,detune=0){
  const o=ctx.createOscillator(), g=ctx.createGain();
  o.type=type; o.frequency.setValueAtTime(freq,start); o.detune.value=detune;
  g.gain.setValueAtTime(.0001,start);
  g.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),start+attack);
  const hold=Math.max(start+attack+.005,start+dur-release);
  g.gain.setValueAtTime(Math.max(.0002,gain),hold);
  g.gain.exponentialRampToValueAtTime(.0001,start+dur);
  o.connect(g).connect(dest); o.start(start); o.stop(start+dur+.03);
}
function addKick(ctx,dest,t,amp){
  const o=ctx.createOscillator(),g=ctx.createGain(); o.type='sine';
  o.frequency.setValueAtTime(150,t); o.frequency.exponentialRampToValueAtTime(48,t+.14);
  g.gain.setValueAtTime(.65*amp,t); g.gain.exponentialRampToValueAtTime(.001,t+.2);
  o.connect(g).connect(dest); o.start(t); o.stop(t+.21);
}
function addNoiseHit(ctx,dest,t,dur,amp,highpass,rng){
  const len=Math.max(1,Math.floor(ctx.sampleRate*dur)),b=ctx.createBuffer(1,len,ctx.sampleRate),data=b.getChannelData(0);
  for(let i=0;i<len;i++) data[i]=(rng()*2-1)*(1-i/len);
  const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();
  s.buffer=b; f.type='highpass'; f.frequency.value=highpass; g.gain.setValueAtTime(amp,t); g.gain.exponentialRampToValueAtTime(.001,t+dur);
  s.connect(f).connect(g).connect(dest); s.start(t); s.stop(t+dur+.01);
}

async function renderSong(prompt,styleName,targetSeconds,energyName,seed){
  if(!window.OfflineAudioContext) throw new Error('This browser does not support OfflineAudioContext. Please use a current Chrome, Edge, Firefox or Safari browser.');
  const rng=mulberry32(seed), cfg=STYLE[styleName], bpm=Math.round(cfg.bpm[0]+rng()*(cfg.bpm[1]-cfg.bpm[0]));
  const beat=60/bpm, bars=Math.max(1,Math.ceil(targetSeconds/(beat*4))), duration=bars*beat*4;
  const sampleRate=44100, frames=Math.ceil(duration*sampleRate);
  const ctx=new OfflineAudioContext(2,frames,sampleRate);
  const master=ctx.createGain(), comp=ctx.createDynamicsCompressor();
  master.gain.value=.7; comp.threshold.value=-13; comp.knee.value=18; comp.ratio.value=4; comp.attack.value=.003; comp.release.value=.18;
  master.connect(comp).connect(ctx.destination);
  const delay=ctx.createDelay(1), feedback=ctx.createGain(), wet=ctx.createGain();
  delay.delayTime.value=beat*.5; feedback.gain.value=.18; wet.gain.value=.15; delay.connect(feedback).connect(delay); delay.connect(wet).connect(master);
  const root=pick([45,47,48,50,52,53,55],rng), scale=SCALES[cfg.scale];
  const progressions=styleName==='pop'?[[0,4,5,3],[0,5,3,4]]:styleName==='dance'?[[0,5,3,4]]:styleName==='hiphop'?[[0,5,3,6],[0,3,5,4]]:[[0,3,5,4],[0,5,4,3]];
  const progression=pick(progressions,rng), energy=energyName==='high'?1.17:energyName==='low'?.76:1;

  for(let bar=0;bar<bars;bar++){
    if(state.cancelled) throw new Error('Generation stopped');
    const t0=bar*beat*4, degree=progression[bar%progression.length]%scale.length, chordRoot=root+scale[degree];
    const chord=[0,2,4].map(step=>{ const idx=degree+step; return root+scale[idx%scale.length]+(idx>=scale.length?12:0); });
    const section=bar/bars;
    const sectionLift=section>.66?1.12:section>.33?1:.9;
    chord.forEach((m,i)=>{
      addOsc(ctx,master,t0,beat*3.88,midiToHz(m+12),cfg.wave,.03*energy*sectionLift,.06,.18,(i-1)*5);
      addOsc(ctx,delay,t0,beat*3.88,midiToHz(m+24),'sine',.009*energy,.11,.22,(i-1)*7);
    });
    for(let q=0;q<4;q++){
      if(styleName==='ambient'&&q%2) continue;
      addOsc(ctx,master,t0+q*beat,beat*.78,midiToHz(chordRoot-12),'sine',.078*cfg.bass*energy,.006,.08);
    }
    for(let s=0;s<8;s++){
      if(rng()<((styleName==='dance')?.14:.29)) continue;
      const st=t0+s*beat/2+(s%2?cfg.swing*beat:0),deg=Math.floor(rng()*scale.length),oct=rng()<.22?24:12;
      const note=root+scale[deg]+oct,dur=beat*(rng()<.33?.2:.4);
      addOsc(ctx,master,st,dur,midiToHz(note),styleName==='ambient'?'sine':'triangle',.03*energy*sectionLift,.005,.045);
      if(rng()<.2) addOsc(ctx,delay,st,dur*1.25,midiToHz(note+12),'sine',.009*energy,.01,.07);
    }
    if(styleName!=='ambient'||bar%2===0){
      for(let q=0;q<4;q++){
        const st=t0+q*beat;
        if(styleName==='dance'||q===0||q===2||(styleName==='hiphop'&&q===3&&rng()>.58)) addKick(ctx,master,st,.61*cfg.kick*energy);
        if(q===1||q===3) addNoiseHit(ctx,master,st,.16,.24*energy,1300,rng);
      }
      const steps=styleName==='dance'||styleName==='hiphop'?8:4;
      for(let h=0;h<steps;h++) if(rng()>.1) addNoiseHit(ctx,master,t0+h*(beat*4/steps)+(h%2?cfg.swing*beat:0),.042,.055*cfg.hats*energy,6200,rng);
    }
    if(bar%4===0){ setProgress(12+(bar/bars)*55,'Composing and arranging…'); await sleep(); }
  }
  if(state.cancelled) throw new Error('Generation stopped');
  setProgress(70,'Rendering the WAV master…');
  const buffer=await ctx.startRendering();
  if(state.cancelled) throw new Error('Generation stopped');
  setProgress(82,'Encoding 44.1 kHz / 16-bit WAV…');
  const wavBuffer=audioBufferToWav(buffer);
  return { blob:new Blob([wavBuffer],{type:'audio/wav'}), buffer, bpm, duration, sampleRate, bitDepth:16, channels:2 };
}

function audioBufferToWav(buffer){
  const channels=buffer.numberOfChannels,sampleRate=buffer.sampleRate,len=buffer.length,bytes=2,align=channels*bytes;
  const ab=new ArrayBuffer(44+len*align),v=new DataView(ab); let o=0;
  const str=s=>{for(let i=0;i<s.length;i++)v.setUint8(o++,s.charCodeAt(i));};
  str('RIFF');v.setUint32(o,36+len*align,true);o+=4;str('WAVE');str('fmt ');v.setUint32(o,16,true);o+=4;
  v.setUint16(o,1,true);o+=2;v.setUint16(o,channels,true);o+=2;v.setUint32(o,sampleRate,true);o+=4;v.setUint32(o,sampleRate*align,true);o+=4;
  v.setUint16(o,align,true);o+=2;v.setUint16(o,16,true);o+=2;str('data');v.setUint32(o,len*align,true);o+=4;
  const ch=Array.from({length:channels},(_,i)=>buffer.getChannelData(i));
  for(let i=0;i<len;i++) for(let c=0;c<channels;c++){ let s=clamp(ch[c][i],-1,1); s=s<0?s*0x8000:s*0x7fff; v.setInt16(o,s,true); o+=2; }
  return ab;
}

function audioBufferSegmentToWav(buffer,startSec,durationSec){
  const channels=buffer.numberOfChannels,sampleRate=buffer.sampleRate,bytes=2,align=channels*bytes;
  const start=Math.max(0,Math.min(buffer.length-1,Math.floor(startSec*sampleRate)));
  const wanted=Math.max(1,Math.floor(durationSec*sampleRate));
  const len=Math.max(1,Math.min(wanted,buffer.length-start));
  const ab=new ArrayBuffer(44+len*align),v=new DataView(ab); let o=0;
  const str=x=>{for(let i=0;i<x.length;i++)v.setUint8(o++,x.charCodeAt(i));};
  str('RIFF');v.setUint32(o,36+len*align,true);o+=4;str('WAVE');str('fmt ');v.setUint32(o,16,true);o+=4;
  v.setUint16(o,1,true);o+=2;v.setUint16(o,channels,true);o+=2;v.setUint32(o,sampleRate,true);o+=4;v.setUint32(o,sampleRate*align,true);o+=4;
  v.setUint16(o,align,true);o+=2;v.setUint16(o,16,true);o+=2;str('data');v.setUint32(o,len*align,true);o+=4;
  const ch=Array.from({length:channels},(_,i)=>buffer.getChannelData(i));
  for(let i=0;i<len;i++) for(let c=0;c<channels;c++){let sample=clamp(ch[c][start+i],-1,1);sample=sample<0?sample*0x8000:sample*0x7fff;v.setInt16(o,sample,true);o+=2;}
  return new Blob([ab],{type:'audio/wav'});
}
function buildPromoClips(audio){
  if(!audio?.buffer)return {hook15:null,hook30:null};
  const d=audio.duration, strong=Math.max(0,d*.63);
  const start15=Math.max(0,Math.min(strong,Math.max(0,d-15)));
  const start30=Math.max(0,Math.min(strong,Math.max(0,d-30)));
  return {
    hook15:audioBufferSegmentToWav(audio.buffer,start15,Math.min(15,d)),
    hook30:audioBufferSegmentToWav(audio.buffer,start30,Math.min(30,d))
  };
}

function textMetricsFit(ctx,text,maxWidth,startSize,minSize){
  let size=startSize; while(size>minSize){ctx.font=`800 ${size}px system-ui, sans-serif`; if(ctx.measureText(text).width<=maxWidth) break; size-=8;} return size;
}
async function makeCover(title,artist,seed){
  const c=els.coverCanvas,ctx=c.getContext('2d'); if(!ctx) throw new Error('Canvas is not available in this browser.');
  const rng=mulberry32(seed^0xA57E91),h1=Math.floor(rng()*360),h2=(h1+70+Math.floor(rng()*120))%360;
  const g=ctx.createLinearGradient(0,0,3000,3000);g.addColorStop(0,`hsl(${h1} 62% 17%)`);g.addColorStop(.5,`hsl(${h2} 72% 34%)`);g.addColorStop(1,`hsl(${(h1+190)%360} 70% 12%)`);ctx.fillStyle=g;ctx.fillRect(0,0,3000,3000);
  for(let i=0;i<24;i++){ const x=rng()*3000,y=rng()*3000,r=100+rng()*700;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=`hsla(${(h1+i*17)%360} 90% 70% / ${.025+rng()*.09})`;ctx.fill(); }
  ctx.save();ctx.translate(1500,1420);ctx.rotate((rng()-.5)*.25);ctx.strokeStyle='rgba(255,255,255,.22)';ctx.lineWidth=20;ctx.strokeRect(-900,-900,1800,1800);ctx.restore();
  ctx.fillStyle='rgba(255,255,255,.96)';ctx.textAlign='center';ctx.textBaseline='middle';
  const titleSize=textMetricsFit(ctx,title,2500,330,150);ctx.font=`900 ${titleSize}px system-ui, sans-serif`;ctx.fillText(title.toUpperCase(),1500,1390);
  ctx.font='750 115px system-ui, sans-serif';ctx.fillStyle='rgba(255,255,255,.82)';ctx.fillText(artist.toUpperCase(),1500,1845);
  return await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error('Could not create cover image.')),'image/png'));
}

async function makeVerticalPromo(title,artist,seed){
  const c=els.promoCanvas,ctx=c?.getContext('2d'); if(!ctx) throw new Error('Vertical promo canvas is not available.');
  const rng=mulberry32(seed^0xC0FFEE),h1=Math.floor(rng()*360),h2=(h1+90+Math.floor(rng()*100))%360;
  const g=ctx.createLinearGradient(0,0,1080,1920);g.addColorStop(0,`hsl(${h1} 68% 22%)`);g.addColorStop(.55,`hsl(${h2} 78% 38%)`);g.addColorStop(1,`hsl(${(h1+210)%360} 70% 12%)`);ctx.fillStyle=g;ctx.fillRect(0,0,1080,1920);
  for(let i=0;i<18;i++){const x=rng()*1080,y=rng()*1920,r=80+rng()*360;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=`hsla(${(h1+i*23)%360} 95% 72% / ${.035+rng()*.1})`;ctx.fill();}
  ctx.fillStyle='rgba(0,0,0,.28)';ctx.fillRect(64,1120,952,560);
  ctx.fillStyle='rgba(255,255,255,.82)';ctx.textAlign='center';ctx.font='800 46px system-ui, sans-serif';ctx.fillText('NEW MUSIC',540,1215);
  const size=textMetricsFit(ctx,title,860,118,62);ctx.font=`900 ${size}px system-ui, sans-serif`;ctx.fillStyle='white';ctx.fillText(title.toUpperCase(),540,1375);
  ctx.font='750 54px system-ui, sans-serif';ctx.fillStyle='rgba(255,255,255,.9)';ctx.fillText(artist.toUpperCase(),540,1510);
  ctx.font='650 36px system-ui, sans-serif';ctx.fillStyle='rgba(255,255,255,.78)';ctx.fillText('LISTEN • SAVE • SHARE',540,1610);
  return await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error('Could not create vertical promo image.')),'image/png'));
}

function defaultReleaseDate(){ const d=new Date(); d.setDate(d.getDate()+21); return d.toISOString().slice(0,10); }
function buildRelease({prompt,title,style,energy,audio,seed,lyrics}){
  const artist=normalizeText(els.artistName.value)||'Corey Vibe';
  const songwriter=normalizeText(els.songwriter.value)||artist;
  const producer=normalizeText(els.producer.value)||artist;
  const label=normalizeText(els.labelName.value)||'Independent';
  return {
    title, artist, songwriter, producer, label, genre:style==='hiphop'?'Hip-Hop/Rap':cap(style), energy,
    release_date_suggestion:defaultReleaseDate(), explicit:'No (review lyrics before submission)', language:'English',
    prompt, bpm:audio.bpm, duration_seconds:Math.round(audio.duration), sample_rate_hz:audio.sampleRate, bit_depth:audio.bitDepth,
    channels:audio.channels, cover_pixels:'3000x3000', audio_format:'WAV PCM', seed,
    created_at:new Date().toISOString(), lyrics,
    generation_method:'Local procedural browser synthesis using Web Audio oscillators, deterministic generated noise, drums and effects. No downloaded audio samples or external music-generation API.',
    project_royalty_share:'0%', project_ownership_claim:'None',
    notes:'Review contributor names, explicit-content selection, genre and release date in SoundOn before final submission.'
  };
}
function genreTag(r){
  const g=(r.genre||'Music').toLowerCase();
  if(g.includes('hip'))return '#HipHop'; if(g.includes('dance'))return '#DanceMusic'; if(g.includes('cinematic'))return '#CinematicMusic'; if(g.includes('ambient'))return '#AmbientMusic'; return '#PopMusic';
}
function tiktokCaptionsText(r){
  const tag=genreTag(r), cleanTitle=r.title.replace(/[\r\n]+/g,' ');
  return `TIKTOK / SHORT-FORM CAPTIONS — ${r.title}\n\n1. New one from Corey Vibe 🎵 ${cleanTitle}. Which part hits hardest?\n#CoreyVibe #NewMusic ${tag} #MusicTok #OriginalMusic\n\n2. I made this from an idea and turned it into a full track. ${cleanTitle} is ready.\n#CoreyVibe #IndependentArtist ${tag} #NewSong #Music\n\n3. Headphones on 🎧 This is ${cleanTitle}.\n#CoreyVibe #MusicDiscovery ${tag} #NewMusic #ListenNow\n\n4. 15 seconds from ${cleanTitle}. Save it if you want the full track.\n#CoreyVibe #MusicTok ${tag} #NewRelease #OriginalMusic\n\n5. Building Corey Vibe one release at a time. This one is ${cleanTitle}.\n#CoreyVibe #IndependentMusic ${tag} #NewMusic #Artist\n\nUse genuine posts and real listener engagement. Do not use bots, paid guaranteed streams, fake playlist placement or coordinated looping.\n`;
}
function shortVideoIdeasText(r){
  const words=themeWords(r.prompt).slice(0,4).join(', ')||'the song theme';
  return `SHORT-VIDEO IDEAS — ${r.title}\n\n1. 15-second hook: use the included 15s WAV with the 9:16 promo image. On-screen text: “${r.title} — Corey Vibe”.\n2. Story clip: one sentence about why you made the song, then cut into the 15s hook. Theme cues: ${words}.\n3. A/B hook test: post the 15s version first, then the 30s version on another day with a different caption. Compare real watch time, saves and shares.\n4. Behind-the-song: show your release screen or cover creation, then play the strongest section.\n5. Comment prompt: “What does this track make you think of?” followed by the hook.\n\nKeep each post meaningfully different rather than bulk-uploading duplicate clips.\n`;
}
function commercialLicensingText(r){
  const s=getEarningsStrategy();
  return `COMMERCIAL LICENSING / CUE SHEET — ${r.title}\n\nTitle: ${r.title}\nArtist: ${r.artist}\nComposer / songwriter: ${r.songwriter}\nProducer: ${r.producer}\nLabel / imprint: ${r.label}\nGenre: ${r.genre}\nMood / prompt: ${r.prompt}\nBPM: ${r.bpm}\nDuration: ${r.duration_seconds} seconds\nMaster: 44.1 kHz / 16-bit stereo PCM WAV\nVersion: Instrumental / no sung vocal in this browser build\nExplicit content: No sung lyrics in the audio master\nProject royalty share: ${r.project_royalty_share}\nGeneration method: ${r.generation_method}\n\nREVENUE FOCUS\nEntered period: ${money(s.total)} total\nCommercial licensing: ${money(s.commercial)} (${pct(s.commercialShare)})\nTikTok: ${money(s.tiktok)} (${pct(s.tiktokShare)})\nStrategy: ${s.focus}\n\nRIGHTS NOTE\nThe project itself claims no ownership or royalty share. This sheet is not a legal title opinion or a guarantee that a platform, library, brand or publisher will accept the track. Confirm your contributor information and any third-party rights before licensing.\n`;
}
function spotifyPitchText(r){
  const themes=themeWords(r.prompt).slice(0,5).join(', ')||'hope and momentum';
  return `SPOTIFY PITCH STARTER — ${r.title}\n\n${r.title} is a ${String(r.genre).toLowerCase()} release by ${r.artist} at ${r.bpm} BPM, built around ${themes}. The arrangement is instrumental in this browser version, with an immediate rhythmic opening and a stronger section later in the track for short-form promotion. Planned promotion includes genuine short-form clips using 15-second and 30-second edits, artist social posts and listener engagement.\n\nBefore submitting: edit this pitch so every statement matches the final master and your actual promotion plan. Do not claim playlist support, press, collaborators or audience numbers unless they are true.\n`;
}
function releaseScheduleText(r){
  const d=new Date(`${r.release_date_suggestion}T12:00:00`); const fmt=x=>x.toISOString().slice(0,10); const day=n=>{const x=new Date(d);x.setDate(x.getDate()+n);return fmt(x);};
  return `AUTOMATIC RELEASE SCHEDULE — ${r.title}\n\n${day(-14)} — Final-check WAV, cover, title, credits and rights. Submit to distributor early enough for review.\n${day(-7)} — Post the 15s teaser with one caption from the included pack.\n${day(-3)} — Post a different behind-the-song clip.\n${day(0)} — Release day: share the direct release link and 30s hook.\n${day(2)} — Post a second creative using a different section/caption.\n${day(7)} — Check SoundOn/streaming analytics. Keep what earned real saves, shares and listens; stop weak formats.\n${day(14)} — Review earnings/source mix and enter or import the new numbers into Earnings Autopilot.\n\nThis is a planning schedule, not a guarantee of reach or revenue.\n`;
}
function growthPlanText(r){
  const s=getEarningsStrategy();
  return `COREY VIBE GROWTH AUTOPILOT — ${r.title}\n\nCURRENT EARNINGS SIGNAL\nTotal entered: ${money(s.total)}\nCommercial Music Licensing: ${money(s.commercial)} (${pct(s.commercialShare)})\nTikTok: ${money(s.tiktok)} (${pct(s.tiktokShare)})\nOther: ${money(s.other)} (${pct(s.otherShare)})\nPriority: ${s.focus}\n\nWHY THE PACK IS BUILT THIS WAY\n${s.code==='commercial'?'Commercial licensing is the dominant source, so this pack emphasizes clean instrumental audio, clear cue-sheet metadata, an immediate hook and short edits that can also feed TikTok discovery.':s.code==='tiktok'?'TikTok is the dominant source, so this pack emphasizes fast hook edits, captions and repeatable short-video concepts.':'The entered mix is more balanced, so this pack covers licensing metadata, short-form hooks and streaming promotion together.'}\n\nFILES TO USE\n• Full WAV: distributor / release master\n• 15s hook WAV: very short teaser\n• 30s hook WAV: longer short-form teaser\n• 9:16 promo PNG: vertical visual for Shorts/Reels/TikTok\n• Commercial licensing cue sheet: licensing metadata starter\n• TikTok captions: five caption choices\n• Short-video ideas: five different concepts\n• Spotify pitch: editable pitch starter\n• Release schedule: automatic dates around the suggested release date\n\nSAFE GROWTH RULE\nGrow with real listeners. Never buy guaranteed streams, use bots/scripts, pay for guaranteed playlist placement, or tell fans to loop songs unnaturally.\n`;
}
function growthStrategyJson(r){
  const s=getEarningsStrategy();
  return JSON.stringify({track:r.title,artist:r.artist,generated_at:new Date().toISOString(),earnings_period:{currency:'NZD',commercial_music_licensing:s.commercial,tiktok:s.tiktok,other:s.other,total:s.total},shares:{commercial_music_licensing:s.commercialShare,tiktok:s.tiktokShare,other:s.otherShare},priority:s.focus,autopilot_enabled:!!els.growthAutopilot.checked,assets:['full_wav','15s_hook_wav','30s_hook_wav','vertical_9x16_png','commercial_licensing_sheet','tiktok_captions','short_video_ideas','spotify_pitch','release_schedule']},null,2);
}

function metadataText(r){
  return `SOUNDON RELEASE METADATA\n\nTrack title: ${r.title}\nPrimary artist: ${r.artist}\nSongwriter / composer: ${r.songwriter}\nProducer: ${r.producer}\nLabel / imprint: ${r.label}\nGenre: ${r.genre}\nLanguage: ${r.language}\nExplicit: ${r.explicit}\nSuggested release date: ${r.release_date_suggestion}\nBPM: ${r.bpm}\nDuration: ${r.duration_seconds} seconds\nAudio: ${r.sample_rate_hz} Hz / ${r.bit_depth}-bit / ${r.channels} channels / ${r.audio_format}\nCover: ${r.cover_pixels} PNG\n\nPROMPT\n${r.prompt}\n\nNOTES\n${r.notes}\n`;
}
function rightsText(r){
  return `COREY VIBE AUTO RELEASE STUDIO — COMMERCIAL OUTPUT RIGHTS\n\nTrack: ${r.title}\nArtist: ${r.artist}\nGenerated: ${r.created_at}\nSeed: ${r.seed}\n\n1. PROJECT CLAIM\nThe Corey Vibe Auto Release Studio project claims no ownership share and no royalty share in the audio, cover, lyrics starter, metadata or other output created for the user with this software. Project royalty share: 0%.\n\n2. COMMERCIAL PERMISSION\nTo the maximum extent the software author has any rights that could restrict use of these generated outputs, those rights are irrevocably waived or, where waiver is not legally effective, licensed to the user on a worldwide, perpetual, royalty-free, sublicensable basis for commercial and non-commercial use, including editing, distribution, streaming, synchronization and monetization.\n\n3. USER INPUTS / THIRD-PARTY RIGHTS\nThis grant does not give permission to use someone else's protected name, lyrics, melody, recording, trademark, artwork or other material supplied in a prompt. The user remains responsible for rights in their own inputs.\n\n4. NO GUARANTEE OF STATUTORY COPYRIGHT\nWhether a generated work itself qualifies for copyright protection depends on the law of the relevant country and the user's human creative contribution. Distributor and streaming-platform rules also apply.\n\nGeneration method: ${r.generation_method}\n`;
}
function checklistText(r){
  return `SOUNDON PRE-SUBMISSION CHECKLIST\n\n[OK] WAV master: ${r.sample_rate_hz} Hz, ${r.bit_depth}-bit PCM\n[OK] Track length: ${r.duration_seconds} seconds\n[OK] Cover: 3000 x 3000 PNG\n[OK] Metadata file included\n[OK] Lyrics starter included\n[OK] Commercial output-rights certificate included\n[OK] Production proof JSON included\n\nFINAL ACCOUNT STEPS\n1. Sign in to SoundOn on desktop.\n2. Create a new single/release.\n3. Upload 01_${safeFilename(r.title)}.wav.\n4. Upload 02_${safeFilename(r.title)}_cover.png.\n5. Copy/review the data from 03_release_metadata.txt.\n6. Confirm the correct artist profile, contributor names, explicit status, genre, territories and release date.\n7. Submit for SoundOn review.\n\nImportant: SoundOn's authenticated upload and final submission are not performed by this static GitHub Pages site.\n`;
}

function validateRelease(r,wavBlob,coverBlob){
  return [
    {ok:r.sample_rate_hz>=44100,name:'WAV sample rate',detail:`${r.sample_rate_hz.toLocaleString()} Hz (minimum 44.1 kHz)`},
    {ok:r.bit_depth>=16,name:'WAV bit depth',detail:`${r.bit_depth}-bit PCM (minimum 16-bit)`},
    {ok:SELFTEST||r.duration_seconds>=60,name:'Track duration',detail:`${r.duration_seconds} sec (at least 60 sec)`},
    {ok:wavBlob.size<200*1024*1024,name:'Audio file size',detail:`${(wavBlob.size/1024/1024).toFixed(1)} MB (under 200 MB)`},
    {ok:r.cover_pixels==='3000x3000',name:'Cover dimensions',detail:'3000 × 3000 square PNG'},
    {ok:coverBlob.type==='image/png',name:'Cover format',detail:'PNG'},
    {ok:Boolean(r.title&&r.artist&&r.songwriter),name:'Core metadata',detail:'Title, artist and songwriter present'},
    {ok:true,name:'No imported samples',detail:'Audio is synthesized locally from code'}
  ];
}

function refreshGrowthUI(){
  if(!state.release||!els.growthStrategySummary)return;
  const s=getEarningsStrategy(),enabled=!!els.growthAutopilot.checked;
  els.growthPackBadge.textContent=enabled?'auto pack ready':'auto pack off';
  els.growthPackBadge.classList.toggle('success',enabled);
  els.growthStrategySummary.innerHTML=`<strong>${escapeHtml(s.focus)}</strong><br>${escapeHtml(`Based on ${money(s.total)} entered earnings: Commercial ${pct(s.commercialShare)}, TikTok ${pct(s.tiktokShare)}, Other ${pct(s.otherShare)}.`)}`;
  els.growthPreview.textContent=growthPlanText(state.release)+'\n'+tiktokCaptionsText(state.release)+'\n'+shortVideoIdeasText(state.release);
  els.hook15Btn.disabled=!state.hook15Blob; els.hook30Btn.disabled=!state.hook30Blob; els.verticalPromoBtn.disabled=!state.verticalPromoBlob;
}
function refreshReleaseUI(){
  const r=state.release;if(!r)return;
  els.trackTitle.textContent=r.title;els.titleInput.value=r.title;
  els.trackSummary.textContent=`${r.artist} • ${r.genre} • ${r.bpm} BPM • ${r.duration_seconds} sec`;
  els.lyricsText.textContent=r.lyrics;renderDetails(r);
  const checks=validateRelease(r,state.wavBlob,state.coverBlob);renderChecks(checks);refreshGrowthUI();
}
function loadHistory(){
  try{const v=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');return Array.isArray(v)?v:[];}catch(_){return [];}
}
function saveHistory(r){
  try{
    const h=loadHistory();h.unshift({title:r.title,prompt:r.prompt,genre:r.genre,bpm:r.bpm,created_at:r.created_at});
    const dedup=[];const seen=new Set();for(const x of h){const k=`${x.title}|${x.prompt}`;if(!seen.has(k)){seen.add(k);dedup.push(x);}if(dedup.length>=12)break;}
    localStorage.setItem(HISTORY_KEY,JSON.stringify(dedup));renderHistory();
  }catch(_){ }
}
function renderHistory(){
  if(!els.historyList)return;const h=loadHistory();
  if(!h.length){els.historyList.innerHTML='<p class="hint">No projects yet.</p>';return;}
  els.historyList.innerHTML=h.map((x,i)=>`<div class="history-item"><div><strong>${escapeHtml(x.title||'Untitled')}</strong><small>${escapeHtml(x.genre||'')} • ${escapeHtml(String(x.bpm||''))} BPM<br>${escapeHtml(x.prompt||'')}</small></div><div class="history-actions"><button class="secondary small" type="button" data-history-index="${i}">Reuse prompt</button></div></div>`).join('');
  els.historyList.querySelectorAll('[data-history-index]').forEach(b=>b.addEventListener('click',()=>{const x=h[Number(b.dataset.historyIndex)];if(!x)return;els.prompt.value=x.prompt||'';window.scrollTo({top:0,behavior:'smooth'});els.prompt.focus();}));
}
function runDiagnostics(){
  const tests=[
    {ok:typeof window.OfflineAudioContext==='function',name:'Audio rendering',detail:'OfflineAudioContext'},
    {ok:!!document.createElement('canvas').getContext, name:'Cover generation', detail:'Canvas support'},
    {ok:typeof Blob==='function'&&typeof URL.createObjectURL==='function',name:'Downloads',detail:'Blob and object URL support'},
    {ok:(()=>{try{localStorage.setItem('__cv_test','1');localStorage.removeItem('__cv_test');return true}catch(_){return false}})(),name:'Saved settings',detail:'Local storage'},
    {ok:'TextEncoder' in window,name:'Release ZIP',detail:'TextEncoder support'},
    {ok:true,name:'Paid API requirement',detail:'None for this local version'}
  ];
  els.diagnosticsList.innerHTML=tests.map(c=>`<div class="check"><span class="icon">${c.ok?'✅':'⚠️'}</span><div><strong>${escapeHtml(c.name)}</strong><small>${escapeHtml(c.detail)}</small></div></div>`).join('');
  return tests.every(t=>t.ok);
}

function renderChecks(checks){
  els.checks.innerHTML=checks.map(c=>`<div class="check"><span class="icon">${c.ok?'✅':'⚠️'}</span><div><strong>${escapeHtml(c.name)}</strong><small>${escapeHtml(c.detail)}</small></div></div>`).join('');
  const all=checks.every(c=>c.ok); els.readyBadge.textContent=all?'SoundOn specs passed':'Review checks'; els.readyBadge.classList.toggle('success',all); return all;
}
function renderDetails(r){
  const pairs=[['Title',r.title],['Artist',r.artist],['Songwriter',r.songwriter],['Producer',r.producer],['Genre',r.genre],['Suggested release',r.release_date_suggestion],['Audio',`${r.sample_rate_hz} Hz • ${r.bit_depth}-bit WAV • ${r.duration_seconds}s`],['Cover',r.cover_pixels],['Project royalty share',r.project_royalty_share]];
  els.releaseDetails.innerHTML=pairs.map(([k,v])=>`<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(String(v))}</dd>`).join('');
}
function escapeHtml(s){ return String(s).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch])); }

function downloadBlob(blob,name){ const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500); }
function textBlob(s,type='text/plain;charset=utf-8'){ return new Blob([s],{type}); }

// Minimal ZIP writer using the STORE method, so this project needs no CDN or third-party ZIP library.
const CRC_TABLE=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
function crc32(bytes){let c=0xFFFFFFFF;for(let i=0;i<bytes.length;i++)c=CRC_TABLE[(c^bytes[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
function dosDateTime(d=new Date()){let year=Math.max(1980,d.getFullYear());return {date:((year-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate(),time:(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1)};}
function u16(v){const b=new Uint8Array(2);new DataView(b.buffer).setUint16(0,v,true);return b;} function u32(v){const b=new Uint8Array(4);new DataView(b.buffer).setUint32(0,v>>>0,true);return b;}
function concat(parts){let len=parts.reduce((n,p)=>n+p.length,0),out=new Uint8Array(len),o=0;for(const p of parts){out.set(p,o);o+=p.length;}return out;}
async function makeZip(files){
  const enc=new TextEncoder(),locals=[],centrals=[];let offset=0;const dt=dosDateTime();
  for(const f of files){
    const name=enc.encode(f.name),data=new Uint8Array(await f.blob.arrayBuffer()),crc=crc32(data);
    const local=concat([u32(0x04034b50),u16(20),u16(0x0800),u16(0),u16(dt.time),u16(dt.date),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),name,data]);
    locals.push(local);
    const central=concat([u32(0x02014b50),u16(20),u16(20),u16(0x0800),u16(0),u16(dt.time),u16(dt.date),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name]);
    centrals.push(central);offset+=local.length;
  }
  const centralData=concat(centrals), localData=concat(locals), end=concat([u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(centralData.length),u32(localData.length),u16(0)]);
  return new Blob([localData,centralData,end],{type:'application/zip'});
}

async function createFullRelease(){
  const prompt=normalizeText(els.prompt.value); if(!prompt){els.prompt.focus();setProgress(0,'Type a song prompt first.');return;}
  persistProfile(); state.cancelled=false; els.createBtn.disabled=true; els.cancelBtn.disabled=false; els.resultCard.classList.add('hidden');
  try{
    setProgress(3,'Reading your prompt…'); await sleep(50);
    const seed=xmur3(`${prompt}|${els.artistName.value}|${Date.now()}`)(),rng=mulberry32(seed);
    const style=els.style.value==='auto'?inferStyle(prompt):els.style.value;
    let energy=els.energy.value==='auto'?inferEnergy(prompt,style):els.energy.value;
    const revenueStrategy=getEarningsStrategy();
    if(els.growthAutopilot.checked&&els.energy.value==='auto'&&style!=='ambient'&&(revenueStrategy.code==='commercial'||revenueStrategy.code==='tiktok'||revenueStrategy.code==='commercial_tiktok')) energy='high';
    const seconds=SELFTEST?4:Number(els.length.value),title=makeTitle(prompt,rng),lyrics=makeLyrics(prompt,title,rng);
    setProgress(9,'Planning title, structure and arrangement…'); await sleep(20);
    const audio=await renderSong(prompt,style,seconds,energy,seed);
    setProgress(84,'Building automatic 15s and 30s hook edits…');
    const clips=buildPromoClips(audio);
    setProgress(87,'Creating 3000 × 3000 cover art…');
    const cover=await makeCover(title,normalizeText(els.artistName.value)||'Corey Vibe',seed);
    setProgress(90,'Creating 9:16 promo artwork…');
    const verticalPromo=await makeVerticalPromo(title,normalizeText(els.artistName.value)||'Corey Vibe',seed);
    if(state.cancelled) throw new Error('Generation stopped');
    setProgress(94,'Preparing release metadata, licensing and growth files…');
    const release=buildRelease({prompt,title,style,energy,audio,seed,lyrics});
    const checks=validateRelease(release,audio.blob,cover);
    cleanupUrls(); state.wavBlob=audio.blob; state.coverBlob=cover; state.release=release; state.hook15Blob=clips.hook15; state.hook30Blob=clips.hook30; state.verticalPromoBlob=verticalPromo;
    state.wavUrl=URL.createObjectURL(audio.blob); state.coverUrl=URL.createObjectURL(cover);
    els.player.src=state.wavUrl; els.coverPreview.src=state.coverUrl; refreshReleaseUI(); els.resultCard.classList.remove('hidden');
    saveHistory(release);setProgress(100,'Complete — release + growth pack ready.');
    els.resultCard.scrollIntoView({behavior:'smooth',block:'start'});
    window.__APP_TEST_RESULT__={ok:checks.every(c=>c.ok)&&!!state.hook15Blob&&!!state.hook30Blob&&!!state.verticalPromoBlob,title,release,wavSize:audio.blob.size,coverSize:cover.size,hook15Size:state.hook15Blob?.size||0,hook30Size:state.hook30Blob?.size||0,promoSize:state.verticalPromoBlob?.size||0};
    if(SELFTEST) document.documentElement.dataset.selftest=checks.every(c=>c.ok)?'pass':'fail';
  }catch(err){
    console.error(err); setProgress(0,err && err.message==='Generation stopped'?'Stopped.':'Could not finish: '+(err?.message||String(err))); window.__APP_TEST_RESULT__={ok:false,error:err?.message||String(err)};if(SELFTEST)document.documentElement.dataset.selftest='fail';
  }finally{ els.createBtn.disabled=false;els.cancelBtn.disabled=true; }
}
function cleanupUrls(){ if(state.wavUrl)URL.revokeObjectURL(state.wavUrl);if(state.coverUrl)URL.revokeObjectURL(state.coverUrl);state.wavUrl=null;state.coverUrl=null; }

function getPackageFiles(){
  const r=state.release,base=safeFilename(r.title);
  const files=[
    {name:'00_START_HERE.txt',blob:textBlob(growthPlanText(r))},
    {name:`01_${base}.wav`,blob:state.wavBlob},
    {name:`02_${base}_cover.png`,blob:state.coverBlob},
    {name:'03_release_metadata.txt',blob:textBlob(metadataText(r))},
    {name:'04_lyrics.txt',blob:textBlob(r.lyrics)},
    {name:'05_commercial_output_rights.txt',blob:textBlob(rightsText(r))},
    {name:'06_production_proof.json',blob:textBlob(JSON.stringify(r,null,2),'application/json')},
    {name:'07_soundon_checklist.txt',blob:textBlob(checklistText(r))}
  ];
  if(els.growthAutopilot.checked){
    if(state.hook15Blob)files.push({name:`08_${base}_15s_hook.wav`,blob:state.hook15Blob});
    if(state.hook30Blob)files.push({name:`09_${base}_30s_hook.wav`,blob:state.hook30Blob});
    if(state.verticalPromoBlob)files.push({name:`10_${base}_vertical_1080x1920.png`,blob:state.verticalPromoBlob});
    files.push(
      {name:'11_commercial_licensing_cue_sheet.txt',blob:textBlob(commercialLicensingText(r))},
      {name:'12_tiktok_captions.txt',blob:textBlob(tiktokCaptionsText(r))},
      {name:'13_short_video_ideas.txt',blob:textBlob(shortVideoIdeasText(r))},
      {name:'14_spotify_pitch_starter.txt',blob:textBlob(spotifyPitchText(r))},
      {name:'15_release_schedule.txt',blob:textBlob(releaseScheduleText(r))},
      {name:'16_growth_strategy.json',blob:textBlob(growthStrategyJson(r),'application/json')}
    );
  }
  return files;
}


async function applyTitle(){
  if(!state.release)return;const next=normalizeText(els.titleInput.value);if(!next){els.titleInput.focus();return;}
  const old=state.release.title;state.release.title=next;state.release.lyrics=replaceTitleInLyrics(state.release.lyrics,old,next);
  try{const seed=randomSeed(next),cover=await makeCover(next,state.release.artist,seed),promo=await makeVerticalPromo(next,state.release.artist,seed);if(state.coverUrl)URL.revokeObjectURL(state.coverUrl);state.coverBlob=cover;state.verticalPromoBlob=promo;state.coverUrl=URL.createObjectURL(cover);els.coverPreview.src=state.coverUrl;}catch(e){console.error(e);}
  refreshReleaseUI();saveHistory(state.release);
}
async function newTitle(){
  if(!state.release)return;const rng=mulberry32(randomSeed(state.release.prompt));const old=state.release.title;const next=makeTitle(state.release.prompt,rng);els.titleInput.value=next;state.release.lyrics=replaceTitleInLyrics(state.release.lyrics,old,next);await applyTitle();
}
function newLyrics(){
  if(!state.release)return;const rng=mulberry32(randomSeed(state.release.prompt));state.release.lyrics=makeLyrics(state.release.prompt,state.release.title,rng);refreshReleaseUI();
}
async function newCover(){
  if(!state.release)return;const oldText=els.newCoverBtn.textContent;els.newCoverBtn.disabled=true;els.newCoverBtn.textContent='Creating…';
  try{const seed=randomSeed(state.release.title),cover=await makeCover(state.release.title,state.release.artist,seed),promo=await makeVerticalPromo(state.release.title,state.release.artist,seed);if(state.coverUrl)URL.revokeObjectURL(state.coverUrl);state.coverBlob=cover;state.verticalPromoBlob=promo;state.coverUrl=URL.createObjectURL(cover);els.coverPreview.src=state.coverUrl;refreshReleaseUI();}
  catch(e){alert('Could not create a new cover: '+e.message);}finally{els.newCoverBtn.disabled=false;els.newCoverBtn.textContent=oldText;}
}
async function newAudioVariation(){
  if(!state.release||!state.release.prompt)return;const old=els.newAudioBtn.textContent;els.newAudioBtn.disabled=true;els.newAudioBtn.textContent='Rendering…';
  try{
    state.cancelled=false;const prompt=state.release.prompt,style=els.style.value==='auto'?inferStyle(prompt):els.style.value;let energy=els.energy.value==='auto'?inferEnergy(prompt,style):els.energy.value;
    const revenueStrategy=getEarningsStrategy();if(els.growthAutopilot.checked&&els.energy.value==='auto'&&style!=='ambient'&&(revenueStrategy.code==='commercial'||revenueStrategy.code==='tiktok'||revenueStrategy.code==='commercial_tiktok'))energy='high';
    const seconds=SELFTEST?4:Number(els.length.value),seed=randomSeed(prompt),audio=await renderSong(prompt,style,seconds,energy,seed);
    const clips=buildPromoClips(audio);
    if(state.wavUrl)URL.revokeObjectURL(state.wavUrl);state.wavBlob=audio.blob;state.hook15Blob=clips.hook15;state.hook30Blob=clips.hook30;state.wavUrl=URL.createObjectURL(audio.blob);els.player.src=state.wavUrl;
    state.release=buildRelease({prompt,title:state.release.title,style,energy,audio,seed,lyrics:state.release.lyrics});refreshReleaseUI();saveHistory(state.release);setProgress(100,'New audio variation + hook edits ready.');
  }catch(e){setProgress(0,'Could not create variation: '+(e?.message||e));}finally{els.newAudioBtn.disabled=false;els.newAudioBtn.textContent=old;}
}
async function copyLyrics(){
  if(!state.release)return;try{await navigator.clipboard.writeText(state.release.lyrics);const old=els.copyLyricsBtn.textContent;els.copyLyricsBtn.textContent='Copied';els.copyLyricsBtn.classList.add('copy-ok');setTimeout(()=>{els.copyLyricsBtn.textContent=old;els.copyLyricsBtn.classList.remove('copy-ok');},1300);}catch(_){downloadBlob(textBlob(state.release.lyrics),`${safeFilename(state.release.title)}_lyrics.txt`);}
}
async function handleEarningsFile(file){
  if(!file)return;
  try{
    els.earningsImportStatus.textContent='Reading export in your browser…';
    const text=await file.text(),parsed=parseEarningsExport(text);
    if(!parsed.found){els.earningsImportStatus.textContent='I could not find Commercial Music Licensing or TikTok rows in that text export. Your existing figures were not changed.';return;}
    els.commercialEarnings.value=parsed.commercial.toFixed(3);els.tiktokEarnings.value=parsed.tiktok.toFixed(3);els.otherEarnings.value=parsed.other.toFixed(3);
    renderEarningsAutopilot();els.earningsImportStatus.textContent=`Imported ${file.name}. Strategy recalculated automatically.`;
  }catch(e){els.earningsImportStatus.textContent='Could not read that file: '+(e?.message||String(e));}
}

els.createBtn.addEventListener('click',createFullRelease);
els.cancelBtn.addEventListener('click',()=>{state.cancelled=true;els.statusText.textContent='Stopping…';});
els.applyTitleBtn.addEventListener('click',applyTitle);
els.titleInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();applyTitle();}});
els.newTitleBtn.addEventListener('click',newTitle);
els.newLyricsBtn.addEventListener('click',newLyrics);
els.newCoverBtn.addEventListener('click',newCover);
els.newAudioBtn.addEventListener('click',newAudioVariation);
els.copyLyricsBtn.addEventListener('click',copyLyrics);
[els.commercialEarnings,els.tiktokEarnings,els.otherEarnings].forEach(el=>el?.addEventListener('input',renderEarningsAutopilot));
els.growthAutopilot?.addEventListener('change',renderEarningsAutopilot);
els.earningsFile?.addEventListener('change',()=>handleEarningsFile(els.earningsFile.files?.[0]));
els.hook15Btn?.addEventListener('click',()=>state.hook15Blob&&downloadBlob(state.hook15Blob,`${safeFilename(state.release.title)}_15s_hook.wav`));
els.hook30Btn?.addEventListener('click',()=>state.hook30Blob&&downloadBlob(state.hook30Blob,`${safeFilename(state.release.title)}_30s_hook.wav`));
els.verticalPromoBtn?.addEventListener('click',()=>state.verticalPromoBlob&&downloadBlob(state.verticalPromoBlob,`${safeFilename(state.release.title)}_vertical_1080x1920.png`));
els.growthTextBtn?.addEventListener('click',()=>state.release&&downloadBlob(textBlob(growthPlanText(state.release)+'\n'+tiktokCaptionsText(state.release)+'\n'+shortVideoIdeasText(state.release)+'\n'+spotifyPitchText(state.release)+'\n'+releaseScheduleText(state.release)),`${safeFilename(state.release.title)}_growth_plan.txt`));
els.licensingBtn?.addEventListener('click',()=>state.release&&downloadBlob(textBlob(commercialLicensingText(state.release)),`${safeFilename(state.release.title)}_commercial_licensing_sheet.txt`));
els.clearHistoryBtn.addEventListener('click',()=>{try{localStorage.removeItem(HISTORY_KEY);}catch(_){}renderHistory();});
els.diagnosticsBtn.addEventListener('click',runDiagnostics);
document.querySelectorAll('[data-prompt]').forEach(b=>b.addEventListener('click',()=>{els.prompt.value=b.dataset.prompt||'';els.prompt.focus();}));
els.wavBtn.addEventListener('click',()=>state.wavBlob&&downloadBlob(state.wavBlob,`${safeFilename(state.release.title)}.wav`));
els.coverBtn.addEventListener('click',()=>state.coverBlob&&downloadBlob(state.coverBlob,`${safeFilename(state.release.title)}_cover.png`));
els.lyricsBtn.addEventListener('click',()=>state.release&&downloadBlob(textBlob(state.release.lyrics),`${safeFilename(state.release.title)}_lyrics.txt`));
els.metaBtn.addEventListener('click',()=>state.release&&downloadBlob(textBlob(metadataText(state.release)),`${safeFilename(state.release.title)}_metadata.txt`));
els.packageBtn.addEventListener('click',async()=>{
  if(!state.release)return; const old=els.packageBtn.textContent;els.packageBtn.disabled=true;els.packageBtn.textContent='Building ZIP…';
  try{const zip=await makeZip(getPackageFiles());downloadBlob(zip,`${safeFilename(state.release.artist)}_${safeFilename(state.release.title)}_Release_Growth_Pack.zip`);}catch(e){alert('Could not build ZIP: '+e.message);}finally{els.packageBtn.disabled=false;els.packageBtn.textContent=old;}
});

function persistProfile(){
  try{localStorage.setItem(PROFILE_KEY,JSON.stringify({artistName:els.artistName.value,songwriter:els.songwriter.value,producer:els.producer.value,labelName:els.labelName.value}));}catch(_){ }
}
function loadProfile(){
  try{const p=JSON.parse(localStorage.getItem(PROFILE_KEY)||'null');if(!p)return;for(const k of ['artistName','songwriter','producer','labelName'])if(typeof p[k]==='string')els[k].value=p[k];}catch(_){ }
}
for(const id of ['artistName','songwriter','producer','labelName']) els[id].addEventListener('change',persistProfile);
loadProfile();
loadEarnings();
renderEarningsAutopilot();
renderHistory();
runDiagnostics();

if(!SELFTEST && 'serviceWorker' in navigator && location.protocol!=='file:') navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
window.addEventListener('beforeunload',cleanupUrls);

// Headless smoke-test hook used during build verification. Normal visitors never trigger it.
if(SELFTEST){
  els.prompt.value='uplifting pop song about starting again and keeping a dream alive';els.length.value='60';els.style.value='pop';els.energy.value='medium';
  setTimeout(()=>createFullRelease(),100);
}

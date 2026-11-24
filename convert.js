/* PSD -> 편집 가능한 장면. 브라우저 안에서 동작합니다(ag-psd 사용). */
(function(){
const WEBW={'Pretendard-Thin':100,'Pretendard-ExtraLight':200,'Pretendard-Light':300,'Pretendard-Regular':400,'Pretendard-Medium':500,'Pretendard-SemiBold':600,'Pretendard-Bold':700,'Pretendard-ExtraBold':800,'Pretendard-Black':900,
 'GmarketSansBold':700,'GmarketSansTTFBold':700,'UtileDisplay-Regular':400,'UtileDisplay-Bold':700};
const FAM={'GmarketSansBold':'GmarketSans','GmarketSansTTFBold':'GmarketSans','UtileDisplay-Regular':'utile-display','UtileDisplay-Bold':'utile-display'};
const REMOTE={'utile-display':1};
const AVAIL={300:1,400:1,500:1,600:1,700:1,900:1};
let seq=0;
const hex=c=>'#'+[c.r,c.g,c.b].map(v=>Math.max(0,Math.min(255,Math.round(v||0))).toString(16).padStart(2,'0')).join('').toUpperCase();
function mk(w,h){const c=document.createElement('canvas');c.width=Math.max(1,w);c.height=Math.max(1,h);return c;}
function data(c){return c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,c.width,c.height);}

function raster(l,report){
 if(!l.canvas||!l.canvas.width||!l.canvas.height)return null;
 const w=l.canvas.width,h=l.canvas.height,c=mk(w,h),x=c.getContext('2d',{willReadFrequently:true});x.drawImage(l.canvas,0,0);
 const m=l.mask;
 if(m&&!m.disabled&&m.canvas&&m.canvas.width){
  const mc=mk(w,h),mx=mc.getContext('2d',{willReadFrequently:true}),d=m.defaultColor==null?0:m.defaultColor;
  mx.fillStyle='rgb('+d+','+d+','+d+')';mx.fillRect(0,0,w,h);mx.drawImage(m.canvas,(m.left||0)-l.left,(m.top||0)-l.top);
  const a=x.getImageData(0,0,w,h),b=mx.getImageData(0,0,w,h),A=a.data,B=b.data;
  for(let i=0;i<A.length;i+=4)A[i+3]=A[i+3]*B[i]/255;
  x.putImageData(a,0,0);
 }
 const fx=l.effects&&!l.effects.disabled&&l.effects.solidFill&&l.effects.solidFill.find(f=>f.enabled!==false);
 if(fx&&fx.color){x.globalCompositeOperation='source-in';x.fillStyle=hex(fx.color);x.fillRect(0,0,w,h);x.globalCompositeOperation='source-over';}
 return {cv:c,x:l.left,y:l.top};
}
function tight(id,ox,oy,thr){const A=id.data,w=id.width,h=id.height;let x0=w,y0=h,x1=-1,y1=-1;
 for(let y=0;y<h;y++){const r=y*w*4;for(let x=0;x<w;x++){if(A[r+x*4+3]>=thr){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}}}
 return x1<0?null:[ox+x0,oy+y0,ox+x1+1,oy+y1+1];}

function textInfo(l){
 const t=l.text,tr=t.transform||[1,0,0,1,l.left,l.top],sy=Math.hypot(tr[2],tr[3])||1,sx=Math.hypot(tr[0],tr[1])||1;
 const txt=String(t.text||'').replace(/\r\n?/g,'\n').replace(/\u0003/g,'\n');
 const base=t.style||{},list=(t.styleRuns&&t.styleRuns.length)?t.styleRuns:[{length:txt.length,style:{}}];
 const runs=[];let i=0;
 for(const r of list){const s=Object.assign({},base,r.style||{}),seg=txt.slice(i,i+r.length);i+=r.length;
  const st={font:(s.font&&s.font.name)||'',size:(s.fontSize||12)*sy,color:hex(s.fillColor||{r:0,g:0,b:0}),strike:!!s.strikethrough,track:s.tracking||0,
   hs:(s.horizontalScale==null?1:s.horizontalScale)*sx/sy,lead:(s.autoLeading===false&&s.leading!=null)?s.leading*sy:null,italic:!!s.fauxItalic};
  const p=runs[runs.length-1];
  if(p&&p.font===st.font&&Math.abs(p.size-st.size)<0.05&&p.color===st.color&&p.strike===st.strike&&p.italic===st.italic)p.t+=seg;else{st.t=seg;runs.push(st);}}
 if(i<txt.length&&runs.length)runs[runs.length-1].t+=txt.slice(i);
 while(runs.length&&!runs[runs.length-1].t.replace(/[\n ]/g,''))runs.pop();
 if(runs.length)runs[runs.length-1].t=runs[runs.length-1].t.replace(/\n+$/,'');
 let just=(t.paragraphStyle&&t.paragraphStyle.justification)||'left';
 if(t.paragraphStyleRuns&&t.paragraphStyleRuns[0]&&t.paragraphStyleRuns[0].style&&t.paragraphStyleRuns[0].style.justification)just=t.paragraphStyleRuns[0].style.justification;
 if(['left','right','center'].indexOf(just)<0)just='left';
 return {runs:runs,align:just,tr:tr};
}

function convert(group,box,report,imgs){
 const X0=box[0],Y0=box[1],X1=box[2],Y1=box[3],els=[],made=new Map();
 const img=cv=>{const k='psd'+(++seq);imgs[k]=cv;return k;};
 function* walk(g,path){let base=null;
  for(const l of (g.children||[])){
   if(l.hidden){if(!l.children)report.skipped.push([l.name,'숨김']);continue;}
   const clip=l.clipping?base:null;if(!l.clipping)base=l;
   if(l.children){yield* walk(l,path.concat([l.name||'']));}else yield [l,clip,path];
  }}
 for(const [l,clipbase,path] of walk(group,[])){
  if(l.adjustment){report.skipped.push([l.name,'조정 레이어']);continue;}
  if(l.right<=X0||l.left>=X1||l.bottom<=Y0||l.top>=Y1)continue;
  if(l.right-l.left<=0||l.bottom-l.top<=0)continue;
  const blend=(l.blendMode||'normal');
  const e={name:l.name||'',g:path.join('/')};
  if(blend==='screen')e.blend='screen';
  const cb=clipbase?made.get(clipbase):null;
  const op=l.opacity==null?1:l.opacity;
  if(l.text){
   const ti=textInfo(l),runs=ti.runs,ok=runs.filter(r=>r.t.trim());
   runs.forEach(r=>{if(!r.t.trim()&&ok.length)r.font=ok[0].font;});
   const cliprect=!clipbase||(cb&&cb[0]==='rect'),hasMask=l.mask&&!l.mask.disabled&&l.mask.canvas;
   const known=runs.length&&runs.every(r=>WEBW[r.font]!=null&&(FAM[r.font]||AVAIL[WEBW[r.font]]));
   if(known&&cliprect&&!hasMask){
    const main=runs.slice().sort((a,b)=>b.t.trim().length-a.t.trim().length)[0];
    const same=r=>r.font===main.font&&r.color===main.color&&Math.abs(r.size-main.size)<0.06;
    const others=runs.filter(r=>!same(r)&&r.t.trim());
    Object.assign(e,{type:'text',ink:true,align:ti.align,y:l.top-Y0,x:Math.round((ti.tr[4]-X0)*100)/100,size:Math.round(main.size*100)/100,hs:Math.round(main.hs*10000)/10000,track:main.track,
     lh:Math.round((main.lead||main.size*1.2)/main.size*10000)/10000,weight:WEBW[main.font],color:main.color,psd:[l.left-X0,l.top-Y0,l.right-l.left,l.bottom-l.top]});
    if(main.strike)e.strike=true;if(main.italic)e.skew=0.2126;if(FAM[main.font])e.font=FAM[main.font];
    if(others.length){const o=others[0];e.em={weight:WEBW[o.font],color:o.color,k:Math.round(o.size/main.size*10000)/10000};if(FAM[o.font])e.em.font=FAM[o.font];else if(FAM[main.font])e.em.font='Pretendard';}
    e.text=runs.map(r=>(same(r)||!r.t.trim())?r.t:r.t.split('\n').map(x=>x?'[['+x+']]':'').join('\n')).join('');
    e.ascR=Math.round((ti.tr[5]-l.top)/main.size*10000)/10000;
    e.name=runs.map(r=>r.t).join('').replace(/\n/g,' ').slice(0,24);
    if(clipbase&&cb){e.clip=cb[1].slice();e.cref=cb[2];}
    if(op<1)e.alpha=Math.round(op*1000)/1000;
    if(REMOTE[e.font]){const r=raster(l,report);if(r)e.fb={src:img(r.cv),dx:Math.round((r.x-X0-e.x)*100)/100,dy:r.y-Y0-e.y,w:r.cv.width,h:r.cv.height};}
    els.push(e);made.set(l,['other',null,null]);continue;
   }
   report.rasterText.push([runs.map(r=>r.t).join('').slice(0,20),[...new Set(runs.map(r=>r.font))].join(', ')]);e.rasterText=true;
  }
  const r=raster(l,report);if(!r){report.skipped.push([l.name,'픽셀 없음']);continue;}
  let id=data(r.cv);const tb=tight(id,r.x,r.y,8);if(!tb)continue;
  const isShape=!l.text&&(l.vectorMask||l.vectorOrigination||l.vectorFill);
  if(isShape&&!clipbase&&blend==='normal'){
   const A=id.data;let n=0,r0=0,g0=0,b0=0,uni=true,amax=0;
   for(let i=0;i<A.length;i+=4){const a=A[i+3];if(a>amax)amax=a;if(a>250){if(!n){r0=A[i];g0=A[i+1];b0=A[i+2];}else if(Math.abs(A[i]-r0)>1||Math.abs(A[i+1]-g0)>1||Math.abs(A[i+2]-b0)>1){uni=false;break;}n++;}}
   const od=l.vectorOrigination&&l.vectorOrigination.keyDescriptorList&&l.vectorOrigination.keyDescriptorList[0];
   const ot=od?(od.keyShapeInvalidated?-1:od.keyOriginType):0;
   if(n&&uni&&amax===255&&(ot===0||ot===1||ot===2||ot===5)){
    const t2=tight(id,r.x,r.y,128);const x=Math.max(t2[0],X0),y=Math.max(t2[1],Y0),x2=Math.min(t2[2],X1),y2=Math.min(t2[3],Y1);
    if(x2<=x||y2<=y)continue;
    let rect=true;
    if(ot===0){const w=id.width,h=id.height,ca=A[3],cb2=A[(w-1)*4+3],cc=A[((h-1)*w)*4+3];rect=ca>200&&cb2>200&&cc>200;}
    if(rect){
     Object.assign(e,{type:'rect',x:x-X0,y:y-Y0,w:x2-x,h:y2-y,fill:hex({r:r0,g:g0,b:b0})});
     if(ot===2&&od.keyOriginRRectRadii){const rr=od.keyOriginRRectRadii.topLeft;e.radius=Math.round(((rr&&rr.value!=null)?rr.value:rr||0)*10)/10;}
     if(ot===5)e.radius=Math.min(e.w,e.h)/2;
     if(op<1)e.alpha=Math.round(op*1000)/1000;
     els.push(e);made.set(l,['rect',[x-X0,y-Y0,x2-x,y2-y],els.length-1]);continue;
    }
   }
  }
  let cv=r.cv;
  if(cb&&cb[0]==='rect'){e.clip=cb[1].slice();e.cref=cb[2];}
  else if(clipbase){const b=raster(clipbase,report);
   if(b){const bc=mk(cv.width,cv.height);bc.getContext('2d').drawImage(b.cv,b.x-r.x,b.y-r.y);const x=cv.getContext('2d');x.globalCompositeOperation='destination-in';x.drawImage(bc,0,0);x.globalCompositeOperation='source-over';report.baked++;}}
  const cx0=Math.max(r.x,X0),cy0=Math.max(r.y,Y0),cx1=Math.min(r.x+cv.width,X1),cy1=Math.min(r.y+cv.height,Y1);
  if(cx1<=cx0||cy1<=cy0)continue;
  if(cx0!==r.x||cy0!==r.y||cx1-cx0!==cv.width||cy1-cy0!==cv.height){const c2=mk(cx1-cx0,cy1-cy0);c2.getContext('2d').drawImage(cv,r.x-cx0,r.y-cy0);cv=c2;}
  Object.assign(e,{type:'image',x:cx0-X0,y:cy0-Y0,w:cv.width,h:cv.height,src:img(cv)});
  if(op<1)e.alpha=Math.round(op*1000)/1000;
  els.push(e);made.set(l,['image',null,null]);
 }
 return els;
}
function topOf(g){let t=1e9;(function w(x){(x.children||[]).forEach(c=>{if(c.hidden)return;if(c.children)w(c);else if(c.bottom>c.top&&!c.adjustment)t=Math.min(t,c.top);});})(g);return t;}

window.psd2scene=function(buf,imgs){
 const psd=agPsd.readPsd(buf,{skipCompositeImageData:true,skipThumbnail:true});
 const W=psd.width,H=psd.height,report={skipped:[],rasterText:[],baked:0};
 const top=(psd.children||[]).filter(l=>!l.hidden);
 const boards=top.filter(l=>l.artboard&&l.children);
 let tops=top,single=null;
 if(boards.length===1&&top.filter(l=>l.children).length===1){single=boards[0];tops=(single.children||[]).filter(l=>!l.hidden);}
 const groups=tops.filter(l=>l.children);
 const long=H>W*2.2&&groups.length>=3;
 const out={w:W,h:H,report:report,sections:[]};
 if(boards.length>=1&&!(single&&long)){
  out.mode='boards';
  for(const ab of boards){const rc=ab.artboard.rect,b=[rc.left,rc.top,rc.right,rc.bottom];
   out.sections.push({name:ab.name||'',x0:b[0],y0:b[1],w:b[2]-b[0],h:b[3]-b[1],els:convert(ab,b,report,imgs)});}
 }else if(long){
  out.mode='sections';
  const gs=groups.map(g=>({g:g,t:topOf(g)})).filter(x=>x.t<1e9).sort((a,b)=>a.t-b.t);
  const bounds=gs.map(x=>Math.max(0,x.t)).concat([H]);bounds[0]=0;
  gs.forEach((x,i)=>{const b=[0,bounds[i],W,bounds[i+1]];if(b[3]-b[1]<20)return;
   out.sections.push({name:x.g.name||'',x0:0,y0:b[1],w:W,h:b[3]-b[1],els:convert(x.g,b,report,imgs)});});
 }else{
  out.mode='single';
  out.sections.push({name:'',x0:0,y0:0,w:W,h:H,els:convert({children:top},[0,0,W,H],report,imgs)});
 }
 return out;
};
})();

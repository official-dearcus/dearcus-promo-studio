/* 기획안 엑셀 읽기 + 틀(PSD 그룹)을 상품 수만큼 복제해 섹션·썸네일 생성 */
(function(){
const num=v=>{if(typeof v==='number')return v;const n=String(v==null?'':v).replace(/[^0-9.]/g,'');return n?Number(n):NaN;};
const str=v=>v==null?'':String(v).replace(/\r/g,'').trim();
const won=n=>Math.round(n).toLocaleString('ko-KR');
const pctOf=(p1,pf)=>(p1>0&&pf>0&&pf<=p1)?Math.floor((1-pf/p1)*100+0.5):null;

window.parsePlan=function(buf){
 const wb=XLSX.read(buf,{type:'array'}),ws=wb.Sheets[wb.SheetNames[0]],rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:null,raw:true});
 const plan={sheet:wb.SheetNames[0],title:'',sub:'',coupons:[],gifts:[],products:[],notes:[]};
 let hi=-1;
 for(let i=0;i<rows.length;i++){const r=rows[i].map(str);if(r.some(c=>/상품명/.test(c))&&r.some(c=>/정상가/.test(c))){hi=i;break;}}
 for(let i=0;i<(hi<0?rows.length:hi);i++){const r=rows[i],cells=r.map((c,j)=>[j,c]).filter(x=>x[1]!=null&&str(x[1])!=='');if(!cells.length)continue;
  const first=str(cells[0][1]);
  if(/메인 ?카피/.test(first)&&cells[1])plan.title=str(cells[1][1]);
  else if(/서브 ?카피/.test(first)&&cells[1])plan.sub=str(cells[1][1]);
  else if(/쿠폰|사은품/.test(first)&&cells.length>=2&&cells.slice(1).some(x=>typeof x[1]==='number'&&x[1]>=1000)){
   const nm=cells.slice(1).map(x=>x[1]).find(v=>typeof v==='string'&&str(v));const ns=cells.slice(1).map(x=>x[1]).filter(v=>typeof v==='number');
   const big=ns.filter(v=>v>=1000),rate=ns.find(v=>v>0&&v<1);const m=str(nm).match(/(\d+)\s*%/);
   const o={kind:first,name:str(nm),min:big[0]||0,max:big[1]||0,rate:rate?Math.round(rate*100):(m?Number(m[1]):0)};
   if(/사은품/.test(first))plan.gifts.push(o);else plan.coupons.push(o);}
 }
 if(hi<0){plan.notes.push('상품 표를 찾지 못했습니다. "상품명"과 "정상가" 제목이 있는 줄이 필요합니다.');return plan;}
 const H=rows[hi].map(c=>str(c).replace(/\n/g,''));const col=(re,last)=>{let k=-1;H.forEach((h,j)=>{if(re.test(h)&&(k<0||last))k=j;});return k;};
 const cName=col(/상품명/),cP1=col(/정상가/),cZone=col(/진열|^구분/),cBadge=col(/배지|뱃지/),cBox=col(/상단 ?박스/);
 let cP3=col(/쿠폰.*최종/);if(cP3<0)cP3=col(/쿠폰.*적용가/);if(cP3<0)cP3=col(/쿠폰.*할인가/);
 let cP2=-1;H.forEach((h,j)=>{if(/(즉시|행사가)/.test(h)&&!/쿠폰 ?(적용|할인|최종)/.test(h)&&j!==cP3)cP2=j;});
 for(let i=hi+1;i<rows.length;i++){const r=rows[i],nm=str(r[cName]),p1=num(r[cP1]);if(!nm||!(p1>0)){if(plan.products.length)break;else continue;}
  const p2=cP2>=0?num(r[cP2]):NaN,p3=cP3>=0?num(r[cP3]):NaN,fin=p3>0?p3:(p2>0?p2:p1),zone=cZone>=0?str(r[cZone]):'';
  plan.products.push({name:nm.replace(/\n/g,' '),p1:p1,p2:p2>0?p2:null,fin:fin,pct:pctOf(p1,fin),zone:zone,layout:/메인|1열|1구|강조/.test(zone)?'one':/하단|추가/.test(zone)?'cart':'two',badge:cBadge>=0?str(r[cBadge]):'',box:cBox>=0?str(r[cBox]):''});}
 if(cZone<0)plan.notes.push('진열 구분 칸이 없어 모든 상품을 2구로 배치했습니다.');
 return plan;
};

const topG=e=>(e.g||'').split('/')[0];
function roleOf(e){if(e.type!=='text')return null;const t=e.text;
 return /^\d+\s*%$/.test(t)?'pct':e.strike?'pv':(/^[\d,]+(\[\[)?원/.test(t)&&e.weight>=700)?'p3':/보기|바로가기|더보기/.test(t)?'cta':(/할인가|판매가|혜택가/.test(t)&&e.weight>=700)?'l3':/판매가|할인가/.test(t)?'lv':e.weight>=600?'name':'etc';}
const biggest=list=>list.filter(e=>e.type==='rect').sort((a,b)=>b.w*b.h-a.w*a.h)[0];
/* 섹션에서 카드 틀을 뽑습니다 */
function template(sec){
 const groups={};sec.els.forEach((e,i)=>{const t=topG(e);if(/^opt/i.test(t))(groups[t]=groups[t]||[]).push(i);});
 const keys=Object.keys(groups).filter(k=>biggest(groups[k].map(i=>sec.els[i])));if(!keys.length)return null;
 const boxes=keys.map(k=>{const r=biggest(groups[k].map(i=>sec.els[i]));return {k:k,x:r.x,y:r.y,w:r.w,h:r.h,r:r};}).sort((a,b)=>Math.abs(a.y-b.y)>20?a.y-b.y:a.x-b.x);
 const f=boxes[0],row0=boxes.filter(b=>Math.abs(b.y-f.y)<=20),cols=row0.length,next=boxes.find(b=>b.y>f.y+20);
 const bottoms=k=>Math.max(...groups[k].map(i=>{const e=sec.els[i];return e.type==='text'?e.y+e.size:e.type==='rect'?e.y+e.h:0;}));
 const cardH=Math.max(f.h,bottoms(f.k)-f.y),rowPitch=next?next.y-f.y:cardH+24,colPitch=cols>1?row0[1].x-f.x:0;
 const idx=groups[f.k],cardEls=idx.map(i=>{const e=JSON.parse(JSON.stringify(sec.els[i]));e.x-=f.x;e.y-=f.y;if(e.clip){e.clip[0]-=f.x;e.clip[1]-=f.y;}
   if(e.cref!=null){const j=idx.indexOf(e.cref);e._c=j;delete e.cref;}e.role=roleOf(e);return e;});
 const lastBottom=Math.max(...boxes.map(b=>bottoms(b.k)));
 const all=new Set([].concat(...keys.map(k=>groups[k])));
 const frame=sec.els.map((e,i)=>all.has(i)?null:{e:e,i:i}).filter(Boolean);
 const firstIdx=Math.min(...all);
 return {sec:sec,cols:cols,x0:f.x,y0:f.y,rowPitch:rowPitch,colPitch:colPitch,cardH:cardH,cardEls:cardEls,frame:frame,firstIdx:firstIdx,lastBottom:lastBottom,n:boxes.length,
  imgBox:(()=>{const im=cardEls.filter(e=>e.type==='image'&&!e.rasterText).sort((a,b)=>b.w*b.h-a.w*a.h)[0];return im?{x:im.x,y:im.y,w:im.w,h:im.h}:null;})()};
}
const normName=s=>String(s).normalize('NFC').toLowerCase().replace(/\[\[|\]\]/g,'').replace(/[()\[\]+·,./\-_&]/g,' ').replace(/\s+/g,' ').trim();
const setKey=s=>{const n=normName(s).replace(/ /g,'');const m=String(s).match(/(\d)\s*\+\s*(\d)/),t=n.match(/(\d+)(세트|set)/);return (m?m[1]+'+'+m[2]:'')+'|'+(t?t[1]:'');};
const FILL=/^(포함|구성|세트구성|본품)$/;
function score(a,b){const ka=setKey(a).split('|'),kb=setKey(b).split('|');if(ka[0]!==kb[0])return 0;if(ka[1]&&kb[1]&&ka[1]!==kb[1])return 0;const A=normName(a).split(' ').filter(t=>t&&!FILL.test(t)),B=normName(b).replace(/ /g,'');if(!A.length)return 0;let hit=0;A.forEach(t=>{if(B.indexOf(t)>=0)hit+=t.length;});return hit/A.join('').length;}
function best(name,list,get){let bi=-1,bs=0;list.forEach((x,i)=>{const s=Math.min(score(name,get(x)),score(get(x),name));if(s>bs){bs=s;bi=i;}});return bs>=0.72?list[bi]:null;}

function wrapName(name,el,maxW,lines,measure){
 if(lines<2||measure(Object.assign({},el,{text:name}))<=maxW)return name;
 const sp=[];for(let i=0;i<name.length;i++)if(name[i]===' ')sp.push(i);if(!sp.length)return name;
 const mid=name.length/2;sp.sort((a,b)=>Math.abs(a-mid)-Math.abs(b-mid));return name.slice(0,sp[0])+'\n'+name.slice(sp[0]+1);}

function fillCard(T,p,cx,cy,out,ctx,no){
 const base=out.length,map=[];
 const tplLines=r=>{const e=T.cardEls.find(x=>x.role===r);return e?String(e.text).split('\n').length:0;};
 T.cardEls.forEach((src,j)=>{const e=JSON.parse(JSON.stringify(src));e.x+=cx;e.y+=cy;if(e.clip){e.clip[0]+=cx;e.clip[1]+=cy;}
  if(e._c!=null&&e._c>=0)e.cref=base+e._c;delete e._c;
  e.g=String(e.g||'').replace(/^[^/]*/,'opt'+String(no).padStart(2,'0'));
  const role=e.role;delete e.role;
  if(role==='name'){const card=T.cardEls.filter(x=>x.type==='rect').sort((a,b)=>b.w*b.h-a.w*a.h)[0];const maxW=T.cols>1?card.w-(src.x-card.x)*2:card.w*0.52;
   e.name=p.name.slice(0,24);const tl=String(src.text).split('\n').length;
   if(tl>=2){e.text=wrapName(p.name,e,maxW,2,ctx.measure);if(ctx.measure(e)>maxW+2){const k=Math.max(0.72,maxW/ctx.measure(e));e.size=Math.floor(e.size*k*10)/10;}}
   else{e.text=p.name;let w=ctx.measure(e);if(w>maxW+2){const k=Math.max(0.8,maxW/w);e.size=Math.floor(e.size*k*10)/10;w=ctx.measure(e);}
    if(w>maxW+2){e.text=wrapName(p.name,e,maxW,2,ctx.measure);e.lh=1.25;e.y-=Math.round(e.size*0.95);}}}
  else if(role==='pv'){const n=String(src.text).split('\n').length;e.text=(n>=2&&p.p2?[p.p1,p.p2]:[p.p1]).map(v=>won(v)+'원').join('\n');if(n>=2&&!p.p2)e.text=won(p.p1)+'원';}
  else if(role==='lv'){const n=String(src.text).split('\n');if(n.length>=2&&!p.p2)e.text=n[0];}
  else if(role==='p3'){e.text=won(p.fin)+(/\[\[원\]\]/.test(src.text)?'[[원]]':'원');}
  else if(role==='pct'){e.text=(p.pct==null?0:p.pct)+'%';}
  else if(e.type==='image'&&!e.rasterText&&T.imgBox&&src.x===T.imgBox.x&&src.y===T.imgBox.y){
   const hit=ctx.findImage(p.name,T);
   if(hit){const B=hit.rel&&hit.kind===T.kind?hit.rel:null;
    if(B){e.x=cx+B.x;e.y=cy+B.y;e.w=B.w;e.h=B.h;}else{const k=Math.min(T.imgBox.w/hit.w,T.imgBox.h/hit.h);e.w=Math.round(hit.w*k);e.h=Math.round(hit.h*k);e.x=cx+T.imgBox.x+Math.round((T.imgBox.w-e.w)/2);e.y=cy+T.imgBox.y+Math.round((T.imgBox.h-e.h)/2);}
    e.src=hit.src;e.name='상품 이미지';const cr=T.cardEls.filter(x=>x.type==='rect').sort((a,b)=>b.w*b.h-a.w*a.h)[0],ci=T.cardEls.indexOf(cr);if(cr&&ci>=0){e.cref=base+ci;e.clip=[cx+cr.x,cy+cr.y,cr.w,cr.h];}}
   else{e.src='__none__';e.name='상품 이미지 (없음)';ctx.missing.push(p.name);}
  }
  else if(e.type==='image'&&!e.rasterText&&e.w>=70&&e.h>=70){e.hide=true;e.name='(틀의 다른 상품 이미지)';}
  out.push(e);map.push(base+j);});
}
function buildSection(T,products,ctx,title){
 const sec=T.sec,rows=Math.ceil(products.length/T.cols),newBottom=T.y0+(rows-1)*T.rowPitch+T.cardH,delta=Math.round(newBottom-T.lastBottom);
 const out=[],idxMap={};let placed=false;
 const put=()=>{products.forEach((p,i)=>{fillCard(T,p,T.x0+(i%T.cols)*T.colPitch,T.y0+Math.floor(i/T.cols)*T.rowPitch,out,ctx,i+1);});placed=true;};
 T.frame.forEach(f=>{if(!placed&&f.i>T.firstIdx)put();const e=JSON.parse(JSON.stringify(f.e));
  if(e.type==='image'&&!e.rasterText&&f.i>T.firstIdx&&e.y>=T.y0-5&&e.y<T.lastBottom-5&&e.h<sec.h*0.6){idxMap[f.i]=null;return;}
  const tall=(e.type!=='text')&&e.h>=sec.h*0.6;
  if(tall){if(e.type==='rect'||e.y+e.h>=sec.h-4)e.h=Math.max(10,e.h+delta);}
  else if(e.y>=T.lastBottom-2){e.y+=delta;if(e.clip)e.clip[1]+=delta;}
  else if(e.type!=='text'&&e.y+e.h>=sec.h-4&&e.y<T.y0){e.h=Math.max(10,e.h+delta);}
  idxMap[f.i]=out.length;out.push(e);});
 if(!placed)put();
 out.forEach(e=>{if(e._f)delete e._f;});
 T.frame.forEach(f=>{const e=out[idxMap[f.i]];if(f.e.cref!=null){if(idxMap[f.e.cref]!=null)e.cref=idxMap[f.e.cref];else delete e.cref;}});
 return {name:sec.name,x0:0,y0:0,w:sec.w,h:sec.h+delta,els:out,generated:true,count:products.length};
}
function tokenize(sec,map){sec.els.forEach(e=>{['color','fill'].forEach(k=>{if(map[e[k]])e[k]=map[e[k]];});if(e.em&&map[e.em.color])e.em.color=map[e.em.color];});return sec;}
function kor(n){if(n>=10000&&n%10000===0)return (n/10000)+'만 원';if(n>=1000&&n%1000===0)return (n/1000)+'천 원';return won(n)+'원';}
function fillCoupons(sec,coupons,notes){
 const gs={};sec.els.forEach(e=>{const t=topG(e);if(/^\d+$/.test(t))(gs[t]=gs[t]||[]).push(e);});
 const keys=Object.keys(gs).sort((a,b)=>{const p=biggest(gs[a])||gs[a][0],q=biggest(gs[b])||gs[b][0];return Math.abs(p.y-q.y)>20?p.y-q.y:p.x-q.x;});
 if(!keys.length)return false;
 if(coupons.length>keys.length)notes.push('쿠폰이 '+coupons.length+'개인데 틀에는 '+keys.length+'칸뿐이라 앞의 '+keys.length+'개만 넣었습니다.');
 keys.forEach((k,i)=>{const c=coupons[i];if(!c){gs[k].forEach(e=>{e.hide=true;});return;}
  const tx=gs[k].filter(e=>e.type==='text'),big=tx.find(e=>e.font&&e.alpha!=null)||tx.find(e=>e.size>=150),title=tx.filter(e=>e!==big&&e.weight>=700).sort((a,b)=>b.size-a.size)[0],cond=tx.find(e=>e!==big&&e!==title&&String(e.text).split('\n').length>=2),lab=tx.find(e=>e!==big&&e!==title&&e!==cond&&!/다운로드/.test(e.text));
  const amt=c.rate?c.rate+'%':(c.max||0)>=1000?Math.round(c.max/1000)+'K':'';
  if(big&&amt)big.text=amt;
  if(title)title.text=c.rate?c.rate+'% 쿠폰':kor(c.max).replace(' 원',' 원')+' 쿠폰';
  if(cond)cond.text=(c.min?(c.min>=10000?(c.min/10000)+'만원':won(c.min)+'원')+' 이상 구매시':'전 상품')+'\n'+(c.rate&&c.max?'최대 '+(c.max>=10000?(c.max/10000)+'만원':(c.max/1000)+'천원')+' 사용 가능':/장바구니/.test(c.kind)?'장바구니 적용':'주문당 1장 사용');
  if(lab)lab.text=/장바구니/.test(c.kind)?'CART':c.kind.replace(/\s*쿠폰$/,'')==='기본'?'전제품 쿠폰':c.kind;});
 return true;
}

/* S: {sections, banners, thumbs}, plan, lib: {cutouts:[{name,src,w,h}], shots:[{name,src,iw,ih}]}, builtin: 예시 장면(틀) */
window.applyPlan=function(S,plan,lib,builtin,theme,measure){
 const log={made:[],notes:plan.notes.slice(),missing:[]};
 const own=S.sections.some(sec=>template(sec));
 const src=own?S.sections:JSON.parse(JSON.stringify(builtin.sections));
 if(!own){const bt=builtin.theme||{};const m={};if(bt.point)m[bt.point]='@point';if(bt.price)m[bt.price]='@price';src.forEach(s=>tokenize(s,m));log.notes.push('올린 PSD에 옵션 카드 틀이 없어 기본 틀(블프 디자인)에 이번 행사의 강조 색을 입혀 만들었습니다.');}
 const tpls=src.map(sec=>{const t=template(sec);if(t){t.kind=t.cols===1?'one':/cart|추가|함께/i.test(sec.name)?'cart':'two';}return t;});
 const pick=k=>tpls.find(t=>t&&t.kind===k)||null;
 const T={one:pick('one'),two:pick('two'),cart:pick('cart')};if(!T.cart)T.cart=T.two;if(!T.two)T.two=T.cart;if(!T.one)T.one=T.two;
 /* 틀에 들어 있던 상품 이미지를 이름으로 찾아 쓸 수 있게 모읍니다 */
 const stock=[];src.forEach((sec,si)=>{const t=tpls[si];if(!t)return;const gs={};sec.els.forEach(e=>{const g=topG(e);if(/^opt/i.test(g))(gs[g]=gs[g]||[]).push(e);});
  Object.keys(gs).forEach(k=>{const card=biggest(gs[k]),nm=gs[k].find(e=>roleOf(e)==='name'),im=gs[k].filter(e=>e.type==='image'&&!e.rasterText).sort((a,b)=>b.w*b.h-a.w*a.h)[0];
   if(card&&nm&&im)stock.push({name:String(nm.text).replace(/\n/g,' '),src:im.src,w:im.w,h:im.h,kind:t.kind,rel:{x:im.x-card.x,y:im.y-card.y,w:im.w,h:im.h}});});});
 const ctx={measure:measure,missing:log.missing,findImage:(name,Tp)=>{const u=best(name,lib.cutouts,x=>x.name);if(u)return {src:u.src,w:u.w,h:u.h};const s=best(name,stock.filter(x=>x.kind===Tp.kind),x=>x.name)||best(name,stock,x=>x.name);return s||null;}};
 const gen=[];
 const by={one:plan.products.filter(p=>p.layout==='one'),two:plan.products.filter(p=>p.layout==='two'),cart:plan.products.filter(p=>p.layout==='cart')};
 const cSec=src.find(sec=>/coupon|쿠폰/i.test(sec.name));
 if(cSec&&plan.coupons.length){const c=own?cSec:JSON.parse(JSON.stringify(cSec));if(fillCoupons(c,plan.coupons,log.notes)){c.generated=true;gen.push(['coupon',c,cSec]);log.made.push('쿠폰 '+Math.min(plan.coupons.length,2)+'개');}}
 ['one','two','cart'].forEach(k=>{if(!by[k].length)return;const t=T[k];if(!t){log.notes.push('옵션 카드 틀이 없어 '+by[k].length+'개 상품을 만들지 못했습니다.');return;}
  const sec=buildSection(t,by[k],ctx);gen.push([k,sec,t.sec]);log.made.push({one:'1구 옵션 ',two:'2구 옵션 ',cart:'함께 담기 옵션 '}[k]+by[k].length+'개');});
 const gSec=src.find(sec=>/gift|사은품/i.test(sec.name));
 if(gSec&&plan.gifts.length&&!own){const g=JSON.parse(JSON.stringify(gSec));g.generated=true;g.giftNote=plan.gifts[0];gen.push(['gift',g,gSec]);log.made.push('사은품 1개(문구·이미지 확인 필요)');}
 if(own){const rep=new Map();gen.forEach(x=>rep.set(x[2],x[1]));const used=new Set();
  S.sections=S.sections.map(sec=>{if(rep.has(sec)&&!used.has(sec)){used.add(sec);return rep.get(sec);}return sec;}).filter(sec=>{const t=template(sec);if(!t||sec.generated)return true;const k=t.cols===1?'one':/cart|추가|함께/i.test(sec.name)?'cart':'two';return by[k].length===0?true:false;});
  gen.forEach(x=>{if(S.sections.indexOf(x[1])<0)S.sections.push(x[1]);});
 }else gen.forEach(x=>S.sections.push(x[1]));
 /* 썸네일: 엑셀 상품마다 연출컷을 이름으로 찾아 할인율을 채웁니다 */
 const shots=lib.shots.slice(),thumbs=[],noShot=[];
 plan.products.forEach(p=>{const s=best(p.name,shots,x=>x.name);if(!s){noShot.push(p.name);return;}
  const m=p.name.match(/(\d)\+(\d)/),st=p.name.match(/(\d+)\s*세트/);
  thumbs.push(Object.assign({},s,{name:p.name,pct:p.pct,small:p.badge?'':m?'SET':'',big:p.badge||(m?m[0]:st?st[1]+'SET':'')}));});
 const matched=new Set(thumbs.map(t=>t.src));S.thumbs=thumbs.concat(S.thumbs.filter(t=>!matched.has(t.src)));
 if(thumbs.length)log.made.push('썸네일 '+thumbs.length+'개(할인율 자동)');
 if(noShot.length)log.notes.push('연출컷이 없어 썸네일을 만들지 못한 상품 '+noShot.length+'개: '+noShot.slice(0,6).join(', ')+(noShot.length>6?' 외':''));
 if(log.missing.length)log.notes.push('상품 이미지를 찾지 못해 빈 칸으로 둔 옵션 '+log.missing.length+'개: '+log.missing.slice(0,6).join(', ')+(log.missing.length>6?' 외':''));
 log.notes.push('카카오톡은 틀(768×1024 아트보드)이 있는 PSD를 올리면 그대로 편집할 수 있지만, 엑셀로 자동 생성하는 기능은 아직 없습니다.');
 return log;
};
window.planTemplate=template;
})();

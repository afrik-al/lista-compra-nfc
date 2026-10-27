// Geometría del diseño original (lienzo 1080x1920). Todo se escala con u = anchoReal/1080.
const LINES=[437,579,718,860,1015,1154,1296,1438,1577];
const BOX=[[144,456],[149,595],[151,737],[149,892],[153,1031],[156,1174],[151,1313],[156,1452]];
const HEAD_H=437,FOOT_H=343,BOX_SIZE=116,TK=MANIFEST.ticket;
const $=s=>document.querySelector(s),R=Math.round;
const stage=$('#stage'),head=$('#head'),list=$('#list'),foot=$('#foot'),storesEl=$('#stores'),titleEl=$('#title');
const el=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e};
const state={store:MANIFEST.stores[0].id,view:'list',busy:false};
const ov=el('div');ov.id='tickets';ov.hidden=true;const toastEl=el('div');toastEl.id='toast';stage.append(ov,toastEl);
let u=1,W=0,lastW=0,pending=false,tt;

const inList=()=>document.activeElement&&list.contains(document.activeElement)&&document.activeElement.tagName==='INPUT';
function toast(msg){toastEl.textContent=msg;toastEl.style.fontSize=R(46*u)+'px';toastEl.style.bottom=R((FOOT_H+30)*u)+'px';toastEl.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>toastEl.classList.remove('on'),2400)}
const fail=()=>toast('No se pudo guardar. Inténtalo de nuevo');

function layout(){
  u=stage.clientWidth/1080;W=R(1080*u);stage.style.setProperty('--u',u+'px');
  const bg=`${W}px ${R(1920*u)}px`,fh=R(FOOT_H*u);
  head.style.height=R(HEAD_H*u)+'px';head.style.backgroundSize=bg;head.style.backgroundPosition='0 0';
  foot.style.height=fh+'px';foot.style.backgroundSize=bg;foot.style.backgroundPosition=`0 ${-(R(1920*u)-fh)}px`;
  storesEl.style.height=R(345*u)+'px';storesEl.style.paddingLeft=storesEl.style.scrollPaddingLeft=R(28*u)+'px';
  ov.style.bottom=fh+'px';
  if(W!==lastW||!inList()){lastW=W;render();renderTickets()}   // no se reconstruye la lista mientras se escribe
}
function buildStores(){
  MANIFEST.stores.forEach(s=>{const b=el('button','store');b.dataset.id=s.id;b.setAttribute('aria-label',s.label);
    const im=el('img');im.src=s.icon.file;im.alt='';im.draggable=false;b.append(im);
    b.onclick=()=>{state.store=s.id;if(state.view!=='list')setView('list');render()};storesEl.append(b)});
}
function placeStores(){
  MANIFEST.stores.forEach((s,k)=>{const b=storesEl.children[k],i=s.icon,im=b.firstChild;
    b.style.width=R(316*u)+'px';b.style.height=R(295*u)+'px';b.style.marginRight=R(33*u)+'px';
    Object.assign(im.style,{left:R((i.x-i.slot)*u)+'px',top:R(i.y*u)+'px',width:R(i.w*u)+'px',height:R(i.h*u)+'px'});
    b.classList.toggle('sel',s.id===state.store)});
}
function buildFoot(){
  [['trash','Vaciar todas las listas',askClear],['ticket','Ver tickets',()=>setView(state.view==='tickets'?'list':'tickets')],['done','Finalizar compra',finish]].forEach(([k,label,fn])=>{
    const b=el('button','btn');b.dataset.k=k;b.setAttribute('aria-label',label);const im=el('img');im.src=MANIFEST.btn[k].file;im.alt='';im.draggable=false;b.append(im);b.onclick=fn;foot.append(b)});
}
function placeFoot(){
  foot.querySelectorAll('.btn').forEach(b=>{const d=MANIFEST.btn[b.dataset.k];
    Object.assign(b.style,{left:R(d.x*u)+'px',top:R((d.y-(1920-FOOT_H))*u)+'px',width:R(d.w*u)+'px',height:R(d.h*u)+'px'})});
}

// ---------- Lista ----------
const myItems=()=>DB.items.filter(i=>i.store===state.store);
function render(){
  const st=MANIFEST.stores.find(s=>s.id===state.store),t=st.title;
  placeStores();placeFoot();
  titleEl.src=t.file;titleEl.alt=st.label;Object.assign(titleEl.style,{left:R(t.x*u)+'px',top:R(t.y*u)+'px',width:R(t.w*u)+'px',height:R(t.h*u)+'px'});
  const items=myItems(),keep=list.scrollTop,bg=`${W}px ${R(1920*u)}px`;pending=false;
  list.innerHTML='';let filled=0,idx=0;
  while(idx<items.length+1||filled<list.clientHeight+R(150*u)){
    const s=idx<8?idx:6+(idx%2),top=R(LINES[s]*u),h=R(LINES[s+1]*u)-top,it=items[idx],[bx,by]=BOX[s];
    const row=el('div','row');Object.assign(row.style,{height:h+'px',backgroundImage:'url(assets/fondo.jpg)',backgroundSize:bg,backgroundPosition:`0 ${-top}px`});
    const hit=el('button','hit');hit.setAttribute('aria-label','Marcar producto');hit.style.left=R((bx-34)*u)+'px';hit.style.width=R((BOX_SIZE+68)*u)+'px';row.append(hit);
    const sw=el('div','sw'),name=el('input','name');
    name.maxLength=60;name.autocomplete='off';name.enterKeyHint='done';name.value=it?it.name:'';name.placeholder=!it&&idx===items.length?'Añadir…':'';
    Object.assign(name.style,{left:R(330*u)+'px',width:R(520*u)+'px',top:R(44*u)+'px',height:R(96*u)+'px',fontSize:R(58*u)+'px'});sw.append(name);
    if(it){
      if(it.checked){const c=MANIFEST.check,im=el('img','chk');im.src=c.file;im.alt='';
        Object.assign(im.style,{left:R((bx+(c.x-BOX[0][0]))*u)+'px',top:R((by-LINES[s]+(c.y-BOX[0][1]))*u)+'px',width:R(c.w*u)+'px',height:R(c.h*u)+'px'});row.append(im)}
      hit.onclick=()=>{const r=DB.updateItem(it.id,{checked:!it.checked});if(!r.ok)fail()};
      const q=el('input','qty');q.value=it.qty;q.placeholder='cant.';q.maxLength=10;q.autocomplete='off';q.enterKeyHint='done';
      Object.assign(q.style,{left:R(880*u)+'px',width:R(170*u)+'px',top:R(44*u)+'px',height:R(96*u)+'px',fontSize:R(52*u)+'px'});sw.append(q);
      const hint=el('div','hint','borrar ✕');Object.assign(hint.style,{right:R(50*u)+'px',top:R(62*u)+'px',fontSize:R(50*u)+'px'});row.append(hint);
      const save=(inp,key,empty)=>()=>{const v=inp.value.trim();if(!v&&!empty){inp.value=it[key];return}if(v!==it[key]){const r=DB.updateItem(it.id,{[key]:v},true);r.ok?it[key]=v:(inp.value=it[key],fail())}inp.value=v};
      name.onblur=save(name,'name',false);q.onblur=save(q,'qty',true);
      [name,q].forEach(i=>i.onkeydown=e=>{if(e.key==='Enter')i.blur()});
      swipe(row,sw,hint,()=>{const r=DB.removeItem(it.id);if(!r.ok){fail();sw.style.transform='';sw.style.opacity=1}});
    }else if(idx===items.length){
      const add=ev=>{const v=name.value.trim();if(!v||name._d)return;name._d=1;name.value='';const r=DB.addItem(state.store,v);
        if(!r.ok){fail();name.value=v;name._d=0;return}if(ev==='enter')focusFree()};
      name.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();add('enter')}};name.onblur=()=>add('blur');
    }
    row.append(sw);list.append(row);filled+=h;idx++;
  }
  list.scrollTop=keep;
}
function focusFree(){const r=list.children[myItems().length];if(r){const i=r.querySelector('.name');i.focus();i.scrollIntoView({block:'center'})}}
// Deslizar hacia la izquierda borra el producto (con umbral; si se suelta antes, vuelve a su sitio).
function swipe(row,sw,hint,del){
  let sx=null,sy,id,act=false,dx=0;
  row.onpointerdown=e=>{if(e.pointerType==='mouse'&&e.button)return;sx=e.clientX;sy=e.clientY;id=e.pointerId;act=false;dx=0};
  row.onpointermove=e=>{if(sx==null||e.pointerId!==id)return;const x=e.clientX-sx,y=e.clientY-sy;
    if(!act){if(x<-12&&Math.abs(x)>Math.abs(y)*1.5){act=true;row.setPointerCapture(id);document.activeElement.blur()}else if(Math.abs(y)>12){sx=null;return}}
    if(act){dx=Math.min(0,x);sw.style.transform=`translateX(${dx}px)`;sw.style.opacity=Math.max(.15,1+dx/(W*.7));hint.style.opacity=Math.min(1,-dx/(120*u))}};
  const end=()=>{if(sx==null)return;const was=act;sx=null;act=false;if(!was)return;sw.classList.add('snap');
    if(-dx>W*.32){sw.style.transform=`translateX(${-W}px)`;sw.style.opacity=0;setTimeout(del,170)}
    else{sw.style.transform='';sw.style.opacity=1;hint.style.opacity=0}};
  row.onpointerup=end;row.onpointercancel=end;
}

// ---------- Confirmar compra ----------
function finish(){
  if(state.busy)return;state.busy=true;setTimeout(()=>state.busy=false,1000);   // bloqueo anti doble toque
  document.activeElement.blur?.();
  const r=DB.confirmPurchase(state.store);
  if(r.empty)return toast('Marca al menos un producto');
  if(!r.ok)return fail();
  toast('Compra guardada · ticket creado');
}

// ---------- Vaciar listas ----------
function confirmBox(title,text,yesLabel,onYes){
  const m=el('div','modal'),c=el('div','card'),bs=el('div','bs'),no=el('button',null,'Cancelar'),yes=el('button','danger',yesLabel);
  c.style.fontSize=R(50*u)+'px';c.append(el('h2',null,title),el('p',null,text));c.firstChild.style.fontSize=R(66*u)+'px';
  bs.append(no,yes);c.append(bs);m.append(c);stage.append(m);
  const close=()=>{m.remove();removeEventListener('keydown',esc)},esc=e=>{if(e.key==='Escape')close()};addEventListener('keydown',esc);
  m.onclick=e=>{if(e.target===m)close()};no.onclick=close;no.focus();yes.onclick=()=>{close();onYes()};
}
function askClear(){
  if(!DB.items.length)return toast('Las listas ya están vacías');
  confirmBox('¿Vaciar todas las listas?','Se borrarán los productos pendientes de todos los supermercados. Los tickets se conservan.','Vaciar todo',()=>{DB.clearAll().ok?toast('Listas vaciadas'):fail()});
}

// ---------- Tickets ----------
const fmtQty=q=>/^\d+([.,]\d+)?$/.test(q)?'x'+q:q;
function setView(v){state.view=v;document.activeElement.blur?.();ov.hidden=v!=='tickets';if(v==='tickets'){renderTickets();ov.querySelector('.car')?.scrollTo(0,0)}}
function askDelTicket(t){
  const sm=MANIFEST.stores.find(s=>s.id===t.store),d=new Date(t.date);
  confirmBox('¿Eliminar este ticket?',`${sm?sm.label:t.store} · ${d.toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric'})}. Se borrará del historial. Tus listas no cambian.`,'Eliminar',()=>{DB.removeTicket(t.id).ok?toast('Ticket eliminado'):fail()});
}
function renderTickets(){
  const prev=ov.querySelector('.car'),keep=prev?Math.round(prev.scrollLeft/(prev.clientWidth||1)):0;   // conserva el ticket que se está viendo
  ov.innerHTML='';const H=stage.clientHeight-R(FOOT_H*u),top=R(150*u),bot=R(110*u);
  let th=H-top-bot,tw=th*TK.w/TK.h;if(tw>W*.92){tw=W*.92;th=tw*TK.h/TK.w}
  const back=el('button','back','‹ volver');back.style.fontSize=R(58*u)+'px';back.onclick=()=>setView('list');
  const car=el('div','car');Object.assign(car.style,{top:top+'px',bottom:bot+'px'});
  const idx=el('div','idx');Object.assign(idx.style,{bottom:R(40*u)+'px',fontSize:R(48*u)+'px'});
  const ts=DB.tickets,N=Math.max(ts.length,1);
  for(let n=0;n<N;n++){
    const t=ts[n],sl=el('div','slide'),tk=el('div','tk');Object.assign(tk.style,{width:tw+'px',height:th+'px',fontSize:R(tw*.05)+'px'});
    if(!t){tk.append(el('div','emp','Todavía no hay compras.\nCuando finalices una, aparecerá aquí.'));tk.firstChild.style.whiteSpace='pre-line'}
    else{
      const tx=el('div','txt'),d=new Date(t.date),sm=MANIFEST.stores.find(s=>s.id===t.store);
      tx.append(el('div','sh',sm?sm.label:t.store),
        el('div','dt',d.toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric'})+' · '+d.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})),el('hr'));
      t.items.forEach(i=>{const l=el('div','ln');l.append(el('span',null,i.name));if(i.qty)l.append(el('b',null,fmtQty(i.qty)));tx.append(l);if(i.note)tx.append(el('div','nt',i.note))});
      tx.append(el('hr'),el('div','tot',t.items.length+(t.items.length===1?' artículo':' artículos')));tk.append(tx);
    }
    sl.append(tk);car.append(sl);
  }
  const upd=()=>{idx.textContent=ts.length?`${Math.min(N,Math.round(car.scrollLeft/(car.clientWidth||1))+1)} / ${N}`:''};
  const cur=()=>Math.min(N-1,Math.round(car.scrollLeft/(car.clientWidth||1)));
  if(ts.length){const del=el('button','back del','Eliminar ticket');del.style.fontSize=R(50*u)+'px';del.onclick=()=>askDelTicket(ts[cur()]);ov.append(del)}
  car.onscroll=upd;ov.append(back,car,idx);car.scrollLeft=Math.min(keep,N-1)*car.clientWidth;upd();
}

DB.onChange(src=>{
  if(src==='remote'&&inList()){pending=true;return}
  render();renderTickets();
});
addEventListener('focusout',()=>{if(pending)setTimeout(()=>{if(pending&&!inList())render()},150)});
buildStores();buildFoot();layout();addEventListener('resize',layout);

// ---------- Acceso, conexión y errores (Fase 5) ----------
const CFG=window.APP_CONFIG||{};
function shareModal(){
  const url=location.origin+location.pathname+'#'+DB.key,m=el('div','modal'),c=el('div','card'),bs=el('div','bs'),ok=el('button',null,'Cerrar'),cp=el('button',null,'Copiar enlace');
  const inp=el('input');inp.readOnly=true;inp.value=url;
  Object.assign(inp.style,{width:'100%',margin:'0 0 '+R(40*u)+'px',padding:R(18*u)+'px',font:'inherit',fontSize:R(34*u)+'px',color:'#3b4252',background:'#fff8',border:'2px solid #3b4252',borderRadius:'10px'});
  c.style.fontSize=R(46*u)+'px';c.append(el('h2',null,'Compartir esta lista'),el('p',null,'Este enlace es la contraseña de tu lista. Escríbelo en tu etiqueta NFC o ábrelo en los móviles de tu familia. No lo publiques.'),inp);
  c.firstChild.style.fontSize=R(62*u)+'px';c.children[1].style.marginBottom=R(30*u)+'px';bs.append(ok,cp);c.append(bs);m.append(c);stage.append(m);
  ok.onclick=()=>m.remove();m.onclick=e=>{if(e.target===m)m.remove()};
  cp.onclick=async()=>{try{await navigator.clipboard.writeText(url);cp.textContent='¡Copiado!'}catch(e){inp.select();document.execCommand&&document.execCommand('copy');cp.textContent='Copiado'}};
}
if(!DB.hasAccess){
  const n=el('div','modal');n.style.background='#eeebe6';const c=el('div','card');c.style.fontSize=R(50*u)+'px';c.style.width='86%';
  let h,p,btn;
  if(DB.configMissing){h='Falta configurar Firebase';p='Copia firebase-config.example.js como firebase-config.js, rellénalo con los datos de tu proyecto y vuelve a desplegar.'}
  else if(CFG.allowCreate){h='¡Bienvenido!';p='Crea tu lista de la compra privada. Si ya tienes una, acerca el móvil a su etiqueta NFC (o abre su enlace) en vez de crear otra.';btn=el('button',null,'Crear mi lista')}
  else{h='Lista privada';p='Acerca el móvil a la etiqueta NFC de la nevera para abrir la lista de la compra.'}
  c.append(el('h2',null,h),el('p',null,p));c.firstChild.style.fontSize=R(70*u)+'px';c.lastChild.style.margin='0';
  if(btn){c.lastChild.style.marginBottom=R(40*u)+'px';btn.style.width='100%';btn.onclick=()=>{
    const k=btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24)))).replace(/\+/g,'-').replace(/\//g,'_');
    try{localStorage.setItem('compra.k',k);sessionStorage.setItem('compra.share','1')}catch(e){}history.replaceState(null,'',location.pathname);location.reload()};c.append(btn)}
  n.append(c);stage.append(n);
}else{
  try{if(sessionStorage.getItem('compra.share')){sessionStorage.removeItem('compra.share');shareModal()}}catch(e){}
  // Mantener pulsado el nombre del supermercado abre "Compartir esta lista" (para añadir otros móviles o reescribir la etiqueta NFC)
  titleEl.style.pointerEvents='auto';let lp;const stop=()=>clearTimeout(lp);
  titleEl.onpointerdown=()=>{lp=setTimeout(shareModal,800)};titleEl.onpointerup=titleEl.onpointermove=titleEl.onpointercancel=stop;titleEl.oncontextmenu=e=>e.preventDefault();
}
DB.onStatus?.(s=>toast(s==='offline'?'Sin conexión · tus cambios se guardan y se enviarán solos':s==='online'?'Conexión recuperada · sincronizando…':'Todo sincronizado'));
DB.onError?.(code=>toast(code==='denied'?'Sin permiso: comprueba la etiqueta NFC':code==='read'?'No se pudo leer la lista. Reintentando…':'No se pudo enviar un cambio. Revisa la conexión'));
if(!navigator.onLine)toast('Sin conexión · tus cambios se guardan y se enviarán solos');

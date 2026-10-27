// Capa de datos con Firestore. Misma interfaz que la versión local de la Fase 4 (la interfaz no cambia).
// Estructura:  familias/{clave}/supermercados | productos | tickets    (la {clave} es el secreto de la etiqueta NFC)
import {initializeApp} from 'firebase/app';
import {initializeFirestore,persistentLocalCache,persistentMultipleTabManager,collection,doc,setDoc,updateDoc,writeBatch,onSnapshot,waitForPendingWrites} from 'firebase/firestore';

const cfg=window.FIREBASE_CONFIG||{};   // viene de firebase-config.js (cada persona pone la de su proyecto)
const configOk=!!cfg.projectId&&!/^TU_/.test(cfg.apiKey||'TU_');
const KEY='compra.k',RE=/^[A-Za-z0-9_-]{24,64}$/;
const subs=[],stSubs=[],errSubs=[];
const uid=()=>(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2,10));
const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)};

// La clave llega en la URL de la etiqueta NFC (tras el #). Se guarda en este móvil y se quita de la barra de direcciones.
function readToken(){
  const h=location.hash.replace(/^#(k=)?/,'');let t=null;
  if(RE.test(h)){t=h;try{localStorage.setItem(KEY,t)}catch(e){}history.replaceState(null,'',location.pathname+location.search)}
  else{try{t=localStorage.getItem(KEY)}catch(e){}}
  return t&&RE.test(t)?t:null;
}
const token=readToken();
let d={items:[],tickets:[]};
const emit=src=>subs.forEach(f=>f(src)),status=s=>stSubs.forEach(f=>f(s)),err=(code,e)=>{console.error(code,e);errSubs.forEach(f=>f(code))};

const DB={
  hasAccess:!!token&&configOk,configMissing:!configOk,key:token,
  get items(){return d.items},get tickets(){return d.tickets},
  onChange:f=>subs.push(f),onStatus:f=>stSubs.push(f),onError:f=>errSubs.push(f)
};
window.DB=DB;
if(token&&configOk){
  const app=initializeApp(cfg);
  // Caché local persistente y compartida entre pestañas: los cambios sin conexión se guardan y se envían solos al reconectar.
  const db=initializeFirestore(app,{localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()})});
  const base=['familias',token],col=n=>collection(db,...base,n),ref=(n,id)=>doc(db,...base,n,id);
  const stores=(window.MANIFEST?.stores||[]);
  const fromProd=x=>({id:x.id,store:x.supermercado,name:x.nombre,qty:x.cantidad,note:x.nota||'',checked:!!x.marcado,createdAt:x.creado});
  const toProd=i=>({supermercado:i.store,nombre:i.name,cantidad:i.qty||'',nota:i.note||'',marcado:!!i.checked,creado:i.createdAt});
  const fromLine=l=>({name:l.nombre,qty:l.cantidad||'',note:l.nota||''});
  const map={store:'supermercado',name:'nombre',qty:'cantidad',note:'nota',checked:'marcado'};

  // Sincronización en tiempo real
  const apply=(key,arr)=>{if(JSON.stringify(d[key])!==JSON.stringify(arr)){d[key]=arr;emit('remote')}};
  const onErr=e=>err(e&&e.code==='permission-denied'?'denied':'read',e);
  onSnapshot(col('productos'),s=>apply('items',s.docs.map(x=>fromProd({id:x.id,...x.data()})).sort((a,b)=>a.createdAt-b.createdAt||(a.id<b.id?-1:1))),onErr);
  onSnapshot(col('tickets'),s=>apply('tickets',s.docs.map(x=>({id:x.id,store:x.data().supermercado,date:x.data().fecha,items:(x.data().productos||[]).map(fromLine)})).sort((a,b)=>a.date<b.date?1:-1)),onErr);

  // Estado de la conexión
  addEventListener('offline',()=>status('offline'));
  addEventListener('online',()=>{status('online');waitForPendingWrites(db).then(()=>status('synced')).catch(()=>{})});
  // Los supermercados iniciales se guardan una vez por dispositivo (operación idempotente)
  const seedKey='compra.seed.'+token;
  if(!localStorage.getItem(seedKey))Promise.all(stores.map((s,i)=>setDoc(ref('supermercados',s.id),{nombre:s.label,orden:i}))).then(()=>{try{localStorage.setItem(seedKey,'1')}catch(e){}}).catch(e=>err('write',e));

  const local=(fn,silent)=>{fn();if(!silent)emit('local')};
  const wr=p=>p.catch(e=>{if(e&&e.code==='not-found')return;err(e&&e.code==='permission-denied'?'denied':'write',e)});   // un fallo se avisa, nunca se pierde en silencio
  Object.assign(DB,{
    addItem(store,name,qty=''){const it={id:uid(),store,name,qty,note:'',checked:false,createdAt:Date.now()};
      local(()=>d.items.push(it));wr(setDoc(ref('productos',it.id),toProd(it)));return{ok:true,item:it}},
    updateItem(id,patch,silent){const it=d.items.find(i=>i.id===id);if(!it)return{ok:true,skip:true};
      local(()=>Object.assign(it,patch),silent);
      const f={};for(const k in patch)if(map[k])f[map[k]]=patch[k];wr(updateDoc(ref('productos',id),f));return{ok:true}},
    removeItem(id){local(()=>{d.items=d.items.filter(i=>i.id!==id)});const b=writeBatch(db);b.delete(ref('productos',id));wr(b.commit());return{ok:true}},
    // Confirmar compra: ticket + borrado de los comprados en UN lote atómico. El id del ticket sale de los productos marcados:
    // repetir la operación (doble toque, reintento, otro móvil) no puede crear un segundo ticket.
    confirmPurchase(store){
      const sel=d.items.filter(i=>i.store===store&&i.checked);if(!sel.length)return{ok:false,empty:true};
      const id=store+'_'+hash(sel.map(i=>i.id).sort().join(',')),fecha=new Date().toISOString();
      const productos=sel.map(i=>({nombre:i.name,cantidad:i.qty||'',nota:i.note||''})),exists=d.tickets.some(t=>t.id===id);
      local(()=>{if(!exists)d.tickets.unshift({id,store,date:fecha,items:productos.map(fromLine)});d.items=d.items.filter(i=>!sel.includes(i))});
      const b=writeBatch(db);if(!exists)b.set(ref('tickets',id),{supermercado:store,fecha,productos});sel.forEach(i=>b.delete(ref('productos',i.id)));wr(b.commit());
      return{ok:true,id}},
    removeTicket(id){local(()=>{d.tickets=d.tickets.filter(t=>t.id!==id)});const b=writeBatch(db);b.delete(ref('tickets',id));wr(b.commit());return{ok:true}},
    clearAll(){const all=d.items.slice();local(()=>{d.items=[]});   // los tickets no se tocan
      for(let i=0;i<all.length;i+=400){const b=writeBatch(db);all.slice(i,i+400).forEach(x=>b.delete(ref('productos',x.id)));wr(b.commit())}return{ok:true}}
  });
}

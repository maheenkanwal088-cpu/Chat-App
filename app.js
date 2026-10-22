import{initializeApp}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import{getAuth,createUserWithEmailAndPassword,signInWithEmailAndPassword,onAuthStateChanged,signOut,sendPasswordResetEmail,updateProfile}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import{getFirestore,doc,setDoc,updateDoc,addDoc,deleteDoc,collection,query,where,orderBy,limitToLast,onSnapshot,serverTimestamp,arrayUnion,arrayRemove,increment,getDocs,getDoc,deleteField}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

window.__pgLoaded=true;
const app=initializeApp({
  apiKey:"AIzaSyAvytRUtEJqIQPiYO-HzhoSykbfAlxcOzw",
  authDomain:"chat-application-5ac56.firebaseapp.com",
  projectId:"chat-application-5ac56",
  storageBucket:"chat-application-5ac56.firebasestorage.app",
  messagingSenderId:"798665666604",
  appId:"1:798665666604:web:3129879e7ebe1a12136189"
});
const auth=getAuth(app),db=getFirestore(app);
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const h=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!==undefined)e.textContent=x;return e};
const svgUrl=s=>`url("data:image/svg+xml,${encodeURIComponent(s)}")`;
const palette=['#00a884','#7c4dff','#ff6d00','#e91e63','#0288d1','#43a047'];
const avatar=u=>{
  if(u&&u.photo)return u.photo;
  const n=((u&&u.name)||'?').trim()||'?';
  let s=0;for(const c of n)s+=c.charCodeAt(0);
  return 'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><rect width='96' height='96' fill='${palette[s%6]}'/><text x='48' y='64' font-size='46' font-family='Arial' fill='white' text-anchor='middle'>${[...n][0].toUpperCase()}</text></svg>`);
};
const GLOBAL={uid:'global',name:'Global Chat',about:'Talk with everyone on Pingora',photo:'data:image/svg+xml,'+encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#7c4dff'/><stop offset='1' stop-color='#00c6ff'/></linearGradient></defs><rect width='96' height='96' fill='url(#g)'/><text x='48' y='64' font-size='46' text-anchor='middle'>🌍</text></svg>")};
const cid=(a,b)=>[a,b].sort().join('_');
const fmt=t=>t&&t.toDate?t.toDate().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'';
const isOnline=u=>u&&!u.hideSeen&&u.lastSeen&&Date.now()-u.lastSeen<70000;
const toast=m=>{const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(t.k);t.k=setTimeout(()=>t.classList.remove('show'),3200)};
const resize=(file,max,q,cb)=>{
  const img=new Image();
  img.onload=()=>{
    const r=Math.min(1,max/Math.max(img.width,img.height));
    const c=document.createElement('canvas');c.width=img.width*r;c.height=img.height*r;
    c.getContext('2d').drawImage(img,0,0,c.width,c.height);
    cb(c.toDataURL('image/jpeg',q));
  };
  img.src=URL.createObjectURL(file);
};

let me=null,users={},chats=[],statuses=[],peer=null,chatId=null,unsubMsgs=null,started=false,subs=[],timers=[],mode='login',stBg='#00a884',lastTyp=0;

const listen=(q,cb)=>subs.push(onSnapshot(q,cb,e=>toast(e.code==='permission-denied'?'Permission denied. Please update your Firestore rules.':e.message)));

if(localStorage.getItem('pg-theme'))document.body.dataset.theme=localStorage.getItem('pg-theme');
if(localStorage.getItem('pg-mode'))document.body.dataset.mode=localStorage.getItem('pg-mode');

const setMode=m=>{
  mode=m;
  $('#switch').classList.toggle('sign',m==='signup');
  $('#tLogin').classList.toggle('on',m==='login');
  $('#tSign').classList.toggle('on',m==='signup');
  $('#aName').classList.toggle('hidden',m==='login');
  $('#aName').required=m==='signup';
  $('#aBtn').textContent=m==='login'?'Login':'Create Account';
  $('#aTitle').textContent=m==='login'?'Welcome back':'Join Pingora';
  $('#aSub').textContent=m==='login'?'Login to continue chatting':'Create your free account in seconds';
  $('#aErr').textContent='';
};
$('#tLogin').onclick=()=>setMode('login');
$('#tSign').onclick=()=>setMode('signup');
$('#forgot').onclick=async()=>{
  const email=$('#aEmail').value.trim();
  if(!email){$('#aErr').textContent='Enter your email first';return}
  try{await sendPasswordResetEmail(auth,email);$('#aErr').style.color='#2e7d32';$('#aErr').textContent='Reset link sent to your email'}
  catch(x){$('#aErr').style.color='';$('#aErr').textContent=x.message.replace('Firebase: ','')}
};

const authMsg=x=>{
  const c=(x.code||'').replace('auth/','');
  const m={'invalid-credential':'Wrong email or password. Please check and try again.','wrong-password':'Wrong password.','user-not-found':'No account found with this email. Please sign up first.','invalid-email':'Please enter a valid email address.','email-already-in-use':'This email is already registered. Please login instead.','weak-password':'Password must be at least 6 characters.','operation-not-allowed':'Email/Password sign-in is turned off. Enable it in Firebase Console > Authentication > Sign-in method.','network-request-failed':'Network error. Check your internet connection.','too-many-requests':'Too many attempts. Please wait a minute and try again.','api-key-not-valid.-please-pass-a-valid-api-key.':'Firebase API key is invalid.'};
  return m[c]||x.message.replace('Firebase: ','');
};
$('#authForm').onsubmit=async e=>{
  e.preventDefault();
  const email=$('#aEmail').value.trim().toLowerCase(),pass=$('#aPass').value,name=$('#aName').value.trim();
  $('#aErr').style.color='';$('#aErr').textContent='';$('#aBtn').disabled=true;
  try{
    if(mode==='signup'){
      const c=await createUserWithEmailAndPassword(auth,email,pass);
      await updateProfile(c.user,{displayName:name}).catch(()=>{});
      await setDoc(doc(db,'users',c.user.uid),{uid:c.user.uid,name:name||'User',email,about:'Hey there! I am using Pingora',photo:'',contacts:[],lastSeen:Date.now()});
    }else await signInWithEmailAndPassword(auth,email,pass);
  }catch(x){$('#aErr').textContent=authMsg(x)}
  $('#aBtn').disabled=false;
};
$('#logout').onclick=async()=>{
  try{if(me)await updateDoc(doc(db,'users',me.uid),{lastSeen:0})}catch(e){}
  signOut(auth);
};

onAuthStateChanged(auth,async u=>{
  subs.forEach(f=>f());subs=[];timers.forEach(clearInterval);timers=[];
  if(unsubMsgs){unsubMsgs();unsubMsgs=null}
  started=false;me=null;chatId=null;peer=null;
  if(!u){
    $('#app').classList.add('hidden');$('#auth').classList.remove('hidden');
    $('#chat').classList.add('hidden');$('#empty').classList.remove('hidden');$('#app').classList.remove('open');
    return;
  }
  try{
    const uref=doc(db,'users',u.uid);
    const snap=await getDoc(uref);
    if(!snap.exists()){
      await setDoc(uref,{uid:u.uid,name:u.displayName||(u.email||'User').split('@')[0],email:(u.email||'').toLowerCase(),about:'Hey there! I am using Pingora',photo:'',contacts:[],lastSeen:Date.now()});
    }
  }catch(e){
    $('#aErr').style.color='';
    $('#aErr').textContent='Logged in, but database is not ready: '+e.message;
    return;
  }
  listen(doc(db,'users',u.uid),s=>{
    if(!s.exists())return;
    me=s.data();
    if(!started){started=true;boot()}
    renderMe();renderContacts();renderChats();renderStatuses();updatePeer();
  });
});

function boot(){
  $('#auth').classList.add('hidden');
  $('#app').classList.remove('hidden');
  const ref=doc(db,'users',me.uid);
  const beat=()=>updateDoc(ref,{lastSeen:Date.now()}).catch(()=>{});
  beat();
  timers.push(setInterval(beat,30000),setInterval(()=>{updatePeer()},3000),setInterval(renderChats,30000));
  window.onbeforeunload=()=>{try{updateDoc(ref,{lastSeen:0})}catch(e){}};
  listen(collection(db,'users'),s=>{
    users={};s.forEach(d=>users[d.id]=d.data());
    renderContacts();renderChats();renderStatuses();updatePeer();renderCalls();
  });
  listen(query(collection(db,'chats'),where('members','array-contains',me.uid)),s=>{
    chats=s.docs.map(d=>({id:d.id,...d.data()}));if(pendingOpen&&chats.some(c=>c.id===pendingOpen)){const k=pendingOpen;pendingOpen=null;openChat(k)}
    renderChats();updatePeer();
    checkNotify();
    chats.forEach(c=>{if(!c.group&&c.lastFrom&&c.lastFrom!==me.uid&&!c.lastDelivered&&c.lastId){updateDoc(doc(db,'chats',c.id),{lastDelivered:true}).catch(()=>{});updateDoc(doc(db,'chats',c.id,'messages',c.lastId),{delivered:true}).catch(()=>{})}});
  });
  listen(collection(db,'statuses'),s=>{
    const now=Date.now();
    statuses=s.docs.map(d=>({id:d.id,...d.data()})).filter(x=>now-x.at<86400000);
    renderStatuses();
  });
  watchRoom();
  watchExtras();
  listen(query(collection(db,'calls'),where('to','==',me.uid),where('status','==','ringing')),s=>{
    s.docChanges().forEach(c=>{
      if(c.type!=='added')return;
      const d=c.doc.data();
      if(d.at&&Date.now()-d.at.toMillis()>60000)return;
      if(pc||pending||(me.blocked||[]).includes(d.from))return;
      showIncoming(c.doc.id,d);
    });
  });
}

function renderMe(){
  $('#myAv').src=avatar(me);$('#pfImg').src=avatar(me);
  if(document.activeElement!==$('#pfName')&&document.activeElement!==$('#pfAbout')){$('#pfName').value=me.name;$('#pfAbout').value=me.about||''}
  $('#pfEmail').value=me.email;
  $('#stLast').checked=!me.hideSeen;$('#stRead').checked=!(me.settings&&me.settings.receipts===false);$('#stSnd').checked=!(me.settings&&me.settings.sound===false);
}
const goTab=t=>$(`.tabs button[data-tab=${t}]`).click();
$$('.tabs button').forEach(b=>b.onclick=()=>{
  $$('.tabs button').forEach(x=>x.classList.toggle('on',x===b));
  $$('.tab').forEach(t=>t.classList.toggle('on',t.id==='tab-'+b.dataset.tab));
});
$('#myAv').onclick=()=>goTab('profile');

const mkRow=(u,title,sub,time,badge,ring)=>{
  const r=h('div','row');
  const img=h('img','av');img.src=avatar(u);
  let left;
  if(ring){left=h('div','ring');left.append(img)}
  else{left=h('div','avw');left.append(img);if(u.uid!=='global'&&isOnline(u))left.append(h('i','dot'))}
  const rb=h('div','rb');
  const rt=h('div','rt');rt.append(h('b','',title),h('small','',time||''));
  const rs=h('div','rs');rs.append(h('span','',sub||''));
  if(badge)rs.append(h('em','badge',badge));
  rb.append(rt,rs);r.append(left,rb);
  return r;
};

function renderChats(){
  if(!me)return;
  const box=$('#chatList');box.innerHTML='';
  const q=$('#search').value.trim().toLowerCase(),favs=me.favs||[],pins=me.pinned||[],arc=me.archived||[],mut=me.muted||[],blk=me.blocked||[],clr=me.cleared||{};
  const items=[{key:'global',u:GLOBAL,name:'🌍 Global Chat',sub:'Everyone is here. Say hello!',un:0,grp:true}];
  [...chats].sort((a,b)=>(b.lastAt?b.lastAt.toMillis():0)-(a.lastAt?a.lastAt.toMillis():0)).forEach(c=>{
    const un=(c.unread&&c.unread[me.uid])||0,t=c.lastAt?c.lastAt.toMillis():0;
    if(clr[c.id]&&t<=clr[c.id])return;
    if(c.group){items.push({key:c.id,u:{uid:c.id,name:c.name,photo:''},name:c.name,sub:c.last||'Group created',time:fmt(c.lastAt),un,grp:true});return}
    const uid=c.members.find(x=>x!==me.uid),u=users[uid];
    if(u&&!blk.includes(uid))items.push({key:uid,u,name:dn(u),sub:c.last||'',time:fmt(c.lastAt),un,grp:false});
  });
  let total=0;items.forEach(i=>{if(!mut.includes(i.key))total+=i.un});
  document.title=(total?'('+total+') ':'')+'Pingora';
  const list=items.filter(i=>(!q||i.name.toLowerCase().includes(q))&&(filt==='archived'?arc.includes(i.key):!arc.includes(i.key)&&(filt==='all'||(filt==='unread'&&i.un>0)||(filt==='fav'&&favs.includes(i.key))||(filt==='groups'&&i.grp))));
  list.sort((a,b)=>pins.includes(b.key)-pins.includes(a.key));
  list.forEach(i=>{
    const r=mkRow(i.u,i.name+(pins.includes(i.key)?' 📌':'')+(mut.includes(i.key)?' 🔕':'')+(favs.includes(i.key)?' ⭐':''),i.sub,i.time,i.un>0&&i.key!==curKey?i.un:'');
    if(i.key===curKey)r.classList.add('act');
    r.onclick=()=>openChat(i.key);box.append(r);
  });
  if(!box.children.length)box.append(h('p','box center','Nothing here yet'));
}
$('#search').oninput=renderChats;

function renderContacts(){
  if(!me)return;
  const box=$('#ctList');box.innerHTML='';
  const list=(me.contacts||[]).map(id=>users[id]).filter(Boolean).sort((a,b)=>a.name.localeCompare(b.name));
  if(!list.length){box.append(h('p','box center','Your saved contacts will appear here'));return}
  box.append(h('div','sec',list.length+' contacts'));
  list.forEach(u=>{
    const r=mkRow(u,dn(u),u.about,isOnline(u)?'online':'');
    const x=h('button','ic','✖');x.style.cssText='background:var(--bg);color:var(--sub);width:30px;height:30px;font-size:12px';
    x.onclick=async e=>{e.stopPropagation();await updateDoc(doc(db,'users',me.uid),{contacts:arrayRemove(u.uid)});toast('Contact removed')};
    const nb=h('button','ic','✏️');nb.style.cssText=x.style.cssText;nb.title='Set nickname';nb.onclick=e=>{e.stopPropagation();openNick(u)};r.append(nb,x);
    r.onclick=()=>{openChat(u.uid);goTab('chats')};
    box.append(r);
  });
}
$('#ctAdd').onclick=async()=>{
  const email=$('#ctEmail').value.trim().toLowerCase();
  if(!email)return;
  if(email===me.email)return toast('You cannot add yourself');
  const s=await getDocs(query(collection(db,'users'),where('email','==',email)));
  if(s.empty)return toast('No user found with this email');
  const u=s.docs[0].data();
  await updateDoc(doc(db,'users',me.uid),{contacts:arrayUnion(u.uid)});
  $('#ctEmail').value='';toast(u.name+' saved to contacts');
};

$('#pfFile').onchange=e=>{
  const f=e.target.files[0];if(!f)return;
  resize(f,220,.75,d=>{$('#pfImg').src=d;updateDoc(doc(db,'users',me.uid),{photo:d});toast('Photo updated')});
};
$('#pfSave').onclick=async()=>{
  const name=$('#pfName').value.trim();
  if(!name)return toast('Name cannot be empty');
  await updateDoc(doc(db,'users',me.uid),{name,about:$('#pfAbout').value.trim()});
  toast('Profile updated');
};

['#00a884','#6a3de8','#f4511e','#d81b60','#0277bd','#263238'].forEach((c,i)=>{
  const s=h('div','sw'+(i===0?' on':''));s.style.background=c;
  s.onclick=()=>{stBg=c;$$('#stColors .sw').forEach(x=>x.classList.toggle('on',x===s))};
  $('#stColors').append(s);
});
$('#stPost').onclick=async()=>{
  const text=$('#stText').value.trim();
  if(!text)return;
  await addDoc(collection(db,'statuses'),{uid:me.uid,text,bg:stBg,at:Date.now(),viewers:[]});
  $('#stText').value='';toast('Status posted');
};
$('#stImg').onchange=e=>{
  const f=e.target.files[0];if(!f)return;
  resize(f,800,.6,async d=>{
    await addDoc(collection(db,'statuses'),{uid:me.uid,text:$('#stText').value.trim(),img:await cld(d),bg:'#000',at:Date.now(),viewers:[]});
    $('#stText').value='';toast('Photo status posted');
  });
};

function renderStatuses(){
  if(!me)return;
  const box=$('#stList');box.innerHTML='';
  const mine=statuses.filter(s=>s.uid===me.uid);
  const m=mkRow(me,'My Status',mine.length?mine.length+' update(s). Tap to view':'No updates yet','',0,mine.length>0);
  m.onclick=()=>openStatus(me.uid);box.append(m);
  const ids=[...new Set(statuses.filter(s=>s.uid!==me.uid&&(me.contacts||[]).includes(s.uid)).map(s=>s.uid))];
  if(ids.length)box.append(h('div','sec','Recent updates'));
  ids.forEach(id=>{
    const list=statuses.filter(s=>s.uid===id).sort((a,b)=>b.at-a.at);
    const u=users[id]||{name:'User'};
    const r=mkRow(u,dn(u),list[0].text||'📷 Photo',new Date(list[0].at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}),0,true);
    r.onclick=()=>openStatus(id);box.append(r);
  });
}

let sv={list:[],i:0,t:null};
function openStatus(uid){
  const list=statuses.filter(s=>s.uid===uid).sort((a,b)=>a.at-b.at);
  if(!list.length)return toast('No status updates yet');
  sv={list,i:0,t:null};
  $('#statusView').classList.remove('hidden');showStatus();
}
function showStatus(){
  clearTimeout(sv.t);
  const s=sv.list[sv.i];
  if(!s)return closeStatus();
  const u=users[s.uid];
  $('#svAv').src=avatar(u);$('#svName').textContent=u?u.name:'';
  const box=$('#svBox');
  box.style.background=s.img?`url(${s.img}) center/cover`:s.bg;
  $('#svText').textContent=s.text||'';
  $('#svViews').textContent=s.uid===me.uid?'👁 '+(s.viewers||[]).length:'';
  const bar=$('#svBar');bar.style.animation='none';void bar.offsetWidth;bar.style.animation='fill 5s linear forwards';
  if(s.uid!==me.uid)updateDoc(doc(db,'statuses',s.id),{viewers:arrayUnion(me.uid)}).catch(()=>{});
  sv.t=setTimeout(()=>{sv.i++;showStatus()},5000);
}
function closeStatus(){clearTimeout(sv.t);$('#statusView').classList.add('hidden')}
$('#svClose').onclick=closeStatus;
$('#svBox').onclick=e=>{if(e.target.id==='svBox'||e.target.id==='svText'){sv.i++;showStatus()}};

let chatMeta={},unsubMeta=null,gPeers=[],editCtx=null;
const previewOf=m=>m.deleted?'🚫 This message was deleted':m.text||(m.img?'📷 Photo':m.audio?'🎤 Voice message':m.poll?'📊 '+m.poll.q:m.loc?'📍 Location':m.file?'📄 '+m.file.name:m.event?'📅 '+m.event.title:'');
const chatRef=()=>doc(db,'chats',chatId);

function updatePeer(){
  if(!peer||!me)return;
  const sp=peer.uid==='global'||peer.uid==='ai'||peer.isGroup;
  if(!sp)peer=users[peer.uid]||peer;
  $('#chName').textContent=peer.uid==='global'?'🌍 Global Chat':sp?peer.name:dn(peer);
  $('#chAv').src=avatar(peer);
  $('#vcall').style.display=$('#xcall').style.display=(!sp||peer.uid==='global')?'grid':'none';
  $('#favBtn').textContent=(me.favs||[]).includes(curKey)?'★':'☆';
  if(peer.uid==='global'){$('#chStat').textContent='Everyone on Pingora';return}
  if(peer.uid==='ai'){$('#chStat').textContent='AI assistant · always online';return}
  if(peer.isGroup){const g0=chats.find(c=>c.id===peer.uid);if(g0)peer.members=g0.members;$('#chStat').textContent=peer.members.map(id=>id===me.uid?'You':users[id]?dn(users[id]):'').filter(Boolean).join(', ');return}
  
  const ty=chatMeta.typing&&chatMeta.typing[peer.uid]&&Date.now()-chatMeta.typing[peer.uid]<4000;
  $('#chStat').textContent=ty?'typing...':peer.hideSeen?'':isOnline(peer)?'online':(peer.lastSeen?'last seen '+new Date(peer.lastSeen).toLocaleString([],{hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'}):'offline');
}

const msgsRef=()=>chatId==='global'?collection(db,'global'):collection(db,'chats',chatId,'messages');
const dayLabel=d=>{
  const t=new Date(),y=new Date(Date.now()-864e5);
  if(d.toDateString()===t.toDateString())return'Today';
  if(d.toDateString()===y.toDateString())return'Yesterday';
  return d.toLocaleDateString([],{day:'numeric',month:'long',year:'numeric'});
};

function renderPin(){
  const p=chatMeta.pinned;
  $('#pinBar').classList.toggle('hidden',!p);
  if(p)$('#pinTxt').textContent=(p.by?p.by+': ':'')+p.text;
}
$('#pinTxt').onclick=()=>{
  const p=chatMeta.pinned;if(!p)return;
  const el=document.querySelector(`.msg[data-id="${p.id}"]`);
  if(!el)return toast('Pinned message is not loaded');
  el.scrollIntoView({behavior:'smooth',block:'center'});
  el.classList.add('hl');setTimeout(()=>el.classList.remove('hl'),1600);
};
$('#pinX').onclick=()=>{ if(chatId!=='global') setDoc(chatRef(),{pinned:deleteField()},{merge:true}); };

function renderBanner(){
  const live=gPeers.filter(x=>Date.now()-x.beat<45000);
  const show=chatId==='global'&&live.length>0&&!gr.on;
  $('#callBanner').classList.toggle('hidden',!show);
  if(show)$('#bnTxt').textContent='📞 Group call in progress · '+live.length+' joined';
}

function openChat(uid){
  const gc=chats.find(c=>c.id===uid&&c.group);
  peer=uid==='global'?GLOBAL:gc?{uid:gc.id,name:gc.name,isGroup:true,members:gc.members,photo:''}:users[uid];if(!peer)return;
  chatId=uid==='global'?'global':gc?gc.id:cid(me.uid,uid);
  curKey=uid;clearReply();
  const isG=chatId==='global'||!!peer.isGroup||uid==='ai',multi=chatId==='global'||!!peer.isGroup,unr=chatId!=='global'&&uid!=='ai';
  chatMeta={};
  $('#empty').classList.add('hidden');$('#chat').classList.remove('hidden');
  $('#app').classList.add('open');$('#attach').classList.add('hidden');
  updatePeer();renderChats();renderPin();renderBanner();
  if(unr)updateDoc(chatRef(),{['unread.'+me.uid]:0}).catch(()=>{});
  if(unsubMsgs)unsubMsgs();
  if(unsubMeta)unsubMeta();
  const mine=chatId;
  
  if(chatId!=='global'){
    unsubMeta=onSnapshot(chatRef(),s=>{if(mine!==chatId)return;chatMeta=s.exists()?s.data():{};renderPin();updatePeer()});
  }

  unsubMsgs=onSnapshot(query(msgsRef(),orderBy('at'),limitToLast(250)),s=>{
    if(mine!==chatId)return;
    const box=$('#msgs');box.innerHTML='';
    let last='';
    s.docs.forEach(d=>{
      const m=d.data({serverTimestamps:'estimate'}),isMe=m.from===me.uid;
      if((m.hiddenFor||[]).includes(me.uid)||(me.blocked||[]).includes(m.from)||(me.cleared&&me.cleared[chatId]&&m.at&&m.at.toMillis()<=me.cleared[chatId]))return;
      const day=m.at?dayLabel(m.at.toDate()):'';
      if(day&&day!==last){box.append(h('div','day',day));last=day}
      const el=h('div','msg'+(isMe?' me':'')+(m.deleted?' dead':''));el.dataset.id=d.id;
      if(multi&&!isMe)el.append(h('div','nm',m.name||'User'));
      if(m.fwd&&!m.deleted)el.append(h('div','fwd','↪ Forwarded'));
      if(m.reply&&!m.deleted){const qd=h('div','quote');qd.append(h('b','',m.reply.name),h('span','',m.reply.text));qd.onclick=e=>{e.stopPropagation();jumpTo(m.reply.id)};el.append(qd)}
      if(m.deleted)el.append(h('div','gone','🚫 This message was deleted'));
      else{
        if(m.img){const i=h('img','pic2');i.src=m.img;i.onclick=e=>{e.stopPropagation();$('#imgBig').src=m.img;$('#imgView').classList.remove('hidden')};el.append(i)}
        if(m.audio){const a=document.createElement('audio');a.controls=true;a.src=m.audio;a.onclick=e=>e.stopPropagation();el.append(a)}
        if(m.poll){
          const v=m.votes||{},tot=Object.keys(v).length;
          el.append(h('div','pq','📊 '+m.poll.q));
          m.poll.opts.forEach((o,i)=>{
            const n=Object.values(v).filter(x=>x===i).length;
            const b=h('div','po'+(v[me.uid]===i?' on':'')),bar=h('i');
            bar.style.width=(tot?n/tot*100:0)+'%';
            b.append(bar,h('span','',o),h('b','',n));
            b.onclick=e=>{e.stopPropagation();updateDoc(d.ref,{['votes.'+me.uid]:i})};
            el.append(b);
          });
          el.append(h('small','pt',tot+' vote'+(tot===1?'':'s')+' · tap an option to vote'));
        }
        if(m.loc){
          const f=document.createElement('iframe');f.className='map';f.loading='lazy';
          f.src=`https://www.openstreetmap.org/export/embed.html?bbox=${m.loc.lng-.004}%2C${m.loc.lat-.0025}%2C${m.loc.lng+.004}%2C${m.loc.lat+.0025}&layer=mapnik&marker=${m.loc.lat}%2C${m.loc.lng}`;
          const a=h('a','dl','📍 Open in Google Maps');a.href=`https://www.google.com/maps?q=${m.loc.lat},${m.loc.lng}`;a.target='_blank';a.onclick=e=>e.stopPropagation();
          el.append(f,a);
        }
        if(m.file){
          const a=h('a','dl file','📄 '+m.file.name+'  ·  '+Math.ceil(m.file.size/1024)+' KB');
          a.href=m.file.data;a.download=m.file.name;a.target='_blank';a.onclick=e=>e.stopPropagation();el.append(a);
        }
        if(m.event){
          const r=m.rsvp||{},n=Object.values(r).filter(Boolean).length;
          el.append(h('div','pq','📅 '+m.event.title),h('div','evi',new Date(m.event.when).toLocaleString([],{dateStyle:'medium',timeStyle:'short'})));
          if(m.event.place)el.append(h('div','evi','📍 '+m.event.place));
          const b=h('button','rsvp'+(r[me.uid]?' on':''),(r[me.uid]?'✅ Going':'Going?')+' · '+n);
          b.onclick=e=>{e.stopPropagation();updateDoc(d.ref,{['rsvp.'+me.uid]:!r[me.uid]})};el.append(b);
        }
        if(m.text)el.append(h('div','',m.text));
      }
      const meta=h('div','meta');
      if(m.edited&&!m.deleted)meta.append(h('span','','edited'));
      if(stars.has(d.id))meta.append(h('span','','⭐'));meta.append(h('span','',fmt(m.at)));
      if(isMe&&!m.deleted){
        const st=isG?'✓':(m.seen?'✓✓':m.delivered?'✓✓':'✓');
        meta.append(h('span','tick'+(m.seen&&!isG?' seen':''),st));
      }
      el.append(meta);
      const rx=m.reactions?Object.values(m.reactions):[];
      if(rx.length&&!m.deleted){const rc={};rx.forEach(e=>rc[e]=(rc[e]||0)+1);el.append(h('div','rx',Object.entries(rc).map(([e,n])=>e+(n>1?' '+n:'')).join('  ')))}
      el.onclick=()=>openMenu(d,m,isMe);
      box.append(el);
      if(!isMe&&!isG&&!m.seen&&!m.deleted&&!d.metadata.hasPendingWrites){const roff=me.settings&&me.settings.receipts===false;if(!(roff&&m.delivered))updateDoc(d.ref,roff?{delivered:true}:{seen:true,delivered:true}).catch(()=>{})}
    });
    box.scrollTop=box.scrollHeight;
    if(unr)updateDoc(chatRef(),{['unread.'+me.uid]:0}).catch(()=>{});
  },e=>toast(e.code==='permission-denied'?'Permission denied. Please update your Firestore rules.':e.message));
}
$('#back').onclick=()=>{
  $('#app').classList.remove('open');chatId=null;peer=null;chatMeta={};
  $('#chat').classList.add('hidden');$('#empty').classList.remove('hidden');
  if(unsubMsgs){unsubMsgs();unsubMsgs=null}
  if(unsubMeta){unsubMeta();unsubMeta=null}
  renderChats();
};
$('#imgView').onclick=()=>$('#imgView').classList.add('hidden');

function openMenu(d,m,isMe){
  const box=$('#mmBox');box.innerHTML='';
  box.append(h('div','mmPrev',previewOf(m)||'Message'));
  if(!m.deleted){
    const rr=h('div','reacts');
    ['👍','❤️','😂','😮','😢','🙏'].forEach(e=>{
      const b=h('button','',e);
      b.onclick=()=>{closeMenu();updateDoc(d.ref,{['reactions.'+me.uid]:(m.reactions||{})[me.uid]===e?deleteField():e})};
      rr.append(b);
    });
    box.append(rr);
  }
  const add=(ic,t,fn,cls)=>{const b=h('button','mmb'+(cls?' '+cls:''),ic+'   '+t);b.onclick=()=>{closeMenu();fn()};box.append(b)};
  const pinned=chatMeta.pinned&&chatMeta.pinned.id===d.id,starred=stars.has(d.id);
  if(!m.deleted)add('↩️','Reply',()=>{replyTo={id:d.id,name:isMe?'You':(m.name||'User'),text:previewOf(m)};showReply()});
  if(!m.deleted)add('↪️','Forward',()=>openFwd(m));
  if(!m.deleted&&m.text)add('📋','Copy text',()=>navigator.clipboard.writeText(m.text).then(()=>toast('Copied')));
  if(!m.deleted)add('⭐',starred?'Unstar':'Star',()=>starred?deleteDoc(doc(db,'users',me.uid,'stars',d.id)):setDoc(doc(db,'users',me.uid,'stars',d.id),{chatKey:curKey,text:previewOf(m),name:m.name||'',at:Date.now()}));
  if(!m.deleted && chatId!=='global')add('📌',pinned?'Unpin message':'Pin message',()=>{
    const o={pinned:pinned?deleteField():{id:d.id,text:previewOf(m),by:m.name||''}};
    if(isDM())o.members=[me.uid,peer.uid];
    setDoc(chatRef(),o,{merge:true});
  });
  if(isMe&&!m.deleted&&m.text)add('✏️','Edit message',()=>{editCtx=d;$('#editIn').value=m.text;$('#editModal').classList.remove('hidden');$('#editIn').focus()});
  add('🗑','Delete for me',()=>updateDoc(d.ref,{hiddenFor:arrayUnion(me.uid)}));
  if(isMe&&!m.deleted)add('🚫','Delete for everyone',async()=>{
    await updateDoc(d.ref,{deleted:true,text:deleteField(),img:deleteField(),audio:deleteField(),poll:deleteField(),votes:deleteField(),file:deleteField(),loc:deleteField(),event:deleteField(),reactions:deleteField()});
    if(chatId!=='global'){
      const o={};
      if(chatMeta.lastId===d.id)o.last='🚫 This message was deleted';
      if(chatMeta.pinned&&chatMeta.pinned.id===d.id)o.pinned=deleteField();
      if(Object.keys(o).length)updateDoc(chatRef(),o).catch(()=>{});
    }
  },'danger');
  $('#msgMenu').classList.remove('hidden');
}
const closeMenu=()=>$('#msgMenu').classList.add('hidden');
$('#msgMenu').onclick=e=>{if(e.target.id==='msgMenu')closeMenu()};
$('#editCancel').onclick=()=>$('#editModal').classList.add('hidden');
$('#editSave').onclick=async()=>{
  const t=$('#editIn').value.trim();
  if(!t||!editCtx)return;
  await updateDoc(editCtx.ref,{text:t,edited:true});
  if(chatId!=='global'){
    if(chatMeta.lastId===editCtx.id)updateDoc(chatRef(),{last:t}).catch(()=>{});
    if(chatMeta.pinned&&chatMeta.pinned.id===editCtx.id)updateDoc(chatRef(),{'pinned.text':t}).catch(()=>{});
  }
  editCtx=null;$('#editModal').classList.add('hidden');toast('Message edited');
};

function resolve(key){
  if(key==='global')return{id:'global',peer:GLOBAL};
  const gc=chats.find(c=>c.id===key&&c.group);
  if(gc)return{id:gc.id,peer:{uid:gc.id,name:gc.name,isGroup:true,members:gc.members}};
  const u=users[key];return u?{id:cid(me.uid,key),peer:u}:null;
}
async function sendTo(key,p){
  const t=resolve(key);if(!t)return;
  const pr=t.peer;
  if(!pr.isGroup&&t.id!=='global'&&(me.blocked||[]).includes(pr.uid))return toast('Unblock this contact to send messages');
  if(p.img)p={...p,img:await cld(p.img)};
  if(p.audio)p={...p,audio:await cld(p.audio)};
  if(p.file)p={...p,file:{...p.file,data:await cld(p.file.data)}};
  if(replyTo&&key===curKey){p={...p,reply:replyTo};clearReply()}
  const col=t.id==='global'?collection(db,'global'):collection(db,'chats',t.id,'messages'),mref=doc(col);
  try{
    await setDoc(mref,{from:me.uid,name:me.name||'User',...p,at:serverTimestamp(),seen:false,delivered:false});
    if(t.id!=='global'){
      const un=pr.isGroup?Object.fromEntries(pr.members.filter(x=>x!==me.uid).map(x=>[x,increment(1)])):{[pr.uid]:increment(1)};
      const o={last:previewOf(p),lastAt:serverTimestamp(),lastId:mref.id,lastFrom:me.uid,lastDelivered:false,unread:un};
      if(!pr.isGroup)o.members=[me.uid,pr.uid];
      await setDoc(doc(db,'chats',t.id),o,{merge:true});
    }
  }catch(e){toast('Could not send: '+e.message)}
}
const send=p=>sendTo(curKey,p);
const sendText=()=>{
  const text=$('#msgIn').value.trim();if(!text)return;
  $('#msgIn').value='';toggleBtns();send({text});
};
const toggleBtns=()=>{const has=$('#msgIn').value.trim().length>0;$('#send').classList.toggle('hidden',!has);$('#mic').classList.toggle('hidden',has)};
$('#send').onclick=sendText;
$('#msgIn').onkeydown=e=>{if(e.key==='Enter')sendText()};
$('#msgIn').oninput=()=>{
  toggleBtns();
  if(!isDM())return;
  const n=Date.now();
  if(n-lastTyp>2000){lastTyp=n;setDoc(chatRef(),{members:[me.uid,peer.uid],typing:{[me.uid]:n}},{merge:true}).catch(()=>{})}
};
$('#attBtn').onclick=()=>$('#attach').classList.toggle('hidden');
$('#imgIn').onchange=e=>{
  const f=e.target.files[0];e.target.value='';$('#attach').classList.add('hidden');if(!f)return;
  resize(f,900,.65,d=>send({img:d}));
};
$('#pollBtn').onclick=()=>{$('#attach').classList.add('hidden');$('#pollModal').classList.remove('hidden')};
$('#pollCancel').onclick=()=>$('#pollModal').classList.add('hidden');
$('#pollGo').onclick=()=>{
  const q=$('#pq').value.trim(),opts=$$('.pOpt').map(i=>i.value.trim()).filter(Boolean);
  if(!q||opts.length<2)return toast('Add a question and at least 2 options');
  send({poll:{q,opts},votes:{}});
  $('#pq').value='';$$('.pOpt').forEach(i=>i.value='');
  $('#pollModal').classList.add('hidden');
};

let rec=null,chunks=[],recT=null;
$('#mic').onclick=async()=>{
  if(rec){rec.stop();return}
  try{
    const s=await navigator.mediaDevices.getUserMedia({audio:true});
    const r=new MediaRecorder(s,{audioBitsPerSecond:24000});
    chunks=[];rec=r;
    r.ondataavailable=e=>chunks.push(e.data);
    r.onstop=()=>{
      s.getTracks().forEach(t=>t.stop());clearTimeout(recT);
      $('#mic').classList.remove('rec');rec=null;
      const b=new Blob(chunks,{type:r.mimeType});
      if(b.size>700000)return toast('Voice note is too long');
      const fr=new FileReader();fr.onload=()=>send({audio:fr.result});fr.readAsDataURL(b);
    };
    r.start();$('#mic').classList.add('rec');toast('Recording... tap the mic again to send');
    recT=setTimeout(()=>rec&&rec.stop(),60000);
  }catch(e){toast('Microphone access denied')}
};

'😀😂😍🥰😎🤩😭😡👍🙏🔥🎉❤️💯😴🤔🙌👏😉🥳💔✨🌹☕🍕😅😇🤗😜🤝💪🎶'.match(/\p{Extended_Pictographic}(\uFE0F)?/gu).forEach(e=>{
  const s=h('span','',e);
  s.onclick=()=>{$('#msgIn').value+=e;$('#msgIn').focus();toggleBtns()};
  $('#emojis').append(s);
});
$('#emojiBtn').onclick=()=>$('#emojis').classList.toggle('hidden');

const themes={emerald:'#00a884',ocean:'#0277bd',sunset:'#f4511e',violet:'#6a3de8',rose:'#d81b60'};
Object.entries(themes).forEach(([k,c])=>{
  const s=h('div','sw');s.style.background=c;s.title=k;
  s.onclick=()=>{document.body.dataset.theme=k;localStorage.setItem('pg-theme',k)};
  $('#themeList').append(s);
});
$('#modeBtn').onclick=()=>{
  const m=document.body.dataset.mode==='dark'?'light':'dark';
  document.body.dataset.mode=m;localStorage.setItem('pg-mode',m);
};

const T=(w,s,body)=>`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${w}'>${body}</svg>`;
const wps=[
 {c:'var(--wall)',p:T(160,0,"<g font-size='26' opacity='.16'><text x='10' y='40'>💬</text><text x='90' y='30'>❤️</text><text x='50' y='100'>⭐</text><text x='120' y='125'>🎈</text><text x='10' y='145'>🍀</text></g>"),s:160},
 {g:'linear-gradient(135deg,#a8edea,#fed6e3)',c:'#cdeff0'},
 {g:'linear-gradient(160deg,#ff9a9e,#fad0c4,#ffecd2)',c:'#fad0c4'},
 {g:'linear-gradient(160deg,#2193b0,#6dd5ed)',c:'#2193b0'},
 {g:'linear-gradient(160deg,#134e5e,#71b280)',c:'#134e5e'},
 {g:'radial-gradient(circle at 20% 20%,#614385,transparent 55%),radial-gradient(circle at 80% 80%,#2b5876,transparent 55%)',c:'#1a1a2e'},
 {g:'linear-gradient(160deg,#0f2027,#203a43,#2c5364)',c:'#0f2027'},
 {g:'linear-gradient(135deg,#f093fb,#f5576c)',c:'#f093fb'},
 {c:'#fff8e1',p:T(24,0,"<circle cx='4' cy='4' r='1.8' fill='#000' fill-opacity='.14'/>"),s:24},
 {c:'#3949ab',p:T(40,0,"<path d='M40 0H0V40' fill='none' stroke='#fff' stroke-opacity='.18'/>"),s:40},
 {c:'#ffe3ec',p:T(100,0,"<g font-size='22' opacity='.3'><text x='8' y='30'>💗</text><text x='58' y='80'>🌸</text></g>"),s:100},
 {c:'var(--wall)'}
];
const paint=(el,k)=>{
  if(k==='custom'){
    el.style.backgroundImage=`url(${localStorage.getItem('pg-wpimg')})`;el.style.backgroundSize='cover';el.style.backgroundColor='#000';return;
  }
  const w=wps[+k]||wps[0],L=[];
  if(w.p)L.push([svgUrl(w.p),w.s+'px']);
  if(w.g)L.push([w.g,'cover']);
  el.style.backgroundImage=L.map(x=>x[0]).join(',')||'none';
  el.style.backgroundSize=L.map(x=>x[1]).join(',')||'auto';
  el.style.backgroundColor=w.c;
};
const applyWp=()=>{
  const k=localStorage.getItem('pg-wp')||'0';
  paint($('#msgs'),k);
  $$('.wpt').forEach(t=>t.classList.toggle('on',t.dataset.k===k));
};
wps.forEach((_,i)=>{
  const t=h('div','wpt');t.dataset.k=i;paint(t,i);
  t.onclick=()=>{localStorage.setItem('pg-wp',i);applyWp()};
  $('#wpGrid').append(t);
});
$('#wpFile').onchange=e=>{
  const f=e.target.files[0];if(!f)return;
  resize(f,1100,.6,d=>{
    try{localStorage.setItem('pg-wpimg',d);localStorage.setItem('pg-wp','custom');applyWp();toast('Wallpaper applied')}
    catch(x){toast('Image is too large')}
  });
};
applyWp();
$('#themeBtn').onclick=()=>$('#themeModal').classList.remove('hidden');
$('#themeClose').onclick=()=>$('#themeModal').classList.add('hidden');

const rtc={iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]};
let pc=null,stream=null,callRef=null,callSubs=[],pending=null,ring=null,tick=null;

const startRing=()=>{
  try{
    const c=new AudioContext(),o=c.createOscillator(),g=c.createGain();
    o.connect(g);g.connect(c.destination);o.frequency.value=520;g.gain.value=0;o.start();
    let on=0;ring={c,t:setInterval(()=>{on^=1;g.gain.value=on?.12:0},600)};
  }catch(e){}
};
const stopRing=()=>{if(ring){clearInterval(ring.t);ring.c.close();ring=null}};

async function prepare(type,other){
  stream=await navigator.mediaDevices.getUserMedia({audio:true,video:type==='video'});
  pc=new RTCPeerConnection(rtc);
  stream.getTracks().forEach(t=>pc.addTrack(t,stream));
  pc.ontrack=e=>{
    $('#remoteVid').srcObject=e.streams[0];
    if(type==='video')$('.callInfo').style.opacity=0;
    if(!tick){const t0=Date.now();tick=setInterval(()=>{const s=Math.floor((Date.now()-t0)/1000);$('#callState').textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')},1000)}
  };
  $('#localVid').srcObject=stream;
  $('#localVid').style.display=type==='video'?'block':'none';
  $('#camBtn').style.display=type==='video'?'block':'none';
  $('#muteBtn').textContent='🎤';$('#camBtn').textContent='📷';
  $('#callAv').src=avatar(other);$('#callName').textContent=dn(other);
  $('.callInfo').style.opacity=1;
  $('#callModal').classList.remove('hidden');
}

async function startCall(type){
  if(!peer||peer.uid==='global'||pc)return;
  try{
    await prepare(type,peer);
    $('#callState').textContent='Calling...';
    callRef=doc(collection(db,'calls'));
    pc.onicecandidate=e=>e.candidate&&addDoc(collection(callRef,'callerCandidates'),e.candidate.toJSON());
    const offer=await pc.createOffer();
    await pc.setLocalDescription(offer);
    await setDoc(callRef,{from:me.uid,to:peer.uid,type,status:'ringing',offer:{type:offer.type,sdp:offer.sdp},at:serverTimestamp()});
    let linked=false;
    callSubs.push(onSnapshot(callRef,async s=>{
      const d=s.data();if(!d)return;
      if(d.status==='ended')return endCall(false);
      if(d.answer&&!linked&&pc){
        linked=true;
        await pc.setRemoteDescription(d.answer);
        callSubs.push(onSnapshot(collection(callRef,'calleeCandidates'),c=>c.docChanges().forEach(x=>x.type==='added'&&pc&&pc.addIceCandidate(x.doc.data()))));
      }
    }));
    setTimeout(()=>{if(pc&&$('#callState').textContent==='Calling...'){toast('No answer');endCall(true)}},45000);
  }catch(e){toast('Could not start call: '+e.message);endCall(true)}
}
$('#vcall').onclick=()=>peer&&peer.uid==='global'?joinGroup('voice'):startCall('voice');
$('#xcall').onclick=()=>peer&&peer.uid==='global'?joinGroup('video'):startCall('video');

function showIncoming(id,d){
  pending={id,d};
  const u=users[d.from]||{name:'Unknown'};
  $('#incAv').src=avatar(u);$('#incName').textContent=dn(u);
  $('#incType').textContent='Incoming '+d.type+' call...';
  $('#incoming').classList.remove('hidden');startRing();
}
$('#decBtn').onclick=async()=>{
  stopRing();$('#incoming').classList.add('hidden');
  if(pending)await updateDoc(doc(db,'calls',pending.id),{status:'ended'}).catch(()=>{});
  pending=null;
};
$('#accBtn').onclick=async()=>{
  stopRing();
  const{id,d}=pending;pending=null;
  $('#incoming').classList.add('hidden');
  try{
    callRef=doc(db,'calls',id);
    await prepare(d.type,users[d.from]||{name:'Unknown'});
    $('#callState').textContent='Connecting...';
    pc.onicecandidate=e=>e.candidate&&addDoc(collection(callRef,'calleeCandidates'),e.candidate.toJSON());
    await pc.setRemoteDescription(d.offer);
    const ans=await pc.createAnswer();
    await pc.setLocalDescription(ans);
    await updateDoc(callRef,{answer:{type:ans.type,sdp:ans.sdp},status:'active'});
    callSubs.push(onSnapshot(collection(callRef,'callerCandidates'),c=>c.docChanges().forEach(x=>x.type==='added'&&pc&&pc.addIceCandidate(x.doc.data()))));
    callSubs.push(onSnapshot(callRef,s=>{const x=s.data();if(x&&x.status==='ended')endCall(false)}));
  }catch(e){toast('Could not answer: '+e.message);endCall(true)}
};

async function endCall(notify){
  callSubs.forEach(f=>f());callSubs=[];
  clearInterval(tick);tick=null;
  if(stream)stream.getTracks().forEach(t=>t.stop());
  if(pc)pc.close();
  stream=null;pc=null;
  $('#remoteVid').srcObject=null;
  $('#callModal').classList.add('hidden');
  if(notify&&callRef)try{await updateDoc(callRef,{status:'ended'})}catch(e){}
  callRef=null;
}
$('#hangBtn').onclick=()=>endCall(true);
$('#muteBtn').onclick=e=>{
  const t=stream&&stream.getAudioTracks()[0];if(!t)return;
  t.enabled=!t.enabled;e.target.textContent=t.enabled?'🎤':'🔇';
};
$('#camBtn').onclick=e=>{
  const t=stream&&stream.getVideoTracks()[0];if(!t)return;
  t.enabled=!t.enabled;e.target.textContent=t.enabled?'📷':'🚫';
};

const gr={on:false,sid:'',pcs:{},stream:null,subs:[],hb:null,tiles:{}};
const pCol=()=>collection(db,'rooms','global','peers');
const sCol=()=>collection(db,'rooms','global','sig');

function watchRoom(){
  listen(pCol(),s=>{gPeers=s.docs.map(d=>d.data());renderBanner()});
  timers.push(setInterval(renderBanner,15000));
}
const countTiles=()=>$('#gCount').textContent=Object.keys(gr.tiles).length+' in call';

function addTile(id,u,st,self){
  let t=gr.tiles[id];
  if(!t){
    const el=h('div','tile'),v=document.createElement('video');
    v.autoplay=true;v.playsInline=true;v.muted=!!self;
    const a=h('img','av big');a.src=avatar(u);
    el.append(a,v,h('div','tn',self?'You':u.name));
    $('#grid').append(el);t=gr.tiles[id]={el,v};
  }
  t.v.srcObject=st;
  const upd=()=>{t.v.style.display=st.getVideoTracks().some(x=>x.readyState==='live'&&x.enabled)?'block':'none'};
  upd();st.onaddtrack=upd;countTiles();
}
function dropPeer(id){
  const e=gr.pcs[id];if(e){e.p.close();delete gr.pcs[id]}
  const t=gr.tiles[id];if(t){t.el.remove();delete gr.tiles[id]}
  countTiles();
}
function mkPc(uid,sid){
  const p=new RTCPeerConnection(rtc);
  gr.pcs[uid]={p,sid,q:[]};
  gr.stream.getTracks().forEach(t=>p.addTrack(t,gr.stream));
  p.onicecandidate=e=>e.candidate&&addDoc(sCol(),{toSid:sid,fromSid:gr.sid,from:me.uid,type:'cand',data:e.candidate.toJSON()});
  p.ontrack=e=>addTile(uid,users[uid]||{name:'User'},e.streams[0]);
  return p;
}
const flush=e=>{e.q.forEach(c=>e.p.addIceCandidate(c));e.q=[]};
async function offerTo(d){
  const p=mkPc(d.uid,d.sid),o=await p.createOffer();
  await p.setLocalDescription(o);
  addDoc(sCol(),{toSid:d.sid,fromSid:gr.sid,from:me.uid,type:'offer',data:{type:o.type,sdp:o.sdp}});
}
async function onSig(m){
  let e=gr.pcs[m.from];
  if(m.type==='offer'){
    if(e)e.p.close();
    const p=mkPc(m.from,m.fromSid);e=gr.pcs[m.from];
    await p.setRemoteDescription(m.data);flush(e);
    const a=await p.createAnswer();await p.setLocalDescription(a);
    addDoc(sCol(),{toSid:m.fromSid,fromSid:gr.sid,from:me.uid,type:'answer',data:{type:a.type,sdp:a.sdp}});
  }else if(!e)return;
  else if(m.type==='answer'){await e.p.setRemoteDescription(m.data);flush(e)}
  else if(e.p.remoteDescription)e.p.addIceCandidate(m.data);
  else e.q.push(m.data);
}

async function joinGroup(type){
  if(gr.on||pc)return;
  try{gr.stream=await navigator.mediaDevices.getUserMedia({audio:true,video:type==='video'})}
  catch(e){return toast('Allow camera or microphone access to join')}
  gr.on=true;gr.sid=Math.random().toString(36).slice(2);gr.pcs={};
  $('#grid').innerHTML='';gr.tiles={};
  $('#groupModal').classList.remove('hidden');
  $('#gMute').textContent='🎤';$('#gCam').textContent='📷';
  $('#gCam').style.display=type==='video'?'block':'none';
  addTile('me',me,gr.stream,true);
  renderBanner();
  try{
    const ex=await getDocs(pCol());
    const beat=()=>setDoc(doc(pCol(),me.uid),{uid:me.uid,name:me.name,sid:gr.sid,type,beat:Date.now()});
    await beat();gr.hb=setInterval(beat,15000);
    gr.subs.push(onSnapshot(query(sCol(),where('toSid','==',gr.sid)),s=>s.docChanges().forEach(c=>c.type==='added'&&onSig(c.doc.data()))));
    gr.subs.push(onSnapshot(pCol(),s=>s.docChanges().forEach(c=>c.type==='removed'&&dropPeer(c.doc.id))));
    ex.forEach(d=>{const x=d.data();if(x.uid!==me.uid&&Date.now()-x.beat<45000)offerTo(x)});
  }catch(e){toast('Could not join call: '+e.message);leaveGroup()}
}
async function leaveGroup(){
  if(!gr.on)return;
  gr.on=false;
  gr.subs.forEach(f=>f());gr.subs=[];clearInterval(gr.hb);
  Object.keys(gr.pcs).forEach(dropPeer);dropPeer('me');
  if(gr.stream)gr.stream.getTracks().forEach(t=>t.stop());
  gr.stream=null;
  $('#groupModal').classList.add('hidden');
  try{await deleteDoc(doc(pCol(),me.uid))}catch(e){}
  renderBanner();
}
window.addEventListener('beforeunload',()=>{if(gr.on&&me)deleteDoc(doc(pCol(),me.uid))});
$('#gLeave').onclick=leaveGroup;
$('#gMute').onclick=e=>{const t=gr.stream&&gr.stream.getAudioTracks()[0];if(!t)return;t.enabled=!t.enabled;e.target.textContent=t.enabled?'🎤':'🔇'};
$('#gCam').onclick=e=>{const t=gr.stream&&gr.stream.getVideoTracks()[0];if(!t)return;t.enabled=!t.enabled;e.target.textContent=t.enabled?'📷':'🚫';gr.tiles.me.v.style.display=t.enabled?'block':'none'};
$('#bnVoice').onclick=()=>joinGroup('voice');
$('#bnVideo').onclick=()=>joinGroup('video');

const dn=u=>(me&&me.nicks&&me.nicks[u.uid])||u.name;
const isDM=()=>peer&&!peer.isGroup&&peer.uid!=='global'&&peer.uid!=='ai';

$$('#filters button').forEach(b=>b.onclick=()=>{filt=b.dataset.f;$$('#filters button').forEach(x=>x.classList.toggle('on',x===b));renderChats()});
$('#favBtn').onclick=()=>{
  const has=(me.favs||[]).includes(curKey);
  updateDoc(doc(db,'users',me.uid),{favs:has?arrayRemove(curKey):arrayUnion(curKey)});
  toast(has?'Removed from favourites':'Added to favourites');
};

$('#newGroup').onclick=()=>{
  grpAdd=null;$('#grpName').classList.remove('hidden');$('#grpGo').textContent='Create';
  const box=$('#grpPick');box.innerHTML='';
  const list=(me.contacts||[]).map(id=>users[id]).filter(Boolean);
  if(!list.length)return toast('Save some contacts first');
  list.forEach(u=>{
    const l=h('label','pk'),c=document.createElement('input'),i=h('img','av');
    c.type='checkbox';c.value=u.uid;i.src=avatar(u);
    l.append(c,i,h('span','',dn(u)));box.append(l);
  });
  $('#grpName').value='';$('#grpModal').classList.remove('hidden');
};
$('#grpCancel').onclick=()=>{grpAdd=null;$('#grpModal').classList.add('hidden')};
$('#grpGo').onclick=async()=>{
  if(grpAdd){
    const add=$$('#grpPick input:checked').map(x=>x.value);if(!add.length)return;
    await updateDoc(doc(db,'chats',grpAdd.id),{members:arrayUnion(...add)});
    grpAdd=null;$('#grpModal').classList.add('hidden');toast('Members added');return;
  }
  const name=$('#grpName').value.trim(),ids=$$('#grpPick input:checked').map(x=>x.value);
  if(!name||!ids.length)return toast('Enter a group name and pick members');
  const ref=doc(collection(db,'chats'));
  pendingOpen=ref.id;
  await setDoc(ref,{group:true,name,admin:me.uid,members:[me.uid,...ids],last:'Group created',lastAt:serverTimestamp(),unread:{}});
  $('#grpModal').classList.add('hidden');goTab('chats');toast('Group created');
};

function openNick(u){nickUid=u.uid;$('#nickIn').value=(me.nicks&&me.nicks[u.uid])||'';$('#nickIn').placeholder=u.name;$('#nickModal').classList.remove('hidden');$('#nickIn').focus()}
$('#chName').onclick=openInfo;
$('#nickCancel').onclick=()=>$('#nickModal').classList.add('hidden');
$('#nickSave').onclick=async()=>{
  const v=$('#nickIn').value.trim();
  await updateDoc(doc(db,'users',me.uid),{['nicks.'+nickUid]:v?v:deleteField()});
  $('#nickModal').classList.add('hidden');toast(v?'Nickname saved':'Nickname removed');
};

$('#camOpt').onclick=async()=>{
  $('#attach').classList.add('hidden');
  try{camS=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'}});$('#camVid').srcObject=camS;$('#camModal').classList.remove('hidden')}
  catch(e){toast('Camera access denied')}
};
const stopCam=()=>{if(camS)camS.getTracks().forEach(t=>t.stop());camS=null;$('#camModal').classList.add('hidden')};
$('#camClose').onclick=stopCam;
$('#camSnap').onclick=()=>{
  const v=$('#camVid'),c=document.createElement('canvas');
  c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);
  c.toBlob(b=>resize(b,900,.65,d=>send({img:d})),'image/jpeg',.9);stopCam();
};
$('#locOpt').onclick=()=>{
  $('#attach').classList.add('hidden');toast('Getting your location...');
  navigator.geolocation.getCurrentPosition(p=>send({loc:{lat:+p.coords.latitude.toFixed(5),lng:+p.coords.longitude.toFixed(5)}}),()=>toast('Location permission denied'),{enableHighAccuracy:true,timeout:10000});
};
$('#docIn').onchange=e=>{
  const f=e.target.files[0];e.target.value='';$('#attach').classList.add('hidden');if(!f)return;
  if(f.size>(CLOUD_NAME?10e6:650000))return toast('Document is too large');
  const r=new FileReader();r.onload=()=>send({file:{name:f.name,size:f.size,data:r.result}});r.readAsDataURL(f);
};
$('#evOpt').onclick=()=>{$('#attach').classList.add('hidden');$('#evModal').classList.remove('hidden')};
$('#evCancel').onclick=()=>$('#evModal').classList.add('hidden');
$('#evGo').onclick=()=>{
  const title=$('#evTitle').value.trim(),when=$('#evWhen').value;
  if(!title||!when)return toast('Add an event name and date');
  send({event:{title,when:new Date(when).getTime(),place:$('#evPlace').value.trim()},rsvp:{}});
  $('#evTitle').value=$('#evPlace').value='';$('#evModal').classList.add('hidden');
};

const CLOUD_NAME='krxgorxd';
const UPLOAD_PRESET='Chat-app';
async function cld(data){
  if(!CLOUD_NAME||!UPLOAD_PRESET||typeof data!=='string'||!data.startsWith('data:'))return data;
  try{
    const fd=new FormData();fd.append('file',data);fd.append('upload_preset',UPLOAD_PRESET);
    const r=await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,{method:'POST',body:fd});
    if(!r.ok)throw new Error('upload');
    return(await r.json()).secure_url;
  }catch(e){toast('Cloud upload failed, sending directly');return data}
}
let curKey=null,filt='all',pendingOpen=null,camS=null,nickUid=null,replyTo=null,starList=[],callLog={},chatsReady=false;
const stars=new Set(),notified={};

let grpAdd=null;
const ding=()=>{
  if(me.settings&&me.settings.sound===false)return;
  try{const c=new AudioContext(),o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.frequency.value=880;g.gain.value=.15;o.start();setTimeout(()=>{o.stop();c.close()},180)}catch(e){}
};
function checkNotify(){
  chats.forEach(c=>{
    if(!c.lastId||c.lastFrom===me.uid){notified[c.id]=c.lastId;return}
    if(notified[c.id]===c.lastId)return;
    notified[c.id]=c.lastId;
    if(!chatsReady)return;
    const key=c.group?c.id:c.members.find(x=>x!==me.uid);
    if((me.muted||[]).includes(key)||(me.blocked||[]).includes(key))return;
    if(c.id===chatId&&!document.hidden)return;
    const u=users[c.lastFrom];
    ding();
    if(window.Notification&&Notification.permission==='granted')new Notification(c.group?c.name:(u?dn(u):'New message'),{body:(c.group&&u?dn(u)+': ':'')+(c.last||'')});
  });
  chatsReady=true;
}
function showReply(){$('#rpName').textContent=replyTo.name;$('#rpTxt').textContent=replyTo.text;$('#replyBar').classList.remove('hidden');$('#msgIn').focus()}
function clearReply(){replyTo=null;$('#replyBar').classList.add('hidden')}
$('#rpX').onclick=clearReply;
function jumpTo(id){
  const el=document.querySelector(`.msg[data-id="${id}"]`);
  if(!el)return toast('Message is not loaded');
  el.scrollIntoView({behavior:'smooth',block:'center'});
  el.classList.add('hl');setTimeout(()=>el.classList.remove('hl'),1600);
}
function sheet(title,items){
  const box=$('#mmBox');box.innerHTML='';
  box.append(h('div','mmPrev',title));
  items.forEach(([ic,t,fn,cls])=>{const b=h('button','mmb'+(cls?' '+cls:''),ic+'   '+t);b.onclick=()=>{closeMenu();fn()};box.append(b)});
  $('#msgMenu').classList.remove('hidden');
}
const toggleList=(f,k,on,off)=>{
  const has=(me[f]||[]).includes(k);
  updateDoc(doc(db,'users',me.uid),{[f]:has?arrayRemove(k):arrayUnion(k)});
  toast(has?off:on);
};
$('#moreBtn').onclick=()=>{
  if(!peer)return;
  const k=curKey,dm=isDM(),g=!!peer.isGroup,has=f=>(me[f]||[]).includes(k);
  sheet(k==='global'?'Global Chat':g?peer.name:dn(peer),[
    ['ℹ️',g?'Group info':dm?'Contact info':'Chat info',openInfo],
    ['⭐','Starred messages',openStars],
    ['🔕',has('muted')?'Unmute notifications':'Mute notifications',()=>toggleList('muted',k,'Chat muted','Chat unmuted')],
    ['📌',has('pinned')?'Unpin chat':'Pin chat',()=>toggleList('pinned',k,'Chat pinned','Chat unpinned')],
    ['🗄',has('archived')?'Unarchive chat':'Archive chat',()=>toggleList('archived',k,'Chat archived','Chat unarchived')],
    ['🎨','Wallpaper and theme',()=>$('#themeModal').classList.remove('hidden')],
    ['🧹','Delete chat',()=>{if(chatId!=='global')updateDoc(doc(db,'users',me.uid),{['cleared.'+chatId]:Date.now()});$('#back').click();toast('Chat deleted')},'danger'],
    ...(dm?[['🚫',has('blocked')?'Unblock contact':'Block contact',()=>toggleList('blocked',k,'Contact blocked','Contact unblocked'),'danger']]:[]),
    ...(g?[['🚪','Leave group',leaveChatGroup,'danger']]:[])
  ]);
};
function openInfo(){
  if(!peer)return;
  const box=$('#infoBox');box.innerHTML='';
  const img=h('img','pic3');img.src=avatar(peer);
  box.append(img,h('h3','',peer.uid==='global'?'Global Chat':peer.isGroup?peer.name:dn(peer)));
  if(isDM()){
    box.append(h('p','tag',peer.about||''),h('p','tag',peer.email||''));
    const b=h('button','ghost','✏️ Set nickname');
    b.onclick=()=>{$('#infoModal').classList.add('hidden');openNick(peer)};box.append(b);
  }else if(peer.isGroup){
    const gc=chats.find(c=>c.id===peer.uid)||{id:peer.uid,members:peer.members,admin:''};
    box.append(h('div','sec',gc.members.length+' members'));
    gc.members.forEach(id=>{
      const u=users[id]||{name:'User',uid:id},r=mkRow(u,id===me.uid?'You':dn(u),id===gc.admin?'Group admin':(u.about||''),'',0);
      if(gc.admin===me.uid&&id!==me.uid){
        const x=h('button','ic','✖');x.style.cssText='background:var(--bg);color:var(--sub);width:30px;height:30px;font-size:12px';
        x.onclick=async e=>{e.stopPropagation();await updateDoc(doc(db,'chats',gc.id),{members:arrayRemove(id)});toast('Member removed');$('#infoModal').classList.add('hidden')};
        r.append(x);
      }
      box.append(r);
    });
    if(gc.admin===me.uid){const a=h('button','ghost','➕ Add members');a.onclick=()=>{$('#infoModal').classList.add('hidden');pickMembers(gc)};box.append(a)}
  }else box.append(h('p','tag','Open to everyone on Pingora.'));
  const c=h('button','primary','Close');c.style.marginTop='12px';c.onclick=()=>$('#infoModal').classList.add('hidden');box.append(c);
  $('#infoModal').classList.remove('hidden');
}
$('#chAv').onclick=openInfo;
$('#infoModal').onclick=e=>{if(e.target.id==='infoModal')$('#infoModal').classList.add('hidden')};
async function leaveChatGroup(){
  const gc=chats.find(c=>c.id===chatId);if(!gc)return;
  const o={members:arrayRemove(me.uid)};
  if(gc.admin===me.uid)o.admin=gc.members.find(x=>x!==me.uid)||'';
  await updateDoc(chatRef(),o);$('#back').click();toast('You left the group');
}
function pickMembers(gc){
  const box=$('#grpPick');box.innerHTML='';
  const list=(me.contacts||[]).map(id=>users[id]).filter(u=>u&&!gc.members.includes(u.uid));
  if(!list.length)return toast('All your contacts are already in this group');
  list.forEach(u=>{
    const l=h('label','pk'),c=document.createElement('input'),i=h('img','av');
    c.type='checkbox';c.value=u.uid;i.src=avatar(u);l.append(c,i,h('span','',dn(u)));box.append(l);
  });
  grpAdd=gc;$('#grpName').classList.add('hidden');$('#grpGo').textContent='Add';$('#grpModal').classList.remove('hidden');
}
function openFwd(m){
  const box=$('#fwdList');box.innerHTML='';
  const t=[{key:'global',u:GLOBAL,name:'Global Chat'},...chats.filter(c=>c.group).map(c=>({key:c.id,u:{uid:c.id,name:c.name,photo:''},name:c.name})),...(me.contacts||[]).map(id=>users[id]).filter(Boolean).map(u=>({key:u.uid,u,name:dn(u)}))];
  t.forEach(x=>{
    const r=mkRow(x.u,x.name,'','',0);
    r.onclick=async()=>{
      $('#fwdModal').classList.add('hidden');
      const p={fwd:true};['text','img','audio','file','loc'].forEach(k=>{if(m[k])p[k]=m[k]});
      await sendTo(x.key,p);toast('Forwarded to '+x.name);
    };
    box.append(r);
  });
  $('#fwdModal').classList.remove('hidden');
}
$('#fwdClose').onclick=()=>$('#fwdModal').classList.add('hidden');
function openStars(){
  const box=$('#starList');box.innerHTML='';
  if(!starList.length)box.append(h('p','box center','No starred messages yet'));
  [...starList].sort((a,b)=>b.at-a.at).forEach(x=>{
    const u=users[x.chatKey]||(x.chatKey==='global'?GLOBAL:{name:x.name}),r=mkRow(u,x.name||'Message',x.text,new Date(x.at).toLocaleDateString(),0);
    r.onclick=()=>{$('#starModal').classList.add('hidden');openChat(x.chatKey)};
    box.append(r);
  });
  $('#starModal').classList.add('hidden');
}
$('#starClose').onclick=()=>$('#starModal').classList.add('hidden');

function watchExtras(){
  listen(collection(db,'users',me.uid,'stars'),s=>{stars.clear();starList=[];s.forEach(d=>{stars.add(d.id);starList.push({id:d.id,...d.data()})})});
  ['to','from'].forEach(f=>listen(query(collection(db,'calls'),where(f,'==',me.uid)),s=>{s.forEach(d=>callLog[d.id]={id:d.id,...d.data()});renderCalls()}));
}
function renderCalls(){
  if(!me)return;
  const box=$('#callList');box.innerHTML='';
  const list=Object.values(callLog).filter(c=>c.at).sort((a,b)=>b.at.toMillis()-a.at.toMillis()).slice(0,60);
  if(!list.length){box.append(h('p','box center','No calls yet'));return}
  list.forEach(c=>{
    const out=c.from===me.uid,uid=out?c.to:c.from,u=users[uid];if(!u)return;
    const missed=!out&&!c.answer;
    const r=mkRow(u,dn(u),(out?'↗ Outgoing ':missed?'↙ Missed ':'↙ Incoming ')+(c.type==='video'?'video':'voice')+' call',c.at.toDate().toLocaleString([],{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}),0);
    if(missed)r.querySelector('b').style.color='#e53935';
    r.onclick=()=>{openChat(uid);setTimeout(()=>startCall(c.type),300)};
    box.append(r);
  });
}

const myRef=()=>doc(db,'users',me.uid);
$('#stLast').onchange=e=>updateDoc(myRef(),{hideSeen:!e.target.checked});
$('#stRead').onchange=e=>updateDoc(myRef(),{'settings.receipts':e.target.checked});
$('#stSnd').onchange=e=>updateDoc(myRef(),{'settings.sound':e.target.checked});
$('#stNotif').onclick=()=>{
  if(!window.Notification)return toast('Notifications are not supported in this browser');
  Notification.requestPermission().then(p=>toast(p==='granted'?'Notifications enabled':'Notifications are blocked in browser settings'));
};
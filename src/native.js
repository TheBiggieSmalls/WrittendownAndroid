import {Capacitor} from '@capacitor/core';
import {LocalNotifications} from '@capacitor/local-notifications';
import {CapacitorCalendar} from '@ebarooni/capacitor-calendar';
import {Filesystem,Directory,Encoding} from '@capacitor/filesystem';
import {Share} from '@capacitor/share';

const native=Capacitor.isNativePlatform();
const P=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+P(d.getMonth()+1)+'-'+P(d.getDate());
const pd=s=>{const[a,b,c]=s.split('-').map(Number);return new Date(a,b-1,c)};
const at=(ds,hm)=>{const[h,m]=hm.split(':').map(Number),d=pd(ds);d.setHours(h,m,0,0);return d};
const FREQ={dagelijks:'daily',wekelijks:'weekly',maandelijks:'monthly',jaarlijks:'yearly'};
function occurs(e,ds){
  if(ds<e.date)return false;if(ds===e.date)return true;
  const a=pd(e.date),b=pd(ds),r=e.repeat;
  if(r==='dagelijks')return true;
  if(r==='wekelijks')return Math.round((b-a)/864e5)%7===0;
  if(r==='maandelijks')return a.getDate()===b.getDate();
  if(r==='jaarlijks')return a.getDate()===b.getDate()&&a.getMonth()===b.getMonth();
  return false;
}

// ---- meldingen: plant de komende 45 dagen opnieuw bij elke wijziging
async function plan(S){
  try{
    const pend=await LocalNotifications.getPending();
    if(pend.notifications.length)await LocalNotifications.cancel({notifications:pend.notifications});
    const now=Date.now(),list=[];let id=1;
    const push=(when,title,body)=>{if(when.getTime()>now&&list.length<400)list.push({id:id++,title,body,schedule:{at:when,allowWhileIdle:true}})};
    const items=[...S.events.map(e=>({e,t:0})),...S.tasks.filter(t=>t.dueDate&&!t.completed).map(t=>({e:{date:t.dueDate,repeat:t.recurrence,title:t.title},t:1}))];
    for(let i=0;i<45;i++){
      const d=new Date();d.setDate(d.getDate()+i);const ds=ymd(d);
      for(const {e,t} of items){
        if(!occurs(e,ds))continue;
        if(!t)push(new Date(at(ds,e.time).getTime()-6e5),e.title,'Om '+e.time+(e.description?' · '+e.description:''));
        else push(at(ds,'09:00'),'Taak: '+e.title,'Staat voor vandaag op je lijst');
      }
    }
    S.tasks.filter(t=>t.completed&&t.back).forEach(t=>push(at(t.back,'09:00'),'Taak: '+t.title,'Komt weer terug op je lijst'));
    if(list.length)await LocalNotifications.schedule({notifications:list});
  }catch(e){console.error('plan',e)}
}

// ---- eenrichtingssync naar de standaardagenda van de telefoon (Samsung Agenda leest die mee)
let calId=null;
async function calSync(S){
  if(localStorage.getItem('wd_calsync')!=='1')return;
  try{
    if(!calId){const r=await CapacitorCalendar.getDefaultCalendar({useFallbackCalendar:true});calId=r.result&&r.result.id}
    if(!calId)return;
    const map=JSON.parse(localStorage.getItem('wd_calmap')||'{}'),want={};
    S.events.forEach(e=>{const s=at(e.date,e.time).getTime();want['e'+e.id]={title:e.title,description:e.description||'',startDate:s,endDate:s+36e5,rep:e.repeat}});
    S.tasks.forEach(t=>{if(!t.dueDate||(t.completed&&t.recurrence==='geen'))return;const s=at(t.dueDate,'09:00').getTime();want['t'+t.id]={title:'☐ '+t.title,description:'Taak',startDate:s,endDate:s+18e5,rep:t.recurrence}});
    const del=async id=>{try{await CapacitorCalendar.deleteEvent({id,span:1})}catch(e){}};
    for(const k of Object.keys(map))if(!want[k]){await del(map[k].id);delete map[k]}
    for(const k of Object.keys(want)){
      const w=want[k],h=JSON.stringify(w);
      if(map[k]&&map[k].h===h)continue;
      if(map[k])await del(map[k].id);
      const o={title:w.title,description:w.description,startDate:w.startDate,endDate:w.endDate,alerts:[],calendarId:calId};
      if(FREQ[w.rep])o.recurrence={frequency:FREQ[w.rep]};
      const r=await CapacitorCalendar.createEvent(o);
      map[k]={id:String(r.id),h};
      localStorage.setItem('wd_calmap',JSON.stringify(map));
    }
    localStorage.setItem('wd_calmap',JSON.stringify(map));
  }catch(e){console.error('calSync',e)}
}

let q=Promise.resolve(),tm;
function sync(S){clearTimeout(tm);tm=setTimeout(()=>{q=q.then(()=>plan(S)).then(()=>calSync(S))},1500)}

async function enable(S,toast){
  try{
    const n=await LocalNotifications.requestPermissions();
    const c=await CapacitorCalendar.requestFullCalendarAccess();
    if(!localStorage.getItem('wd_exact')){
      localStorage.setItem('wd_exact','1');
      try{const x=await LocalNotifications.checkExactNotificationSetting();if(x.exact_alarm!=='granted')await LocalNotifications.changeExactNotificationSetting()}catch(e){}
    }
    const ok=c.result==='granted';
    localStorage.setItem('wd_calsync',ok?'1':'0');
    await plan(S);if(ok)await calSync(S);
    toast(n.display!=='granted'?'Meldingen niet toegestaan':ok?'Meldingen en agenda-sync staan aan':'Meldingen aan; agenda niet toegestaan');
  }catch(e){toast('Mislukt: '+(e.message||e))}
}

async function saveFile(name,text){
  const r=await Filesystem.writeFile({path:name,data:text,directory:Directory.Cache,encoding:Encoding.UTF8});
  await Share.share({title:name,url:r.uri,dialogTitle:'Bewaar of deel'});
}

window.WDN={native,sync,enable,saveFile,init:sync};

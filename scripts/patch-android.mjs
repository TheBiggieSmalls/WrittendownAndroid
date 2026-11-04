import fs from 'node:fs';
const f='android/app/src/main/AndroidManifest.xml';
let x=fs.readFileSync(f,'utf8');
for(const p of ['READ_CALENDAR','WRITE_CALENDAR']){
  const t=`<uses-permission android:name="android.permission.${p}" />`;
  if(!x.includes(p))x=x.replace('<application',t+'\n    <application');
}
fs.writeFileSync(f,x);
console.log('manifest gepatcht');

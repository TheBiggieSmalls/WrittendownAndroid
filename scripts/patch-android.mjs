import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

// 1) rechten voor agenda
const f='android/app/src/main/AndroidManifest.xml';
let x=fs.readFileSync(f,'utf8');
for(const p of ['READ_CALENDAR','WRITE_CALENDAR']){
  const t=`<uses-permission android:name="android.permission.${p}" />`;
  if(!x.includes(p))x=x.replace('<application',t+'\n    <application');
}
fs.writeFileSync(f,x);

// 2) app-icoon + opstartscherm: witte pen op indigo
const PEN='M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z';
const BG='#4f46e5';
const pen=(vb,scale)=>`<g transform="translate(${vb/2} ${vb/2}) scale(${scale}) translate(-12 -12)"><path fill="#fff" d="${PEN}"/></g>`;
const svg=(w,h,inner)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`);
const res='android/app/src/main/res';
fs.writeFileSync(`${res}/values/ic_launcher_background.xml`,`<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BG}</color>\n</resources>\n`);
const dens={mdpi:[48,108],hdpi:[72,162],xhdpi:[96,216],xxhdpi:[144,324],xxxhdpi:[192,432]};
for(const [d,[leg,fg]] of Object.entries(dens)){
  const dir=`${res}/mipmap-${d}`;
  // adaptive voorgrond: pen binnen de veilige zone
  await sharp(svg(fg,fg,pen(fg,fg/108*2.3))).png().toFile(`${dir}/ic_launcher_foreground.png`);
  const s=leg/24*0.62;
  await sharp(svg(leg,leg,`<rect width="${leg}" height="${leg}" rx="${leg*.22}" fill="${BG}"/>${pen(leg,s)}`)).png().toFile(`${dir}/ic_launcher.png`);
  await sharp(svg(leg,leg,`<circle cx="${leg/2}" cy="${leg/2}" r="${leg/2}" fill="${BG}"/>${pen(leg,s)}`)).png().toFile(`${dir}/ic_launcher_round.png`);
}
for(const e of fs.readdirSync(res,{withFileTypes:true})){
  if(!e.isDirectory()||!e.name.startsWith('drawable'))continue;
  const sp=path.join(res,e.name,'splash.png');
  if(!fs.existsSync(sp))continue;
  const {width:w,height:h}=await sharp(sp).metadata();
  const m=Math.min(w,h);
  const out=await sharp(svg(w,h,`<rect width="${w}" height="${h}" fill="${BG}"/><g transform="translate(${w/2} ${h/2})">${pen(0,m*.22/24)}</g>`)).png().toBuffer();
  fs.writeFileSync(sp,out);
}
console.log('manifest + iconen gepatcht');

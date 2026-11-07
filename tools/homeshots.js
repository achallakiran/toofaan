#!/usr/bin/env node
/* Build 76 in the built file: a gang patrol on the road (and on the mini-map and full map), riding up to it starts that road fight; then
   HOME: the ride to the cycle-repair shop, the hidden entrance (brick, shutter, floor, ramp) and the hideout, Toofan in costume; then
   riding out again starts at the shop. Frames go to outDir (default dist) as home-*.png. */
'use strict';
var pw=require('playwright'),path=require('path');var out=process.argv[2]||path.resolve(__dirname,'..','dist');var FILE='file://'+path.resolve(__dirname,'..','dist','toofan-brawler.html');var fails=0;
(async function(){var b=await pw.chromium.launch({args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
for (const vp of [[900,540,'wide'],[390,760,'phone']]){
var p=await b.newPage({viewport:{width:vp[0],height:vp[1]}}),errs=[],log=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
async function shot(n){await p.screenshot({path:out+'/home-'+n+'-'+vp[2]+'.png'});}
await p.goto(FILE+'#ride');await p.waitForSelector('html[data-ready="1"]');await p.waitForTimeout(1500);
/* a bike patrol parked just ahead on his road, for the picture */
await p.evaluate(()=>{var r=__game.ctx.ride,B=r.bike,ax=Math.abs(Math.sin(B.h))>0.5?'x':'z',dir=ax==='x'?Math.sign(Math.sin(B.h)):Math.sign(Math.cos(B.h));
  r.patrolCool=1e9;r.patrols=[{id:'pv',kind:'bikes',gang:'antu',axis:ax,line:ax==='x'?Math.round(B.z/72*2)/2*72:0,dir:dir,lane:1,s:0,x:B.x+Math.sin(B.h)*22,z:B.z+Math.cos(B.h)*22,px:0,pz:0,h:B.h,ph:B.h}];
  var q=r.patrols[0];q.px=q.x;q.pz=q.z;q.line=ax==='x'?B.z-(-Math.sin(B.h))*0:B.x;__game.ctx.debug.freeze=true;});
await p.waitForTimeout(600);await shot('0patrol');
await p.click('#rMap');await p.waitForTimeout(700);await shot('1fullmap');await p.click('text=[ CLOSE ]');
await p.evaluate(()=>{__game.ctx.debug.freeze=false;__game.ctx.ride.patrols=[];});
/* home */
await p.evaluate(()=>__game.ctx.debug.goHome());
await p.waitForFunction(()=>{var S=__game.ctx.debug.rideMode;return S&&S.cut&&S.cut.kind==='home';},null,{timeout:30000}).catch(()=>log.push('no home cut'));
var marks=[[1.2,'2turn'],[2.4,'3shutter'],[4.0,'4floor'],[5.0,'5ramp']];
for(const m of marks){await p.waitForFunction(t=>{var S=__game.ctx.debug.rideMode;return !S.cut||S.cut.t>t;},m[0],{timeout:30000}).catch(()=>{});await shot(m[1]);}
await p.waitForFunction(()=>__game.modes.currentName()==='hideout',null,{timeout:30000}).catch(()=>log.push('no hideout'));
await p.waitForTimeout(1200);await shot('6hideout');
var st=await p.evaluate(()=>({mode:__game.modes.currentName(),ride:__game.ctx.ride.state,near:Math.round(Math.hypot(__game.ctx.ride.bike.x-__game.ctx.ride.map.home.x,__game.ctx.ride.bike.z-__game.ctx.ride.map.home.z))}));
var ok=st.mode==='hideout'&&st.ride==='ride'&&st.near<10&&!log.length&&!errs.length;if(!ok)fails++;
console.log((ok?'PASS ':'FAIL ')+vp[2],JSON.stringify(st),JSON.stringify(log),JSON.stringify(errs));await p.close();}
/* riding up to a patrol starts its road fight */
var p2=await b.newPage({viewport:{width:900,height:540}}),e2=[];p2.on('pageerror',e=>e2.push(e.message));
await p2.goto(FILE+'#ride');await p2.waitForSelector('html[data-ready="1"]');await p2.waitForTimeout(1200);
await p2.evaluate(()=>{var r=__game.ctx.ride,B=r.bike;B.x=B.px=-150;B.z=B.pz=r.map.lines[1]-5.1;B.h=B.ph=Math.PI/2;B.speed=12;r.target=null;r.patrolCool=1e9;
  r.patrols=[{id:'pc',kind:'car',gang:'kalia',axis:'x',line:r.map.lines[1],dir:1,lane:1,s:-138,x:-138,z:r.map.lines[1]-5.1,px:-138,pz:r.map.lines[1]-5.1,h:Math.PI/2,ph:Math.PI/2}];});
await p2.keyboard.down('KeyW');
await p2.waitForFunction(()=>__game.ctx.ride.enc,null,{timeout:20000}).catch(()=>{});
await p2.keyboard.up('KeyW');await p2.waitForTimeout(1500);await p2.screenshot({path:out+'/home-7chase.png'});
var k=await p2.evaluate(()=>__game.ctx.ride.enc&&__game.ctx.ride.enc.kind);var ok2=k==='car'&&!e2.length;if(!ok2)fails++;console.log((ok2?'PASS ':'FAIL ')+'chase -> '+k,JSON.stringify(e2));
await b.close();process.exit(fails?1:0);})();

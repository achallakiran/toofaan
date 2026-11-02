#!/usr/bin/env node
/* Maa ka Thappad, played through in the built file on phone and wide: knock Toofan out in a practice fight, wait for Maa, tap the slaps,
   then the rock stand, the spark and the goons amazed, and check the fight carries on at full health. Frames go to outDir (default dist). */
'use strict';
var pw=require('playwright'),path=require('path');var out=process.argv[2]||path.resolve(__dirname,'..','dist');var FILE='file://'+path.resolve(__dirname,'..','dist','toofan-brawler.html');var fails=0;
(async function(){var b=await pw.chromium.launch({args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
for (const vp of [[900,540,'wide'],[390,760,'phone']]){
var p=await b.newPage({viewport:{width:vp[0],height:vp[1]}}),errs=[],log=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto(FILE+'?dev=1#fight=market,3');await p.waitForSelector('html[data-ready="1"]');await p.waitForTimeout(1500);
await p.evaluate(()=>{var f=__game.ctx.fight;f.player.hp=0;});
await p.waitForFunction(()=>__game.ctx.fight.state==='thappad',null,{timeout:20000}).catch(()=>log.push('no thappad'));
var t0=Date.now();
async function shot(n){await p.screenshot({path:out+'/th-'+n+'-'+vp[2]+'.png'});}
await p.waitForTimeout(400);await shot('0black');
await p.waitForTimeout(2200);await shot('1walk');
await p.waitForFunction(()=>/TAP TAP/.test(document.body.innerText)&&[...document.querySelectorAll('div')].some(d=>d.textContent==='✊ TAP TAP TAP!'&&getComputedStyle(d).opacity==='1'),null,{timeout:20000}).catch(()=>log.push('no prompt'));
await shot('2line');
for(let i=0;i<14;i++){await p.keyboard.press('Space');await p.waitForTimeout(i<3?350:120);if(i==1)await shot('3slap');if(i==9)await shot('4fast');}
await p.waitForFunction(()=>__game.ctx.fight.state==='rise',null,{timeout:20000}).catch(()=>log.push('no rise'));
await p.waitForTimeout(300);await shot('5rise');
await p.waitForFunction(()=>__game.ctx.fight.riseT>50,null,{timeout:20000}).catch(()=>{});await shot('6spark');
await p.waitForFunction(()=>__game.ctx.fight.riseT>95,null,{timeout:20000}).catch(()=>{});await shot('7amazed');
await p.waitForFunction(()=>__game.ctx.fight.state==='fight',null,{timeout:20000}).catch(()=>log.push('no resume'));
await p.waitForTimeout(500);await shot('8resume');
var st=await p.evaluate(()=>{var f=__game.ctx.fight;return {state:f.state,hp:f.player.hp,men:f.combat.enemies.filter(e=>!e.dead).length,thappads:f.thappads,music:__game.ctx.debug.music.track()}});
var ok=st.state==='fight'&&st.hp===100&&st.thappads===1&&st.music==='arena'&&!log.length&&!errs.length;if(!ok)fails++;console.log((ok?'PASS ':'FAIL ')+vp[2],JSON.stringify(st),'secs',((Date.now()-t0)/1000).toFixed(1),JSON.stringify(log),JSON.stringify(errs));await p.close();}
await b.close();console.log(fails?'THAPPAD: '+fails+' FAILED':'THAPPAD: ALL PASS');process.exit(fails?1:0);})();

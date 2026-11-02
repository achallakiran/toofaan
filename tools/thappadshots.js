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
await p.waitForSelector('text=SAVE TOOFAN',{timeout:20000});await p.waitForTimeout(700);await shot('0choice');
await p.click('text=SAVE TOOFAN');
await p.waitForTimeout(2000);await shot('1walk');await p.waitForTimeout(1800);await shot('1kneel');
await p.waitForFunction(()=>/TAP TAP/.test(document.body.innerText)&&[...document.querySelectorAll('div')].some(d=>d.textContent==='✊ TAP TAP TAP!'&&getComputedStyle(d).opacity==='1'),null,{timeout:20000}).catch(()=>log.push('no prompt'));
await shot('2line');
for(let i=0;i<14;i++){await p.keyboard.press('Space');await p.waitForTimeout(i<3?450:130);if(i==1)await shot('3slap');if(i==9)await shot('4fast');}
await p.waitForFunction(()=>__game.ctx.fight.state==='rise',null,{timeout:20000}).catch(()=>log.push('no rise'));
await p.waitForTimeout(300);await shot('5rise');
await p.waitForFunction(()=>__game.ctx.fight.riseT>50,null,{timeout:20000}).catch(()=>{});await shot('6spark');
await p.waitForFunction(()=>__game.ctx.fight.riseT>95,null,{timeout:20000}).catch(()=>{});await shot('7amazed');
await p.waitForFunction(()=>__game.ctx.fight.state==='fight',null,{timeout:20000}).catch(()=>log.push('no resume'));
await p.waitForTimeout(500);await shot('8resume');
var st=await p.evaluate(()=>{var f=__game.ctx.fight;return {state:f.state,hp:f.player.hp,men:f.combat.enemies.filter(e=>!e.dead).length,thappads:f.thappads,music:__game.ctx.debug.music.track()}});
var ok=st.state==='fight'&&st.hp===100&&st.thappads===1&&/^arena/.test(st.music)&&!log.length&&!errs.length;if(!ok)fails++;console.log((ok?'PASS ':'FAIL ')+vp[2],JSON.stringify(st),'secs',((Date.now()-t0)/1000).toFixed(1),JSON.stringify(log),JSON.stringify(errs));await p.close();}
/* let him die: game over, back to the title menu */
var p2=await b.newPage({viewport:{width:900,height:540}}),errs2=[];p2.on('pageerror',e=>errs2.push(e.message));
await p2.goto(FILE+'?dev=1#fight=market,1');await p2.waitForSelector('html[data-ready="1"]');await p2.waitForTimeout(1200);
await p2.evaluate(()=>{__game.ctx.fight.player.hp=0;});await p2.waitForSelector('text=LET HIM DIE',{timeout:20000});await p2.waitForTimeout(600);await p2.click('text=LET HIM DIE');
await p2.waitForFunction(()=>__game.modes.currentName()==='title',null,{timeout:20000}).catch(()=>{});
var m2=await p2.evaluate(()=>__game.modes.currentName()+' '+/NEW GAME/.test(document.body.innerText));if(!/^title true/.test(m2)||errs2.length)fails++;console.log((/^title true/.test(m2)?'PASS ':'FAIL ')+'let him die -> '+m2,JSON.stringify(errs2));
/* on the road: thrown off Bijli, Maa, the rock stand by the roadside, back on the bike */
var p3=await b.newPage({viewport:{width:900,height:540}}),errs3=[],log3=[];p3.on('pageerror',e=>errs3.push(e.message));
await p3.goto(FILE+'#ride');await p3.waitForSelector('html[data-ready="1"]');await p3.waitForTimeout(1200);
await p3.evaluate(()=>{__game.ctx.debug.rideStart('bikes');});await p3.waitForFunction(()=>__game.ctx.ride.enc&&__game.ctx.ride.enc.phase==='fight',null,{timeout:30000}).catch(()=>log3.push('no fight'));
await p3.evaluate(()=>{__game.ctx.ride.hearts=0;});await p3.waitForTimeout(500);await p3.screenshot({path:out+'/th-road-0down.png'});
await p3.waitForSelector('text=SAVE TOOFAN',{timeout:20000}).catch(()=>log3.push('no choice'));await p3.waitForTimeout(600);await p3.click('text=SAVE TOOFAN');
await p3.waitForFunction(()=>{var S=__game.ctx.debug.rideMode;return S.thp&&S.thp.phase()==='ready';},null,{timeout:60000}).catch(()=>log3.push('maa not ready'));await p3.waitForTimeout(1200);
for(let i=0;i<400;i++){var ph=await p3.evaluate(()=>{var S=__game.ctx.debug.rideMode;return S.thp?S.thp.phase():'gone';});if(ph==='final'||ph==='gone')break;await p3.keyboard.press('Space');await p3.waitForTimeout(150);}   /* keep tapping, like a player, until the big one */
await p3.waitForFunction(()=>__game.ctx.ride.enc&&__game.ctx.ride.enc.phase==='rise'&&__game.ctx.ride.enc.t>40,null,{timeout:30000}).catch(()=>log3.push('no rise'));await p3.screenshot({path:out+'/th-road-1rock.png'});
await p3.waitForFunction(()=>__game.ctx.ride.enc&&__game.ctx.ride.enc.phase==='rise'&&__game.ctx.ride.enc.t>140,null,{timeout:30000}).catch(()=>{});await p3.screenshot({path:out+'/th-road-2afraid.png'});
await p3.waitForFunction(()=>__game.ctx.ride.enc&&__game.ctx.ride.enc.phase==='fight',null,{timeout:30000}).catch(()=>log3.push('no resume'));
await p3.waitForTimeout(800);await p3.screenshot({path:out+'/th-road-3back.png'});
var st3=await p3.evaluate(()=>({hearts:__game.ctx.ride.hearts,phase:__game.ctx.ride.enc&&__game.ctx.ride.enc.phase,mode:__game.modes.currentName()}));
var ok3=st3.hearts===3&&st3.phase==='fight'&&!log3.length&&!errs3.length;if(!ok3)fails++;console.log((ok3?'PASS ':'FAIL ')+'road',JSON.stringify(st3),JSON.stringify(log3),JSON.stringify(errs3));
await b.close();console.log(fails?'THAPPAD: '+fails+' FAILED':'THAPPAD: ALL PASS');process.exit(fails?1:0);})();

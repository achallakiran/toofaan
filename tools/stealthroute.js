/* tools: plays the stealth stage's last stretch with real inputs (up the office stairs, behind the head sniper, the takedown) and saves
   screenshots. Usage: node tools/stealthroute.js <out dir> [w|p]. Prints the end state; it should be [ 'won', 1 ]. */
var pw=require('playwright'),path=require('path');(async()=>{var b=await pw.chromium.launch({args:['--use-gl=swiftshader','--enable-webgl']});var errs=[],out=process.argv[2];
var vp=process.argv[3]==='p'?[390,780]:[960,540];var tag=process.argv[3]||'w';
var p=await b.newPage({viewport:{width:vp[0],height:vp[1]}});p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.resolve('dist/toofan-brawler.html')+'#stealth');await p.waitForSelector('html[data-ready="1"]');
await p.waitForFunction(()=>__game.ctx.debug.stealth&&__game.ctx.debug.stealth.st,null,{timeout:60000});await p.mouse.click(vp[0]/2,vp[1]/2);
await p.evaluate(()=>{var s=__game.ctx.debug.stealth.st;s.watchers.forEach(w=>{if(w.type!=='boss')w.st='out'});var B=s.watchers.find(w=>w.type==='boss');B.glance=999;var pl=s.player;pl.x=pl.px=10.2;pl.z=pl.pz=-20.4;pl.crouch=true;});
var I=()=>__game.ctx.input;
await p.evaluate(()=>__game.ctx.input.setAxis(-1,0));await p.waitForTimeout(1600);await p.screenshot({path:out+'/'+tag+'-r1-stairs.png'});
await p.waitForTimeout(1900);await p.evaluate(()=>__game.ctx.input.setAxis(0,0));
var r=await p.evaluate(()=>{var pl=__game.ctx.debug.stealth.st.player;return [pl.x.toFixed(2),pl.z.toFixed(2),pl.y.toFixed(2),pl.up]});console.log('after stairs',r);
for(let k=0;k<80;k++){var d=await p.evaluate(()=>{var s=__game.ctx.debug.stealth.st,pl=s.player,B=s.watchers.find(w=>w.type==='boss');var dx=B.x-pl.x,dz=(B.z-1.1)-pl.z,d=Math.hypot(dx,dz);if(d<0.25){__game.ctx.input.setAxis(0,0);return d}__game.ctx.input.setAxis(dx/d,-dz/d);return d});if(d<0.25)break;await p.waitForTimeout(60);}
await p.waitForTimeout(300);await p.screenshot({path:out+'/'+tag+'-r2-behind.png'});
await p.evaluate(()=>__game.ctx.input.setButton('attack',true));await p.waitForTimeout(80);await p.evaluate(()=>__game.ctx.input.setButton('attack',false));
await p.waitForTimeout(450);await p.screenshot({path:out+'/'+tag+'-r3-chop.png'});await p.waitForTimeout(2600);await p.screenshot({path:out+'/'+tag+'-r4-clear.png'});
console.log(await p.evaluate(()=>{var s=__game.ctx.debug.stealth.st;return [s.state,s.stunned]}),errs);await b.close();})();

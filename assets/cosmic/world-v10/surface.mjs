import {baseWorld} from './base-worlds.mjs';
import {smooth} from './transitions.mjs';
const clamp=x=>Math.max(0,Math.min(1,x));
function hash(x,y,z,s){let h=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(z,1274126177)^s;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;}
const fade=t=>t*t*(3-2*t),mix=(a,b,t)=>a+(b-a)*t;
function noise(x,y,z,s){const a=Math.floor(x),b=Math.floor(y),c=Math.floor(z),u=fade(x-a),v=fade(y-b),w=fade(z-c);const layer=k=>mix(mix(hash(a,b,k,s),hash(a+1,b,k,s),u),mix(hash(a,b+1,k,s),hash(a+1,b+1,k,s),u),v);return mix(layer(c),layer(c+1),w);}
export function makeSurface(type,seed){const world=baseWorld(type,seed),s=world.seed;return (x,y,z)=>{const len=Math.hypot(x,y,z);if(!len||!Number.isFinite(len))throw new RangeError('Invalid direction');x/=len;y/=len;z/=len;const n=(f,k=0)=>noise(x*f,y*f,z*f,s^k);const broad=n(2),detail=n(8,31),fine=n(24,79),ridge=1-Math.abs(detail*2-1),latitude=Math.abs(y);let height=0,water=0,heat=clamp(1-latitude),ice=0,emission=0,cloud=0,metal=0;
switch(type){
case 'earth':height=clamp(.7*broad+.2*ridge+.1*fine);water=1-smooth(.48,.53,height);ice=smooth(.7,.95,latitude);cloud=n(5,99);break;
case 'aquatic':height=clamp(.75*broad+.25*detail);water=1-smooth(.76,.82,height);cloud=n(5,99);break;
case 'rock':height=clamp(.55*broad+.35*ridge+.1*fine);break;
case 'volcanic':height=clamp(.5*broad+.4*ridge+.1*fine);emission=smooth(.86,.99,ridge)*smooth(.3,.65,broad);heat=clamp(.65+.35*emission);cloud=.35*n(5,99);break;
case 'ice':height=clamp(.6*broad+.4*ridge);ice=1-smooth(.82,.94,ridge)*.35;water=(1-ice)*.4;heat*=.15;break;
case 'gas':cloud=clamp(.5+.35*Math.sin(y*28+detail*5)+.15*fine);break;
case 'spectralMetallic':height=clamp(.6*broad+.4*ridge);metal=smooth(.35,.7,detail);emission=smooth(.9,.99,ridge)*metal;break;
}return {height,water,heat,ice,emission,cloud,metal,humidity:n(4,123)};};}
// Prototype scalar fields, not physical simulation or rendered assets.

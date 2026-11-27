export const tiers=Object.freeze([{steps:8,scale:.5,plumes:1},{steps:12,scale:.5,plumes:2},{steps:20,scale:.67,plumes:4},{steps:32,scale:.75,plumes:6}]);
export function volumeQuality(tier,visible,projectedPx){if(!visible||!Number.isFinite(projectedPx)||projectedPx<24)return {steps:0,scale:0,plumes:0};return tiers[Math.max(0,Math.min(3,Math.trunc(Number(tier)||0)))];}
export function shellInterval(ro,rd,r=1.12){const b=ro.reduce((s,x,i)=>s+x*rd[i],0), c=ro.reduce((s,x)=>s+x*x,0)-r*r, d=b*b-c;if(d<0)return null;const a=Math.max(0,-b-Math.sqrt(d)),z=-b+Math.sqrt(d);return z>a?[a,z]:null;}

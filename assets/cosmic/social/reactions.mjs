export class ReactionPool {
 constructor({limit=3,ttl=3200}={}){this.limit=limit;this.ttl=ttl;this.items=[];this.seen=new Map()}
 trigger(event,now){if(!event?.id||!event.target||!event.variant||!Number.isFinite(now)||this.seen.has(event.id))return false;this.seen.set(event.id,now);if(this.seen.size>512)this.seen.delete(this.seen.keys().next().value);this.items=this.items.filter(x=>now-x.start<this.ttl);if(this.items.length>=this.limit)this.items.shift();this.items.push({...event,start:now});return true}
 sample(now,{visible=()=>true,reducedMotion=false}={}){this.items=this.items.filter(x=>now-x.start<this.ttl);return this.items.filter(x=>visible(x.target)).map(x=>({...x,frame:reducedMotion?0:Math.floor(Math.max(0,now-x.start)/100)%16,opacity:Math.max(0,Math.min(1,(now-x.start)/120,(this.ttl-now+x.start)/300))}))}
 clear(){this.items=[]}
}
export function atlasUV(frame){let i=Math.max(0,Math.min(15,Math.floor(frame)));return [(i%4)/4,Math.floor(i/4)/4,0.25,0.25]}

// The existing V2.2 envelope is reused; no microphone, audio engine or RAF.
import {audioEnvelope} from '../natural-world-v22/world.mjs';
export function visualAudio(previous,target,dt){
 const unit=x=>Number.isFinite(x)?Math.max(0,Math.min(1,x)):0;
 return audioEnvelope(unit(previous),unit(target),Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0)));
}

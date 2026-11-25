// Optional lifecycle adapter for the analytic WebGL2 planet renderer.
// Owns only PBR leases and bindings; never changes audio, Figma or the render loop.
import { PlanetPBR } from "./webgl-pbr.mjs";
import { createPlanetPBRBinding } from "./planet-pbr-shader.mjs";

export class PlanetMaterialController {
  constructor(gl, {manifestURL, units, reservedUnits=[], budgetBytes=16*1024*1024,
    onInvalidate=()=>{}, onError=()=>{}}) {
    this.gl=gl;
    this.options={manifestURL,units,reservedUnits,budgetBytes};
    this.onInvalidate=onInvalidate; this.onError=onError;
    this.pool=null; this.binding=null; this.lease=null; this.pending=null;
    this.generation=0; this.preset=null; this.strength=0;
    this.closed=false; this.program=null;
    this.lost=()=>this.reset();
    gl.canvas.addEventListener("webglcontextlost",this.lost);
  }
  // Explicitly opt in only after UV orientation and actual bakes are verified.
  async attach(program) {
    if(this.closed || this.gl.isContextLost()) return false;
    this.reset();
    this.program=program;
    const generation=this.generation;
    const {units,reservedUnits,manifestURL,budgetBytes}=this.options;
    this.binding=createPlanetPBRBinding(this.gl,program,units,{reservedUnits});
    if(!this.binding) return false;
    const abort=new AbortController();
    this.pending=abort;
    try {
      const pool=await PlanetPBR.open(this.gl,manifestURL,{budgetBytes,signal:abort.signal});
      if(this.closed || generation!==this.generation || this.gl.isContextLost()){
        pool.dispose(); return false;
      }
      this.pool=pool;
      if(this.preset) await this.select(this.preset);
      return generation===this.generation && !this.closed;
    } catch(error) {
      if(!abort.signal.aborted) this.onError(error);
      return false;
    } finally { if(this.pending===abort) this.pending=null; }
  }
  async select(preset) {
    this.preset=typeof preset==="string"?preset:null;
    const request=Symbol();
    this.selection=request;
    const pool=this.pool;
    if(this.lease){this.lease.release();this.lease=null;}
    this.onInvalidate();
    if(!pool || !this.preset || this.closed) return false;
    try {
      const lease=await pool.acquire(this.preset,{includeAlbedo:false});
      if(this.closed || this.pool!==pool || this.selection!==request){
        lease?.release(); return false;
      }
      this.lease=lease;
      this.onInvalidate();
      return !!lease;
    } catch(error) {
      if(this.selection===request && !this.closed) this.onError(error);
      return false;
    }
  }
  setStrength(value) {
    this.strength=Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;
    this.onInvalidate();
  }
  // Renderer must bind its program before calling; original draw stays synchronous.
  draw(originalDraw,{longitude=0.5,normalY=1}={}) {
    if(this.closed || !this.binding || this.gl.isContextLost()) return originalDraw();
    return this.binding.draw(this.lease,originalDraw,{strength:this.strength,longitude,normalY});
  }
  reset() {
    this.generation++; this.selection=null;
    this.pending?.abort(); this.pending=null;
    this.lease?.release(); this.lease=null;
    this.pool?.dispose(); this.pool=null;
    this.binding?.dispose(); this.binding=null;
    this.program=null;
  }
  // After context restoration the renderer supplies its newly linked program to attach().
  dispose() {
    if(this.closed) return;
    this.closed=true;
    this.gl.canvas.removeEventListener("webglcontextlost",this.lost);
    this.reset();
  }
}

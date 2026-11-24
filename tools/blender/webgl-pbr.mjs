// Optional WebGL asset pool. Does not own the renderer, audio or Figma assets.
// Usage: const pool = await PlanetPBR.open(gl, manifestURL);
// const lease = await pool.acquire("ocean", { includeAlbedo: false });
// if (lease) { bind lease.maps.normal / roughness; lease.release() when done; }
// null means retain existing artistic material. Recreate pool after context restore.
export class PlanetPBR {
  static async open(gl, url, options = {}) {
    const base = new URL(url, document.baseURI);
    if (base.origin !== location.origin) throw new Error("Same-origin assets required");
    const response = await fetch(base, {signal: options.signal});
    if (!response.ok) throw new Error("PBR manifest unavailable");
    return new PlanetPBR(gl, base, await response.json(), options);
  }
  constructor(gl, base, manifest, {budgetBytes = 16 * 1024 * 1024} = {}) {
    const {width:w,height:h} = manifest;
    if (manifest.version !== 1 || ![256,512,1024,2048].includes(w) ||
        h !== w/2 || !manifest.presets || manifest.normalConvention !== "+X +Y +Z tangent")
      throw new Error("Unsupported PBR manifest");
    this.gl = gl; this.base = base; this.manifest = manifest;
    this.budget = Math.max(0, budgetBytes); this.used = 0;
    this.entries = new Map(); this.closed = false;
    this.controller = new AbortController();
    this.onLost = () => this.dispose();
    gl.canvas.addEventListener("webglcontextlost", this.onLost);
  }
  evict(required) {
    for (const [key,e] of this.entries) {
      if (this.used + required <= this.budget) break;
      if (!e.refs && e.ready) this.remove(key,e);
    }
    return this.used + required <= this.budget;
  }
  remove(key,e) {
    if (this.entries.get(key) !== e) return;
    this.entries.delete(key); this.used -= e.bytes;
    for (const texture of Object.values(e.maps)) this.gl.deleteTexture(texture);
  }
  async acquire(preset, {includeAlbedo = false} = {}) {
    if (this.closed || this.gl.isContextLost()) return null;
    const files = Object.hasOwn(this.manifest.presets,preset) && this.manifest.presets[preset];
    if (!files) return null;
    const kinds = includeAlbedo ? ["albedo","normal","roughness"] : ["normal","roughness"];
    const key = preset + ":" + includeAlbedo;
    let e = this.entries.get(key);
    if (!e) {
      const {width:w,height:h} = this.manifest;
      if (w > this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE)) return null;
      const bytes = Math.ceil(w*h*4*4/3)*kinds.length;
      if (!this.evict(bytes)) return null;
      e = {refs:0,bytes,maps:{},ready:false};
      this.entries.set(key,e); this.used += bytes;
      e.promise = (async () => {
        try {
          for (const kind of kinds) {
            const file = files[kind];
            if (typeof file !== "string" || !/^[a-z0-9-]+\.png$/i.test(file)) throw new Error("Invalid asset");
            const response = await fetch(new URL(file,this.base), {signal:this.controller.signal});
            if (!response.ok) throw new Error("Missing asset");
            const bitmap = await createImageBitmap(await response.blob(), {colorSpaceConversion:"none",premultiplyAlpha:"none",imageOrientation:"flipY"});
            try {
              if (this.closed || bitmap.width !== w || bitmap.height !== h) throw new Error("Invalid image");
              e.maps[kind] = this.upload(bitmap,kind);
            } finally { bitmap.close(); }
          }
          e.ready = true;
          return true;
        } catch (_) { this.remove(key,e); return false; }
      })();
    }
    e.refs++;
    if (!await e.promise || this.closed) { e.refs--; return null; }
    // Refresh LRU order; leases pin textures until explicitly released.
    this.entries.delete(key); this.entries.set(key,e);
    let released = false;
    return {maps:Object.freeze({...e.maps}), albedoEncoding:"srgb-manual",
      normalConvention:this.manifest.normalConvention,
      release:() => { if (!released) { released=true; e.refs--; } }};
  }
  upload(bitmap,kind) {
    const gl=this.gl;
    const previous=gl.getParameter(gl.TEXTURE_BINDING_2D);
    const flip=gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL);
    const texture=gl.createTexture();
    if (!texture) throw new Error("GPU allocation failed");
    try {
      gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
      // RGBA bytes retained; shader must decode albedo sRGB, not data maps.
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,bitmap);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.generateMipmap(gl.TEXTURE_2D);
      return texture;
    } catch (error) { gl.deleteTexture(texture); throw error; }
    finally { gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,flip); gl.bindTexture(gl.TEXTURE_2D,previous); }
  }
  dispose() {
    if (this.closed) return;
    this.closed=true; this.controller.abort();
    this.gl.canvas.removeEventListener("webglcontextlost",this.onLost);
    for (const [key,e] of this.entries) this.remove(key,e);
  }
}

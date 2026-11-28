// V10 « plein potentiel » : helpers purs, sans DOM, sans RAF, sans moteur audio.
// Chaque levier a son drapeau (?v10pal=0, ?v10pbr=0, ?v10aud=0, ?v10city=0, ?v10lod=0) ; tous actifs seulement sous ?world10=1.
export const FP_VERSION=1;
export const FP_FLAGS=Object.freeze(['pal','pbr','aud','city','lod','smooth','win','flow']);
// Leviers encore en ébauche : éteints même sous ?world10=1, à allumer un par un (?v10act=1).
export const FP_OPT_IN=Object.freeze(['act']);
export function fpFlags(search=''){
 const q=new URLSearchParams(search||'');
 return Object.freeze(Object.fromEntries([...FP_FLAGS.map(k=>[k,q.get('v10'+k)!=='0']),...FP_OPT_IN.map(k=>[k,q.get('v10'+k)==='1'])]));
}
// Paliers : l'appli en a 3 (0..2), V10 en a 4 (0..3). Mobile 2 -> 2 (16 Mio), ordinateur 2 -> 3 (24 Mio). (Dot Design §0)
export function v10Tier(appTier,mobile){const t=Math.max(0,Math.min(2,Math.trunc(Number(appTier))||0));return t===2&&!mobile?3:t;}
export const TIER_BUDGET_MIB=Object.freeze([4,8,16,24]);
export const TIER_CACHE_WORLDS=Object.freeze([0,2,2,4]);
export const TIER_PBR_SIZE=Object.freeze([0,256,512,512]);
export const TIER_TARGET_FPS=Object.freeze([30,60,60,60]);
// Cible hors écran (RGBA8 + profondeur 16 bits = 6 octets/px) : 512 / 640 / 1024 / 1024.
export const TIER_TARGET_CAP=Object.freeze([512,640,1024,1024]);
export function targetCapForTier(t){return TIER_TARGET_CAP[tierOf(t)];}
// Netteté (V10fp) : cuisson 256 px/face lissée dès le palier 2 (?v10smooth=0 : retour à 128 au plus proche) ;
// cible hors écran limitée à la partie visible de la planète, avec un budget de pixels égal à l'ancien carré (?v10win=0 : ancien carré).
export const TIER_BAKE=Object.freeze([128,128,256,256]);
export function bakeForTier(t){return TIER_BAKE[tierOf(t)];}
export function targetPixelsForTier(t){const c=TIER_TARGET_CAP[tierOf(t)];return c*c;}
// Fenêtre visible : intersection du carré de la planète (px écran) et de l'écran, puis échelle pour tenir dans le budget de pixels.
export function visibleWindow(body,width,height,maxPixels){
 if(![body?.x,body?.y,body?.r,width,height,maxPixels].every(Number.isFinite)||body.r<=0||width<=0||height<=0||maxPixels<1024)return null;
 const R=body.r/.92,x0=Math.max(0,body.x-R),x1=Math.min(width,body.x+R),y0=Math.max(0,body.y-R),y1=Math.min(height,body.y+R);
 if(x1-x0<2||y1-y0<2)return null;
 const k=Math.min(1,Math.sqrt(maxPixels/((x1-x0)*(y1-y0))));
 // Fenêtre en coordonnées locales de la planète (-1..1 sur le carré), y vers le haut.
 const local=[(x0-body.x)/R,(body.y-y1)/R,(x1-body.x)/R,(body.y-y0)/R];
 return {px:[x0,y0,x1,y1],local,w:Math.max(16,Math.ceil((x1-x0)*k)),h:Math.max(16,Math.ceil((y1-y0)*k)),scale:k};
}
const tierOf=t=>Math.max(0,Math.min(3,Math.trunc(Number(t))||0));
export function cacheWorldsForTier(t){return TIER_CACHE_WORLDS[tierOf(t)];}
export function pbrSizeForTier(t){return TIER_PBR_SIZE[tierOf(t)];}
export function budgetBytes(t){return TIER_BUDGET_MIB[tierOf(t)]*1048576;}
export function targetFpsForTier(t,lowPower=false){return lowPower?30:TIER_TARGET_FPS[tierOf(t)];}
// Estimation mémoire GPU (RGBA8, mipmaps +1/3), en octets ; le compteur JS remplace tout getParameter/getError par image.
export function estimateWorldBytes({bake=128,detail=512,height=512,pbr=0,cities=0}={}){
 const mip=n=>Math.ceil(n*4/3);
 return mip(2*6*bake*bake*4)+(detail?mip(detail*detail*4):0)+(height?mip(height*height*4):0)+(pbr?mip(2*pbr*(pbr/2)*4):0)+cities;
}
export function budgetTable(){
 return [0,1,2,3].map(t=>{const pbr=pbrSizeForTier(t),detail=t===0?256:512,cap=targetCapForTier(t);
  const world=estimateWorldBytes({bake:bakeForTier(t),detail,height:t===0?0:detail,pbr,cities:t>=1?262144:0}),target=cap*cap*6,gpu=world+target,cpu=cacheWorldsForTier(t)*2*6*bakeForTier(t)**2*4;
  const m=x=>+(x/1048576).toFixed(2);
  return {tier:t,budgetMiB:TIER_BUDGET_MIB[t],worldMiB:m(world),targetMiB:m(target),gpuMiB:m(gpu),cpuCacheMiB:m(cpu),fits:gpu<=budgetBytes(t)};});
}
// LOD selon la taille à l'écran (px CSS du diamètre) : 0 = V9, 1 = lumières de villes seules, 2 = bâtiments.
// Hystérésis de 15 % à chaque seuil ; jamais de changement pendant un geste. (Dot Design §2)
export const LOD_THRESHOLDS=Object.freeze([64,256]);
// Préchargement avant le seuil bâtiments (256 px) ; le hôte V10 se prépare dès ~45 px (avant le passage à LOD 1).
export const LOD_PREPARE=180,LOD_WARM=45,CITY_FADE_SEC=.3;
export function shouldWarmHost(diameter){return Number.isFinite(diameter)&&diameter>=LOD_WARM;}
export function shouldPrepareLiving(lod,diameter,flow=true){if(!flow)return lod===2;return lod>=1||(Number.isFinite(diameter)&&diameter>=LOD_PREPARE);}
// Taille du tampon hors écran : pas de réallocation pendant un geste (sauf croissance avec marge), marge hors geste pour éviter un realloc à chaque cran de zoom.
export function targetAlloc(needW,needH,allocW,allocH,{gesture=false,flow=true}={}){
 const pad=n=>Math.max(16,Math.ceil(Math.max(0,n)/64)*64),fit=needW<=allocW&&needH<=allocH;
 if(!flow){if(fit&&needW*needH*2>=allocW*allocH)return [allocW,allocH];return [pad(needW),pad(needH)];}
 if(gesture&&allocW&&allocH){if(fit)return [allocW,allocH];return [pad(Math.max(allocW,needW*1.25)),pad(Math.max(allocH,needH*1.25))];}
 if(fit&&needW*needH*2>=allocW*allocH)return [allocW,allocH];
 return [pad(needW+32),pad(needH+32)];
}
export function lodLevel(prev,diameter,gesture=false){
 const p=prev===0||prev===1||prev===2?prev:null;
 if(!Number.isFinite(diameter))return p??0;
 if(gesture&&p!==null)return p;
 const [a,b]=LOD_THRESHOLDS;
 if(p===null)return diameter<a?0:diameter<b?1:2;
 let l=p;
 if(l===0&&diameter>a*1.15)l=1;
 if(l===1&&diameter>b*1.15)l=2;
 if(l===2&&diameter<b*.85)l=1;
 if(l===1&&diameter<a*.85)l=0;
 return l;
}
// Paquet audio : tiré des niveaux déjà calculés par l'hôte (spectre hors ligne, carte des grosses caisses, 4 bandes).
// Aucun createMediaElementSource, aucun AnalyserNode. (Dot Son & Com §3, §5)
export const AUDIO_MAX_FLASH_HZ=3;
// Réactivité à 3 crans (Dot Son & Com, mise à jour) : off / doux / plein. Défaut plein dans Safari, doux dans les navigateurs intégrés.
// Le curseur ira dans les réglages à côté de « réduire les animations » (Dot Design) : pas encore d'interface, valeur interne en attendant.
export const REACTIVITY=Object.freeze({off:0,soft:.5,full:1});
export function defaultReactivity(inApp=false){return inApp?'soft':'full';}
const unit=x=>Number.isFinite(x)?Math.max(0,Math.min(1,x)):0;
export const AUDIO_LIGHT_CAP=.2;   // « réduire les animations » : aucune pulsation de kick, lumière plafonnée à +20 %
export function audioPacket(input,state={},dt=0,{reducedMotion=false,reactivity='full'}={}){
 const s={bass:0,mid:0,high:0,level:0,kick:0,kickAge:9,lastFlash:-9,clock:0,cap:1,...state};
 const d=Math.max(0,Math.min(.25,Number.isFinite(dt)?dt:0));s.clock+=d;
 const src=typeof input==='number'?{level:input,live:input>0?1:0}:(input||{});
 const live=src.live===undefined?1:(src.live?1:0);
 const k=(typeof reactivity==='number'?unit(reactivity):(REACTIVITY[reactivity]??1))*live;
 s.cap=reducedMotion?AUDIO_LIGHT_CAP:1;
 const rest=Math.exp(-d/.12);   // au repos (pause, silence) : retour à zéro en moins de 0,5 s
 for(const key of ['bass','mid','high','level']){const target=unit(src[key])*k;s[key]=live?target:s[key]*rest;}
 // Grosse caisse : au plus 3 flashs par seconde (WCAG 2.3.1) ; aucune en « réduire les animations ».
 const age=Number.isFinite(src.kickAge)?Math.max(0,src.kickAge):9;
 const fresh=live&&k>0&&!reducedMotion&&age<.05&&unit(src.kick)>0&&s.clock-s.lastFlash>=1/AUDIO_MAX_FLASH_HZ;
 if(fresh){s.lastFlash=s.clock;s.kickAge=0;s.kick=unit(src.kick)*k;}
 else{s.kickAge=Math.min(9,s.kickAge+d);s.kick=reducedMotion?0:live?s.kick*Math.exp(-d*6):s.kick*rest;}
 return s;
}
// Gain de lumière des villes : la nuit seulement, basses + kick, +20 % au plus.
export function cityLightGain(s,night=1){return 1+Math.min(s?.cap??1,AUDIO_LIGHT_CAP,.12*unit(s?.bass)+.08*unit(s?.kick))*unit(night);}
// Particules (décision Dot Design) : aucune au palier 0, 128 sans réaction au son au palier 1, réactives dès le palier 2.
export function particleBudget(tier){const t=tierOf(tier);return {count:[0,128,256,512][t],audio:t>=2};}
// Croissance des villes : monte seulement pendant que le titre de la planète joue, pendant la session ; jamais de baisse, aucun compteur.
export function cityGrowth(prev,{floor=0,playing=false,dt=0,reducedMotion=false,rate=1/120}={}){
 const base=unit(floor),p=Math.max(unit(prev),base);
 if(reducedMotion)return playing?1:p;
 return playing?Math.min(1,p+Math.max(0,Math.min(.25,dt||0))*rate):p;
}
// Fondu d'apparition des bâtiments (400 ms) au franchissement du seuil.
export function fadeStep(prev,on,dt,seconds=CITY_FADE_SEC){const v=unit(prev)+(on?1:-1)*Math.max(0,dt||0)/seconds;return unit(v);}
// Couleurs de l'album (c1, c2 en HSL 0..1, format des sauvegardes) -> RGB linéaire.
export function hslToLinear(c){
 if(!Array.isArray(c)||c.length<3||!c.every(Number.isFinite))return null;
 const h=((c[0]%1)+1)%1,s=unit(c[1]),l=unit(c[2]);
 const f=n=>{const k=(n+h*12)%12,a=s*Math.min(l,1-l);return l-a*Math.max(-1,Math.min(k-3,9-k,1));};
 return [f(0),f(8),f(4)].map(v=>Math.pow(unit(v),2.2));
}
export function planetPalette(planet){const a=hslToLinear(planet?.c1),b=hslToLinear(planet?.c2);return a&&b?[a,b]:null;}
// PBR 512×256 (Blender, UV sphère) par type de sauvegarde (Dot Visuels §1) : albédo + normale, rugosité en uniforme (aplats).
// Tellurique 0 = désert, Rocheuse 10 = basalte (types fusionnés en V10 : on choisit par type d'origine).
export const PBR_PRESETS=Object.freeze({0:'desert',1:'ocean',2:'gas',3:'ice',4:'basalt',6:null,9:null,10:'basalt',11:'ocean'});
export const PBR_ROUGHNESS=Object.freeze({basalt:.82,desert:.86,gas:.68,ice:.48,ocean:.32});
export function pbrPreset(legacyType){return Object.hasOwn(PBR_PRESETS,legacyType)?PBR_PRESETS[legacyType]:null;}

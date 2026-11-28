// V10 « plein potentiel » : helpers purs, sans DOM, sans RAF, sans moteur audio.
// Les leviers stables s'éteignent avec ?v10<levier>=0. PBR et interactions restent opt-in (?v10pbr=1, ?v10act=1).
export const FP_VERSION=1;
export const FP_FLAGS=Object.freeze(['pal','aud','city','lod','smooth','win','flow','part']);
// Leviers expérimentaux éteints même sous ?world10=1.
export const FP_OPT_IN=Object.freeze(['act','pbr']);
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
// Périodes d'accumulation : multiples exacts des pulsations du shader, donc le repli à zéro ne produit aucun saut.
export const WAVE_PERIOD=20*Math.PI;          // vagues : cos(k·phase) avec k = 0,9 / 1,3 / 1,7
export const STORM_PERIOD=2*Math.PI/.55;      // cyclones : cos(… − phase·0,55)
const AUDIO_OPTS=Object.freeze({reducedMotion:false,reactivity:'full'});
// Le paquet est MIS À JOUR SUR PLACE (aucune allocation par image) et renvoyé. Il contient aussi les 8 flottants des 2 uniformes vec4 :
//   u[0..3] = (bass, mid, high, level) lissés (attaque 40 ms, retombée 220 ms) ; u[4..7] = (kick, phase des vagues, phase des cyclones, plafond de lumière).
// kick = enveloppe exp(−6·timeSinceKick) déjà limitée à 3 flashs/s ; les phases sont accumulées (jamais temps × vitesse).
export function audioPacket(input,state={},dt=0,opts=AUDIO_OPTS){
 const reducedMotion=!!opts?.reducedMotion,reactivity=opts?.reactivity??'full';
 const s=state;
 if(!(s.clock>=0)){s.bass=s.mid=s.high=s.level=s.kick=0;s.kickAge=9;s.lastFlash=-9;s.clock=0;s.cap=1;s.sb=s.sm=s.sh=s.sl=0;s.wave=s.storm=0;s.burstAge=9;s.burstSeed=0;s.u=new Float32Array(8);}
 const d=Math.max(0,Math.min(.25,Number.isFinite(dt)?dt:0));s.clock+=d;
 const num=typeof input==='number';
 const src=num?null:(input||EMPTY);
 const live=num?(input>0?1:0):(src.live===undefined?1:(src.live?1:0));
 const k=(typeof reactivity==='number'?unit(reactivity):(REACTIVITY[reactivity]??1))*live;
 s.cap=reducedMotion?AUDIO_LIGHT_CAP:1;
 const rest=Math.exp(-d/.12);   // au repos (pause, silence) : retour à zéro en moins de 0,5 s
 s.bass=live?unit(num?0:src.bass)*k:s.bass*rest;s.mid=live?unit(num?0:src.mid)*k:s.mid*rest;s.high=live?unit(num?0:src.high)*k:s.high*rest;s.level=live?unit(num?input:src.level)*k:s.level*rest;
 // Grosse caisse : au plus 3 flashs par seconde (WCAG 2.3.1) ; aucune en « réduire les animations ».
 const age=!num&&Number.isFinite(src.kickAge)?Math.max(0,src.kickAge):9;
 const fresh=live&&k>0&&!reducedMotion&&age<.05&&!num&&unit(src.kick)>0&&s.clock-s.lastFlash>=1/AUDIO_MAX_FLASH_HZ;
 if(fresh){s.lastFlash=s.clock;s.kickAge=0;s.kick=unit(src.kick)*k;if(s.kick>.6){s.burstAge=0;s.burstSeed=(s.burstSeed+1)%1024;}}
 else{s.kickAge=Math.min(9,s.kickAge+d);s.kick=reducedMotion?0:live?s.kick*Math.exp(-d*6):s.kick*rest;}
 if(!fresh)s.burstAge=Math.min(9,s.burstAge+d);
 if(reducedMotion)s.burstAge=9;
 // Lissage visuel (naturel, pas de clignotement) puis phases accumulées : plus ou moins vite, jamais d'à-coup.
 const att=1-Math.exp(-d/.04),rel=1-Math.exp(-d/.22);
 s.sb+=(s.bass-s.sb)*(s.bass>s.sb?att:rel);s.sm+=(s.mid-s.sm)*(s.mid>s.sm?att:rel);s.sh+=(s.high-s.sh)*(s.high>s.sh?att:rel);s.sl+=(s.level-s.sl)*(s.level>s.sl?att:rel);
 s.wave=(s.wave+d*(1+(reducedMotion?0:.6*s.sb)))%WAVE_PERIOD;
 s.storm=(s.storm+d*(1+(reducedMotion?0:.25*s.sb+.25*s.kick)))%STORM_PERIOD;
 const u=s.u;u[0]=s.sb;u[1]=s.sm;u[2]=s.sh;u[3]=s.sl;u[4]=s.kick;u[5]=s.wave;u[6]=s.storm;u[7]=s.cap;
 return s;
}
const EMPTY=Object.freeze({});
// Gain de lumière des villes : la nuit seulement, basses + kick, +20 % au plus.
export function cityLightGain(s,night=1){return 1+Math.min(s?.cap??1,AUDIO_LIGHT_CAP,.12*unit(s?.sb??s?.bass)+.08*unit(s?.kick))*unit(night);}
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

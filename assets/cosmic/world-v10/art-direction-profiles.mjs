const tiers=Object.freeze([{cloudShadow:0,sparks:0},{cloudShadow:1,sparks:0},{cloudShadow:1,sparks:1},{cloudShadow:1,sparks:1}]);
const profile=(density,roughness,drift,tint)=>Object.freeze({density,roughness,drift,tint,tierPolicy:tiers});
export const ART_PROFILES=Object.freeze({
  terrestre:profile(.64,.76,.20,[.24,.46,.78]), aquatique:profile(.74,.18,.27,[.16,.51,.72]),
  rocheuse:profile(.06,.91,.04,[.49,.35,.23]), volcanique:profile(.42,.87,.14,[.50,.27,.18]),
  glacee:profile(.23,.82,.10,[.36,.64,.85]), gazeuse:profile(.85,.94,.35,[.64,.52,.38]),
  spectrale_metallique:profile(.09,.31,.06,[.32,.41,.55])
});

// One pool per GL context. The legacy owner and a focused V10 planet hold independent references.
export function createSharedReliefPool() {
  const entries=new Map();
  function acquire(key,create) {
    let entry=entries.get(key);
    if(!entry){if(!create)return null;entry={asset:create(),refs:0};entries.set(key,entry);}
    entry.refs++;return entry.asset;
  }
  function release(key) {
    const entry=entries.get(key);
    if(entry && --entry.refs===0){entries.delete(key);entry.asset.dispose?.();}
  }
  function getTotalBytes(){let total=0;for(const e of entries.values())total+=e.asset.bytes;return total;}
  return {acquire,release,getTotalBytes,getStats:()=>Array.from(entries,([key,e])=>({key,refs:e.refs,bytes:e.asset.bytes})),
    onContextLost(){entries.clear();}};
}

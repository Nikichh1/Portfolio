import {clamp} from './v6-layout.mjs';

// The car and the two real app screens share one scroll clock. The second
// movement starts when the handsets themselves enter, rather than finishing
// unseen while their preceding copy is still below the fold.
export function storyTimeline({header,viewport,storyBottom,markerTop,pinHeight,installTop,installHeight}){
 const runway=Math.max(1,storyBottom-markerTop-pinHeight),exitDistance=Math.max(1,viewport*.85);
 const relativeInstall=Number.isFinite(installTop)?installTop-markerTop:runway+pinHeight;
 const installStart=Math.max(0,relativeInstall+header-viewport*.88);
 const installSpan=Math.max(1,Math.min(installHeight*.75||viewport*.72,viewport*.72));
 const total=Math.max(runway+exitDistance,installStart+installSpan);
 return {runway,exitDistance,installStart,installSpan,total,target:clamp((header-markerTop)/total)};
}

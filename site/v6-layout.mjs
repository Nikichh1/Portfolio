export const clamp=value=>Math.max(0,Math.min(1,Number(value)||0));
export const smooth=value=>{const t=clamp(value);return t*t*t*(t*(t*6-15)+10);};

// One set of physical bounds for the phone and the expanded native canvas.
// Width never follows viewport height: a short phone remains readable.
export function presentationFrame({width,height,progress=0,ready=true,reduced=false}){
 const w=Math.max(1,width),h=Math.max(1,height),mobile=w<=700;
 const phoneWidth=Math.min(w-32,w<=1000?304:w<=1400?330:390);
 const phoneHeight=Math.min(700,Math.max(160,h-32));
 const p=reduced||!ready?0:clamp(progress),expand=smooth((p-.12)/.42);
 const startX=mobile?(w-phoneWidth)/2:w-phoneWidth-w*.06,startY=Math.max(16,(h-phoneHeight)/2);
 const mix=(a,b)=>a+(b-a)*expand;
 return {x:mix(startX,0),y:mix(startY,0),width:mix(phoneWidth,w),height:mix(phoneHeight,h),radius:mix(mobile?30:34,0),padding:mix(mobile?6:7,0),expand,camera:smooth((p-.18)/.82),intro:1-smooth((p-.04)/.2),car:1-smooth((p-.07)/.2),progress:p};
}

export function surfacePalette(darkness){
 const d=clamp(darkness),light=[244,245,240],dark=[7,10,9],rgb=light.map((v,i)=>Math.round(v+(dark[i]-v)*d));
 const luminance=rgb.reduce((sum,v,i)=>{const s=v/255;return sum+(s<=.04045?s/12.92:((s+.055)/1.055)**2.4)*[.2126,.7152,.0722][i];},0);
 const ink=d<.08?'#101711':luminance>.179?'#000000':'#ffffff';
 return {surface:`rgb(${rgb.join(',')})`,ink,muted:d>.08&&d<.92?ink:d>.5?'#c2cbc1':'#4e594e',line:d>.5?'#465149':'#c4cdbf',scheme:d>.5?'dark':'light'};
}

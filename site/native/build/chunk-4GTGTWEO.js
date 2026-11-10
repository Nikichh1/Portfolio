var o=Object.freeze({onset:.72,strength:.68,falloff:3,fog:.0196078431372549}),v=(t,n)=>{if(!t||t.length!==n||!(Array.isArray(t)||ArrayBuffer.isView(t)))return!1;for(let e=0;e<n;e++)if(!Number.isFinite(t[e]))return!1;return!0};function F(t,n,e=new Float32Array(4)){if(!v(t,16)||!v(n,3)||!(e instanceof Float32Array)||e.length!==4||Math.abs(t[15])<1e-12||n[2]<=0)return null;let r=Math.hypot(t[0],t[1],t[2]),i=Math.hypot(t[4],t[5],t[6]),f=Math.hypot(t[8],t[9],t[10]);if(r<1e-8||i<1e-8||f<1e-8||![r,i,f].every(Number.isFinite))return null;let h=t[0]/r,u=t[1]/r,c=t[2]/r,x=t[4]/i,y=t[5]/i,p=t[6]/i,g=-t[8]/f,D=-t[9]/f,s=-t[10]/f;if(Math.abs((u*p-c*y)*g+(c*x-h*p)*D+(h*y-u*x)*s)<1e-8||s>=-1e-4)return null;let l=n[2]/-s;return!Number.isFinite(l)||l<=0||l>34028234663852886e22?null:(e[0]=g,e[1]=D,e[2]=s,e[3]=l,e)}function b(t,n){if(!Number.isFinite(t)||!Number.isFinite(n)||n<=0)return 0;let e=Math.max(0,t/n-o.onset);return o.strength*-Math.expm1(-o.falloff*e*e)}var d=`
  float cityDepthAmount(float viewDepth,float focusDepth){
    if(focusDepth<=0.)return 0.;
    float excess=max(0.,viewDepth/focusDepth-${o.onset});
    return ${o.strength}*(1.-exp(-${o.falloff.toFixed(1)}*excess*excess));
  }
  vec3 cityDepthShade(vec3 color,vec3 world,vec3 eye,vec4 depthView){
    float amount=cityDepthAmount(dot(world-eye,depthView.xyz),depthView.w);
    return mix(color,vec3(${o.fog}),amount);
  }
  vec3 cityDepthShade(vec3 color,vec3 world,vec3 eye,vec4 depthView,vec3 fogColor){
    float amount=cityDepthAmount(dot(world-eye,depthView.xyz),depthView.w);
    return mix(color,fogColor,amount);
  }`;export{F as a,b,d as c};

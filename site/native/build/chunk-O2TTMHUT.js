var O=Object.defineProperty;var H=(e,n)=>{for(var o in n)O(e,o,{get:n[o],enumerable:!0})};var g=Object.freeze({ambient:.82,key:.42,azimuth:225,polar:34}),G=Object.freeze([.785,.805,.829]),y=Object.freeze([{name:"ground",color:[.736,.751,.772],roughness:1.08,satinRoughness:.86,coat:.012},{name:"major-road",color:[.638,.655,.678],roughness:1.04,satinRoughness:.79,coat:.016},{name:"secondary-road",color:[.613,.632,.655],roughness:1.08,satinRoughness:.84,coat:.011},{name:"local-road",color:[.59,.609,.632],roughness:1.1,satinRoughness:.88,coat:.006},{name:"park",color:[.64,.728,.676],roughness:1.18,satinRoughness:.92,coat:.007},{name:"open-industrial",color:[.724,.74,.76],roughness:1.12,satinRoughness:.88,coat:.009},{name:"parking",color:[.65,.667,.689],roughness:1.1,satinRoughness:.84,coat:.012},{name:"water",color:[.507,.63,.704],roughness:.98,satinRoughness:.78,coat:.02},{name:"built-ground",color:[.739,.754,.775],roughness:1.08,satinRoughness:.87,coat:.012},{name:"path",color:[.621,.64,.662],roughness:1.15,satinRoughness:.91,coat:.004},{name:"facade",color:[.672,.687,.711],roughness:.94,satinRoughness:.8,coat:.014},{name:"roof",color:[.804,.82,.838],roughness:1.04,satinRoughness:.76,coat:.024}].map(e=>Object.freeze({...e,color:Object.freeze(e.color)})));function j(e=0){return Number.isFinite(e)?Math.max(0,Math.min(1,e)):0}function D(e,n,o=0){let t=y[n],r=j(o);if(!t||!e)return null;if(r===0)return e;if(r===1)return t;let a=(s,c)=>s+(c-s)*r;return{name:e.name,color:e.color.map((s,c)=>a(s,t.color[c])),roughness:a(e.roughness,t.roughness),satinRoughness:a(e.satinRoughness,t.satinRoughness),coat:a(e.coat,t.coat)}}var N=`
  uniform float themeWeight;
  vec3 sceneThemeDepthShade(vec3 color,vec3 world,vec3 eye,vec4 depthView){
    if(themeWeight<=0.)return cityDepthShade(color,world,eye,depthView);
    vec3 fogColor=mix(vec3(${5/255}),vec3(${G.join(",")}),themeWeight);
    return cityDepthShade(color,world,eye,depthView,fogColor);
  }`;var p=Object.freeze({ambient:.21,key:1.7,azimuth:225,polar:34}),P=Object.freeze([{name:"ground",color:[.102,.106,.112],roughness:1.02,satinRoughness:.82,coat:.018},{name:"major-road",color:[.088,.092,.098],roughness:.98,satinRoughness:.75,coat:.027},{name:"secondary-road",color:[.04,.043,.048],roughness:.98,satinRoughness:.82,coat:.015},{name:"local-road",color:[.009,.01,.012],roughness:.98,satinRoughness:.88,coat:.005},{name:"park",color:[.07,.103,.086],roughness:1.14,satinRoughness:.91,coat:.008},{name:"open-industrial",color:[.099,.103,.109],roughness:1.06,satinRoughness:.86,coat:.014},{name:"parking",color:[.084,.088,.094],roughness:1.04,satinRoughness:.81,coat:.02},{name:"water",color:[.04,.07,.103],roughness:.88,satinRoughness:.76,coat:.026},{name:"built-ground",color:[.103,.107,.113],roughness:1.02,satinRoughness:.84,coat:.017},{name:"path",color:[.007,.008,.01],roughness:1.08,satinRoughness:.91,coat:.004},{name:"facade",color:[.076,.08,.086],roughness:.88,satinRoughness:.79,coat:.021},{name:"roof",color:[.123,.128,.135],roughness:.96,satinRoughness:.72,coat:.042}].map(e=>Object.freeze({...e,color:Object.freeze(e.color)})));function M(e){let n=Math.max(0,Math.min(Math.PI/2,Number.isFinite(e)?e:0)),o=n*n;return[1-.5*o/(o+.33),.45*o/(o+.09)]}var i=(e,n,o)=>Math.max(n,Math.min(o,e)),f=e=>{if(!Array.isArray(e)&&!ArrayBuffer.isView(e)||e.length!==3||!Array.from(e).every(Number.isFinite))return null;let n=Math.hypot(...e);return n>1e-8?Array.from(e,o=>o/n):null},v=(e,n)=>e.reduce((o,t,r)=>o+t*n[r],0);function W(e,n,o,t,r,a=1){let s=f(e),c=f(n),h=f(o);if(!s||!c||!h||!Number.isFinite(t)||!Number.isFinite(r)||!Number.isFinite(a))return 0;let u=v(s,c),b=v(s,h);if(u<=0||b<=0)return 0;let d=f(c.map((A,F)=>A+h[F]));if(!d)return 0;let l=i(t,.58,1),T=l*l,R=T*T,x=i(v(s,d),0,1),_=i(v(h,d),0,1),S=x*x*(R-1)+1,I=R*R/(S*S),m=(l+1)*(l+1)/8,L=u/(u*(1-m)+m)*b/(b*(1-m)+m),E=(.04+.96*(1-_)**5)/.04;return i(r,0,.05)*i(I*L*E*u,0,1)*i(a,0,1)}var C=`
  float graphiteSatin(vec3 n,vec3 l,vec3 v,float roughness,float coat){
    float nl=dot(n,l),nv=dot(n,v);if(nl<=0.||nv<=0.)return 0.;
    vec3 sum=l+v;if(dot(sum,sum)<1e-8)return 0.;vec3 h=normalize(sum);
    float r=clamp(roughness,.58,1.),a=r*r,a2=a*a;
    float nh=clamp(dot(n,h),0.,1.),vh=clamp(dot(v,h),0.,1.);
    float denominator=nh*nh*(a2-1.)+1.;
    float distribution=a2*a2/(denominator*denominator),k=(r+1.)*(r+1.)/8.;
    float visibility=nl/(nl*(1.-k)+k)*nv/(nv*(1.-k)+k);
    float fresnel=(.04+.96*pow(1.-vh,5.))/.04;
    return clamp(coat,0.,.05)*clamp(distribution*visibility*fresnel*nl,0.,1.);
  }`,z=`
  float graphiteDiffuse(vec3 n,vec3 l,vec3 v,vec2 ab){
    float nl=max(0.,dot(n,l)),nv=max(0.,dot(n,v));
    float angular=max(0.,dot(l,v)-nl*nv)/max(max(nl,nv),1e-4);
    return nl*(ab.x+ab.y*angular);
  }
  vec3 graphiteShade(vec3 base,vec3 n,vec3 l,vec3 v,vec2 ab){
    return base*(${p.ambient}+${p.key}*graphiteDiffuse(n,l,v,ab));
  }`,V=`${z}
  vec2 sceneThemeDiffuseAB(float roughness){
    float sigma=clamp(roughness,0.,1.57079632679),variance=sigma*sigma;
    return vec2(1.-.5*variance/(variance+.33),.45*variance/(variance+.09));
  }
  float sceneThemeAmbient(){return mix(${p.ambient},${g.ambient},themeWeight);}
  float sceneThemeKey(){return mix(${p.key},${g.key},themeWeight);}
  vec3 sceneThemeShade(vec3 base,vec3 n,vec3 l,vec3 v,vec2 ab){
    if(themeWeight<=0.)return graphiteShade(base,n,l,v,ab);
    return base*(sceneThemeAmbient()+sceneThemeKey()*graphiteDiffuse(n,l,v,ab));
  }`;export{H as a,g as b,G as c,y as d,j as e,D as f,N as g,p as h,P as i,M as j,W as k,C as l,V as m};

export function sphereGeometry(segments=64,rings=32){
 if(!Number.isInteger(segments)||!Number.isInteger(rings)||segments<8||rings<4||segments>128||rings>64)throw new RangeError('Invalid sphere detail');
 const positions=new Float32Array((segments+1)*(rings+1)*3),indices=[];
 let k=0;
 for(let y=0;y<=rings;y++){const theta=Math.PI*y/rings;for(let x=0;x<=segments;x++){const phi=2*Math.PI*x/segments;positions[k++]=Math.sin(theta)*Math.cos(phi);positions[k++]=Math.cos(theta);positions[k++]=Math.sin(theta)*Math.sin(phi);}}
 for(let y=0;y<rings;y++)for(let x=0;x<segments;x++){const a=y*(segments+1)+x,b=a+segments+1;if(y>0)indices.push(a,a+1,b);if(y<rings-1)indices.push(a+1,b+1,b);}
 return {positions,indices:new Uint16Array(indices)};
}
export function uploadSphere(gl,segments=64,rings=32){
 const {positions,indices}=sphereGeometry(segments,rings),oldA=gl.getParameter(gl.ARRAY_BUFFER_BINDING),oldE=gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING);
 const vertex=gl.createBuffer(),index=gl.createBuffer();
 try{if(!vertex||!index)throw new Error('Sphere allocation failed');gl.bindBuffer(gl.ARRAY_BUFFER,vertex);gl.bufferData(gl.ARRAY_BUFFER,positions,gl.STATIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,index);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);}
 catch(e){if(vertex)gl.deleteBuffer(vertex);if(index)gl.deleteBuffer(index);throw e;}
 finally{gl.bindBuffer(gl.ARRAY_BUFFER,oldA);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,oldE);}
 let disposed=false;return {vertex,index,count:indices.length,triangles:indices.length/3,dispose(){if(!disposed){disposed=true;gl.deleteBuffer(vertex);gl.deleteBuffer(index);}}};
}
export const SPHERE_LODS=Object.freeze([[24,12],[48,24],[64,32],[128,64]].map(Object.freeze));

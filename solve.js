export function run(input) {
 const t=String(input.text), header=input.header===true, rows=[], errors=[];
 let columns=null,width=-1,p=t.charCodeAt(0)===65279?1:0,line=1,rl=1,rr=null;
 const err=code=>errors.push({code,line:rl,row:rr});
 function unquoted(prefix='') {
  let start=p,v=prefix,added=0,end=0;
  while(p<t.length){const c=t.charCodeAt(p);if(c===44||c===10||c===13){v+=t.slice(start,p);added+=p-start;if(c===13&&t.charCodeAt(p+1)!==10){err('stray_cr');start=++p;continue;}p+=c===13?2:1;if(c!==44)line++;end=c===44?1:2;return {v,end,added};}p++;}
  v+=t.slice(start,p);added+=p-start;return {v,end,added};
 }
 function quoted(){const open=p,ol=line;let start=++p,v='';
  for(;;){let q=t.indexOf('"',p);if(q<0){p=open+1;line=ol;err('unterminated_quote');return unquoted('"');}
   v+=t.slice(start,q);if(t.charCodeAt(q+1)===34){v+='"';p=q+2;start=p;continue;}p=q+1;break;
  }
  if(v.indexOf('\r')>=0)v=v.replace(/\r\n?/g,'\n');
  for(let i=v.indexOf('\n');i>=0;i=v.indexOf('\n',i+1))line++;
  const f=unquoted(v);if(f.added)err('quote_junk');return f;
 }
 while(p<t.length){while(t[p]==='\n'||(t[p]==='\r'&&t[p+1]==='\n')){p+=t[p]==='\r'?2:1;line++;}if(p>=t.length)break;
 rl=line;rr=header&&columns===null?null:rows.length;
 let fields,wasQuoted=false;
 let lf=t.indexOf('\n',p),end=lf<0?t.length:lf,stop=end;if(lf>=0&&t.charCodeAt(stop-1)===13)stop--;
 const segment=t.slice(p,stop);
 if(segment.indexOf('"')<0&&segment.indexOf('\r')<0){fields=segment.split(',');p=lf<0?t.length:lf+1;if(lf>=0)line++;}
 else {fields=[];let f;do{wasQuoted=t[p]==='"';f=wasQuoted?quoted():unquoted();fields.push(f.v);}while(f.end===1);}
 if(fields.length===1&&fields[0]===''&&!wasQuoted)continue;
 if(width<0)width=fields.length;
 if(header&&columns===null){columns=fields;continue;}
 if(fields.length<width){errors.push({code:'short_row',line:rl,row:rr,fields:fields.length});while(fields.length<width)fields.push('');}
 else if(fields.length>width)errors.push({code:'long_row',line:rl,row:rr,extra:fields.splice(width)});
 rows.push(fields);
 }
 return {columns:header?(columns??[]):null,rows,errors};
}

// Fast drop-in for csv-reader 1.0.0: inlined-field indexOf scanner, exact answers.
// Single-pass parser: plain-line fast path (manual indexOf(',') field loop),
// inlined quoted/unquoted field scanning with indexOf jumps, slow paths only
// for stray CR / quote junk / unterminated quotes. Semantics byte-identical
// to csv-reader 1.0.0 (BOM, stray_cr, quote_junk, unterminated_quote,
// short/long_row, header). Pure: no state kept between calls.
export function run(input) {
 const t=String(input.text), header=input.header===true, rows=[], errors=[];
 let columns=null,width=-1,p=t.charCodeAt(0)===65279?1:0,line=1,rl=1,rr=null;
 const err=code=>errors.push({code,line:rl,row:rr});
 while(p<t.length){
  for(;;){const c=t.charCodeAt(p);if(c===10){p++;line++;}else if(c===13&&t.charCodeAt(p+1)===10){p+=2;line++;}else break;}
  if(p>=t.length)break;
  rl=line;rr=header&&columns===null?null:rows.length;
  let fields,wasQuoted=false;
  let lf=t.indexOf('\n',p),end=lf<0?t.length:lf,stop=end;if(lf>=0&&t.charCodeAt(stop-1)===13)stop--;
  const segment=t.slice(p,stop);
  if(segment.indexOf('"')<0&&segment.indexOf('\r')<0){
   fields=[];let s=p;
   for(;;){const c=t.indexOf(',',s);if(c<0||c>=stop){fields.push(t.slice(s,stop));break;}fields.push(t.slice(s,c));s=c+1;}
   p=lf<0?t.length:lf+1;if(lf>=0)line++;
  }
  else{
   fields=[];
   for(;;){
    let v='',fend=0,fadded=0;
    wasQuoted=t.charCodeAt(p)===34;
    if(wasQuoted){
     const open=p,ol=line;let start=++p;let closed=false;
     for(;;){
      const q=t.indexOf('"',p);
      if(q<0){p=open+1;line=ol;err('unterminated_quote');v='"';start=p;closed=false;break;}
      v+=t.slice(start,q);
      if(t.charCodeAt(q+1)===34){v+='"';p=q+2;start=p;continue;}
      p=q+1;closed=true;break;
     }
     if(closed){
      if(v.indexOf('\r')>=0)v=v.replace(/\r\n?/g,'\n');
      for(let i=v.indexOf('\n');i>=0;i=v.indexOf('\n',i+1))line++;
      if(p>=t.length){fend=0;}
      else{
       const c=t.charCodeAt(p);
       if(c===44){p++;fend=1;}
       else if(c===10){p++;line++;fend=2;}
       else if(c===13&&t.charCodeAt(p+1)===10){p+=2;line++;fend=2;}
       else{
        let s=p;fadded=0;
        for(;;){
         const ch=t.charCodeAt(p);
         if(p>=t.length){v+=t.slice(s,p);fadded+=p-s;fend=0;break;}
         if(ch===44||ch===10||ch===13){
          v+=t.slice(s,p);fadded+=p-s;
          if(ch===13&&t.charCodeAt(p+1)!==10){err('stray_cr');p++;s=p;continue;}
          p+=ch===13?2:1;if(ch!==44)line++;fend=ch===44?1:2;break;
         }
         p++;
        }
        if(fadded)err('quote_junk');
       }
      }
     } else {
      let s=p;
      for(;;){
       const ch=t.charCodeAt(p);
       if(p>=t.length){v+=t.slice(s,p);fend=0;break;}
       if(ch===44||ch===10||ch===13){
        v+=t.slice(s,p);
        if(ch===13&&t.charCodeAt(p+1)!==10){err('stray_cr');p++;s=p;continue;}
        p+=ch===13?2:1;if(ch!==44)line++;fend=ch===44?1:2;break;
       }
       p++;
      }
     }
    } else {
     let s=p;
     for(;;){
      const ch=t.charCodeAt(p);
      if(p>=t.length){v+=t.slice(s,p);fend=0;break;}
      if(ch===44||ch===10||ch===13){
       v+=t.slice(s,p);
       if(ch===13&&t.charCodeAt(p+1)!==10){err('stray_cr');p++;s=p;continue;}
       p+=ch===13?2:1;if(ch!==44)line++;fend=ch===44?1:2;break;
      }
      p++;
     }
    }
    fields.push(v);
    if(fend!==1)break;
   }
  }
  if(fields.length===1&&fields[0]===''&&!wasQuoted)continue;
  if(width<0)width=fields.length;
  if(header&&columns===null){columns=fields;continue;}
  if(fields.length<width){errors.push({code:'short_row',line:rl,row:rr,fields:fields.length});while(fields.length<width)fields.push('');}
  else if(fields.length>width)errors.push({code:'long_row',line:rl,row:rr,extra:fields.splice(width)});
  rows.push(fields);
 }
 return {columns:header?(columns??[]):null,rows,errors};
}

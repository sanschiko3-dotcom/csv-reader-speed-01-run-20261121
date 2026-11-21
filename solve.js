// Fast drop-in for csv-reader 1.0.0: v3b — per-line CR flag + single-line quoted fast path.
// Single-pass parser: plain-line fast path (manual indexOf(',') field loop),
// field loop with line-end-bounded indexOf jumps for unquoted fields and a
// per-physical-line CR flag (char-by-char slow path only when the line actually
// holds a CR and the sliced field holds one), single-slice quoted fields with
// both CR/LF scans skipped when the field closes on a CR-free line before the
// line end. Slow paths only for stray CR / quote junk / unterminated quotes.
// Semantics byte-identical to csv-reader 1.0.0 (BOM, stray_cr, quote_junk,
// unterminated_quote, short/long_row, header). Pure: no state kept between calls.
export function run(input) {
 const t=String(input.text), header=input.header===true, rows=[], errors=[];
 let columns=null,width=-1,p=t.charCodeAt(0)===65279?1:0,line=1,rl=1,rr=null;
 const L=t.length;
 const err=code=>errors.push({code,line:rl,row:rr});
 while(p<L){
  for(;;){const c=t.charCodeAt(p);if(c===10){p++;line++;}else if(c===13&&t.charCodeAt(p+1)===10){p+=2;line++;}else break;}
  if(p>=L)break;
  rl=line;rr=header&&columns===null?null:rows.length;
  let fields,wasQuoted=false;
  let lf=t.indexOf('\n',p),end=lf<0?L:lf,stop=end;if(lf>=0&&t.charCodeAt(stop-1)===13)stop--;
  const segment=t.slice(p,stop);
  const hasCR=segment.indexOf('\r')>=0;
  if(segment.indexOf('"')<0&&!hasCR){
   fields=[];let s=p;
   for(;;){const c=t.indexOf(',',s);if(c<0||c>=stop){fields.push(t.slice(s,stop));break;}fields.push(t.slice(s,c));s=c+1;}
   p=lf<0?L:lf+1;if(lf>=0)line++;
  }
  else{
   fields=[];
   let le=lf<0?L:lf,lineCR=hasCR;
   for(;;){
    if(p>le){le=t.indexOf('\n',p);if(le<0)le=L;let ls=le;if(le<L&&t.charCodeAt(le-1)===13)ls=le-1;lineCR=ls>p?t.slice(p,ls).indexOf('\r')>=0:false;}
    let v,fend=0,fadded=0;
    wasQuoted=t.charCodeAt(p)===34;
    if(wasQuoted){
     const open=p,ol=line;let start=++p;let closed=false,q0=-1;v=undefined;
     for(;;){
      const q=t.indexOf('"',p);
      if(q<0){p=open+1;line=ol;err('unterminated_quote');v='"';start=p;closed=false;break;}
      if(t.charCodeAt(q+1)===34){v=v===undefined?t.slice(start,q):v+t.slice(start,q);v+='"';p=q+2;start=p;continue;}
      v=v===undefined?t.slice(start,q):v+t.slice(start,q);
      p=q+1;closed=true;q0=q;break;
     }
     if(closed){
      if(q0<le&&!lineCR){
       // Single-line quoted field on a CR-free line: no CR, no LF inside.
      } else {
       if(v.indexOf('\r')>=0)v=v.replace(/\r\n?/g,'\n');
       for(let i=v.indexOf('\n');i>=0;i=v.indexOf('\n',i+1))line++;
      }
      if(p>=L){fend=0;}
      else{
       const c=t.charCodeAt(p);
       if(c===44){p++;fend=1;}
       else if(c===10){p++;line++;fend=2;}
       else if(c===13&&t.charCodeAt(p+1)===10){p+=2;line++;fend=2;}
       else{
        let s=p;fadded=0;
        for(;;){
         const ch=t.charCodeAt(p);
         if(p>=L){v+=t.slice(s,p);fadded+=p-s;fend=0;break;}
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
       if(p>=L){v+=t.slice(s,p);fend=0;break;}
       if(ch===44||ch===10||ch===13){
        v+=t.slice(s,p);
        if(ch===13&&t.charCodeAt(p+1)!==10){err('stray_cr');p++;s=p;continue;}
        p+=ch===13?2:1;if(ch!==44)line++;fend=ch===44?1:2;break;
       }
       p++;
      }
     }
    } else {
     // Unquoted field: bounded indexOf fast path. The field ends at the first
     // comma or at the line end (le). When the line holds no CR at all, the
     // sliced field cannot hold a stray CR either; otherwise check the slice
     // (a CRLF terminator is excluded from it) and fall back to the
     // char-by-char scan only when it actually holds a CR.
     let s=p,c=t.indexOf(',',s),e,f2;
     if(c>=0&&c<le){e=c;f2=1;}
     else if(le>=L){e=L;f2=0;}
     else if(t.charCodeAt(le-1)===13){e=le-1;f2=2;}
     else{e=le;f2=2;}
     v=t.slice(s,e);
     if(lineCR&&v.indexOf('\r')>=0){
      v='';
      for(;;){
       const ch=t.charCodeAt(p);
       if(p>=L){v+=t.slice(s,p);fend=0;break;}
       if(ch===44||ch===10||ch===13){
        v+=t.slice(s,p);
        if(ch===13&&t.charCodeAt(p+1)!==10){err('stray_cr');p++;s=p;continue;}
        p+=ch===13?2:1;if(ch!==44)line++;fend=ch===44?1:2;break;
       }
       p++;
      }
     } else {
      fend=f2;
      if(f2===1)p=e+1;
      else if(f2===2){p=le+1;line++;}
      else p=L;
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

import {readFileSync,openSync,writeSync,closeSync} from 'node:fs';
import {join} from 'node:path';
import {setFlagsFromString} from 'node:v8';
setFlagsFromString('--no-incremental-marking');
const {run}=await import('./solve.js');
const cases=JSON.parse(readFileSync(join(process.env.MAKEFUN_INPUT_DIR??'/input','cases.json'),'utf8'));
const fd=openSync(join(process.env.MAKEFUN_OUTPUT_DIR??'/output','answers.json'),'w');
writeSync(fd,'[');
for(let i=0;i<cases.length;i++){if(i)writeSync(fd,',');writeSync(fd,JSON.stringify(run(cases[i].input)));}
writeSync(fd,']');
closeSync(fd);

import {readFileSync,writeFileSync} from 'node:fs';
const root=new URL('../public/studio/locales/',import.meta.url);
const entries=readFileSync(new URL('en.tsv',root),'utf8').split(/\r?\n/).filter(Boolean).map((line,index)=>{const pos=line.indexOf('\t');if(pos<1||!line.slice(pos+1))throw Error(`Invalid translation at line ${index+1}`);return[line.slice(0,pos),line.slice(pos+1)];});
const english=Object.fromEntries(entries);if(Object.keys(english).length!==entries.length)throw Error('Duplicate translation keys');
writeFileSync(new URL('en.js',root),'// Chinese source phrases remain stable; English is presentation-only.\nexport const english='+JSON.stringify(english,null,1)+';\n');
console.log(`Generated ${entries.length} English translations`);

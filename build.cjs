// 동현디 묶기: src의 HTML·CSS·JS를 index.html 한 장으로 합친다(글꼴·아이콘 내장).
const fs=require('fs'),path=require('path');
const {copyIcons}=require('./icon-files.cjs');
const root=__dirname,out=path.join(root,'dist'),src=n=>fs.readFileSync(path.join(root,'src',n),'utf8');
let css=src('style.css');
for(const name of fs.readdirSync(path.join(root,'fonts')))
  css=css.replaceAll('./fonts/'+name,'data:font/woff2;base64,'+fs.readFileSync(path.join(root,'fonts',name)).toString('base64'));
if(/\.\/fonts\//.test(css))throw new Error('묶지 못한 글꼴이 있다');
const titlePng='window.DS.TITLE_PNG="data:image/png;base64,'+fs.readFileSync(path.join(root,'src','title.png')).toString('base64')+'";';      // 출전 준비 화면 제목 손글씨
const JS=['donghyun.js','sketch.js','art.js','stages.js','game.js','render.js','input.js','sfx.js','petals.js','examples.js','app.js'];
const html=src('index.html')
  .replace('__SERIES_NAV__',()=>src('series.html'))
  .replace('__BRAND_ICON__',()=>src('brand-icon.txt').trim())
  .replace('<link rel="stylesheet" href="./style.css">',()=>`<style>${css}</style>`)
  .replace('<script src="./game.js"></script>',()=>'<script>'+JS.map(n=>n==='render.js'?titlePng+'\n'+src(n):src(n)).join('\n;\n').replaceAll('</script','<\\/script')+'</script>');
if(html.includes('src="./game.js"')||html.includes('__SERIES_NAV__')||html.includes('__BRAND_ICON__'))throw new Error('스크립트를 묶지 못했다');
fs.writeFileSync(path.join(root,'index.html'),html);
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'index.html'),html);
copyIcons(out);
fs.cpSync(path.join(root,'licenses'),path.join(out,'licenses'),{recursive:true});
console.log(JSON.stringify({bytes:Buffer.byteLength(html)}));

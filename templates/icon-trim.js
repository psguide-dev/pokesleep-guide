(()=>{
 const bounds=/* PSG_ICON_TRIM_BOUNDS */;
 const byUrl=new Map(Object.entries(bounds).map(([path,box])=>[new URL(path,document.baseURI).href,box]));
 const adopted=new Set(/* PSG_ADOPTED_UI_PATHS */.map(path=>new URL(path,document.baseURI).href));
 const ns='http://www.w3.org/2000/svg';
 function trim(img){
  const url=new URL(img.src,document.baseURI),plain=new URL(url.href);plain.search='';plain.hash='';
  if(adopted.has(plain.href)&&url.searchParams.get('art')!=='544'){url.searchParams.set('art','544');img.src=url.href;return;}
  const spec=byUrl.get(img.src);if(!spec)return;
  const svg=document.createElementNS(ns,'svg');
  for(const attr of img.attributes)if(!['src','srcset','loading','decoding'].includes(attr.name))svg.setAttribute(attr.name,attr.value);
  svg.classList.add('psg-trimmed-icon');svg.setAttribute('viewBox',spec.box.join(' '));svg.setAttribute('preserveAspectRatio','xMidYMid meet');
  svg.setAttribute('width',img.getAttribute('width')||spec.box[2]);svg.setAttribute('height',img.getAttribute('height')||spec.box[3]);
  if(img.alt){svg.setAttribute('role','img');svg.setAttribute('aria-label',img.alt)}
  const image=document.createElementNS(ns,'image');image.setAttribute('href',new URL(spec.source,document.baseURI).href);image.setAttribute('width',spec.width);image.setAttribute('height',spec.height);svg.append(image);img.replaceWith(svg);
 }
 function scan(node){if(node.nodeType!==1)return;if(node.matches('img'))trim(node);else node.querySelectorAll('img').forEach(trim)}
 new MutationObserver(records=>{for(const record of records){if(record.type==='attributes')scan(record.target);else record.addedNodes.forEach(scan)}}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
 document.addEventListener('DOMContentLoaded',()=>scan(document.documentElement),{once:true});
})();

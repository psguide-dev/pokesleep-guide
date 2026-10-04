(()=>{
const src=/* PSG_BUILD_FACE_SHEET */;
// Coordinates identify only portraits already present on the supplied six-row sheet.
const tiles={1:[3,0],2:[4,0],3:[5,0],4:[6,0],5:[7,0],6:[8,0],7:[9,0],8:[10,0],9:[11,0],
 10:[0,1],11:[1,1],12:[2,1],25:[1,0],26:[2,0],39:[9,1],40:[10,1],
 54:[3,2],55:[4,2],58:[7,2],59:[8,2],69:[9,2],70:[10,2],71:[11,2],79:[3,3],80:[4,3]};
const sheet={width:2048,height:1152,tileWidth:145,tileHeight:108,left:24,top:174,stepX:169,stepY:161};
if(src)document.documentElement.style.setProperty('--psg-face-sheet',`url("${src}")`);
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
window.PS_FACE_ART={
 has(no){return !!src&&Object.prototype.hasOwnProperty.call(tiles,Number(no))},
 usesSheet(no){return this.has(no)&&!window.PS_IMAGE_FILES.pokemonFaces?.[no]},
 html(no,alt=''){
  const tile=tiles[Number(no)];if(!src||!tile)return '';
  const x=(sheet.left+tile[0]*sheet.stepX)/(sheet.width-sheet.tileWidth)*100;
  const y=(sheet.top+tile[1]*sheet.stepY)/(sheet.height-sheet.tileHeight)*100;
  return `<span class="psg-face-sprite" role="img" aria-label="${escape(alt)}" style="--face-x:${x.toFixed(4)}%;--face-y:${y.toFixed(4)}%"></span>`;
 },
 element(no,alt=''){const wrap=document.createElement('span');wrap.innerHTML=this.html(no,alt);return wrap.firstElementChild}
};
})();

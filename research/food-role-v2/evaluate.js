function evaluateFoodPrototype(record,p,references){
 const pending=reason=>({status:'pending',reason});
 if(![60,70,80].includes(record.level))return pending('評価Lvを選んでください');
 const id=String(p.no).padStart(4,'0')+'_default',pattern=p.ingredientSlots.map(slot=>String.fromCharCode(65+slot.candidates.findIndex(c=>c.name===record.ingredients?.[slot.unlock]))).join(''),ref=references.entries[JSON.stringify([id,record.level,pattern])];
 if(!ref)return pending('この種類の基準は試作対象外です');
 const normalized={...record,ribbonHours:0,skillLevel:ref.skillLevel};
 const reasons=individualEvaluationReasons(normalized,p).filter(r=>!(record.level===80&&r==='対応範囲内のレベルを設定してください'));
 if(reasons.length)return pending(reasons.join('／'));
 if(new Set(normalized.subskills).size!==normalized.subskills.length)return pending('サブスキルを重複させず選んでください');
 const active=p.ingredientSlots.filter(s=>s.unlock<=record.level);
 if(active.some(s=>!s.candidates.some(c=>c.name===record.ingredients?.[s.unlock])))return pending('解放済み食材を選んでください');
 const snapshot=calculateIndividualTrial(normalized);if(snapshot.reasons)return pending(snapshot.reasons.join('／'));
 const foods=Object.fromEntries(snapshot.member.normalFoods),ideal=ref.ideal;
 if(!ideal)return pending('このレベルで入手できる食材を選んでください');
 const value=snapshot.values.food;
 return {status:'ready',pattern,value,ideal:ideal.value,percent:value/ideal.value*100,foods,idealFoods:ideal.foods,total:snapshot.values.food,idealRecord:ideal.record,member:snapshot.member,skillLevel:ref.skillLevel};
}

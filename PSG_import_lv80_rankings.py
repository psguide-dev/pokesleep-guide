"""Convert Enigma's Lv80 export to the bounded public ranking contract.

Usage: python3 PSG_import_lv80_rankings.py /path/to/PSN_Lv80
The original research archive remains the source; this exports UI fields only.
"""
import base64
import gzip
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def import_rankings(source):
    source = Path(source)
    manifest = json.loads((source / 'manifest.json').read_text())
    for name, digest in manifest.items():
        assert hashlib.sha256((source / name).read_bytes()).hexdigest() == digest, name
    validation = json.loads((source / 'validation.json').read_text())
    assert validation['level'] == 80 and validation['subskillSlots'] == 5
    assert validation['calculated'] == 250 and validation['totalEnergySpecies'] == 143
    skills = {p.parent.name: json.loads(p.read_text())['name'] for p in (ROOT / 'master/skills').glob('*/data.json')}
    flame = json.loads((ROOT / 'master/supplements/magical-flame.json').read_text())
    skills[flame['id']] = flame['name']
    eligible = json.loads((source / 'eligibility.json').read_text())['included']
    refs = json.loads((source / 'species_references.json').read_text())
    supported = {(r['speciesId'], r['axis']) for r in refs}
    tables = []
    mapping = {'berryEnergy': 'berry', 'totalEnergy': 'total', 'skill': 'skill', 'food': 'food'}
    for table in json.loads((source / 'rankings.json').read_text()):
        axis, group = table['axis'], table['group']
        kind = mapping[axis]
        candidates = [e for e in eligible if (e['type'] == group if kind in ('berry', 'total') else e['mainSkillId'] == group if kind == 'skill' else True)]
        metric = {'berry': 'berryEnergy', 'total': 'totalEnergy', 'skill': 'skillTriggers'}.get(kind)
        pending = []
        for e in candidates:
            if (metric and (e['speciesId'], metric) not in supported) or (not metric and not any(k[0] == e['speciesId'] for k in supported)):
                reason = '全構成の理想個体探索・ランキング照合が未完了' if e['no'] == 491 else '解放状態・選択スキルを含む個別モデルの照合待ち' if e['no'] == 151 else 'スキル効果のエナジー換算が未対応'
                pending.append({'name': e['name'], 'reason': reason})
        rows = []
        for entry in table['entries']:
            record = entry['record']
            order = entry.get('order', {}).get('slots')
            row = {k: entry[k] for k in ('rank', 'speciesId', 'name', 'pattern', 'value')}
            row.update(ingredients=[record['ingredients'][str(level)] for level in (1, 30, 60)],
                       nature=record['nature'], subskills=[order[str(level)] for level in (10, 25, 50, 70, 80)] if order else record['subskills'],
                       skillLevel=record['skillLevel'], orderedSubskills=bool(order),
                       speciesIdealPercent=entry.get('speciesIdealPercent'), patternIdealPercent=entry.get('patternIdealPercent'))
            assert 0 <= row['value'] and len(row['subskills']) in (0, 5)
            rows.append(row)
        tables.append(dict(kind=kind, group=skills[group] if kind == 'skill' else group,
                           mode=table['mode'], camp=table['camp'], unit='個／日' if kind == 'food' else '回／日' if kind == 'skill' else 'エナジー／日',
                           partial=bool(pending), pending=pending, rows=rows))
    assert len(tables) == 552
    assert len({(t['kind'], t['group'], t['mode'], t['camp']) for t in tables}) == 552
    payload = dict(schemaVersion=2, level=80, subskillSlots=5, generatedDateJST='2026-10-28',
                   tables=tables, groups={kind:list(dict.fromkeys(t['group'] for t in tables if t['kind']==kind)) for kind in mapping.values()},
                   coverage={k:validation[k] for k in ('speciesTotal','calculated','totalEnergySpecies')},
                   notes=[
                       'Lv.80・サブスキル5枠。回収4時間・活動16時間／睡眠8時間・起床げんき100・起床直後／6時間後／12時間後の3食。',
                       '好物・フィールド・EX・イベント・リボン・仲間からの支援なし。本人のおてつだいボーナスと対応済み自己回復は反映。',
                       'メインスキルは進化段階＋1と有効なスキルレベルアップで決定（上限あり）。たねは使いません。',
                       'きのみは通常収集＋いつのまに育成。食材は通常収集のみ。発動回数は効果の強さの順位ではありません。',
                       '総合はきのみ＋通常食材の素エナジー＋対応済み直接エナジー／ランダム食材の素エナジー期待値。料理倍率・鍋・大成功・仲間への支援は換算しません。',
                       '通常収集・発動回数は252種・姿中250対応。総合エナジーは143種・姿の対応範囲です。未算定を0点にはしていません。',
                       'ミュウとダークライはこの一括ランキングで保留。ダークライはナイトメア固定ですが全構成の理想探索・追加は未完了です。',
                       '理想個体の最終5枠を固定し、Lv50→25→10→70の順で育成途中の値を比較して並べます。同値の全個体間の最適順までは保証しません。手持ち個体の順番は変更しません。',
                       '各項目の理想は別の個体です。きのみ・食材・発動回数の理想値を同じ個体の出力として合算しません。',
                       '食材構成の種族理想比と構成内理想比は、同じ食材・同じ条件の理想値を分母とします。分母0は未定義です。',
                       'ムウマ系の確率は2026年10月28日のユーザー確認により確定表示へ変更。元資料の旧非表示指定は採用しません。'])
    raw = json.dumps(payload, ensure_ascii=False, separators=(',', ':')).encode()
    folder = ROOT / 'master/rankings'
    (folder / 'three-modes-lv80.json.gz.b64').write_text(base64.b64encode(gzip.compress(raw, mtime=0)).decode()+'\n')
    receipt = dict(schemaVersion=2, level=80, tableCount=552, payloadSHA256=hashlib.sha256(raw).hexdigest(),
                   sourceRankingSHA256=manifest['rankings.json'], sourceValidation=validation,
                   displayOverride='ムウマ系確率・寝顔名：ユーザー確認 2026-10-28', sourceArchive='PSN_Enigma_Lv80_20261027.zip')
    (folder / 'lv80-receipt.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2)+'\n')
    print(f'Imported {len(tables)} Lv80 tables, {len(raw)} public JSON bytes')


if __name__ == '__main__':
    import_rankings(sys.argv[1])

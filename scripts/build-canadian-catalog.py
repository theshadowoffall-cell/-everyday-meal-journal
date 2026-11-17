"""Build Health Canada CNF 2026 catalogue from its published CSV files.

Usage: python3 scripts/build-canadian-catalog.py /path/to/extracted/files [independent.sqlite]
Contains information licensed under the Open Government Licence – Canada.
"""
import csv, json, math, sqlite3, sys, hashlib
from collections import defaultdict
from pathlib import Path

source=Path(sys.argv[1])
def rows(filename):
    with (source/filename).open(encoding='utf-8-sig',newline='') as f:
        yield from csv.DictReader(f)
foods={int(r['Food_Code']):{'id':int(r['Food_Code']),'name':r['Food_Description_EN'].strip(),'aliases':[v.strip() for v in [r['Alternate_Description_EN'],r['Food_Description_FR'],r['Alternate_Description_FR']] if v.strip()]} for r in rows('Food_Name.csv')}
for r in rows('Nutrient_Amount.csv'):
    if r['Nutrient_Code']!='208' or not r['Nutrient_Amount']:continue
    f=foods.get(int(r['Food_Code']));value=float(r['Nutrient_Amount'])
    if f is not None and math.isfinite(value) and 0<=value<=1000:
        f['kcal']=value
        if r['Nutrient_Last_Updated_Date']:f['updated']=r['Nutrient_Last_Updated_Date']
measures={r['Measure_Code']:r['Measure_Description_and_Unit_EN'].strip() for r in rows('Measure_Name.csv')}
portions=defaultdict(lambda:defaultdict(set))
for r in rows('Measure_Weight_Conversion.csv'):
    if r['Measure_Type_Code']!='6':continue  # 3 is refuse and 9 is yield, not edible serving sizes
    try: food=int(r['Food_Code']); grams=float(r['Measure_Weight_Conversion'])
    except (ValueError,TypeError):continue
    label=measures.get(r['Measure_Code'],'')
    if food in foods and label and len(label)<=90 and math.isfinite(grams) and 0<grams<=1000000:
        portions[food][label].add(grams)
for food,options in portions.items():
    # Omit conflicting same-name portions rather than silently choosing a weight.
    foods[food]['portions']=[{'label':label,'grams':next(iter(weights))} for label,weights in options.items() if len(weights)==1]
result=sorted((v for v in foods.values() if 'kcal' in v),key=lambda v:v['name'].lower())
if len(sys.argv)>2:
    db=sqlite3.connect(sys.argv[2]); independent={code:(amount,date) for code,amount,date in db.execute('select food_code,amount,last_updated_date from nutrient_amount where nutrient_code=208')}
    names=dict(db.execute('select food_code,description_en from food'))
    assert len(names)==len(foods),f'Food count differs: {len(names)} vs {len(foods)}'
    for f in result:
        assert f['id'] in independent and abs(f['kcal']-independent[f['id']][0])<1e-7, f"Energy mismatch {f['id']}"
        assert names[f['id']]==f['name'],f"Name mismatch {f['id']}"
        assert f.get('updated','')==(independent[f['id']][1] or ''),f"Date mismatch {f['id']}"
    entries={(a,b):v for a,b,v in db.execute('select food_code,measure_code,conversion from measure_weight_conversion where measure_type_code=6')}
    source_measures=[r for r in rows('Measure_Weight_Conversion.csv') if r['Measure_Type_Code']=='6' and r['Measure_Weight_Conversion']]
    assert {(int(r['Food_Code']),int(r['Measure_Code'])) for r in source_measures} == set(entries), 'Measure identifiers differ'
    mismatch=[r for r in source_measures if abs(float(r['Measure_Weight_Conversion'])-entries[(int(r['Food_Code']),int(r['Measure_Code']))])>1e-7]
    assert not mismatch,f'Portion mismatch: {len(mismatch)}'
    print('Cross-check passed against independent CNF 2026 SQLite for names, calories and measure weights.')
Path('src/data/canada.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n')
print(f'Built {len(result)} Canadian foods; {sum(len(f.get("portions",[])) for f in result)} unambiguous documented portions.')
print('CSV SHA-256:',json.dumps({f:hashlib.sha256((source/f).read_bytes()).hexdigest() for f in ['Food_Name.csv','Nutrient_Amount.csv','Measure_Name.csv','Measure_Weight_Conversion.csv']},sort_keys=True))

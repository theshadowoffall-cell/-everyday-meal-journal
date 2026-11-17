"""Build the local catalogue from the official USDA SR Legacy CSV zip."""
import urllib.request,zipfile,csv,io,json,math
from pathlib import Path
url='https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip'
archive=Path('/tmp/everyday-usda-sr.zip')
if not archive.exists(): urllib.request.urlretrieve(url,archive)
z=zipfile.ZipFile(archive)
def rows(name):
 path=next(p for p in z.namelist() if p.endswith('/'+name))
 return csv.DictReader(io.TextIOWrapper(z.open(path),encoding='utf-8-sig'))
foods={int(r['fdc_id']):{'id':int(r['fdc_id']),'name':r['description']} for r in rows('food.csv')}
for r in rows('food_nutrient.csv'):
 if r['nutrient_id']=='1008' and r['amount']:
  f=foods.get(int(r['fdc_id']));v=float(r['amount'])
  if f is not None and math.isfinite(v) and 0<=v<=1000:f['kcal']=v
units={r['id']:r['name'] for r in rows('measure_unit.csv')}
for r in rows('food_portion.csv'):
 f=foods.get(int(r['fdc_id']))
 try:amount=float(r['amount']);weight=float(r['gram_weight'])
 except (ValueError,TypeError):continue
 if not f or amount<=0 or weight<=0 or not math.isfinite(weight/amount):continue
 unit=units.get(r['measure_unit_id'],'');desc=r['portion_description'] or r['modifier'] or unit
 if not desc or desc=='undetermined':continue
 label=desc if amount==1 else f'{amount:g} {desc}'
 option={'label':label,'grams':weight}
 if not any(existing['label']==label for existing in f.setdefault('portions',[])):f['portions'].append(option)
result=sorted((f for f in foods.values() if 'kcal' in f),key=lambda f:f['name'])
Path('src/data/usda.json').write_text(json.dumps(result,separators=(',',':')))
print('Bundled',len(result),'USDA SR Legacy foods with energy per 100 g and documented portions.')

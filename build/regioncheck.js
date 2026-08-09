// Region coverage audit: which first-level regions of a country do we actually have a group for?
//
//   node build/regioncheck.js            # summary + gaps for every reference country
//   node build/regioncheck.js DE IT      # just these
//   node build/regioncheck.js --thin     # every country in the dataset with no regional split
//
// Exists because "the country is done" and "every region of the country is covered" are different
// claims, and only the first one is visible in a group count. A country can sit near the top of the
// list on total groups while missing half its states.
//
// Names are compared accent- and case-insensitively with an alias table, because batches legitimately
// use English exonyms (Bavaria for Bayern), local forms (Islas Baleares for Baleares), or a country's
// own grouping convention. Japan is listed by the Wild Bird Society's seven regional blocks rather
// than by its 47 prefectures, for instance, which is a reasonable choice and not a gap.

const fs = require('fs');
const path = require('path');
const DATA = path.join(__dirname, 'data');

const norm = (s) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');

// Region names that mean the same place. Left side is what a batch might write.
const ALIAS = {
  bavaria: 'bayern', hesse: 'hessen', lowersaxony: 'niedersachsen',
  northrhinewestphalia: 'nordrheinwestfalen', rhinelandpalatinate: 'rheinlandpfalz',
  saxony: 'sachsen', saxonyanhalt: 'sachsenanhalt', thuringia: 'thuringen',
  badenwurttemberg: 'badenwurttemberg', mecklenburgvorpommern: 'mecklenburgvorpommern',
  schleswigholstein: 'schleswigholstein',
  islasbaleares: 'baleares', balearicislands: 'baleares',
  catalonia: 'cataluna', basquecountry: 'paisvasco', valencia: 'comunidadvalenciana',
  castileandleon: 'castillayleon', castillalamancha: 'castillalamancha',
  tuscany: 'toscana', sardinia: 'sardegna', sicily: 'sicilia', lombardy: 'lombardia',
  piedmont: 'piemonte', apulia: 'puglia', latium: 'lazio', aostavalley: 'valledaosta',
  manawatu: 'manawatuwhanganui', manawatuwanganui: 'manawatuwhanganui',
  hawkesbay: 'hawkesbay',
};
const canon = (s) => { const n = norm(s); return ALIAS[n] || n; };

// Countries where a regional split is the expectation, with their first-level regions.
// A country not listed here is not audited: for most of the world a single "Countrywide"
// region is the honest and correct answer.
const REF = {
  US: ['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','District of Columbia','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming'],
  CA: ['Alberta','British Columbia','Manitoba','New Brunswick','Newfoundland and Labrador','Northwest Territories','Nova Scotia','Nunavut','Ontario','Prince Edward Island','Quebec','Saskatchewan','Yukon'],
  AU: ['New South Wales','Victoria','Queensland','South Australia','Western Australia','Tasmania','Northern Territory','Australian Capital Territory'],
  DE: ['Baden-Wurttemberg','Bayern','Berlin','Brandenburg','Bremen','Hamburg','Hessen','Mecklenburg-Vorpommern','Niedersachsen','Nordrhein-Westfalen','Rheinland-Pfalz','Saarland','Sachsen','Sachsen-Anhalt','Schleswig-Holstein','Thuringen'],
  NL: ['Drenthe','Flevoland','Friesland','Gelderland','Groningen','Limburg','Noord-Brabant','Noord-Holland','Overijssel','Utrecht','Zeeland','Zuid-Holland'],
  ZA: ['Eastern Cape','Free State','Gauteng','KwaZulu-Natal','Limpopo','Mpumalanga','North West','Northern Cape','Western Cape'],
  BR: ['Acre','Alagoas','Amapa','Amazonas','Bahia','Ceara','Distrito Federal','Espirito Santo','Goias','Maranhao','Mato Grosso','Mato Grosso do Sul','Minas Gerais','Para','Paraiba','Parana','Pernambuco','Piaui','Rio de Janeiro','Rio Grande do Norte','Rio Grande do Sul','Rondonia','Roraima','Santa Catarina','Sao Paulo','Sergipe','Tocantins'],
  ES: ['Andalucia','Aragon','Asturias','Baleares','Canarias','Cantabria','Castilla-La Mancha','Castilla y Leon','Cataluna','Extremadura','Galicia','La Rioja','Madrid','Murcia','Navarra','Pais Vasco','Comunidad Valenciana'],
  IT: ['Abruzzo','Basilicata','Calabria','Campania','Emilia-Romagna','Friuli-Venezia Giulia','Lazio','Liguria','Lombardia','Marche','Molise','Piemonte','Puglia','Sardegna','Sicilia','Toscana','Trentino-Alto Adige','Umbria',"Valle d'Aosta",'Veneto'],
  NZ: ['Northland','Auckland','Waikato','Bay of Plenty','Gisborne',"Hawke's Bay",'Taranaki','Manawatu-Whanganui','Wellington','Tasman','Nelson','Marlborough','West Coast','Canterbury','Otago','Southland'],
  IN: ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu and Kashmir','Ladakh','Puducherry','Chandigarh','Andaman and Nicobar Islands'],
};

const all = new Map();
for (const f of fs.readdirSync(DATA).filter((f) => f.endsWith('.json'))) {
  for (const c of JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'))) all.set(c.code, c);
}

const args = process.argv.slice(2);
const groupsOf = (c) => (c.regions || []).reduce((n, r) => n + (r.groups || []).length, 0);

if (args.includes('--thin')) {
  // Every country carrying groups but no regional split at all.
  const rows = [...all.values()]
    .filter((c) => groupsOf(c) > 0 && c.code !== 'INT')
    .filter((c) => (c.regions || []).filter((r) => r.groups.length).length === 1)
    .sort((a, b) => groupsOf(b) - groupsOf(a));
  console.log(`${rows.length} countries have a single region only:\n`);
  for (const c of rows) console.log(`  ${c.code}  ${c.name.padEnd(28)} ${String(groupsOf(c)).padStart(3)} groups  [${c.regions.filter((r) => r.groups.length)[0].name}]`);
  process.exit(0);
}

const codes = args.length ? args : Object.keys(REF);
let totalMissing = 0;
for (const code of codes) {
  const ref = REF[code];
  const c = all.get(code);
  if (!ref) { console.log(`${code}: no reference region list`); continue; }
  if (!c) { console.log(`${code}: not in the dataset`); continue; }
  const have = new Set((c.regions || []).filter((r) => r.groups.length).map((r) => canon(r.name)));
  const missing = ref.filter((r) => !have.has(canon(r)));
  totalMissing += missing.length;
  const pct = Math.round(((ref.length - missing.length) / ref.length) * 100);
  console.log(`\n${code} ${c.name} — ${ref.length - missing.length}/${ref.length} regions (${pct}%), ${groupsOf(c)} groups`);
  if (missing.length) console.log(`   missing: ${missing.join(', ')}`);
}
console.log(`\n${totalMissing} regions missing across ${codes.length} audited countries.`);

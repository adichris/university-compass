"""Turn the GTEC register snapshot (data/gtec/register.json) into app data in data/generated/.

- Institutions already curated in data/universities.json are matched by name and keep their curated
  data (cut-offs etc.); everything else GTEC lists as Active becomes a new institution.
- Each accredited undergraduate programme is linked to a requirements template from
  data/programme-templates.json when its name clearly matches one. Otherwise it is published with
  `requirementsKnown: false`, so the app checks only the general entry rules and says so.
- Postgraduate programmes go to data/generated/postgrad.json with general (unverified) requirements.
"""

from __future__ import annotations

import json
import re
from difflib import SequenceMatcher
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data"
GEN = DATA / "generated"

TYPE_BY_CATEGORY = {
    "Traditional University": "public",
    "Public Degree Awarding and Professional Institution": "public",
    "Regionally-Owned (West Africa) Tertiary Institution": "public",
    "Public Technical University": "technical",
    "Chartered Private Tertiary Institution": "private",
    "Private University": "private",
    "Private Tertiary Institutions Offering HND/Degree Programmes": "private",
    "Private Polytechnic": "private",
    "Distance Learning Institution": "private",
    "Public College of Education": "college-of-education",
    "Private College of Education": "college-of-education",
    "Public Nurses/Health Training College": "health-college",
    "Private Nurses/Health Training College": "health-college",
    "College of Agriculture": "agric-college",
}
PUBLIC_CATEGORIES = {
    "Traditional University", "Public Degree Awarding and Professional Institution", "Public Technical University",
    "Public College of Education", "Public Nurses/Health Training College", "College of Agriculture",
    "Regionally-Owned (West Africa) Tertiary Institution",
}

REGIONS = [
    "Greater Accra", "Ashanti", "Western North", "Western", "Central", "Eastern", "Volta", "Oti", "Northern",
    "Savannah", "North East", "Upper East", "Upper West", "Bono East", "Bono", "Ahafo",
]
# Towns -> region, for locations that don't name the region. Longer names are checked first.
TOWNS = {
    "Greater Accra": "sowutuom amrahia kokrobite tantra kanda adjiringanor shai pantang tesano accra legon madina tema kasoa? haatso east legon spintex adenta ashaiman dodowa achimota dansoman "
                     "kaneshie osu labone cantonments airport oyibi miotso dawhenya teshie nungua weija mallam "
                     "kwabenya pokuase amasaman abokobi ada korle bu ridge north legon taifa dome ashongman "
                     "ofankor sakumono lashibi kokomlemle adabraka asylum down ningo prampram afienya berekuso? "
                     "gbawe kpone",
    "Ashanti": "akrokerri barekese anyinasu jaachie pramso kumasi kwadaso obuasi ejisu mampong konongo bekwai offinso agogo asante akim juaben ejura nkawie "
               "agona ashanti tepa effiduase kokofu jacobu nyinahin manso adubiase abuakwa ashanti kenyasi? "
               "kwamo ayeduase bomso tanoso santasi asokwa suame tafo fomena",
    "Western": "takoradi sekondi tarkwa axim prestea half assini essikado apowa effia shama daboase nsuaem "
               "tarkwa-nsuaem agona nkwanta",
    "Western North": "sefwi wiawso sefwi bibiani juaboso enchi aowin asankragwa? dadieso",
    "Central": "fetteh kakraba ankaful cape coast winneba kasoa? mankessim saltpond agona swedru swedru dunkwa assin fosu foso elmina "
               "komenda twifo praso ajumako abura apam breman asikuma oguaa",
    "Eastern": "kpong batabi afosu osiem koforidua nkawkaw akropong somanya akim oda oda nsawam suhum aburi kibi kyebi abetifi begoro "
               "akwatia asamankese mpraeso donkorkrom akuse odumase krobo atibie bunso kade akuapem berekuso "
               "okwahu asesewa",
    "Volta": "amedzofe ho hohoe keta aflao kpando sogakope akatsi anloga denu dzodze peki battor adidome tsito "
             "abutia akatsi vakpo kpedze",
    "Oti": "dambai jasikan nkwanta kadjebi worawora krachi kete krachi chinderi",
    "Northern": "bagabaga tamale yendi gushegu bimbilla nyankpala savelugu tolon zabzugu walewale? kpandai",
    "Savannah": "kpembe damongo bole salaga sawla buipe",
    "North East": "kubori nalerigu walewale gambaga chereponi bunkpurugu",
    "Upper East": "kansoe bongo bolgatanga bolga navrongo bawku zuarungu sandema paga tongo garu zebilla",
    "Upper West": "nadowli wa tumu lawra nandom jirapa funsi gwollu",
    "Bono": "nsawkaw wamfie dadiesoaba seikwa sunyani berekum dormaa wenchi fiapre nsoatre odumasi chiraa drobo sampa",
    "Bono East": "techiman kintampo nkoranza atebubu yeji kwame danso",
    "Ahafo": "yamfo ntotroso goaso kenyasi duayaw nkwanta bechem hwidiem kukuom mim",
}
TOWN_LIST = sorted(
    ((t.strip("?").strip(), region) for region, towns in TOWNS.items() for t in re.split(r"\s{1,}", towns) if t),
    key=lambda x: -len(x[0]),
)
# Multi-word towns written with spaces in the table above.
MULTI = ["jaachie pramso", "shai hills", "tantra hill", "akyem batabi", "akyem afosu", "east legon", "north legon", "korle bu", "half assini", "agona swedru", "assin fosu", "akim oda",
         "twifo praso", "kete krachi", "kwame danso", "sefwi wiawso", "sefwi bibiani", "asante akim",
         "abuakwa ashanti", "asylum down", "agona nkwanta", "dunkwa", "bechem", "duayaw nkwanta"]

# (pattern, template) - checked in order against "<award> <programme name>", gated by level.
DEGREE_RULES = [
    # Teacher-education programmes first, so "Mathematics Education" isn't read as plain Mathematics.
    (r"science education|education.*science", "bed-science"),
    (r"mathematics education|education.*mathemat", "bed-maths"),
    (r"(technical|vocational|tvet).*education|education.*(technical|vocational)", "bed-tvet"),
    (r"medicine|mbchb|medical and surgery|surgery", "medicine"),
    (r"dental|dentistry", "dentistry"),
    (r"pharm", "pharmacy"),
    (r"midwif", "midwifery"),
    (r"nursing", "nursing"),
    (r"physician assist", "physician-assistant"),
    (r"medical lab|laboratory science", "medical-lab"),
    (r"physiotherap", "physiotherapy"),
    (r"public health|health promotion|health information|community health", "public-health"),
    (r"computer engineering|telecom", "computer-engineering"),
    (r"electrical|electronic", "electrical-engineering"),
    (r"civil engineering|construction tech|building tech|construction management", "civil-engineering"),
    (r"mechanical|automotive|mechatronic", "mechanical-engineering"),
    (r"petroleum|oil and gas", "petroleum-engineering"),
    (r"mining|mineral", "mining-engineering"),
    (r"geomatic|surveying|land economy|real estate", "geomatic-engineering"),
    (r"architect", "architecture"),
    (r"actuarial", "actuarial-science"),
    (r"computer science|computing|software|cyber|data science|artificial intelligence", "computer-science"),
    (r"information technology|information systems|\bict\b|information and communication", "information-technology"),
    (r"statistic", "statistics"),
    (r"mathemat", "mathematics"),
    (r"biochem|molecular|biomedical", "biochemistry"),
    (r"\bphysics\b|\bchemistry\b", "physical-science"),
    (r"environment", "environmental-science"),
    (r"natural resource|forest|wildlife|fisher", "natural-resources"),
    (r"agric|agro|crop|animal science|horticult", "agriculture"),
    (r"accounting|accountancy", "accounting"),
    (r"banking|finance", "banking-finance"),
    (r"economics", "economics"),
    (r"procurement|supply chain|logistics", "procurement"),
    (r"hospitality|tourism|hotel", "hospitality"),
    (r"business|management|marketing|human resource|entrepreneur|administration", "business-admin"),
    (r"\blaw\b|\bllb\b|legal", "law"),
    (r"political|international relations|public administration", "political-science"),
    (r"psycholog", "psychology"),
    (r"sociolog|social work", "sociology"),
    (r"geograph|planning", "geography"),
    (r"communication|journalism|media|public relations", "communication"),
    (r"french", "french"),
    (r"english|literature", "english"),
    (r"history", "history"),
    (r"religio|theolog|ministry|divinity", "religion"),
    (r"fashion|textile|clothing", "fashion"),
    (r"fine art|graphic|painting|sculpture|art and design|visual art|ceramic", "fine-art"),
    (r"basic education|early grade|primary|junior high|\bjhs\b|early childhood|\bb\.?ed\b|education", "bed-basic"),
]
HND_RULES = [
    (r"engineering|electrical|mechanical|civil|buil?ding|buliding|construction|automotive|welding|plant|telecom", "hnd-engineering"),
    (r"science laboratory|laboratory tech", "hnd-science-lab"),
    (r"hotel|catering|hospitality|tourism", "hnd-hospitality"),
    (r"fashion|textile|clothing", "hnd-fashion"),
    (r"account|marketing|secretar|management|purchasing|procurement|banking|business|statistic|office", "hnd-business"),
]
DIPLOMA_RULES = [
    (r"midwif", "diploma-midwifery"),
    (r"nursing", "diploma-nursing"),
    (r"education|teaching", "diploma-education"),
]

FIELD_RULES = [
    ("health", r"nurs|midwif|health|medic|pharm|laborator|physio|optom|anaesth|radiograph|dietet|nutrition|dental|clinical|disease"),
    ("engineering", r"engineer|architect|construction|building|survey|geomatic|quantity|mechatronic|automotive|welding"),
    ("agriculture", r"agric|agro|forest|fisher|animal|crop|horticult|natural resource|veterinar"),
    ("law", r"\blaw\b|legal|\bllb\b"),
    ("education", r"education|teaching|\bb\.?ed\b|pedagog"),
    ("science", r"comput|software|information tech|information system|\bict\b|data|cyber|math|statistic|actuar|physics|chemistry|biolog|biochem|science"),
    ("business", r"account|business|manage|financ|bank|econom|market|procure|logistic|supply|human resource|entrepreneur|insurance|hospitality|tourism|secretar|hotel|catering"),
    ("arts", r"\bart\b|design|fashion|textile|graphic|ceramic|sculpture|theatre|film|music|dance"),
    ("social-science", r"sociolog|psycholog|politic|social work|development|geograph|planning|public admin|international relations|security|criminolog"),
    ("humanities", r"english|french|language|literature|history|religio|theolog|philosoph|communicat|journalism|media|linguist|ministry|divinity"),
]

DEGREE_AWARD = re.compile(r"^(b[a-z.]*|bachelor|llb|mbchb|pharm\.?d|doctor of (pharmacy|optometry|medicine)|od)\b", re.I)
POSTGRAD_AWARD = re.compile(r"^(m[a-z.]*|master|ph\.?d|doctor|dba|pg|post ?graduate|emba|llm)\b", re.I)
SKIP_NAME = re.compile(r"top[- ]?up|post[- ]diploma|conversion|sandwich|\bcertificate\b", re.I)


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def norm_name(s: str) -> str:
    s = s.lower().replace("&", "and")
    s = re.sub(r"[^a-z ]", " ", s)
    return " ".join(w for w in s.split() if w not in {"the", "of", "and", "for"})


def slugify(s: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", s.lower().replace("&", "and")).strip("-")
    return s[:60].rstrip("-")


def acronym(name: str) -> str:
    words = [w for w in re.split(r"[\s,.-]+", name) if w and w.lower() not in {"of", "and", "the", "for", "&"}]
    ac = "".join(w[0] for w in words if w[0].isalpha()).upper()
    return ac if 2 <= len(ac) <= 7 else words[0][:12]


def region_for(location: str, name: str) -> tuple[str, str]:
    text = f"{location} {name}".lower()
    region = next((r for r in REGIONS if f"{r.lower()} region" in text), None)
    city = ""
    for town in MULTI + [t for t, _ in TOWN_LIST]:
        if re.search(rf"\b{re.escape(town)}\b", text):
            city = town.title()
            region = region or next((r for t, r in TOWN_LIST if t == town), None) or region_for_multi(town)
            break
    if not region:
        region = next((r for r in REGIONS if re.search(rf"\b{r.lower()}\b", text)), "Other")
    return region, city


def region_for_multi(town: str) -> str | None:
    for region, towns in TOWNS.items():
        words = towns.replace("?", "").split()
        if town in towns or any(w in words for w in town.split()):
            return region
    return None


UNDERGRAD_DOCTORATE = re.compile(r"pharmac|optometr|veterinar|medical laboratory|herbal medicine|physician", re.I)


def level_of(award: str, name: str = "") -> str | None:
    a = award.strip()
    if re.match(r"^doctor\b", a, re.I) and UNDERGRAD_DOCTORATE.search(name):
        return "degree"
    if re.match(r"^post\b", a, re.I) and re.match(r"^graduate", name.strip(), re.I):
        return "postgrad"
    if re.match(r"^hnd\b|higher national", a, re.I):
        return "hnd"
    if re.match(r"^dip", a, re.I):
        return "diploma"
    if POSTGRAD_AWARD.match(a) and not DEGREE_AWARD.match(a):
        return "postgrad"
    if DEGREE_AWARD.match(a):
        return "degree"
    return None


def pg_level(award: str) -> str:
    a = award.lower()
    if a.startswith("ph") or a.startswith("doctor") or a.startswith("dba"):
        return "phd"
    if a.startswith("mphil"):
        return "mphil"
    return "masters"


def match(rules, text: str) -> str | None:
    t = text.lower()
    return next((tpl for pat, tpl in rules if re.search(pat, t)), None)


def field_of(text: str, default: str) -> str:
    t = text.lower()
    return next((f for f, pat in FIELD_RULES if re.search(pat, t)), default)


GENERIC_WORDS = {"university", "college", "technical", "technology", "institute", "school", "education",
                 "studies", "science", "sciences", "applied", "development", "ghana", "allied", "health"}


def distinctive(name: str) -> set[str]:
    return {w for w in norm_name(name).split() if w not in GENERIC_WORDS and len(w) > 1}


def best_curated_match(name: str, curated: list[dict]) -> dict | None:
    n = norm_name(name)
    best, score = None, 0.0
    for u in curated:
        if norm_name(u["short"]) == n:
            return u
        a, b = distinctive(name), distinctive(u["name"])
        # The words that tell institutions apart (usually places or people) must largely agree.
        if a and b and len(a & b) / len(a | b) < 0.6:
            continue
        s = SequenceMatcher(None, n, norm_name(u["name"])).ratio()
        if s > score:
            best, score = u, s
    return best if score >= 0.86 else None


def build(register_path: Path = DATA / "gtec" / "register.json", out_dir: Path = GEN) -> None:
    register = load(register_path)
    curated = load(DATA / "universities.json")
    offerings = load(DATA / "offerings.json")
    templates = {k: v for k, v in load(DATA / "programme-templates.json").items() if not k.startswith("_")}

    institutions, programmes, postgrad, links = [], [], [], {}
    used_slugs = {u["slug"] for u in curated}
    stats = {"institutions": 0, "matched": 0, "programmes": 0, "mapped": 0, "postgrad": 0, "skipped_expired": 0}

    for inst in register["institutions"]:
        if inst["status"].lower() != "active":
            stats["skipped_expired"] += 1
            continue
        gtec_url = f"https://gtec.edu.gh/programmes/?institutionId={inst['gtecId']}"
        cur = best_curated_match(inst["name"], curated)
        if cur:
            slug = cur["slug"]
            links[slug] = {"gtecId": inst["gtecId"], "category": inst["category"], "gtecUrl": gtec_url}
            stats["matched"] += 1
            existing = set((offerings.get(slug) or {}).keys())
        else:
            region, city = region_for(inst["location"], inst["name"])
            slug = slugify(inst["name"])
            base, n = slug, 2
            while slug in used_slugs:
                slug, n = f"{base}-{n}", n + 1
            used_slugs.add(slug)
            institutions.append({
                "slug": slug,
                "name": inst["name"],
                "short": acronym(inst["name"]),
                "type": TYPE_BY_CATEGORY.get(inst["category"], "private"),
                "ownership": "public" if inst["category"] in PUBLIC_CATEGORIES else "private",
                "category": inst["category"],
                "region": region,
                "city": city or inst["location"][:40],
                "address": inst["location"],
                "website": "",
                "admissionsUrl": gtec_url,
                "gtecId": inst["gtecId"],
                "gtecUrl": gtec_url,
                "multipleSittings": True,
                "maxSittings": 2,
                "sittingsKnown": False,
                "feesRange": "Contact the institution",
                "description": f"Accredited by GTEC as a {inst['category'].lower()}.",
            })
            existing = set()
        stats["institutions"] += 1

        seen = set()
        for p in inst.get("programmes", []):
            if p["status"].lower() != "active" or SKIP_NAME.search(p["name"]) or SKIP_NAME.search(p["award"]):
                continue
            level = level_of(p["award"], p["name"])
            if not level:
                continue
            title = f"{p['award']} {p['name']}".strip()
            key = (level, p["name"].lower())
            if key in seen:
                continue
            seen.add(key)

            if level == "postgrad":
                lvl = pg_level(p["award"])
                fld = field_of(p["name"], "social-science")
                postgrad.append({
                    "id": f"gtec-{inst['gtecId']}-{len(postgrad)}",
                    "university": slug,
                    "country": "Ghana",
                    "name": title,
                    "level": lvl,
                    "field": fld,
                    "acceptedFields": [fld],
                    "minClass": "second-lower",
                    "requires": "masters" if lvl == "phd" else "bachelor",
                    "workYears": 0,
                    "proposal": lvl != "masters",
                    "durationYears": {"masters": 1.5, "mphil": 2, "phd": 4}[lvl],
                    "modes": [],
                    "url": gtec_url,
                    "note": "Listed as accredited by GTEC. Requirements shown are typical - confirm with the institution.",
                    "requirementsKnown": False,
                })
                stats["postgrad"] += 1
                continue

            rules = {"degree": DEGREE_RULES, "hnd": HND_RULES, "diploma": DIPLOMA_RULES}[level]
            tpl = match(rules, f"{p['award']} {p['name']}")
            if tpl and tpl not in templates:
                tpl = None
            if tpl and tpl in existing:
                continue  # curated entry (with cut-off) already covers it
            if tpl:
                existing.add(tpl)
                stats["mapped"] += 1
            programmes.append({
                "id": f"{slug}--{slugify(title)}"[:120],
                "university": slug,
                "template": tpl,
                "name": title,
                "level": level,
                "field": templates[tpl]["field"] if tpl else field_of(p["name"], "technical" if level == "hnd" else "social-science"),
                "requirementsKnown": bool(tpl),
                "accreditedTo": p.get("accreditedTo") or None,
            })
            stats["programmes"] += 1

    out_dir.mkdir(parents=True, exist_ok=True)
    meta = {"source": register["source"], "fetched": register["fetched"]}
    (out_dir / "institutions.json").write_text(json.dumps({**meta, "institutions": institutions, "links": links}, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    (out_dir / "programmes.json").write_text(json.dumps({**meta, "programmes": programmes}, separators=(",", ":"), ensure_ascii=False) + "\n", encoding="utf-8")
    (out_dir / "postgrad.json").write_text(json.dumps({**meta, "programmes": postgrad}, separators=(",", ":"), ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(stats, indent=1))
    if unknown := [i["name"] for i in institutions if i["region"] == "Other"]:
        print(f"{len(unknown)} institution(s) without a recognised region, e.g.: {unknown[:8]}")

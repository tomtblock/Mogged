#!/usr/bin/env python3
"""
Import top influencers from TikTok/Twitch/Kick into mogged.chat Supabase.
Uses BATCH inserts for speed. Service role key bypasses RLS.

Usage:  python3 import_influencers.py
"""

import os, re, sys, json, uuid, time, requests
from collections import OrderedDict

# ─── Config ──────────────────────────────────────────────
def load_env(path):
    if not os.path.exists(path):
        return {}
    env = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip()
    return env

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_local = load_env(os.path.join(project_root, ".env.local"))
env_seed = load_env(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

SUPABASE_URL = env_local.get("NEXT_PUBLIC_SUPABASE_URL") or env_seed.get("SUPABASE_URL") or "https://kjibzupnfpkxyynjtroj.supabase.co"
SUPABASE_KEY = env_local.get("SUPABASE_SERVICE_ROLE_KEY") or env_seed.get("SUPABASE_KEY")
if not SUPABASE_KEY:
    print("ERROR: No key found"); sys.exit(1)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation,resolution=merge-duplicates",
}

SKIP = {"TikTok","Real Madrid C.F.","fcbarcelona","ESPN","Champions League","Netflix",
        "Netflix Latinoamérica","psg","spursofficial","juventus","LALIGA","Manchester City",
        "WWE","Barstool Sports","XO TEAM","Riot Games","Fortnite","VALORANT","easportsfc",
        "RocketLeague","ESLCS","kingsleague"}

# ═══════════════════════════════════════════════════════════
TIKTOK = [
    (1,"Khabane lame",160400000),(2,"charli d'amelio",155800000),(3,"MrBeast",124600000),
    (4,"TikTok",92800000),(5,"Bella Poarch",92700000),(6,"Addison Rae",88300000),
    (7,"Zach King",84300000),(8,"WILLIE SALIM",83900000),(9,"Kimberly Loaiza",83700000),
    (10,"The Rock",79800000),(11,"Will Smith",78900000),(12,"domelipa",76000000),
    (13,"BILLIE EILISH",74300000),(14,"cznburak",74100000),(15,"BTS",73900000),
    (16,"Real Madrid C.F.",70200000),(17,"VILMEI",68000000),(18,"Jason Derulo",65700000),
    (19,"fcbarcelona",63800000),(20,"Kylie Jenner",59700000),(21,"Selena Gomez",59100000),
    (22,"YZ",57200000),(23,"ESPN",56500000),(24,"Karol G",55400000),
    (25,"Bayashi",55000000),(26,"omari.to",54500000),(27,"Dixie D'Amelio",54300000),
    (28,"HOMA",54100000),(29,"Spencer X",54000000),(30,"Champions League",54000000),
    (31,"Loren Gray",53000000),(32,"ROSE",52000000),(33,"Ria Ricis",51800000),
    (34,"BLACKPINK",51400000),(35,"psg",51100000),(36,"Brent Rivera",50500000),
    (37,"Netflix",50500000),(38,"Kris HC",50500000),(39,"Michael Le",50200000),
    (40,"Barstool Sports",48400000),(41,"IShowSpeed",47800000),(42,"Carlos Feria",47200000),
    (43,"nianaguerrero",46200000),(44,"JoJo Siwa",46100000),(45,"Pongamoslo a Prueba",46000000),
    (46,"Katteyes",45500000),(47,"Brooke Monk",44700000),(48,"noelgoescrazy",44400000),
    (49,"Junya",44000000),(50,"Joe Albanese",44000000),(51,"spursofficial",43500000),
    (52,"tuzelity",43100000),(53,"Shakira",42600000),(54,"juventus",42600000),
    (55,"LALIGA",42500000),(56,"Virginia Fonseca",42000000),(57,"Avani Gregg",41500000),
    (58,"BigChungus",41200000),(59,"Gordon Ramsay",41000000),(60,"Mia Khalifa",41000000),
    (61,"Ruben Tuesta",40700000),(62,"James Charles",40600000),(63,"Anokhina Liza",40500000),
    (64,"XO TEAM",40400000),(65,"Lucas and Marcus",40300000),(66,"Ariana Grande",40000000),
    (67,"Montpantoja",39200000),(68,"KEEMOKAZI",38800000),(69,"Surthycooks",38800000),
    (70,"Netflix Latinoamérica",38400000),(71,"Fujiiian",38400000),(72,"HotSpanish",38200000),
    (73,"itsmichhh",37800000),(74,"Emir Abdul Gani",37600000),(75,"Scott",37200000),
    (76,"BabyAriel",36700000),(77,"Sabrina Carpenter",36600000),(78,"spider_slack",36500000),
    (79,"Bad Bunny",36400000),(80,"wigofellas",36100000),(81,"BORREGO",36100000),
    (82,"BRIANDA",36000000),(83,"ondy mikula",35800000),(84,"Gil Croes",35500000),
    (85,"Enejota",35400000),(86,"Arnaldo Mangini",35300000),(87,"Benji Krol",35100000),
    (88,"Alejandro Nieto",34900000),(89,"Stray Kids",34700000),(90,"Bader Al Safar",34700000),
    (91,"WWE",34600000),(92,"Manchester City",34400000),(93,"Kevin Hart",34200000),
    (94,"Kunno",34100000),(95,"kyle thomas",34100000),(96,"Devon Rodriguez",34100000),
    (97,"Kirya Kolesnikov",34000000),(98,"DorisJocelyn",33700000),(99,"Taylor Swift",33300000),
    (100,"Lele Pons",33100000),
]
TWITCH = [
    (1,"KaiCenat",20170000),(2,"ibai",19760000),(3,"Ninja",19260000),
    (4,"auronplay",16980000),(5,"Rubius",16160000),(6,"xQc",12280000),
    (7,"easyliker",12260000),(8,"TheGrefg",12250000),(9,"juansguarnizo",11610000),
    (10,"Tfue",11470000),(11,"shroud",11320000),(12,"ElMariana",10820000),
    (13,"edu90",10650000),(14,"ElSpreen",9700000),(15,"pokimane",9380000),
    (16,"sodapoppin",8970000),(17,"Jynxzi",8870000),(18,"Clix",8500000),
    (19,"caseoh_",8110000),(20,"alanzoka",7930000),(21,"TimTheTatman",7610000),
    (22,"Riot Games",7360000),(23,"Myth",7290000),(24,"tommyinnit",7250000),
    (25,"SypherPK",7240000),(26,"Mongraal",7200000),(27,"AriGameplays",7100000),
    (28,"AdinRoss",7030000),(29,"loud_coringa",7000000),(30,"rivers_gg",6790000),
    (31,"NICKMERCS",6740000),(32,"ESLCS",6610000),(33,"Quackity",6450000),
    (34,"summit1g",6380000),(35,"Fortnite",6300000),(36,"AMOURANTH",6100000),
    (37,"Dream",6070000),(38,"Robleis",5910000),(39,"Squeezie",5810000),
    (40,"NickEh30",5790000),(41,"moistcr1tikal",5760000),(42,"MontanaBlack88",5740000),
    (43,"elded",5690000),(44,"Bugha",5500000),(45,"loltyler1",5460000),
    (46,"Tubbo",5200000),(47,"Carreraaa",4960000),(48,"QuackityToo",4850000),
    (49,"buster",4820000),(50,"GeorgeNotFound",4810000),(51,"VALORANT",4790000),
    (52,"Elraenn",4790000),(53,"SLAKUNTV",4720000),(54,"Dakotaz",4640000),
    (55,"MrSavage",4630000),(56,"RocketLeague",4620000),(57,"Gotaga",4600000),
    (58,"IlloJuan",4510000),(59,"TenZ",4510000),(60,"stableronaldo",4450000),
    (61,"DrLupo",4410000),(62,"elxokas",4390000),(63,"WilburSoot",4350000),
    (64,"Gaules",4320000),(65,"Its_J0schi",4310000),(66,"RanbooLive",4300000),
    (67,"quiriify",4300000),(68,"Philza",4290000),(69,"MissaSinfonia",4190000),
    (70,"Symfuhny",4110000),(71,"benjyfishy",4100000),(72,"s1mple",4080000),
    (73,"DaequanWoco",4060000),(74,"easportsfc",4020000),(75,"casimito",3940000),
    (76,"Trymacs",3880000),(77,"Sykkuno",3880000),(78,"edu90_",3880000),
    (79,"Faker",3860000),(80,"coscu",3850000),(81,"NOBRU",3790000),
    (82,"Castro_1021",3720000),(83,"PaulinhoLOKObr",3630000),(84,"bratishkinoff",3610000),
    (85,"Ludwig",3600000),(86,"Cellbit",3570000),(87,"Fanum",3550000),
    (88,"Asmongold",3550000),(89,"karljacobs",3540000),(90,"Staryuuki",3530000),
    (91,"Fernanfloo",3460000),(92,"IShowSpeed",3370000),(93,"aminematue",3360000),
    (94,"Duke",3350000),(95,"tarik",3310000),(96,"kingsleague",3290000),
    (97,"xCry",3260000),(98,"Agent00",3220000),(99,"Alexby11",3220000),
    (100,"gabelulz",3200000),
]
KICK = [
    (1,"WestCOL",3672680),(2,"AdinRoss",1919577),(3,"MrStivenTC",1638642),
    (4,"davooxeneize",1521611),(5,"SXB",1496300),(6,"spreen",1377892),
    (7,"drb7h",1368281),(8,"lacobraaa",1253047),(9,"RRaenee",1167679),
    (10,"xQc",1037013),(11,"Atro",1034670),(12,"Elzeein",908775),
    (13,"Mernuel",889670),(14,"ilyaselmaliki",849926),(15,"Mellstroy475",840954),
    (16,"rdJavi",832177),(17,"Robleis",787637),(18,"Elraenn",784289),
    (19,"Absi",756146),(20,"Abodby",746188),
]

# ═══════════════════════════════════════════════════════════
# INFO: profession, category, gender  (key = lowercased name)
# ═══════════════════════════════════════════════════════════
I = {
    "khabane lame":("tiktoker","tiktoker","men"),"charli d'amelio":("tiktoker","tiktoker","women"),
    "mrbeast":("youtuber","youtuber","men"),"bella poarch":("tiktoker","tiktoker","women"),
    "addison rae":("tiktoker","tiktoker","women"),"zach king":("tiktoker","tiktoker","men"),
    "the rock":("actor","sports","men"),"will smith":("actor","actor","men"),
    "billie eilish":("musician","influencer","women"),"jason derulo":("musician","influencer","men"),
    "kylie jenner":("influencer","influencer","women"),"selena gomez":("actress","actress","women"),
    "karol g":("musician","influencer","women"),"dixie d'amelio":("tiktoker","tiktoker","women"),
    "loren gray":("tiktoker","tiktoker","women"),"brent rivera":("youtuber","youtuber","men"),
    "ishowspeed":("streamer","streamer","men"),"jojo siwa":("tiktoker","internet_personality","women"),
    "brooke monk":("tiktoker","tiktoker","women"),"gordon ramsay":("internet_personality","internet_personality","men"),
    "mia khalifa":("influencer","internet_personality","women"),"james charles":("influencer","influencer","men"),
    "ariana grande":("musician","influencer","women"),"sabrina carpenter":("musician","influencer","women"),
    "bad bunny":("musician","influencer","men"),"shakira":("musician","influencer","women"),
    "kevin hart":("actor","actor","men"),"taylor swift":("musician","influencer","women"),
    "lele pons":("tiktoker","tiktoker","women"),"bts":("musician","influencer","men"),
    "blackpink":("musician","influencer","women"),"stray kids":("musician","influencer","men"),
    "domelipa":("tiktoker","tiktoker","women"),"kimberly loaiza":("tiktoker","tiktoker","women"),
    "michael le":("tiktoker","tiktoker","men"),"lucas and marcus":("youtuber","youtuber","men"),
    "devon rodriguez":("tiktoker","tiktoker","men"),"avani gregg":("tiktoker","tiktoker","women"),
    "kaicenat":("streamer","streamer","men"),"ibai":("streamer","streamer","men"),
    "ninja":("streamer","streamer","men"),"auronplay":("streamer","streamer","men"),
    "rubius":("streamer","streamer","men"),"xqc":("streamer","streamer","men"),
    "tfue":("streamer","streamer","men"),"shroud":("streamer","streamer","men"),
    "pokimane":("streamer","streamer","women"),"jynxzi":("streamer","streamer","men"),
    "clix":("streamer","streamer","men"),"caseoh_":("streamer","streamer","men"),
    "timthetatman":("streamer","streamer","men"),"tommyinnit":("streamer","streamer","men"),
    "adinross":("streamer","streamer","men"),"amouranth":("streamer","streamer","women"),
    "dream":("streamer","youtuber","men"),"moistcr1tikal":("streamer","streamer","men"),
    "ludwig":("streamer","streamer","men"),"asmongold":("streamer","streamer","men"),
    "fanum":("streamer","streamer","men"),"faker":("streamer","streamer","men"),
    "s1mple":("streamer","streamer","men"),"bugha":("streamer","streamer","men"),
    "agent00":("streamer","streamer","men"),"loltyler1":("streamer","streamer","men"),
    "stableronaldo":("streamer","streamer","men"),"westcol":("streamer","streamer","men"),
    "robleis":("streamer","streamer","men"),"elraenn":("streamer","streamer","men"),
    "arigameplays":("streamer","streamer","women"),"staryuuki":("streamer","streamer","women"),
}

ALIASES = {"edu90_":"edu90","quackitytoo":"quackity","elspreen":"spreen"}

WIKI = {
    "Khabane lame":"Khaby Lame","charli d'amelio":"Charli D'Amelio","MrBeast":"MrBeast",
    "Bella Poarch":"Bella Poarch","Addison Rae":"Addison Rae","The Rock":"Dwayne Johnson",
    "Will Smith":"Will Smith","BILLIE EILISH":"Billie Eilish","Jason Derulo":"Jason Derulo",
    "Kylie Jenner":"Kylie Jenner","Selena Gomez":"Selena Gomez","IShowSpeed":"IShowSpeed",
    "JoJo Siwa":"JoJo Siwa","Gordon Ramsay":"Gordon Ramsay","Ariana Grande":"Ariana Grande",
    "Sabrina Carpenter":"Sabrina Carpenter","Bad Bunny":"Bad Bunny","Shakira":"Shakira",
    "Kevin Hart":"Kevin Hart","Taylor Swift":"Taylor Swift","KaiCenat":"Kai Cenat",
    "Ninja":"Ninja (gamer)","xQc":"xQc","Tfue":"Tfue","pokimane":"Pokimane",
    "AdinRoss":"Adin Ross","AMOURANTH":"Amouranth","Dream":"Dream (YouTuber)",
    "moistcr1tikal":"Cr1TiKaL","Bugha":"Bugha","Ludwig":"Ludwig Ahgren",
    "Asmongold":"Asmongold","Faker":"Faker (gamer)","s1mple":"S1mple",
    "Mia Khalifa":"Mia Khalifa","BTS":"BTS","BLACKPINK":"Blackpink",
    "Lele Pons":"Lele Pons","Brooke Monk":"Brooke Monk","Zach King":"Zach King",
    "Dixie D'Amelio":"Dixie D'Amelio","ibai":"Ibai Llanos","Loren Gray":"Loren Gray",
    "James Charles":"James Charles (makeup artist)","shroud":"Shroud (gamer)",
    "Kimberly Loaiza":"Kimberly Loaiza","domelipa":"Domelipa","Brent Rivera":"Brent Rivera",
}

def norm(n): return re.sub(r'\s+',' ',re.sub(r'[^\w\s\'-]','',n.lower().strip())).strip()
def slug(n):
    s=re.sub(r'-+','-',re.sub(r'[\s_]+','-',re.sub(r'[^\w\s-]','',n.lower().strip()))).strip('-')
    return f"{s}-{uuid.uuid4().hex[:6]}" if s else f"x-{uuid.uuid4().hex[:6]}"

def wiki_thumb(title):
    try:
        r=requests.get(f"https://en.wikipedia.org/api/rest_v1/page/summary/{requests.utils.quote(title)}",
                       timeout=10,headers={"User-Agent":"mogged/1.0"})
        if r.ok:
            src=r.json().get("thumbnail",{}).get("source")
            if src: return re.sub(r'/(\d+)px-','/500px-',src)
    except: pass
    return None

def build():
    ppl=OrderedDict()
    def key(n):
        k=norm(n); return ALIASES.get(k,k)
    def get(n):
        k=key(n)
        if k not in ppl: ppl[k]={"name":n,"tk":0,"tw":0,"ki":0,"ph":{}}
        return ppl[k]
    for r,n,f in TIKTOK:
        if n in SKIP: continue
        p=get(n); p["tk"]=max(f,p["tk"]); p["ph"]["tiktok"]=f
    for r,n,f in TWITCH:
        if n in SKIP: continue
        k=key(n)
        if k in ppl: ppl[k]["tw"]=max(f,ppl[k]["tw"]); ppl[k]["ph"]["twitch"]=f
        else: p=get(n); p["tw"]=f; p["ph"]["twitch"]=f
    for r,n,f in KICK:
        if n in SKIP: continue
        k=key(n)
        if k in ppl: ppl[k]["ki"]=max(f,ppl[k]["ki"]); ppl[k]["ph"]["kick"]=f
        else: p=get(n); p["ki"]=f; p["ph"]["kick"]=f
    
    result=[]
    for k,p in ppl.items():
        info=I.get(k)
        tot=p["tk"]+p["tw"]+p["ki"]
        if p["tk"]>0 and p["tw"]==0 and p["ki"]==0:
            dp,dc="tiktoker","tiktoker"
        else:
            dp,dc="streamer","streamer"
        prof=info[0] if info else dp
        cat=info[1] if info else dc
        gen=info[2] if info else "unspecified"
        result.append({
            "slug":slug(p["name"]),
            "name":p["name"],
            "profession":prof,
            "category":cat,
            "gender":gen,
            "source_type":"csv_import",
            "status":"active",
            "visibility":"public",
            "headshot_path":"",
            "headshot_url":"",
            "headshot_source":"",
            "headshot_license":"pending",
            "headshot_attribution":"",
            "platform_handles":p["ph"],
        })
    result.sort(key=lambda x:sum(x["platform_handles"].values()),reverse=True)
    return result

def main():
    print("="*60)
    print("  mogged.chat — Influencer Batch Import")
    print("="*60)

    print("\n  Building people list...")
    people=build()
    print(f"  {len(people)} unique people")

    # Fetch headshots from Wikipedia (batch)
    print("\n  Fetching Wikipedia headshots...")
    hcount=0
    for p in people:
        wt=WIKI.get(p["name"])
        if wt:
            thumb=wiki_thumb(wt)
            if thumb:
                p["headshot_url"]=thumb
                p["headshot_path"]=thumb
                p["headshot_source"]="wikipedia"
                p["headshot_license"]="CC BY-SA 3.0"
                p["headshot_attribution"]="Wikimedia Commons"
                hcount+=1
                print(f"    + {p['name']}")
            else:
                print(f"    - {p['name']}")
            time.sleep(0.1)
    print(f"  Got {hcount} headshots\n")

    # Batch insert (PostgREST supports array POST)
    print("  Uploading to Supabase (batch)...")
    url=f"{SUPABASE_URL}/rest/v1/people"
    
    # Split into batches of 50
    batch_size=50
    total_ok=0
    total_err=0
    for i in range(0,len(people),batch_size):
        batch=people[i:i+batch_size]
        try:
            r=requests.post(url,headers=HEADERS,json=batch,timeout=60)
            if r.status_code in (200,201):
                rows=r.json()
                total_ok+=len(rows)
                for row in rows:
                    ph=row.get("platform_handles",{})
                    tot=sum(v for k,v in ph.items() if isinstance(v,(int,float)))
                    print(f"    + {row['name']:<35s} {tot:>13,} followers")
            else:
                total_err+=len(batch)
                print(f"    ! Batch {i//batch_size+1} ERROR {r.status_code}: {r.text[:200]}")
        except Exception as e:
            total_err+=len(batch)
            print(f"    ! Batch {i//batch_size+1} EXCEPTION: {e}")

    print(f"\n{'='*60}")
    print(f"  DONE: {total_ok} inserted, {total_err} errors, {hcount} headshots")
    print(f"{'='*60}")

    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)),"import_backup.json"),"w") as f:
        json.dump(people,f,indent=2,default=str)
    print("  Backup saved.")

if __name__=="__main__":
    main()

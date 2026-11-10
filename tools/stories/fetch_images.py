import json, urllib.request, ssl, os, time, io, re, sys
from PIL import Image
UA = 'VIKRAM-study-app/1.0 (personal offline study app; github vikram007sage)'
ctx = ssl.create_default_context(cafile=os.path.expanduser('~/.ccr/ca-bundle.crt'))
R = {}; [R.update(json.load(open(f))) for f in ('/tmp/img/r1.json', '/tmp/img/r2.json')]
PICK = {  # key: (query, index, alt)
 'alex_map': ('Alexander the Great empire map', 3, 'Map of Alexander\'s empire from a 1909 historical atlas'),
 'persepolis': ('Persepolis Gate of All Nations', 1, 'The Gate of All Nations at Persepolis'),
 'babylon': ('Ishtar Gate Pergamon Museum', 1, 'The Ishtar Gate of Babylon, reconstructed in Berlin'),
 'siwa': ('Siwa Oasis Temple of the Oracle of Amun', 0, 'Ruins of the Temple of the Oracle of Amun at Siwa'),
 'banknote': ('German hyperinflation 1923 banknote', 0, 'A 500 billion mark note from 1923'),
 'reichstag': ('Reichstag fire 1933', 0, 'The Reichstag building on fire, 27 February 1933'),
 'auschwitz': ('Auschwitz main gate', 4, 'The main gate of Auschwitz I today'),
 'enigma': ('Enigma machine', 1, 'An Enigma cipher machine'),
 'spitfire': ('Supermarine Spitfire', 3, 'A Supermarine Spitfire in flight'),
 'arizona': ('USS Arizona Pearl Harbor burning', 2, 'USS Arizona burning at Pearl Harbor, 7 December 1941'),
 'dday': ('Into the Jaws of Death Omaha Beach', 0, 'US troops wading ashore at Omaha Beach, 6 June 1944'),
 'genbaku': ('Genbaku Dome Hiroshima', 2, 'The Genbaku Dome, Hiroshima Peace Memorial'),
 'knossos': ('Knossos palace north entrance', 1, 'North entrance of the palace of Knossos with the bull fresco'),
 'parthenon': ('Parthenon Athens Acropolis', 4, 'The Parthenon on the Acropolis of Athens'),
 'colosseum': ('Colosseum Rome exterior', 0, 'The Colosseum and Roman Forum'),
 'bayeux': ('Bayeux Tapestry scene', 3, 'Bayeux Tapestry: the scene with Halley\'s Comet'),
 'magnacarta': ('Magna Carta 1215 British Library Cotton', 3, 'Magna Carta (1215), British Library copy'),
 'gutenberg': ('Gutenberg Bible Library of Congress', 1, 'A Gutenberg Bible at the Library of Congress'),
 'berlinwall': ('Berlin Wall 9 November 1989', 3, 'People walking through the opened Berlin Wall, 1989'),
 'olympus': ('Mount Olympus Greece', 0, 'Mount Olympus, Greece'),
 'delphi': ('Delphi Temple of Apollo', 4, 'Columns of the Temple of Apollo at Delphi'),
 'trojanhorse': ('Mykonos vase Trojan horse', 2, 'The Mykonos vase (c. 670 BC), one of the oldest images of the Trojan Horse'),
 'sirens': ('Siren Vase British Museum Odysseus', 1, 'Odysseus and the Sirens on an Athenian vase (British Museum E440)'),
 'medusa': ('Medusa Caravaggio Uffizi', 2, 'Medusa by Caravaggio (1597)'),
 'troy': ('Troy archaeological site walls Hisarlik', 3, 'The walls of Troy at Hisarlik'),
}
out = {}
for k, (q, i, alt) in PICK.items():
    r = R[q][i]; url = r['thumb']
    for t in range(5):
        try: data = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), context=ctx, timeout=60).read(); break
        except Exception as e: print('retry', k, e, file=sys.stderr); time.sleep(10 * (t + 1))
    im = Image.open(io.BytesIO(data)).convert('RGB'); im.thumbnail((900, 900)); im.save(f'/home/claude/vikram/stories/img/{k}.jpg', 'JPEG', quality=74, optimize=True, progressive=True)
    by = r['artist'] or 'Unknown author'; by = 'Unknown author' if by.lower().startswith('unknown') else re.sub(r'\s+', ' ', by)[:60]
    out[k] = {'by': by, 'lic': r['lic'], 'page': r['page'], 'alt': alt, 'file': r['title'][5:]}
    print(k, os.path.getsize(f'/home/claude/vikram/stories/img/{k}.jpg') // 1024, 'KB', r['lic'], '|', by)
    time.sleep(1.5)
with open('/home/claude/vikram/js/story_img.js', 'w') as f:
    f.write('/* Image credits for VIKRAM Stories. All files from Wikimedia Commons; licences as listed (public domain, CC0, CC BY, CC BY-SA). */\n')
    f.write('VK_STORIES.IMG = ' + json.dumps(out, ensure_ascii=False, indent=0) + ';\n')

"""Builds every icon and store graphic from the vector crest.

App assets -> assets/images/  (referenced by app.json)
Store art  -> assets/store/   (uploaded to Play Console / App Store Connect)

Run from the project folder:
  npm i --no-save @resvg/resvg-js && pip install pillow && python3 tools/crest/make_assets.py
"""
import os
import subprocess

from PIL import Image

import crest as C

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_APP = os.path.join(HERE, '..', '..', 'assets', 'images')
OUT_STORE = os.path.join(HERE, '..', '..', 'assets', 'store')
os.makedirs(OUT_APP, exist_ok=True)
os.makedirs(OUT_STORE, exist_ok=True)

BODY = C.crest_body()
SIL = C.silhouette()


def place(inner, scale, cx_canvas, cy_canvas, cx_crest, cy_crest):
    tx = cx_canvas - cx_crest * scale
    ty = cy_canvas - cy_crest * scale
    return f'<g transform="translate({tx:.2f} {ty:.2f}) scale({scale:.5f})">{inner}</g>'


def render(name, svg_text, width, out_dir, opaque=False):
    svg_path = os.path.join(HERE, 'tmp.svg')
    png_path = os.path.join(out_dir, name)
    open(svg_path, 'w').write(svg_text)
    subprocess.run(['node', os.path.join(HERE, 'render.js'), svg_path, png_path, str(width)], check=True)
    im = Image.open(png_path)
    if opaque:
        bg = Image.new('RGB', im.size, 'white')
        bg.paste(im, mask=im.convert('RGBA').split()[3])
        bg.save(png_path, optimize=True)
    else:
        im.convert('RGBA').save(png_path, optimize=True)
    return png_path


def square(inner, size=1024, bg=None):
    return C.svg(inner, size, size, bg)


# Crest proportions: 1000 x 1080 units (shield 34..1006, ribbon to 1066).
# Android adaptive icons are masked to shapes inside a circle of 66% of the
# canvas, so the crest's farthest points (top horns, scroll tails) must sit
# within radius 0.33 * 1024 = 338 px of the centre. Centre chosen at y=467
# so the horns and the scroll are equally far (about 604 units).
ADAPTIVE_SCALE = 330 / 604

files = {
    # iOS + default icon: opaque, crest large on white (iOS adds the rounded mask)
    'icon.png': (square(place(BODY, 860 / 1080, 512, 512, 500, 540), bg='#FFFFFF'), 1024, True),
    # Android adaptive icon layers
    'android-icon-foreground.png': (square(place(BODY, ADAPTIVE_SCALE, 512, 512, 500, 467)), 1024, False),
    'android-icon-background.png': (square('', bg='#FFFFFF'), 1024, True),
    # Android 13+ themed icon: single colour, shield only, inside the safe zone
    'android-icon-monochrome.png': (square(place(SIL, 330 / 578, 512, 512, 500, 428)), 1024, False),
    # Android status-bar notification icon: white silhouette on transparent
    'notification-icon.png': (square(place(SIL, 88 / 972, 48, 48, 500, 520), 96), 96, False),
    # Splash screen (shown at 180 dp, so 1024 px is sharp on any phone)
    'splash-icon.png': (square(place(BODY, 1000 / 1080, 512, 512, 500, 540)), 1024, False),
    # In-app crest (header 40 dp, sign-in 112 dp -> 336 px at 3x)
    'crest.png': (C.svg(BODY), 600, False),
    'favicon.png': (square(place(BODY, 46 / 1080, 24, 24, 500, 540), 48), 48, False),
}

for name, (svg_text, width, opaque) in files.items():
    render(name, svg_text, width, OUT_APP, opaque)

# --- Store graphics ---
render('play-store-icon-512.png', square(place(BODY, 440 / 1080, 256, 256, 500, 540), 512, '#FFFFFF'), 512, OUT_STORE, opaque=True)
render('app-store-icon-1024.png', files['icon.png'][0], 1024, OUT_STORE, opaque=True)

GREEN, GOLD, RED = '#1C6A39', '#F0C540', '#DF231A'
feature = f'''
<rect width="1024" height="500" fill="{GREEN}"/>
<circle cx="230" cy="250" r="214" fill="#FFFFFF" opacity="0.08"/>
{place(BODY, 400 / 1080, 230, 246, 500, 540)}
<text x="468" y="214" font-family="Bricolage Grotesque" font-size="118" fill="#FFFFFF" letter-spacing="4">ICAOSA</text>
<text x="472" y="270" font-family="Instrument Sans" font-size="31" fill="#FFFFFF" opacity="0.92">Ibadan City Academy</text>
<text x="472" y="308" font-family="Instrument Sans" font-size="31" fill="#FFFFFF" opacity="0.92">Old Students Association</text>
<text x="472" y="372" font-family="Instrument Sans" font-size="28" fill="{GOLD}">News, events, dues and birthdays</text>
<rect x="0" y="488" width="256" height="12" fill="{RED}"/><rect x="256" y="488" width="256" height="12" fill="{GOLD}"/>
<rect x="512" y="488" width="256" height="12" fill="#048E39"/><rect x="768" y="488" width="256" height="12" fill="#FFFFFF"/>
'''
render('play-feature-graphic-1024x500.png', C.svg(feature, 1024, 500), 1024, OUT_STORE, opaque=True)

# Master artwork for the association to keep
open(os.path.join(OUT_STORE, 'icaosa-crest.svg'), 'w').write(C.svg(BODY))
render('icaosa-crest-2000.png', C.svg(BODY), 2000, OUT_STORE)
os.remove(os.path.join(HERE, 'tmp.svg'))

for d in (OUT_APP, OUT_STORE):
    for f in sorted(os.listdir(d)):
        p = os.path.join(d, f)
        if f.endswith('.png'):
            im = Image.open(p)
            print(f'{f:40s} {im.size[0]}x{im.size[1]} {im.mode}')
        else:
            print(f'{f:40s} vector')

"""Makes every app icon and store graphic from the ICAOSA logo file.

Source: assets/brand/icaosa-logo.png (the association's logo, enlarged 4x).
Run from the project folder:  python3 tools/make_icons.py
"""
import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'assets', 'brand', 'icaosa-logo.png')
APP = os.path.join(ROOT, 'assets', 'images')
STORE = os.path.join(ROOT, 'assets', 'store')
os.makedirs(STORE, exist_ok=True)

# --- Cut the crest (shield and motto scroll) out of its white background ---
logo = Image.open(SRC).convert('RGB')
s = logo.width / 382  # the source file is the original 382 px logo enlarged
crest = logo.crop((int(28 * s), int(52 * s), int(354 * s), int(382 * s)))
light = crest.convert('L').point(lambda v: 255 if v > 228 else 0)
w, h = crest.size
for corner in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, h - 1), (w // 2, 0), (0, h // 2), (w - 1, h // 2)]:
    if light.getpixel(corner) == 255:
        ImageDraw.floodfill(light, corner, 128)
alpha = light.point(lambda v: 0 if v == 128 else 255).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(1))
CREST = crest.convert('RGBA')
CREST.putalpha(alpha)
CREST = CREST.crop(CREST.getbbox())


def crest_at(height):
    return CREST.resize((round(CREST.width * height / CREST.height), height), Image.LANCZOS)


def canvas(size, bg=None):
    return Image.new('RGBA', (size, size), bg or (0, 0, 0, 0))


def centre(base, im, dy=0):
    base.alpha_composite(im, ((base.width - im.width) // 2, (base.height - im.height) // 2 + dy))
    return base


def fit_in_circle(radius):
    """Largest crest height whose visible pixels stay inside a centred circle."""
    a = CREST.split()[3]
    cx, cy = CREST.width / 2, CREST.height / 2
    far = max(((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
              for y in range(0, CREST.height, 4) for x in range(0, CREST.width, 4) if a.getpixel((x, y)) > 128)
    return int(CREST.height * radius / far)


def silhouette(height):
    a = crest_at(height).split()[3]
    white = Image.new('RGBA', a.size, (255, 255, 255, 255))
    white.putalpha(a)
    return white


def save(im, path, opaque=False):
    if opaque:
        bg = Image.new('RGB', im.size, 'white')
        bg.paste(im, mask=im.split()[3])
        bg.save(path, optimize=True)
    else:
        im.save(path, optimize=True)


# Android adaptive icons are cut to shapes inside the middle 66% circle.
adaptive_h = fit_in_circle(330)

save(centre(canvas(1024, 'white'), crest_at(880)), f'{APP}/icon.png', opaque=True)
save(centre(canvas(1024), crest_at(adaptive_h)), f'{APP}/android-icon-foreground.png')
save(canvas(1024, 'white'), f'{APP}/android-icon-background.png', opaque=True)
save(centre(canvas(1024), silhouette(adaptive_h)), f'{APP}/android-icon-monochrome.png')
save(centre(canvas(96), silhouette(88)), f'{APP}/notification-icon.png')
save(centre(canvas(1024), crest_at(980)), f'{APP}/splash-icon.png')
save(crest_at(640), f'{APP}/crest.png')
save(centre(canvas(48), crest_at(46)), f'{APP}/favicon.png')

save(centre(canvas(512, 'white'), crest_at(450)), f'{STORE}/play-store-icon-512.png', opaque=True)
save(centre(canvas(1024, 'white'), crest_at(880)), f'{STORE}/app-store-icon-1024.png', opaque=True)
save(CREST, f'{STORE}/icaosa-crest-transparent.png')

# Play Store feature graphic, 1024 x 500
fonts = os.path.join(ROOT, 'node_modules', '@expo-google-fonts')
try:
    big = ImageFont.truetype(f'{fonts}/bricolage-grotesque/800ExtraBold/BricolageGrotesque_800ExtraBold.ttf', 118)
    mid = ImageFont.truetype(f'{fonts}/instrument-sans/600SemiBold/InstrumentSans_600SemiBold.ttf', 31)
    tag = ImageFont.truetype(f'{fonts}/instrument-sans/600SemiBold/InstrumentSans_600SemiBold.ttf', 28)
except OSError:  # fonts not installed (run `npm install` first); use a plain font
    big, mid, tag = (ImageFont.load_default(n) for n in (118, 31, 28))
fg = Image.new('RGBA', (1024, 500), '#1C6A39')
d = ImageDraw.Draw(fg)
d.ellipse((30, 40, 450, 460), fill=(255, 255, 255, 235))
c = crest_at(360)
fg.alpha_composite(c, (240 - c.width // 2, 250 - c.height // 2))
d.text((478, 120), 'ICAOSA', font=big, fill='white')
d.text((482, 252), 'Ibadan City Academy', font=mid, fill='white')
d.text((482, 290), 'Old Students Association', font=mid, fill='white')
d.text((482, 352), 'News, events, dues and birthdays', font=tag, fill='#F0C540')
for i, col in enumerate(['#DF231A', '#F0C540', '#048E39', '#FFFFFF']):
    d.rectangle((i * 256, 488, i * 256 + 255, 499), fill=col)
fg.convert('RGB').save(f'{STORE}/play-feature-graphic-1024x500.png', optimize=True)

for folder in (APP, STORE):
    for f in sorted(os.listdir(folder)):
        im = Image.open(os.path.join(folder, f))
        print(f'{f:40s} {im.size[0]}x{im.size[1]}')

# --- Web app (iPhone home screen, Android browsers) ---
PUBLIC = os.path.join(ROOT, 'public')
os.makedirs(PUBLIC, exist_ok=True)
save(centre(canvas(180, 'white'), crest_at(150)), f'{PUBLIC}/apple-touch-icon.png', opaque=True)
save(centre(canvas(192, 'white'), crest_at(165)), f'{PUBLIC}/icon-192.png', opaque=True)
save(centre(canvas(512, 'white'), crest_at(440)), f'{PUBLIC}/icon-512.png', opaque=True)
save(centre(canvas(512, 'white'), crest_at(fit_in_circle(330) * 512 // 1024 + 20)), f'{PUBLIC}/icon-maskable-512.png', opaque=True)
save(crest_at(240), f'{PUBLIC}/crest-small.png')
for f in ['apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'crest-small.png']:
    im = Image.open(os.path.join(PUBLIC, f))
    print(f'{f:40s} {im.size[0]}x{im.size[1]}')

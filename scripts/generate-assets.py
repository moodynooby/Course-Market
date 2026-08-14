#!/usr/bin/env python3
"""Generate Capacitor app assets from the existing brand icon.

Outputs:
- android/app/src/main/res/mipmap-*/ic_launcher*.png (foreground layer + legacy
  icons with rounded-square treatment on a dark background)
- android/app/src/main/res/drawable*/splash.png (brand splash screens)

The brand icon (public/android-chrome-512x512.png) is a black rounded square
with white "Aurals" text and an orange "Hub" pill. For the splash screen we
reuse it centered on a matching dark background (#111111) with the brand blue
accent for polish.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ICON_SRC = ROOT / "public" / "android-chrome-512x512.png"
RES = ROOT / "android" / "app" / "src" / "main" / "res"

BRAND_DARK = (17, 17, 17, 255)  # matches the icon's near-black background
ACCENT_ORANGE = (252, 114, 33, 255)

FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
]


def font(size: int) -> ImageFont.FreeTypeFont:
    for path in FONT_CANDIDATES:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def load_icon() -> Image.Image:
    im = Image.open(ICON_SRC).convert("RGBA")
    # Crop to the opaque bounding box (the file has transparent padding).
    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)
    return im


def rounded_square_mask(size: int, corner_ratio: float = 0.22) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    r = size * corner_ratio
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=255)
    return mask


def save_icon_layer(im: Image.Image, out: Path, size: int) -> None:
    """Paste the brand icon onto a dark rounded-square background."""
    pad = int(size * 0.18)
    cell = size + 2 * pad
    canvas = Image.new("RGBA", (cell, cell), (0, 0, 0, 0))
    mask = rounded_square_mask(cell)
    # Solid background square (drawn through the rounded mask).
    bg = Image.new("RGBA", (cell, cell), BRAND_DARK)
    canvas.paste(bg, (0, 0), mask)
    # The brand icon, centered, occupying ~64% of the cell.
    icon_size = int(cell * 0.62)
    icon = im.resize((icon_size, icon_size), Image.LANCZOS)
    pos = (cell - icon_size) // 2
    canvas.paste(icon, (pos, pos), icon)
    canvas.resize((size, size), Image.LANCZOS).save(out)


def splash(bg_size: tuple[int, int], icon_out: Path) -> None:
    """Render a centered-brand splash: dark bg, logo with soft glow."""
    width, height = bg_size
    canvas = Image.new("RGBA", (width, height), BRAND_DARK)
    logo = load_icon()

    # Logo occupies ~42% of the width.
    logo_size = int(width * 0.42)
    logo = logo.resize((logo_size, logo_size), Image.LANCZOS)

    # Soft orange glow behind the logo for depth.
    glow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    glow_px = Image.new("RGBA", logo.size, ACCENT_ORANGE)
    glow.paste(glow_px, ((width - logo_size) // 2, (height - logo_size) // 2 - 20), glow_px)
    glow = glow.filter(ImageFilter.GaussianBlur(radius=width // 9))
    canvas = Image.alpha_composite(canvas, glow)

    canvas.paste(logo, ((width - logo_size) // 2, (height - logo_size) // 2 - 20), logo)

    # Brand name beneath the logo.
    draw = ImageDraw.Draw(canvas)
    text = "AuraIsHub"
    f = font(int(width * 0.075))
    bbox = draw.textbbox((0, 0), text, font=f)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = (width - tw) // 2 - bbox[0]
    ty = (height - logo_size) // 2 + logo_size + int(height * 0.05)
    # Text outline for contrast.
    draw.text((tx, ty), text, font=f, fill=(255, 255, 255, 255),
              stroke_width=2, stroke_fill=(17, 17, 17, 255))

    canvas.convert("RGB").save(icon_out)


def foreground_layer(im: Image.Image, size: int, out: Path) -> None:
    """Adaptive-icon foreground: icon on transparent background.

    Android reserves a 66% central safe zone; we place the brand icon inside it
    with a small margin so nothing gets clipped by the system mask.
    """
    cell = int(size * 1.4)  # 140% canvas so the icon sits inside the safe zone
    canvas = Image.new("RGBA", (cell, cell), (0, 0, 0, 0))
    icon_size = int(cell * 0.72)
    icon = im.resize((icon_size, icon_size), Image.LANCZOS)
    pos = (cell - icon_size) // 2
    canvas.paste(icon, (pos, pos), icon)
    canvas.resize((size, size), Image.LANCZOS).save(out)


def main() -> None:
    icon = load_icon()
    changed: list[str] = []

    for density, size in [
        ("mdpi", 48), ("hdpi", 72), ("xhdpi", 96), ("xxhdpi", 144), ("xxxhdpi", 192),
    ]:
        out = RES / f"mipmap-{density}" / "ic_launcher.png"
        out_round = RES / f"mipmap-{density}" / "ic_launcher_round.png"
        out_fg = RES / f"mipmap-{density}" / "ic_launcher_foreground.png"
        save_icon_layer(icon, out, size)
        out_round.write_bytes(out.read_bytes())
        foreground_layer(icon, size, out_fg)
        changed += [
            str(out.relative_to(ROOT)),
            str(out_round.relative_to(ROOT)),
            str(out_fg.relative_to(ROOT)),
        ]

    for folder, width, height in [
        ("drawable-mdpi", 320, 470),
        ("drawable-hdpi", 480, 720),
        ("drawable-xhdpi", 720, 1080),
        ("drawable-xxhdpi", 960, 1440),
        ("drawable-xxxhdpi", 1280, 1920),
    ]:
        out = RES / folder / "splash.png"
        out.parent.mkdir(parents=True, exist_ok=True)
        splash((width, height), out)
        changed.append(str(out.relative_to(ROOT)))

    print(f"Generated {len(changed)} assets")
    for c in changed:
        print(" -", c)


if __name__ == "__main__":
    main()

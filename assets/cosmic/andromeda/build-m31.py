#!/usr/bin/env python3
"""Build a display-derived two-channel texture from the official M31 composite.
Requires Pillow. Run offline with an original JPEG, or explicitly use --download.
No synthetic astronomy data. Not a calibrated measurement or 3D reconstruction.
"""
import argparse
import hashlib
import io
import json
from pathlib import Path
from urllib.request import urlopen
from PIL import Image, ImageChops, ImageOps

SOURCE = "https://www.spitzer.caltech.edu/system/avm_images/binaries/2216/larger/sig06-024.jpg?1603798061="
CREDIT = "NASA/JPL-Caltech/K. Gordon (Univ. of Arizona) & GALEX Science Team"
SIZE = 512

def convert(raw):
    with Image.open(io.BytesIO(raw)) as im:
        rgb = im.convert("RGB")
        # Preserve the observed axis ratio; black padding is not invented signal.
        rgb = ImageOps.contain(rgb, (SIZE, SIZE), Image.Resampling.LANCZOS)
        r, g, b = rgb.split()
        uv = ImageChops.lighter(g, b)  # visual proxy, not calibrated UV flux
        packed = Image.merge("RGB", (r, uv, Image.new("L", rgb.size)))
        canvas = Image.new("RGB", (SIZE, SIZE))
        canvas.paste(packed, ((SIZE-rgb.width)//2, (SIZE-rgb.height)//2))
        return canvas

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument("--input", type=Path, help="Original PIA08787 / sig06-024 image")
    mode.add_argument("--download", action="store_true", help="Fetch official Spitzer JPEG")
    ap.add_argument("--output", type=Path, default=Path(__file__).with_name("spitzer-galex.png"))
    args = ap.parse_args()
    if args.download:
        with urlopen(SOURCE, timeout=30) as response:
            raw = response.read(16*1024*1024+1)
        if len(raw)>16*1024*1024:
            raise ValueError("source too large")
    else:
        raw = args.input.read_bytes()
    result = convert(raw)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    result.save(args.output, optimize=True)
    meta = {"source": SOURCE, "credit": CREDIT, "source_sha256": hashlib.sha256(raw).hexdigest(),
            "texture_sha256": hashlib.sha256(args.output.read_bytes()).hexdigest(),
            "size": [SIZE, SIZE], "channels": {"R": "display red / Spitzer MIPS 24um",
            "G": "max(display green, display blue) / GALEX UV proxy", "B": "zero"},
            "calibrated_flux": False, "geometry": "aspect preserved, centered black padding"}
    args.output.with_suffix(".json").write_text(json.dumps(meta, indent=2)+"\n", encoding="utf-8")
    print(json.dumps(meta, indent=2))

if __name__ == "__main__":
    main()

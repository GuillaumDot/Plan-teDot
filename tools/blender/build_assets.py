"""Build real Blender previews and PBR packs without touching app assets.
Run from any directory: python tools/blender/build_assets.py --output /path/to/new-pack
Requires Blender on PATH (or --blender). No network or paid service.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import struct
import subprocess
import tempfile

PRESETS = ("basalt", "ocean", "ice", "desert", "gas")
KINDS = ("albedo", "normal", "roughness")
HERE = Path(__file__).resolve().parent

def run(blender, script, cwd, env, *args):
    command = [blender, "-b", "--python-exit-code", "1", "--python",
               str(HERE / script)]
    if args:
        command += ["--", *map(str, args)]
    subprocess.run(command, cwd=cwd, env=env, check=True)

def png_info(path, expected):
    with path.open("rb") as stream:
        header = stream.read(24)
    if len(header) != 24 or header[:8] != b"\x89PNG\r\n\x1a\n" or header[12:16] != b"IHDR":
        raise ValueError(f"Invalid PNG header: {path}")
    size = struct.unpack(">II", header[16:24])
    if size != expected:
        raise ValueError(f"Unexpected dimensions {size}: {path}")
    return {"bytes": path.stat().st_size,
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            "width": size[0], "height": size[1]}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--blender", default="blender")
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--widths", nargs="+", type=int, choices=(256,512,1024,2048),
                        default=[512,1024])
    args = parser.parse_args()
    output = args.output.resolve()
    if output.exists():
        raise FileExistsError(f"Refusing to overwrite {output}")
    blender = shutil.which(args.blender)
    if not blender:
        raise RuntimeError("Blender executable not found; install Blender or use --blender")
    output.parent.mkdir(parents=True, exist_ok=True)
    env = dict(os.environ, PD_PLANETS=",".join(PRESETS))
    version = subprocess.check_output([blender, "--version"], text=True).splitlines()[0]
    with tempfile.TemporaryDirectory(prefix=".pd-build-", dir=output.parent) as tmp:
        work = Path(tmp)
        pack = work / "pack"
        pack.mkdir()
        previews = pack / "previews"
        previews.mkdir()
        run(blender, "generate.py", work, env)
        source = work / "blender-output"
        inventory = {"blender": version, "files": {}, "packs": {}}
        for name in PRESETS:
            filename = name + "-preview.png"
            shutil.copyfile(source / filename, previews / filename)
            inventory["files"]["previews/" + filename] = png_info(previews / filename, (512,512))
        for width in sorted(set(args.widths)):
            folder = pack / f"pbr-{width}"
            run(blender, "bake_pbr.py", work, env, "--input", source,
                "--output", folder, "--width", width)
            manifest = json.loads((folder / "manifest.json").read_text(encoding="utf-8"))
            if set(manifest["presets"]) != set(PRESETS):
                raise ValueError("Incomplete planet pack")
            for name in PRESETS:
                for kind in KINDS:
                    filename = f"{name}-{kind}.png"
                    if manifest["presets"][name][kind] != filename:
                        raise ValueError("Unexpected manifest path")
                    inventory["files"][f"pbr-{width}/{filename}"] = png_info(
                        folder / filename, (width,width//2))
            inventory["packs"][str(width)] = f"pbr-{width}/manifest.json"
        (pack / "build-inventory.json").write_text(json.dumps(inventory, indent=2), encoding="utf-8")
        if output.exists():
            raise FileExistsError(output)
        pack.rename(output)
    print(f"Asset pack generated: {output}")

if __name__ == "__main__":
    main()

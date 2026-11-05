#!/usr/bin/env python3
"""Draw the demo's hand-drawn coach marks.

    python scripts/art/coach-marks.py            # every mark that has no file yet
    python scripts/art/coach-marks.py curve hook # only these
    python scripts/art/coach-marks.py --redo     # draw again, never overwriting

WHY THESE ARE GENERATED AND NOT DRAWN IN SVG. The look is the point: a pencil
stroke that is visibly a human's, sitting on top of a precise interface, is what
makes a hint read as a hint rather than as chrome. A hand-authored Bezier looks
like a logo. The reference is `doodle-arrow.png` from PROJECTS/15-Flipper, which
is where this style already lives in Alexander's work — every mark is an edit of
it, so they are one family rather than five unrelated doodles.

WHAT IS NOT IN THE IMAGES: text. The captions are real DOM text (CoachMarks.tsx)
so they translate with the browser's own translate, resize with the layout and
recolour in dark mode. Baking German into a PNG would lose all three.

Output: transparent PNGs in apps/web/public/assets/coach/, metadata stripped.
Needs OPENAI_API_KEY (dotPrivate/.env or the environment) and curl. The key is
written to a temp file and passed with -H @file, never on the command line where
it would show up in a process list.
"""
import argparse
import base64
import json
import os
import pathlib
import subprocess
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parent.parent
OUT = REPO / "apps" / "web" / "public" / "assets" / "coach"
REFERENCE = HERE / "reference" / "doodle-arrow.png"

MODEL = "gpt-image-2.6-sunburst"
SIZE = "1024x1024"

# Every mark says only what its PATH is. The style block below carries the rest,
# so the marks cannot drift apart from one another.
STYLE = (
    "Redraw this exact hand-drawn arrow in the same black marker-pen style: a single "
    "confident stroke with a slightly wobbly, imperfect, human quality, the same line "
    "weight as the reference, and a simple open two-line arrowhead. "
    "Pure black ink on a fully transparent background. "
    "No paper, no paper texture, no drop shadow, no colour, no gradient, no frame, "
    "no text, no letters, no numbers, no other object anywhere in the image. "
    "One arrow only, drawn large and filling most of the frame. "
    "Change only the path of the line, as follows: "
)

MARKS = {
    # The reference's own shape, kept so the set has its anchor.
    "loop": "a long diagonal sweeping from the upper right down to the lower left, "
            "with one small open loop where the line crosses itself about halfway along, "
            "arrowhead at the lower left.",
    "curve": "a smooth C-shaped curve sweeping from the upper left down to the lower right, "
             "bulging outward to the left, no loop at all, arrowhead at the lower right.",
    "hook": "a short steep hook: the line comes down from the top, curls tightly to the right "
            "at the bottom like a letter J, arrowhead pointing left at the end of the curl.",
    "rise": "a long shallow line rising from the lower left to the upper right with one small "
            "open loop near the middle, arrowhead at the upper right.",
    # Not an arrow: the ring you draw round a thing you are pointing at.
    "ring": "instead of an arrow, draw a single hand-drawn oval ring, as if circling something "
            "on a printed page: one continuous looping stroke that overshoots slightly where it "
            "closes, wide and flat, completely empty in the middle. No arrowhead.",
}


def api_key() -> str:
    key = os.environ.get("OPENAI_API_KEY")
    if key:
        return key
    env = REPO.parent.parent / ".env"
    if env.is_file():
        for line in env.read_text(encoding="utf-8").splitlines():
            if line.startswith("OPENAI_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit("OPENAI_API_KEY not set and not found in dotPrivate/.env")


MAX_EDGE = 512


def finish(path: pathlib.Path) -> None:
    """Strip metadata, crop the empty margin, and scale to a sane size.

    Three things in one pass because they all need the pixels open:

    * rebuilding from raw pixel data drops the C2PA chunk and every other bit of
      provenance metadata the model attaches;
    * the model fills a 1024 square, so most of each file is transparent nothing
      — cropping to the ink is what lets the overlay position a mark by its own
      bounding box instead of guessing where inside the square the line sits;
    * at 1024 these were 220-465 KB each, which is absurd for a hint someone may
      dismiss in two seconds. Line art at 512 is indistinguishable on screen and
      about fifteen times smaller.

    Alpha is preserved throughout: the whole point of these files is that they
    are a stroke and nothing else.
    """
    try:
        from PIL import Image
    except ImportError:
        print("  (Pillow not installed: file left at full size, metadata in place)", flush=True)
        return
    with Image.open(path) as im:
        im = im.convert("RGBA")
        box = im.getchannel("A").getbbox()
        if box:
            im = im.crop(box)
        w, h = im.size
        scale = min(1.0, MAX_EDGE / max(w, h))
        if scale < 1.0:
            im = im.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
        clean = Image.new("RGBA", im.size)
        clean.putdata(list(im.getdata()))
        clean.save(path, "PNG", optimize=True)


def free_path(name: str) -> pathlib.Path:
    """Never overwrite. A redo writes -v2, -v3 beside the original."""
    out = OUT / f"{name}.png"
    if not out.exists():
        return out
    n = 2
    while (OUT / f"{name}-v{n}.png").exists():
        n += 1
    return OUT / f"{name}-v{n}.png"


def draw(name: str, path_prompt: str, key: str) -> bool:
    with tempfile.TemporaryDirectory() as folder:
        header = pathlib.Path(folder) / "auth.txt"
        header.write_text(f"Authorization: Bearer {key}\n", encoding="utf-8")
        cmd = [
            "curl", "-sS", "--max-time", "1800",
            "https://api.openai.com/v1/images/edits",
            "-H", f"@{header}",
            "-F", f"model={MODEL}",
            "-F", f"size={SIZE}",
            "-F", "quality=high",
            "-F", "background=transparent",
            "-F", "output_format=png",
            "-F", "n=1",
            "-F", f"prompt={STYLE}{path_prompt}",
            "-F", f"image[]=@{REFERENCE};type=image/png",
        ]
        result = subprocess.run(cmd, capture_output=True)

    if result.returncode:
        print(f"{name}: FAILED curl exit {result.returncode} {result.stderr.decode()[:200]}", flush=True)
        return False

    data = json.loads(result.stdout or b"{}")
    if "error" in data or "data" not in data:
        print(f"{name}: FAILED {str(data.get('error', result.stderr.decode()))[:300]}", flush=True)
        return False

    usage = data.get("usage") or {}
    out = free_path(name)
    OUT.mkdir(parents=True, exist_ok=True)
    out.write_bytes(base64.b64decode(data["data"][0]["b64_json"]))
    finish(out)
    tokens = usage.get("output_tokens", 0)
    print(f"{name}: drew {out.relative_to(REPO)} ({out.stat().st_size // 1024} KB, "
          f"{tokens} output tokens, ~${tokens * 30 / 1e6:.3f})", flush=True)
    return True


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("names", nargs="*", help=f"one or more of: {', '.join(MARKS)}")
    ap.add_argument("--redo", action="store_true", help="draw again even if a file exists")
    args = ap.parse_args()

    if not REFERENCE.is_file():
        sys.exit(f"missing style reference: {REFERENCE}")

    wanted = args.names or list(MARKS)
    unknown = [n for n in wanted if n not in MARKS]
    if unknown:
        sys.exit(f"unknown mark(s): {', '.join(unknown)}")

    key = api_key()
    failed = 0
    for name in wanted:
        if not args.redo and (OUT / f"{name}.png").exists():
            print(f"{name}: have it already (--redo to draw another)", flush=True)
            continue
        if not draw(name, MARKS[name], key):
            failed += 1
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())

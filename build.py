"""Build the React client into Vercel's public static asset directory."""
from pathlib import Path
import os
import shutil
import subprocess

ROOT = Path(__file__).resolve().parent
WEBSITE = ROOT / "website"
PUBLIC = ROOT / "public"


def main():
    npm = "npm.cmd" if os.name == "nt" else "npm"
    subprocess.run([npm, "ci"], cwd=WEBSITE, check=True)
    subprocess.run([npm, "run", "build"], cwd=WEBSITE, check=True)
    if PUBLIC.exists():
        shutil.rmtree(PUBLIC)
    shutil.copytree(WEBSITE / "dist", PUBLIC)


if __name__ == "__main__":
    main()

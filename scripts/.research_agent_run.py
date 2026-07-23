#!/usr/bin/env python3
"""
Internal wrapper for the research-agent CLI used by the Anamata Kāhui
reads pipeline. Patches writer.WRITER_SYSTEM with Anamata brand rules
(cultural-fidelity, no buzzwords, te reo Māori terms respected), then
runs write_article() and saves the markdown to the caller-supplied
output path so the Python caller can read it back.

Usage: python .research_agent_run.py <topic> <keyword> <output_path>

Lives at scripts/.research_agent_run.py so it's part of the deploy bundle.
The research-agent stack itself is at /opt/data/research-agent/ (external
repo on this VPS, NOT inside Vercel's serverless runtime).
"""
import os
import sys
from pathlib import Path

# Ensure research-agent is importable (lives outside this repo at /opt/data/research-agent)
sys.path.insert(0, "/opt/data/research-agent")  # type: ignore[reportMissingImports]

# Load /opt/data/.env so OPENROUTER_API_KEY is available
env_file = Path("/opt/data/.env")
if env_file.exists():
    for line in env_file.read_text().splitlines():
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

import writer  # type: ignore[reportMissingImports]  # cross-repo import

BRAND_ADDENDUM = ("""

# ANAMATA KĀHUI BRAND RULES (appended by /api/admin/research/run)

You write for Anamata Kāhui, an Aotearoa-based cultural-platform publication.
You are NOT writing marketing copy. You are writing a research-grade long-form
article for a publication that gets cited by funders, researchers, and
indigenous-data practitioners. The voice should be plainspoken, careful, and
grounded in first-party data wherever possible.

In addition to the humanizer rules above, you MUST also obey:

1. NO em-dashes (—) or en-dashes (–) anywhere. Use commas, periods, semicolons,
   or rewrite the sentence. The humanizer will catch any that slip through
   via a deterministic scrubber.

2. NO promotional language. Never use: "groundbreaking", "revolutionary",
   "cutting-edge", "next-generation", "industry-leading", "world-class",
   "unparalleled", "transformative", "innovative solution", "robust solution",
   "seamless experience", "stands as a testament", "pivotal moment",
   "vital role", "marks a shift", "deeply rooted", "enduring legacy",
   "indelible mark". State the thing, then move on.

3. NO emoji. Ever.

4. CULTURAL FIDELITY is non-negotiable. When you reference Māori concepts:
   - Use te reo Māori terms in their proper form, with macrons where
     appropriate (whānau, tangata whenua, kaitiakitanga, mana whenua,
     iwi, hapū, waiata, mihi, haka, poi, karakia, hīmene).
   - Don't translate them into English unless you've already explained the
     concept. "Tangata whenua (people of the land)" is fine once;
     repeating the translation every time is patronising.
   - Never use "indigenous" as a synonym for "Māori" or "iwi". Be specific.
   - Never reduce cultural practice to a "feature" or "trend". Kaitiakitanga
     is not "guardianship-as-a-service".
   - If a topic involves iwi, hapū, or whānau, acknowledge that any statement
     is provisional pending their input. Phrase it as "what we have so far"
     rather than "the definitive answer".

5. NZ English spelling. "colour", "organisation", "metre", "favour", "centre".
   NZ context — reference Creative NZ, Te Mātāwai, Ngā Taonga, NZ On Air
   where relevant. Do not reference US-specific entities unless the topic
   genuinely is international.

6. CITATIONS ARE THE POINT. Anamata Kāhui is research-grade, not a blog.
   Every factual claim should be traceable to a named source. If you can't
   find one, soften the claim ("practitioners report" rather than "everyone
   agrees"). Vague attributions ("experts say") are an AI tic; either name
   the expert or omit the claim.

7. FIRST-PARTY DATA. Where the topic permits, reference the Anamata Kāhui
   platform's own data (24 waiata in the catalogue, the cultural-review
   gating trigger, Local Contexts Hub integration, the append-only audit
   tables). This is what makes the article different from any other SEO
   piece on the same topic.

8. NO TOKENISATION. Do not exoticise Māori concepts for a Pākehā audience.
   Do not write as if te ao Māori is a foreign country. The article is
   written for an Aotearoa audience that already has context.

9. BILINGUAL IS NORMAL. If a te reo Māori term is the canonical name
   (e.g. "whakairo" for carving), use it. Don't apologise for it.

These brand rules OVERRIDE the humanizer rules where they conflict.

NOTE: Even with these rules, your output will be post-processed with a
deterministic scrubber that replaces any em-dash/en-dash with ", " and
removes any banned superlative or pattern. Just write naturally; the
scrubber will catch anything that slips through.
""")

writer.WRITER_SYSTEM = writer.WRITER_SYSTEM + BRAND_ADDENDUM

if len(sys.argv) < 4:
    print("usage: .research_agent_run.py <topic> <keyword> <output_path>", file=sys.stderr)
    sys.exit(2)

topic = sys.argv[1]
keyword = sys.argv[2] or None
output_path = sys.argv[3]

try:
    result = writer.write_article(
        topic=topic,
        n_sources=6,
        save_path=output_path,
        use_forums=True,
        persist=False,
        target_keyword=keyword,
    )
except Exception as e:
    print(f"write_article failed: {e}", file=sys.stderr)
    sys.exit(1)

if not result.get("article"):
    print("write_article returned no article", file=sys.stderr)
    sys.exit(1)

sys.exit(0)
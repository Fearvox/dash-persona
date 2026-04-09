#!/usr/bin/env python3
"""Fix remaining text replacements in Dash Persona PPTX."""

import re

def replace_text_in_file(filepath, old_text, new_text):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Try exact match first
    old_xml = f'<a:t>{re.escape(old_text)}</a:t>'
    new_xml = f'<a:t>{new_text}</a:t>'
    new_content, count = re.subn(old_xml, new_xml, content)
    
    if count > 0:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"  ✓ Replaced in {filepath.split('/')[-1]}: '{old_text[:50]}' -> '{new_text[:50]}'")
        return True
    else:
        print(f"  ✗ Not found: '{old_text[:60]}' in {filepath.split('/')[-1]}")
        return False

SLIDES_DIR = "/Users/0xvox/.openclaw/workspace/dash-persona/pptx-unpacked/ppt/slides"

# Slide 1: Replace "ZONIC DESIGN STUDIO" subtitle with "Creator Intelligence Engine"
s1 = f"{SLIDES_DIR}/slide1.xml"
replace_text_in_file(s1, "ZONIC DESIGN STUDIO", "Creator Intelligence Engine")

# Slide 4 (What Is Dash Persona): Expand "Open-Source Engine" card description  
s4 = f"{SLIDES_DIR}/slide4.xml"
replace_text_in_file(s4, 
    "Feed it your data from any Creator Center export or live collection through the DASH Collector. One unified view across every platform.",
    "Feed it data from any Creator Center export or live collection via the DASH Collector. One unified view across Douyin, TikTok, and Red Note with full data lineage.")

# Slide 5 (What It Actually Does): Expand CONTENT CALENDAR description
s5 = f"{SLIDES_DIR}/slide5.xml"
replace_text_in_file(s5,
    "Computed from your own best-performing time slots. The Next Content Engine ranks ideas using seven deterministic rules with engagement velocity signals.",
    "The Next Content Engine ranks ideas using seven deterministic rules with engagement velocity signals, computed from your own best-performing time slots. Fully traceable recommendations.")

# Slide 6 (How We Built It): Expand CLAUDE CODE description
s6 = f"{SLIDES_DIR}/slide6.xml"
replace_text_in_file(s6,
    "Deep implementation: statistics library, signal framework, and all 11 analysis engines.",
    "Deep implementation: statistics library, signal framework with 18 intelligence signals, and all 11 deterministic analysis engines — Hazen percentile, OLS regression, adaptive threshold, and more.")
replace_text_in_file(s6,
    "Handles the core engineering: writing deterministic algorithms with full test coverage.",
    "Core engineering: writing deterministic algorithms with 308+ unit tests and 15 E2E cases. Every score traces back to an open, readable formula.")

# Slide 8 (The Full Stack): Expand EverMemOS description
s8 = f"{SLIDES_DIR}/slide8.xml"
replace_text_in_file(s8,
    "Writing the statistics library, signal framework, and all analysis engines with deterministic algorithms.",
    "Writing the statistics library, signal framework with 18 intelligence signals across 5 categories, and all 11 deterministic analysis engines with full test coverage.")
replace_text_in_file(s8,
    "Every number is explainable. Every recommendation is traceable. The engineering process that built it never lost context.",
    "Every number is explainable. Every recommendation is traceable. The engineering process that built Dash Persona never lost context — thanks to EverMemOS.")

print("\n✓ Text replacements complete")

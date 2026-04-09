#!/usr/bin/env python3
"""Edit Dash Persona PPTX - add DASH logos and technical details."""

import os
import re
import shutil
from xml.etree import ElementTree as ET

SLIDES_DIR = "/Users/0xvox/.openclaw/workspace/dash-persona/pptx-unpacked/ppt/slides"
MEDIA_DIR = "/Users/0xvox/.openclaw/workspace/dash-persona/pptx-unpacked/ppt/media"

# Namespaces
NS = {
    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
    'rel': 'http://schemas.openxmlformats.org/package/2006/relationships',
}

for prefix, uri in NS.items():
    ET.register_namespace(prefix, uri)
ET.register_namespace('', 'http://schemas.openxmlformats.org/package/2006/relationships')

def get_max_id(tree):
    """Find max id in slide."""
    root = tree.getroot()
    ids = []
    for el in root.iter():
        id_val = el.get('id')
        if id_val and id_val.isdigit():
            ids.append(int(id_val))
    return max(ids) if ids else 1000

def get_max_rid(rels_path):
    """Find max rId in rels file."""
    tree = ET.parse(rels_path)
    root = tree.getroot()
    rids = []
    for rel in root:
        rid = rel.get('Id', '')
        if rid.startswith('rId') and rid[3:].isdigit():
            rids.append(int(rid[3:]))
    return max(rids) if rids else 10

def add_logo_relationship(rels_path, logo_file):
    """Add logo image relationship to slide rels."""
    tree = ET.parse(rels_path)
    root = tree.getroot()
    
    # Check if already exists
    for rel in root:
        if 'logo' in rel.get('Target', '').lower():
            return rel.get('Id')
    
    max_rid = get_max_rid(rels_path)
    new_rid = f"rId{max_rid + 1}"
    
    new_rel = ET.SubElement(root, 'Relationship')
    new_rel.set('Id', new_rid)
    new_rel.set('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image')
    new_rel.set('Target', f'../media/{logo_file}')
    
    tree.write(rels_path, xml_declaration=True, encoding='ascii')
    return new_rid

def add_logo_to_slide(slide_path, logo_file, rid, position='top-left'):
    """Add logo image element to slide XML after the spTree opening."""
    with open(slide_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Logo position: top-left corner, approx 150pt wide x 35pt tall in EMU
    # 1 inch = 914400 EMU. At ~20% width: 1449000 cx, ~320000 cy
    logo_cx = "1449000"
    logo_cy = "320000"
    logo_x = "350000"   # ~0.38 inches from left
    logo_y = "150000"   # ~0.16 inches from top
    
    # Find the grpSpPr element (after nvGrpSpPr) to insert pic after it
    # Actually insert as first child of spTree (right after grpSpPr)
    
    pic_xml = f'''<p:pic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
        <p:nvPicPr>
          <p:cNvPr id="9999" name="DASH Logo"/>
          <p:cNvPicPr/>
          <p:nvPr/>
        </p:nvPicPr>
        <p:blipFill>
          <a:blip r:embed="{rid}"/>
          <a:stretch>
            <a:fillRect/>
          </a:stretch>
        </p:blipFill>
        <p:spPr>
          <a:xfrm>
            <a:off x="{logo_x}" y="{logo_y}"/>
            <a:ext cx="{logo_cx}" cy="{logo_cy}"/>
          </a:xfrm>
          <a:prstGeom prst="rect">
            <a:avLst/>
          </a:prstGeom>
        </p:spPr>
      </p:pic>'''
    
    # Insert after </p:grpSpPr> and before first <p:sp> or <p:pic>
    # Find position after grpSpPr closing tag
    pattern = r'(</p:grpSpPr>)'
    match = re.search(pattern, content)
    if match:
        insert_pos = match.end()
        new_content = content[:insert_pos] + pic_xml + content[insert_pos:]
        with open(slide_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"  Added logo to {os.path.basename(slide_path)}")
    else:
        print(f"  WARNING: Could not find grpSpPr in {slide_path}")

def replace_text_in_slide(slide_path, old_text, new_text):
    """Replace text content in slide."""
    with open(slide_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find the text run containing old_text and replace just the text
    # Use a more targeted approach
    pattern = rf'(<a:t>){re.escape(old_text)}(</a:t>)'
    replacement = rf'\g<1>{new_text}\2'
    new_content, count = re.subn(pattern, replacement, content)
    
    if count > 0:
        with open(slide_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"  Replaced '{old_text}' -> '{new_text}' in {os.path.basename(slide_path)}")
    else:
        print(f"  WARNING: Could not find '{old_text}' in {os.path.basename(slide_path)}")

def change_shape_text(slide_path, shape_name_substring, new_text):
    """Change text in a shape matching the name substring."""
    tree = ET.parse(slide_path)
    root = tree.getroot()
    
    changed = False
    for sp in root.iter('{http://schemas.openxmlformats.org/presentationml/2006/main}sp'):
        nvSpPr = sp.find('p:nvSpPr', NS)
        if nvSpPr is None:
            continue
        cNvPr = nvSpPr.find('p:cNvPr', NS)
        if cNvPr is None:
            continue
        name = cNvPr.get('name', '')
        if shape_name_substring.lower() in name.lower():
            # Find text runs and replace
            for t in sp.iter('{http://schemas.openxmlformats.org/drawingml/2006/main}t'):
                if t.text and t.text.strip():
                    t.text = new_text
                    changed = True
                    print(f"  Changed shape '{name}': -> '{new_text}'")
    
    if changed:
        tree.write(slide_path, xml_declaration=True, encoding='utf-8')
    return changed

# ==== SLIDE-BY-SLIDE EDITS ====

# SLIDE 1: Dark background - add dark logo, change subtitle
slide1 = f"{SLIDES_DIR}/slide1.xml"
rels1 = f"{SLIDES_DIR}/_rels/slide1.xml.rels"
print("\n=== Slide 1 ===")
rid1 = add_logo_relationship(rels1, "logo-dark.png")
add_logo_to_slide(slide1, "logo-dark.png", rid1)
replace_text_in_slide(slide1, "Deterministic. Open-Source. Local-First.", "Creator Intelligence Engine")
replace_text_in_slide(slide1, "A Zonic Design Studio Project", "dash-persona.vercel.app")

# SLIDE 2: White bg - add light logo
slide2 = f"{SLIDES_DIR}/slide2.xml"
rels2 = f"{SLIDES_DIR}/_rels/slide2.xml.rels"
print("\n=== Slide 2 ===")
rid2 = add_logo_relationship(rels2, "logo-light.png")
add_logo_to_slide(slide2, "logo-light.png", rid2)
# Add more problem detail - replace the last paragraph text
replace_text_in_slide(slide2, "Context dies between AI sessions. You spec 18 signals on Monday, by Wednesday the agent forgot half.", 
    "Multi-platform creators face a data fragmentation crisis. Douyin, TikTok, and Red Note each speak a different metric language.")

# SLIDE 3: White bg - add light logo, add stats detail
slide3 = f"{SLIDES_DIR}/slide3.xml"
rels3 = f"{SLIDES_DIR}/_rels/slide3.xml.rels"
print("\n=== Slide 3 ===")
rid3 = add_logo_relationship(rels3, "logo-light.png")
add_logo_to_slide(slide3, "logo-light.png", rid3)

# SLIDE 4: Features - add light logo  
slide4 = f"{SLIDES_DIR}/slide4.xml"
rels4 = f"{SLIDES_DIR}/_rels/slide4.xml.rels"
print("\n=== Slide 4 ===")
rid4 = add_logo_relationship(rels4, "logo-light.png")
add_logo_to_slide(slide4, "logo-light.png", rid4)

# SLIDE 5: How We Built It - add light logo, add tech detail
slide5 = f"{SLIDES_DIR}/slide5.xml"
rels5 = f"{SLIDES_DIR}/_rels/slide5.xml.rels"
print("\n=== Slide 5 ===")
rid5 = add_logo_relationship(rels5, "logo-light.png")
add_logo_to_slide(slide5, "logo-light.png", rid5)
# Add tech detail to description
replace_text_in_slide(slide5, "Handles the core engineering: writing deterministic algorithms with full test coverage.",
    "Handles the core engineering: writing 11 deterministic analysis engines with 308+ unit tests covering Hazen percentile, OLS regression, and adaptive threshold algorithms.")
replace_text_in_slide(slide5, "Deep implementation: statistics library, signal framework, and all 11 analysis engines.",
    "Deep implementation: signal collection framework, statistics library with 18 intelligence signals across 5 categories, and all 11 deterministic engines.")

# SLIDE 6: Full Stack - add light logo, add adapters detail
slide6 = f"{SLIDES_DIR}/slide6.xml"
rels6 = f"{SLIDES_DIR}/_rels/slide6.xml.rels"
print("\n=== Slide 6 ===")
rid6 = add_logo_relationship(rels6, "logo-light.png")
add_logo_to_slide(slide6, "logo-light.png", rid6)
replace_text_in_slide(slide6, "Electron Collector, Chrome Extension, and 7 data adapters.",
    "Electron 33 Collector app, Chrome MV3 Extension, and 7 data adapters: CDP, FileImport, HTMLParse, Browser, Extension, Demo.")

# SLIDE 7: EverMemOS - dark bg - add dark logo, expand descriptions
slide7 = f"{SLIDES_DIR}/slide7.xml"
rels7 = f"{SLIDES_DIR}/_rels/slide7.xml.rels"
print("\n=== Slide 7 ===")
rid7 = add_logo_relationship(rels7, "logo-dark.png")
add_logo_to_slide(slide7, "logo-dark.png", rid7)
# Expand episodic memory description
replace_text_in_slide(slide7, "Captures what happened in each session. Original requirements from day one are still accessible.",
    "Captures every session event: code decisions, rejected approaches, design trade-offs, and original requirements. Nothing is ever lost.")
replace_text_in_slide(slide7, "Captures what matters: architectural decisions, design constraints, and project conventions.",
    "Stores persistent project knowledge: naming conventions, tech stack decisions, performance budgets, and team workflow preferences.")

# SLIDE 8: Full Stack - EDE8D8 bg - add light logo
slide8 = f"{SLIDES_DIR}/slide8.xml"
rels8 = f"{SLIDES_DIR}/_rels/slide8.xml.rels"
print("\n=== Slide 8 ===")
rid8 = add_logo_relationship(rels8, "logo-light.png")
add_logo_to_slide(slide8, "logo-light.png", rid8)
# Expand EverMemOS description
replace_text_in_slide(slide8, "Persistent structured recall so context never dies between sessions. Episodic and trait memory working together.",
    "Persistent structured recall: episodic memory captures session history, trait memory preserves project conventions. Both Claude Code and OpenClaw share the same memory layer.")

# SLIDE 9: CTA - white bg - add light logo
slide9 = f"{SLIDES_DIR}/slide9.xml"
rels9 = f"{SLIDES_DIR}/_rels/slide9.xml.rels"
print("\n=== Slide 9 ===")
rid9 = add_logo_relationship(rels9, "logo-light.png")
add_logo_to_slide(slide9, "logo-light.png", rid9)

print("\n=== All edits complete ===")

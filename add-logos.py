#!/usr/bin/env python3
"""Add DASH logos to all slides in the current unpacked PPTX."""

import os, re
from xml.etree import ElementTree as ET

SLIDES_DIR = "/Users/0xvox/.openclaw/workspace/dash-persona/pptx-unpacked/ppt/slides"
MEDIA_DIR  = "/Users/0xvox/.openclaw/workspace/dash-persona/pptx-unpacked/ppt/media"
CT_PATH    = "/Users/0xvox/.openclaw/workspace/dash-persona/pptx-unpacked/[Content_Types].xml"

NS = {
    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
    'rel': 'http://schemas.openxmlformats.org/package/2006/relationships',
}

# Register all namespaces
for prefix, uri in NS.items():
    ET.register_namespace(prefix, uri)

# Slide backgrounds → which logo to use
# dark bg: 000000 → logo-dark.png
# light bg: anything else → logo-light.png
LOGO_MAP = {
    1: 'logo-light.png',
    2: 'logo-light.png',
    3: 'logo-dark.png',
    4: 'logo-light.png',
    5: 'logo-light.png',
    6: 'logo-light.png',
    7: 'logo-dark.png',
    8: 'logo-light.png',
    9: 'logo-light.png',
}

def get_max_rid(rels_path):
    tree = ET.parse(rels_path)
    root = tree.getroot()
    rids = []
    for rel in root:
        rid = rel.get('Id', '')
        if rid.startswith('rId') and rid[3:].isdigit():
            rids.append(int(rid[3:]))
    return max(rids) if rids else 10

def add_logo_rels(slide_num):
    """Add logo relationship to slide rels. Returns the new rId."""
    rels_path = f"{SLIDES_DIR}/_rels/slide{slide_num}.xml.rels"
    logo_file = LOGO_MAP[slide_num]
    
    tree = ET.parse(rels_path)
    root = tree.getroot()
    
    # Check if already has this logo
    for rel in root:
        if rel.get('Target', '') == f'../media/{logo_file}':
            return rel.get('Id')
    
    max_rid = get_max_rid(rels_path)
    new_rid = f"rId{max_rid + 1}"
    
    new_rel = ET.SubElement(root, 'Relationship')
    new_rel.set('Id', new_rid)
    new_rel.set('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image')
    new_rel.set('Target', f'../media/{logo_file}')
    
    tree.write(rels_path, xml_declaration=True, encoding='utf-8')
    return new_rid

def add_logo_to_slide(slide_path, logo_rid):
    """Add logo <p:pic> element to slide XML after <p:grpSpPr>."""
    with open(slide_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if already has logo
    if f'r:embed="{logo_rid}"' in content:
        return
    
    # Logo size: ~150pt wide x 33pt tall → EMU: 1371600 × 301752
    logo_cx = "1371600"
    logo_cy = "301752"
    logo_x  = "300000"
    logo_y  = "150000"
    
    pic_xml = f'''<p:pic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
        <p:nvPicPr><p:cNvPr id="9999" name="DASH Logo"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr>
        <p:blipFill><a:blip r:embed="{logo_rid}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>
        <p:spPr>
          <a:xfrm><a:off x="{logo_x}" y="{logo_y}"/><a:ext cx="{logo_cx}" cy="{logo_cy}"/></a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
      </p:pic>'''
    
    # Insert right after </p:grpSpPr>
    marker = '</p:grpSpPr>'
    idx = content.find(marker)
    if idx == -1:
        print(f"  WARNING: no grpSpPr in {slide_path}")
        return
    insert_pos = idx + len(marker)
    new_content = content[:insert_pos] + pic_xml + content[insert_pos:]
    
    with open(slide_path, 'w', encoding='utf-8') as f:
        f.write(new_content)

def add_to_content_types():
    """Add PNG extension if not already present."""
    tree = ET.parse(CT_PATH)
    root = tree.getroot()
    ct_ns = 'http://schemas.openxmlformats.org/package/2006/content-types'
    
    has_png = False
    for el in root:
        if el.get('Extension') == 'png':
            has_png = True
            break
    
    if not has_png:
        default = ET.SubElement(root, 'Default')
        default.set('Extension', 'png')
        default.set('ContentType', 'image/png')
        tree.write(CT_PATH, xml_declaration=True, encoding='utf-8')

# Add Content-Type for PNG if missing
add_to_content_types()

# Process each slide
for slide_num in range(1, 10):
    slide_path = f"{SLIDES_DIR}/slide{slide_num}.xml"
    print(f"Slide {slide_num}: ", end='')
    
    # Add to rels
    rid = add_logo_rels(slide_num)
    print(f"rId={rid} ({LOGO_MAP[slide_num]})", end=' → ')
    
    # Add picture element
    add_logo_to_slide(slide_path, rid)
    print('logo added')

print('\nDone.')

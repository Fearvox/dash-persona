#!/usr/bin/env python3
"""Fix rels files: add logo Relationship with correct namespace prefix."""

import re, os

SLIDES_DIR = "/Users/0xvox/.openclaw/workspace/dash-persona/pptx-unpacked/ppt/slides"

LOGO_MAP = {
    1: 'logo-light.png', 2: 'logo-light.png', 3: 'logo-dark.png',
    4: 'logo-light.png', 5: 'logo-light.png', 6: 'logo-light.png',
    7: 'logo-dark.png',  8: 'logo-light.png', 9: 'logo-light.png',
}

def fix_rels(slide_num):
    rels_path = f"{SLIDES_DIR}/_rels/slide{slide_num}.xml.rels"
    logo_file = LOGO_MAP[slide_num]
    
    with open(rels_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if already has logo
    if f'../media/{logo_file}' in content:
        print(f"Slide {slide_num}: already has {logo_file}")
        return
    
    # Find max rId
    rids = [int(m.group(1)) for m in re.finditer(r'Id="rId(\d+)"', content)]
    new_rid = f"rId{max(rids) + 1}"
    
    # Add namespace to Relationship element
    # The namespace prefix is 'rel' in the original file
    new_rel = f'\n  <rel:Relationship Id="{new_rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/{logo_file}" />'
    
    # Insert before closing tag
    content = content.replace('\n</rel:Relationships>', new_rel + '\n</rel:Relationships>')
    
    with open(rels_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Slide {slide_num}: added {logo_file} as {new_rid}")

for n in range(1, 10):
    fix_rels(n)
print('Done.')

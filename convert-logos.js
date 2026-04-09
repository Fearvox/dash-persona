const sharp = require('sharp');
const fs = require('fs');

async function convert() {
    // Light bg logo (for light slides)
    const lightSvg = `<svg viewBox="0 0 180 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(0, 10)">
    <line x1="1" y1="10" x2="31" y2="10" stroke="#35584C" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="11" y1="18" x2="21" y2="2" stroke="#35584C" stroke-width="2.5" stroke-linecap="round"/>
  </g>
  <text x="38" y="29" font-family="'Plus Jakarta Sans', 'Geist', sans-serif" font-weight="800" font-size="28" letter-spacing="-0.06em" fill="#10291F">DASH</text>
</svg>`;
    
    // Dark bg logo (for dark elements)
    const darkSvg = `<svg viewBox="0 0 180 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(0, 10)">
    <line x1="1" y1="10" x2="31" y2="10" stroke="#F0EE9B" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="11" y1="18" x2="21" y2="2" stroke="#F0EE9B" stroke-width="2.5" stroke-linecap="round"/>
  </g>
  <text x="38" y="29" font-family="'Plus Jakarta Sans', 'Geist', sans-serif" font-weight="800" font-size="28" letter-spacing="-0.06em" fill="#ddd6c7">DASH</text>
</svg>`;
    
    await sharp(Buffer.from(lightSvg)).png().toFile('pptx-unpacked/ppt/media/logo-light.png');
    await sharp(Buffer.from(darkSvg)).png().toFile('pptx-unpacked/ppt/media/logo-dark.png');
    console.log('Logos converted');
}

convert().catch(console.error);

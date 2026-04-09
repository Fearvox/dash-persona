const sharp = require('sharp');
const path = require('path');

async function main() {
    const mediaDir = '/Users/0xvox/.openclaw/workspace/dash-persona/pptx-unpacked/ppt/media';

    // Light logo (dark green text + teal dash on cream/white/light-sand backgrounds)
    const lightSvg = `<svg viewBox="0 0 200 45" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(0, 11)">
    <line x1="1" y1="11" x2="34" y2="11" stroke="#35584C" stroke-width="3" stroke-linecap="round"/>
    <line x1="12" y1="20" x2="23" y2="2" stroke="#35584C" stroke-width="3" stroke-linecap="round"/>
  </g>
  <text x="42" y="32" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="30" letter-spacing="-0.04em" fill="#10291F">DASH</text>
</svg>`;

    // Dark logo (yellow-green dash on dark/black backgrounds)
    const darkSvg = `<svg viewBox="0 0 200 45" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(0, 11)">
    <line x1="1" y1="11" x2="34" y2="11" stroke="#F0EE9B" stroke-width="3" stroke-linecap="round"/>
    <line x1="12" y1="20" x2="23" y2="2" stroke="#F0EE9B" stroke-width="3" stroke-linecap="round"/>
  </g>
  <text x="42" y="32" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="30" letter-spacing="-0.04em" fill="#ddd6c7">DASH</text>
</svg>`;

    await sharp(Buffer.from(lightSvg)).png().toFile(path.join(mediaDir, 'logo-light.png'));
    await sharp(Buffer.from(darkSvg)).png().toFile(path.join(mediaDir, 'logo-dark.png'));
    console.log('Logos generated');
}

main().catch(console.error);

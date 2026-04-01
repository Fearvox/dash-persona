const path = require('path');
const fs = require('fs');

/** Copy install-mac.sh next to .app in the staging dir so it appears in the DMG root. */
exports.default = async function (context) {
  if (context.electronPlatformName !== 'darwin') return;

  const src = path.join(__dirname, 'scripts', 'install-mac.sh');
  const dest = path.join(context.appOutDir, 'install-mac.sh');
  fs.copyFileSync(src, dest);
  fs.chmodSync(dest, 0o755);
  console.log('[afterPack] Copied install-mac.sh to DMG staging directory');
};

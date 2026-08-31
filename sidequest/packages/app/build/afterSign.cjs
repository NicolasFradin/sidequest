const { execFileSync } = require("node:child_process");
const path = require("node:path");

/**
 * Signe l'app en ad-hoc (`codesign --sign -`, gratuit, pas de certificat Apple Developer) après
 * l'empaquetage macOS. `mac.identity: null` dans package.json dit à electron-builder de ne pas
 * chercher de vrai certificat — sans ce hook, l'app sort complètement non signée, et macOS refuse
 * alors *tout* enregistrement en lancement au démarrage (`app.setLoginItemSettings` échoue avec
 * "Operation not permitted", SMAppService exige au minimum une signature ad-hoc). Une signature
 * ad-hoc suffit pour ça, mais ne lève pas l'avertissement Gatekeeper au premier lancement (ça,
 * il faudrait un vrai certificat payant + notarisation — voir le README, section Install).
 */
exports.default = async function afterSign(context) {
  if (context.electronPlatformName !== "darwin") return;
  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  execFileSync("codesign", ["--force", "--deep", "--sign", "-", appPath]);
};

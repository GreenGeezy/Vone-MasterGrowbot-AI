import fs from 'node:fs';
import path from 'node:path';

const packageRoot = path.resolve('node_modules/@revenuecat/purchases-capacitor');
const packageJsonPath = path.join(packageRoot, 'package.json');
const pluginPath = path.join(
  packageRoot,
  'android/src/main/java/com/revenuecat/purchases/capacitor/PurchasesPlugin.kt',
);

if (!fs.existsSync(packageJsonPath) || !fs.existsSync(pluginPath)) {
  throw new Error('RevenueCat Capacitor Android sources were not installed.');
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
if (packageJson.version !== '11.3.2') {
  throw new Error(`RevenueCat native patch expects 11.3.2, found ${packageJson.version}.`);
}

const source = fs.readFileSync(pluginPath, 'utf8');
const corrected = /@PluginMethod\(returnType = PluginMethod\.RETURN_PROMISE\)\r?\n\s+fun configure\(call: PluginCall\)/;
if (corrected.test(source)) {
  console.log('RevenueCat configure bridge already uses RETURN_PROMISE.');
  process.exit(0);
}

const original = /@PluginMethod\(returnType = PluginMethod\.RETURN_NONE\)(\r?\n\s+fun configure\(call: PluginCall\))/;
if (!original.test(source)) {
  throw new Error('RevenueCat configure bridge signature changed; refusing an unsafe patch.');
}

fs.writeFileSync(pluginPath, source.replace(original, '@PluginMethod(returnType = PluginMethod.RETURN_PROMISE)$1'));
console.log('Patched RevenueCat configure bridge to honor its Promise contract.');

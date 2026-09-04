/**
 * Pre-publish script — resolves workspace:* dependencies to actual versions
 * before npm publish. Prevents leaked workspace protocol in published packages.
 *
 * Usage: node scripts/fix-workspace-deps.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const PKGS_DIR = join(import.meta.dirname, '..', 'packages');

// Build version map from all packages
const versions = {};
for (const dir of readdirSync(PKGS_DIR)) {
  try {
    const pkg = JSON.parse(readFileSync(join(PKGS_DIR, dir, 'package.json'), 'utf8'));
    versions[pkg.name] = pkg.version;
  } catch {}
}

console.log('Version map:', versions);

// Fix workspace:* in all packages
let totalFixed = 0;
for (const dir of readdirSync(PKGS_DIR)) {
  const pkgPath = join(PKGS_DIR, dir, 'package.json');
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    let changed = false;

    for (const depType of ['dependencies', 'devDependencies', 'peerDependencies']) {
      if (pkg[depType]) {
        for (const [name, version] of Object.entries(pkg[depType])) {
          if (typeof version === 'string' && version.startsWith('workspace:')) {
            if (versions[name]) {
              pkg[depType][name] = versions[name];
              changed = true;
              totalFixed++;
              console.log(`  ${pkg.name}: ${name} ${version} -> ${versions[name]}`);
            } else {
              console.warn(`  WARNING: ${pkg.name} depends on ${name} but version not found!`);
            }
          }
        }
      }
    }

    if (changed) {
      writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
      console.log(`Fixed: ${pkg.name}`);
    }
  } catch {}
}

console.log(`\nDone. Fixed ${totalFixed} workspace:* dependencies.`);

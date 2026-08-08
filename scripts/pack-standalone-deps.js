#!/usr/bin/env node
// 收集 embedded-postgres 及其全部依赖树,复制到目标 node_modules
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC_NM = path.join(ROOT, 'node_modules');
const TARGET_NM = process.argv[2] || path.join(ROOT, 'pack', 'node_modules');

function readPkg(pkgDir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));
  } catch {
    return null;
  }
}

function depsOf(pkg) {
  if (!pkg) return [];
  return Object.keys(pkg.dependencies || {});
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

function collect(entry, seen = new Set(), result = []) {
  if (seen.has(entry)) return result;
  seen.add(entry);
  const pkgDir = path.join(SRC_NM, entry);
  if (!fs.existsSync(path.join(pkgDir, 'package.json'))) {
    console.warn(`  !! missing package: ${entry}`);
    return result;
  }
  result.push(entry);
  const pkg = readPkg(pkgDir);
  for (const dep of depsOf(pkg)) {
    if (dep.startsWith('@')) {
      const scope = dep;
      const scopedDir = path.join(SRC_NM, scope);
      if (fs.existsSync(scopedDir)) {
        for (const sub of fs.readdirSync(scopedDir)) {
          collect(`${scope}/${sub}`, seen, result);
        }
      }
    } else {
      collect(dep, seen, result);
    }
  }
  return result;
}

const entries = process.env.PACK_EXTRA_PACKAGES
  ? process.env.PACK_EXTRA_PACKAGES.split(',').map((s) => s.trim()).filter(Boolean)
  : ['embedded-postgres', '@embedded-postgres/windows-x64'];

const packages = [];
for (const entry of entries) {
  collect(entry, new Set(), packages);
}

console.log(`Copying ${packages.length} packages for standalone runtime...`);
let copied = 0;
for (const pkg of packages) {
  const src = path.join(SRC_NM, pkg);
  const dest = path.join(TARGET_NM, pkg);
  copyDir(src, dest);
  copied++;
}
console.log(`Done, copied ${copied} packages to ${TARGET_NM}`);

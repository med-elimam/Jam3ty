const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const mobileModules = path.resolve(projectRoot, 'node_modules');

const config = getDefaultConfig(projectRoot);

// ──────────────────────────────────────────────────────────────────────
// pnpm monorepo: watch the workspace root so Metro can find workspace
// packages (e.g. @workspace/api-client-react) that live outside
// artifacts/mobile, and prefer mobile's node_modules first.
// ──────────────────────────────────────────────────────────────────────
config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  mobileModules,
  path.resolve(workspaceRoot, 'node_modules'),
];

// ──────────────────────────────────────────────────────────────────────
// CRITICAL FIX — Duplicate-package prevention for pnpm monorepos
//
// pnpm's .pnpm store creates separate copies of the same package when
// different workspace members have different peer-dep trees. Metro then
// bundles BOTH copies, which causes:
//
//   1. "Invalid hook call / useState null"  (two React copies)
//   2. "No QueryClient set"                 (two @tanstack/react-query copies)
//   3. Any other context-based provider/consumer mismatch
//
// Fix: for EVERY direct dependency of the mobile app (except workspace
// packages), force Metro to always resolve from mobile's node_modules.
// This guarantees a single copy of react, @tanstack/react-query, and
// every other package that uses React context internally.
// ──────────────────────────────────────────────────────────────────────
const mobilePkg = require('./package.json');
const directDeps = [
  ...Object.keys(mobilePkg.dependencies || {}),
  ...Object.keys(mobilePkg.devDependencies || {}),
].filter((name) => !name.startsWith('@workspace/'));

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Skip relative and absolute imports — only intercept bare specifiers
  if (moduleName.startsWith('.') || moduleName.startsWith('/')) {
    return context.resolveRequest(context, moduleName, platform);
  }

  // Check if this import matches any direct dependency (exact or subpath)
  const match = directDeps.find(
    (pkg) => moduleName === pkg || moduleName.startsWith(pkg + '/'),
  );

  if (match) {
    try {
      return {
        filePath: require.resolve(moduleName, { paths: [mobileModules] }),
        type: 'sourceFile',
      };
    } catch {
      // Fall through to Metro's default resolver
    }
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

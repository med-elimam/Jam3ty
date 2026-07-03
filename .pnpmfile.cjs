function readPackage(pkg) {
  // Auto-approve esbuild builds for Railway deployment
  if (pkg.name === 'esbuild') {
    delete pkg.scripts?.build;
  }
  return pkg;
}

module.exports = {
  hooks: {
    readPackage,
  },
};

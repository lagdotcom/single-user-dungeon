/*eslint-env node*/

/**
 * @param {string} mode
 * @param {import('esbuild').BuildOptions} [options={}] custom options
 * @returns {import('esbuild').BuildOptions} combined options
 */
export default function getBuildConfig(mode, options = {}) {
  return {
    entryPoints: ["src/main.ts"],
    bundle: true,
    outfile: "docs/bundle.js",
    target: "es2018",
    define: {
      MODE: JSON.stringify(mode),
      [`process.env.APP_BUILD_VERSION`]: JSON.stringify(
        process.env.npm_package_version
      ),
    },
    ...options,
  };
}

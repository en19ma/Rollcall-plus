/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // No eslint config/deps are vendored in this scaffold — skip lint-on-build so a
  // non-interactive Docker build doesn't fail or hang. Add `eslint` + `eslint-config-next`
  // and remove this once you wire up linting.
  eslint: {
    ignoreDuringBuilds: true,
  },
};
export default nextConfig;

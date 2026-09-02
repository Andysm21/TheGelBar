import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // StrictMode double-invokes effects in dev, which corrupts GSAP
  // ScrollTrigger's scroll-range measurement for the NailProcess
  // section (confirmed while building the standalone mockup — see
  // plan doc). Keep this off.
  reactStrictMode: false,
};

export default withNextIntl(nextConfig);

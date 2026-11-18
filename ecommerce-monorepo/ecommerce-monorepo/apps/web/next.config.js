/** @type {import('next').NextConfig} */

// Личные и служебные разделы: не индексировать (дополнительно к Disallow в robots.txt)
const PRIVATE_SECTIONS = [
  'admin',
  'cart',
  'checkout',
  'orders',
  'profile',
  'favorites',
  'login',
  'register',
  'reset-password',
  'restore',
  'verify-email',
];

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ecommerce/shared'],
  async headers() {
    return PRIVATE_SECTIONS.map((section) => ({
      source: `/${section}/:path*`,
      headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
    }));
  },
};

module.exports = nextConfig;

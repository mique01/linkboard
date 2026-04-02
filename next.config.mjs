/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard.html',
        permanent: false,
      },
      {
        source: '/dashboard',
        destination: '/dashboard.html',
        permanent: false,
      },
    ]
  },
}

export default nextConfig

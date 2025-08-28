/** @type {import('next').NextConfig} */
const nextConfig = {
	// Disable static export for development to enable API routes
	// output: 'export',
	eslint: {
		ignoreDuringBuilds: true,
	},
	images: { unoptimized: true },
};

module.exports = nextConfig;

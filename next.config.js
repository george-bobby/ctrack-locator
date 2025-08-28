/** @type {import('next').NextConfig} */
const nextConfig = {
	// Enable static export only for production builds without API routes
	// For development and API routes, comment out the output line
	...(process.env.NODE_ENV === 'production' &&
	process.env.DISABLE_API_ROUTES === 'true'
		? { output: 'export' }
		: {}),
	eslint: {
		ignoreDuringBuilds: true,
	},
	images: { unoptimized: true },
};

module.exports = nextConfig;

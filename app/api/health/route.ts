import { NextResponse } from 'next/server';

export async function GET() {
	return NextResponse.json({
		status: 'healthy',
		message: 'C-Track Locator Next.js API is running!',
		timestamp: new Date().toISOString(),
		roboflow_configured: !!process.env.ROBOFLOW_API_KEY,
		endpoints: [
			'GET /api/health - Server status',
			'POST /api/predict - Unified prediction endpoint (AI-only, GPS-only, or hybrid based on weights)',
		],
		prediction_modes: {
			'ai-only': 'Set gps_weight=0 or omit GPS coordinates',
			'gps-only': 'Set ai_weight=0 or omit image file',
			'hybrid': 'Provide both image and GPS coordinates with custom weights',
		},
	});
}

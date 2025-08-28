import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Types
interface CampusLocation {
	name: string;
	lat: number;
	lng: number;
}

interface GPSMatch {
	name: string | null;
	distance: number;
	confidence: number;
	coordinates: CampusLocation | null;
}

interface AIPrediction {
	predicted_class: string;
	probabilities: Record<string, number>;
}

interface HybridPrediction {
	final_location: string;
	final_confidence: number;
	gps_contribution: number;
	ai_contribution: number;
	method: 'hybrid' | 'gps-only' | 'ai-only';
	location_scores: Record<string, number>;
}

interface RoboflowPrediction {
	class: string;
	confidence: number;
	x: number;
	y: number;
	width: number;
	height: number;
}

interface RoboflowResponse {
	predictions: RoboflowPrediction[];
	image: {
		width: number;
		height: number;
	};
}

// Configuration
const ROBOFLOW_API_KEY = process.env.ROBOFLOW_API_KEY || 'MBFBifupwZPFdYcEHX1u';
const MODEL_ID = 'c-tracker-awsa5/1';
const ROBOFLOW_URL = `https://serverless.roboflow.com/${MODEL_ID}`;

// Campus location coordinates
const campusLocations: CampusLocation[] = [
	{ name: 'Main Gate', lat: 12.863788, lng: 77.434897 },
	{ name: 'Cross Road', lat: 12.86279, lng: 77.437411 },
	{ name: 'Block 1', lat: 12.863154, lng: 77.437718 },
	{ name: 'Students Square', lat: 12.862314, lng: 77.43824 },
	{ name: 'Open Auditorium', lat: 12.862787, lng: 77.43858 },
	{ name: 'Block 4', lat: 12.862211, lng: 77.43886 },
	{ name: 'Xpress Cafe', lat: 12.862045, lng: 77.439374 },
	{ name: 'Block 6', lat: 12.862103, lng: 77.439809 },
	{ name: 'Amphi theater', lat: 12.861424, lng: 77.438057 },
	{ name: 'PU Block', lat: 12.860511, lng: 77.437249 },
	{ name: 'Architecture Block', lat: 12.860132, lng: 77.438592 },
];

// Utility functions
function calculateDistance(
	lat1: number,
	lon1: number,
	lat2: number,
	lon2: number
): number {
	const R = 6371e3; // Earth's radius in meters
	const phi1 = (lat1 * Math.PI) / 180;
	const phi2 = (lat2 * Math.PI) / 180;
	const dphi = ((lat2 - lat1) * Math.PI) / 180;
	const dlambda = ((lon2 - lon1) * Math.PI) / 180;

	const a =
		Math.sin(dphi / 2) ** 2 +
		Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) ** 2;

	return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findNearestLocation(userLat: number, userLng: number): GPSMatch {
	let nearestLocation: CampusLocation | null = null;
	let minDistance = Infinity;

	for (const loc of campusLocations) {
		const dist = calculateDistance(userLat, userLng, loc.lat, loc.lng);
		if (dist < minDistance) {
			minDistance = dist;
			nearestLocation = loc;
		}
	}

	const maxDistance = 200; // meters
	const confidence = Math.max(0, Math.min(1, 1 - minDistance / maxDistance));

	return {
		name: nearestLocation?.name || null,
		distance: minDistance,
		confidence,
		coordinates: nearestLocation || null,
	};
}

function combinePredictions(
	aiPrediction: AIPrediction | null,
	gpsMatch: GPSMatch | null,
	gpsWeight: number = 40,
	aiWeight: number = 60
): HybridPrediction | null {
	if (!aiPrediction && !gpsMatch) {
		return null;
	}

	const totalWeight = gpsWeight + aiWeight || 1;
	const gpsW = gpsWeight / totalWeight;
	const aiW = aiWeight / totalWeight;

	const scores: Record<string, number> = {};

	// GPS contribution
	if (gpsMatch && gpsMatch.name) {
		scores[gpsMatch.name] = gpsW * gpsMatch.confidence;
	}

	// AI contribution
	if (aiPrediction && aiPrediction.probabilities) {
		for (const [loc, prob] of Object.entries(aiPrediction.probabilities)) {
			scores[loc] = (scores[loc] || 0) + aiW * prob;
		}
	}

	if (Object.keys(scores).length === 0) {
		return null;
	}

	const bestLoc = Object.keys(scores).reduce((a, b) =>
		scores[a] > scores[b] ? a : b
	);
	const bestScore = scores[bestLoc];

	const gpsContribution =
		gpsMatch && gpsMatch.name === bestLoc
			? ((gpsW * gpsMatch.confidence) / bestScore) * 100
			: 0;

	const aiContribution = aiPrediction
		? ((aiW * (aiPrediction.probabilities[bestLoc] || 0)) / bestScore) * 100
		: 0;

	return {
		final_location: bestLoc,
		final_confidence: bestScore,
		gps_contribution: gpsContribution,
		ai_contribution: aiContribution,
		method:
			gpsMatch && aiPrediction ? 'hybrid' : gpsMatch ? 'gps-only' : 'ai-only',
		location_scores: scores,
	};
}

async function predictWithRoboflow(imageBase64: string): Promise<AIPrediction> {
	try {
		const response = await axios({
			method: 'POST',
			url: ROBOFLOW_URL,
			params: {
				api_key: ROBOFLOW_API_KEY,
			},
			data: imageBase64,
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
		});

		const roboflowData: RoboflowResponse = response.data;

		if (!roboflowData.predictions || roboflowData.predictions.length === 0) {
			throw new Error('No predictions returned from Roboflow');
		}

		// Convert Roboflow predictions to our format
		const probabilities: Record<string, number> = {};

		for (const pred of roboflowData.predictions) {
			probabilities[pred.class] = pred.confidence;
		}

		// Find the prediction with highest confidence
		const topPrediction = roboflowData.predictions.reduce((prev, current) =>
			prev.confidence > current.confidence ? prev : current
		);

		return {
			predicted_class: topPrediction.class,
			probabilities,
		};
	} catch (error) {
		console.error('Roboflow prediction error:', error);
		throw new Error(
			`Roboflow API error: ${
				error instanceof Error ? error.message : 'Unknown error'
			}`
		);
	}
}

// Separate prediction functions
async function getAIPrediction(imageBase64: string): Promise<AIPrediction> {
	return await predictWithRoboflow(imageBase64);
}

function getGPSPrediction(lat: number, lng: number): GPSMatch {
	return findNearestLocation(lat, lng);
}

function processHybridPrediction(
	aiPrediction: AIPrediction | null,
	gpsMatch: GPSMatch | null,
	gpsWeight: number,
	aiWeight: number
): any {
	// Handle GPS-only case (when AI weight is 0 or AI prediction fails)
	if (aiWeight === 0 || !aiPrediction) {
		if (gpsMatch && gpsMatch.name) {
			return {
				predicted_class: gpsMatch.name,
				confidence: gpsMatch.confidence,
				probabilities: { [gpsMatch.name]: gpsMatch.confidence },
				gps_data: gpsMatch,
				method: 'gps-only',
			};
		}
		return null;
	}

	// Handle AI-only case (when GPS weight is 0 or no GPS data)
	if (gpsWeight === 0 || !gpsMatch || !gpsMatch.name) {
		return {
			predicted_class: aiPrediction.predicted_class,
			confidence: aiPrediction.probabilities[aiPrediction.predicted_class],
			probabilities: aiPrediction.probabilities,
			ai_data: aiPrediction,
			method: 'ai-only',
		};
	}

	// Handle hybrid case
	const hybrid = combinePredictions(
		aiPrediction,
		gpsMatch,
		gpsWeight,
		aiWeight
	);

	if (hybrid) {
		return {
			predicted_class: hybrid.final_location,
			confidence: hybrid.final_confidence,
			probabilities: aiPrediction.probabilities,
			hybrid_prediction: hybrid,
			gps_data: gpsMatch,
			ai_data: aiPrediction,
			method: hybrid.method,
		};
	}

	// Fallback to AI-only if hybrid fails
	return {
		predicted_class: aiPrediction.predicted_class,
		confidence: aiPrediction.probabilities[aiPrediction.predicted_class],
		probabilities: aiPrediction.probabilities,
		ai_data: aiPrediction,
		method: 'ai-only',
	};
}

export async function POST(request: NextRequest) {
	try {
		let gpsLat: number | null = null;
		let gpsLng: number | null = null;
		let gpsWeight: number = 40;
		let aiWeight: number = 60;
		let imageFile: File | null = null;
		let imageBase64: string | null = null;

		// Check content type to determine parsing method
		const contentType = request.headers.get('content-type') || '';

		if (contentType.includes('application/json')) {
			// JSON request
			try {
				const body = await request.json();
				gpsLat = body.latitude || body.gps_lat || null;
				gpsLng = body.longitude || body.gps_lng || null;
				gpsWeight = body.gps_weight || 40;
				aiWeight = body.ai_weight || 60;
				imageBase64 = body.image || body.imageBase64 || null;
			} catch (error) {
				return NextResponse.json(
					{ error: 'Invalid JSON format' },
					{ status: 400 }
				);
			}
		} else {
			// FormData request (default)
			try {
				const formData = await request.formData();
				gpsLat = formData.get('gps_lat')
					? parseFloat(formData.get('gps_lat') as string)
					: null;
				gpsLng = formData.get('gps_lng')
					? parseFloat(formData.get('gps_lng') as string)
					: null;
				gpsWeight = formData.get('gps_weight')
					? parseInt(formData.get('gps_weight') as string)
					: 40;
				aiWeight = formData.get('ai_weight')
					? parseInt(formData.get('ai_weight') as string)
					: 60;
				imageFile = formData.get('image') as File;
			} catch (error) {
				return NextResponse.json(
					{ error: 'Invalid FormData format' },
					{ status: 400 }
				);
			}
		}

		let aiPrediction: AIPrediction | null = null;
		let gpsMatch: GPSMatch | null = null;

		// Get AI prediction if needed (when AI weight > 0 and image provided)
		if (aiWeight > 0) {
			if (imageFile) {
				// Convert file to base64
				const bytes = await imageFile.arrayBuffer();
				const buffer = Buffer.from(bytes);
				imageBase64 = buffer.toString('base64');
			}

			if (imageBase64) {
				aiPrediction = await getAIPrediction(imageBase64);
			}
		}

		// Get GPS prediction if needed (when GPS weight > 0 and coordinates provided)
		if (gpsWeight > 0 && gpsLat !== null && gpsLng !== null) {
			gpsMatch = getGPSPrediction(gpsLat, gpsLng);
		}

		// Process the prediction based on available data and weights
		const response = processHybridPrediction(
			aiPrediction,
			gpsMatch,
			gpsWeight,
			aiWeight
		);

		if (!response) {
			return NextResponse.json(
				{
					error: 'No valid prediction could be made',
					message:
						'Please provide either an image (for AI prediction) or GPS coordinates (for GPS prediction)',
				},
				{ status: 400 }
			);
		}

		return NextResponse.json(response);
	} catch (error) {
		console.error('Prediction error:', error);
		return NextResponse.json(
			{
				error: 'Prediction failed',
				message: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 }
		);
	}
}

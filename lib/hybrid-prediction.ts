import { type LocationMatch } from './gps-utils';
import { campusLocations } from './campus-data';

export interface AIPrediction {
	predicted_class: string;
	confidence: number;
	probabilities: Record<string, number>;
}

export interface GPSPrediction {
	location: string;
	confidence: number;
	distance: number;
	coordinates: {
		lat: number;
		lng: number;
	};
}

export interface HybridPredictionResult {
	finalLocation: string;
	finalConfidence: number;
	gpsContribution: number;
	aiContribution: number;
	gpsData?: GPSPrediction;
	aiData?: AIPrediction;
	method: 'gps-only' | 'ai-only' | 'hybrid';
	breakdown: {
		gpsScore: number;
		aiScore: number;
		combinedScore: number;
	};
}

export interface PredictionWeights {
	gpsWeight: number; // 0-100
	aiWeight: number; // 0-100
}

/**
 * Combine GPS and AI predictions with configurable weights
 */
export function combineGPSAndAIPredictions(
	gpsMatch: LocationMatch | null,
	aiPrediction: AIPrediction | null,
	weights: PredictionWeights
): HybridPredictionResult {
	const normalizedGPSWeight = weights.gpsWeight / 100;
	const normalizedAIWeight = weights.aiWeight / 100;

	// Handle edge cases
	if (!gpsMatch && !aiPrediction) {
		throw new Error('No GPS or AI prediction data available');
	}

	// GPS only
	if (gpsMatch && !aiPrediction) {
		return {
			finalLocation: gpsMatch.name,
			finalConfidence: gpsMatch.confidence,
			gpsContribution: 100,
			aiContribution: 0,
			gpsData: {
				location: gpsMatch.name,
				confidence: gpsMatch.confidence,
				distance: gpsMatch.distance,
				coordinates: gpsMatch.coordinates,
			},
			method: 'gps-only',
			breakdown: {
				gpsScore: gpsMatch.confidence,
				aiScore: 0,
				combinedScore: gpsMatch.confidence,
			},
		};
	}

	// AI only
	if (!gpsMatch && aiPrediction) {
		return {
			finalLocation: aiPrediction.predicted_class,
			finalConfidence: aiPrediction.confidence,
			gpsContribution: 0,
			aiContribution: 100,
			aiData: aiPrediction,
			method: 'ai-only',
			breakdown: {
				gpsScore: 0,
				aiScore: aiPrediction.confidence,
				combinedScore: aiPrediction.confidence,
			},
		};
	}

	// Hybrid prediction
	if (gpsMatch && aiPrediction) {
		const locationScores = calculateLocationScores(
			gpsMatch,
			aiPrediction,
			weights
		);
		const bestLocation = getBestLocationFromScores(locationScores);

		const gpsScore = normalizedGPSWeight * gpsMatch.confidence;
		const aiScore = normalizedAIWeight * aiPrediction.confidence;
		const combinedScore = gpsScore + aiScore;

		return {
			finalLocation: bestLocation.location,
			finalConfidence: bestLocation.score,
			gpsContribution: (gpsScore / combinedScore) * 100,
			aiContribution: (aiScore / combinedScore) * 100,
			gpsData: {
				location: gpsMatch.name,
				confidence: gpsMatch.confidence,
				distance: gpsMatch.distance,
				coordinates: gpsMatch.coordinates,
			},
			aiData: aiPrediction,
			method: 'hybrid',
			breakdown: {
				gpsScore,
				aiScore,
				combinedScore,
			},
		};
	}

	throw new Error('Invalid prediction state');
}

/**
 * Calculate weighted scores for all possible locations
 */
function calculateLocationScores(
	gpsMatch: LocationMatch,
	aiPrediction: AIPrediction,
	weights: PredictionWeights
): Record<string, number> {
	const normalizedGPSWeight = weights.gpsWeight / 100;
	const normalizedAIWeight = weights.aiWeight / 100;

	const scores: Record<string, number> = {};

	// Get all possible locations
	const allLocations = new Set([
		gpsMatch.name,
		aiPrediction.predicted_class,
		...Object.keys(aiPrediction.probabilities),
	]);

	for (const location of Array.from(allLocations)) {
		let gpsScore = 0;
		let aiScore = 0;

		// GPS contribution
		if (location === gpsMatch.name) {
			gpsScore = normalizedGPSWeight * gpsMatch.confidence;
		}

		// AI contribution
		const aiConfidence = aiPrediction.probabilities[location] || 0;
		aiScore = normalizedAIWeight * aiConfidence;

		scores[location] = gpsScore + aiScore;
	}

	return scores;
}

/**
 * Get the location with the highest combined score
 */
function getBestLocationFromScores(scores: Record<string, number>): {
	location: string;
	score: number;
} {
	let bestLocation = '';
	let bestScore = 0;

	for (const [location, score] of Object.entries(scores)) {
		if (score > bestScore) {
			bestScore = score;
			bestLocation = location;
		}
	}

	return { location: bestLocation, score: bestScore };
}

/**
 * Get GPS prediction from location match
 */
export function createGPSPrediction(
	locationMatch: LocationMatch
): GPSPrediction {
	return {
		location: locationMatch.name,
		confidence: locationMatch.confidence,
		distance: locationMatch.distance,
		coordinates: locationMatch.coordinates,
	};
}

/**
 * Validate prediction weights
 */
export function validatePredictionWeights(weights: PredictionWeights): boolean {
	const total = weights.gpsWeight + weights.aiWeight;
	return total === 100 && weights.gpsWeight >= 0 && weights.aiWeight >= 0;
}

/**
 * Normalize prediction weights to sum to 100
 */
export function normalizePredictionWeights(
	weights: PredictionWeights
): PredictionWeights {
	const total = weights.gpsWeight + weights.aiWeight;

	if (total === 0) {
		return { gpsWeight: 50, aiWeight: 50 };
	}

	return {
		gpsWeight: Math.round((weights.gpsWeight / total) * 100),
		aiWeight: Math.round((weights.aiWeight / total) * 100),
	};
}

/**
 * Calculate confidence boost based on agreement between GPS and AI
 */
export function calculateAgreementBoost(
	gpsMatch: LocationMatch,
	aiPrediction: AIPrediction
): number {
	if (gpsMatch.name === aiPrediction.predicted_class) {
		// Both methods agree - boost confidence
		const avgConfidence = (gpsMatch.confidence + aiPrediction.confidence) / 2;
		return Math.min(1.0, avgConfidence * 1.2); // 20% boost, capped at 100%
	}

	return 0; // No boost if they disagree
}

/**
 * Get location suggestions based on hybrid prediction
 */
export function getLocationSuggestions(
	gpsMatch: LocationMatch | null,
	aiPrediction: AIPrediction | null,
	maxSuggestions: number = 3
): Array<{
	location: string;
	confidence: number;
	source: 'gps' | 'ai' | 'both';
}> {
	const suggestions: Array<{
		location: string;
		confidence: number;
		source: 'gps' | 'ai' | 'both';
	}> = [];

	// Add GPS suggestion
	if (gpsMatch) {
		suggestions.push({
			location: gpsMatch.name,
			confidence: gpsMatch.confidence,
			source: 'gps',
		});
	}

	// Add AI suggestions
	if (aiPrediction) {
		const sortedAIPredictions = Object.entries(aiPrediction.probabilities)
			.sort(([, a], [, b]) => b - a)
			.slice(0, maxSuggestions);

		for (const [location, confidence] of sortedAIPredictions) {
			const existingIndex = suggestions.findIndex(
				(s) => s.location === location
			);

			if (existingIndex >= 0) {
				// Combine GPS and AI for same location
				suggestions[existingIndex] = {
					location,
					confidence: Math.max(
						suggestions[existingIndex].confidence,
						confidence
					),
					source: 'both',
				};
			} else {
				suggestions.push({
					location,
					confidence,
					source: 'ai',
				});
			}
		}
	}

	// Sort by confidence and limit results
	return suggestions
		.sort((a, b) => b.confidence - a.confidence)
		.slice(0, maxSuggestions);
}

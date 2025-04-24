'use client';

import { useState, useEffect } from 'react';

const CLASS_LABELS = [
	'Main Gate',
	'Cross road',
	'Block 1',
	'Students Square',
	'Open auditorium',
	'Block 4',
	'Xpress Cafe',
	'Block 6',
	'Amphi theater',
	'PU Block',
	'Architecture Block',
];

export function useModelLoader() {
	const [modelLoaded, setModelLoaded] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		// Simulate model loading since it's now handled by Flask
		setTimeout(() => {
			setModelLoaded(true);
			setLoading(false);
		}, 1500);
	}, []);

	return { modelLoaded, loading, error };
}

// Function to send image to Flask API for prediction
export async function predictLocation(imageFile: File) {
	try {
		const formData = new FormData();
		formData.append('image', imageFile);

		// Make sure the URL has a trailing slash before 'predict'
		const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
		const url = baseUrl.endsWith('/')
			? `${baseUrl}predict`
			: `${baseUrl}/predict`;

		console.log('Sending prediction request to:', url); // Debug log

		const response = await fetch(url, {
			method: 'POST',
			body: formData,
			mode: 'cors', // Explicitly set CORS mode
			headers: {
				// Don't set Content-Type header when sending FormData
				// It will be set automatically with the correct boundary
			},
		});

		if (!response.ok) {
			throw new Error('Failed to get a response from the server.');
		}

		const result = await response.json();

		// Ensure valid class index
		const predictedClassIndex = result.class_index;
		if (predictedClassIndex < 0 || predictedClassIndex >= CLASS_LABELS.length) {
			throw new Error('Invalid class index received.');
		}

		return CLASS_LABELS[predictedClassIndex];
	} catch (error) {
		console.error('Error during prediction:', error);
		throw new Error('Failed to process the image. Please try again.');
	}
}

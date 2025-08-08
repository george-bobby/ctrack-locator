'use client';

import { useEffect, useState, useCallback } from 'react';

interface MobileOptimizations {
	isLowPowerMode: boolean;
	isOnline: boolean;
	devicePixelRatio: number;
	orientation: 'portrait' | 'landscape';
	viewportHeight: number;
	viewportWidth: number;
	isStandalone: boolean;
	connectionType: string;
	batteryLevel?: number;
	isCharging?: boolean;
}

interface NetworkInformation extends EventTarget {
	effectiveType: string;
	downlink: number;
	rtt: number;
	saveData: boolean;
}

interface BatteryManager extends EventTarget {
	charging: boolean;
	chargingTime: number;
	dischargingTime: number;
	level: number;
}

declare global {
	interface Navigator {
		connection?: NetworkInformation;
		mozConnection?: NetworkInformation;
		webkitConnection?: NetworkInformation;
		getBattery?: () => Promise<BatteryManager>;
	}
}

export const useMobileOptimizations = (): MobileOptimizations => {
	const [optimizations, setOptimizations] = useState<MobileOptimizations>({
		isLowPowerMode: false,
		isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
		devicePixelRatio:
			typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
		orientation:
			typeof window !== 'undefined'
				? window.innerHeight > window.innerWidth
					? 'portrait'
					: 'landscape'
				: 'portrait',
		viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 800,
		viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 400,
		isStandalone:
			typeof window !== 'undefined'
				? window.matchMedia('(display-mode: standalone)').matches
				: false,
		connectionType: 'unknown',
		batteryLevel: undefined,
		isCharging: undefined,
	});

	const updateViewport = useCallback(() => {
		if (typeof window !== 'undefined') {
			setOptimizations((prev) => ({
				...prev,
				viewportHeight: window.innerHeight,
				viewportWidth: window.innerWidth,
				orientation:
					window.innerHeight > window.innerWidth ? 'portrait' : 'landscape',
			}));
		}
	}, []);

	const updateOnlineStatus = useCallback(() => {
		if (typeof navigator !== 'undefined') {
			setOptimizations((prev) => ({
				...prev,
				isOnline: navigator.onLine,
			}));
		}
	}, []);

	const getConnectionType = useCallback((): string => {
		if (typeof navigator !== 'undefined') {
			const connection =
				navigator.connection ||
				navigator.mozConnection ||
				navigator.webkitConnection;
			if (connection) {
				return connection.effectiveType || 'unknown';
			}
		}
		return 'unknown';
	}, []);

	const updateBatteryInfo = useCallback(async () => {
		if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
			try {
				const battery = await navigator.getBattery!();
				setOptimizations((prev) => ({
					...prev,
					batteryLevel: battery.level,
					isCharging: battery.charging,
					isLowPowerMode: battery.level < 0.2 && !battery.charging,
				}));

				// Listen for battery changes
				const updateBattery = () => {
					setOptimizations((prev) => ({
						...prev,
						batteryLevel: battery.level,
						isCharging: battery.charging,
						isLowPowerMode: battery.level < 0.2 && !battery.charging,
					}));
				};

				battery.addEventListener('chargingchange', updateBattery);
				battery.addEventListener('levelchange', updateBattery);

				return () => {
					battery.removeEventListener('chargingchange', updateBattery);
					battery.removeEventListener('levelchange', updateBattery);
				};
			} catch (error) {
				console.warn('Battery API not available:', error);
			}
		}
	}, []);

	useEffect(() => {
		// Initial setup
		setOptimizations((prev) => ({
			...prev,
			connectionType: getConnectionType(),
		}));

		// Event listeners (only in browser)
		if (typeof window !== 'undefined') {
			window.addEventListener('resize', updateViewport);
			window.addEventListener('orientationchange', updateViewport);
			window.addEventListener('online', updateOnlineStatus);
			window.addEventListener('offline', updateOnlineStatus);
		}

		// Battery monitoring
		const batteryCleanup = updateBatteryInfo();

		// Connection monitoring
		let connection: NetworkInformation | undefined;
		const updateConnection = () => {
			setOptimizations((prev) => ({
				...prev,
				connectionType: getConnectionType(),
			}));
		};

		if (typeof navigator !== 'undefined') {
			connection =
				navigator.connection ||
				navigator.mozConnection ||
				navigator.webkitConnection;
			if (connection) {
				connection.addEventListener('change', updateConnection);
			}
		}

		// Cleanup
		return () => {
			if (typeof window !== 'undefined') {
				window.removeEventListener('resize', updateViewport);
				window.removeEventListener('orientationchange', updateViewport);
				window.removeEventListener('online', updateOnlineStatus);
				window.removeEventListener('offline', updateOnlineStatus);
			}

			if (connection) {
				connection.removeEventListener('change', updateConnection);
			}

			batteryCleanup.then((cleanup) => cleanup?.());
		};
	}, [
		updateViewport,
		updateOnlineStatus,
		getConnectionType,
		updateBatteryInfo,
	]);

	// Apply optimizations to document
	useEffect(() => {
		if (typeof document !== 'undefined') {
			const body = document.body;

			if (optimizations.isLowPowerMode) {
				body.classList.add('mobile-low-power');
			} else {
				body.classList.remove('mobile-low-power');
			}

			if (!optimizations.isOnline) {
				body.classList.add('mobile-offline');
			} else {
				body.classList.remove('mobile-offline');
			}
		}
	}, [optimizations.isLowPowerMode, optimizations.isOnline]);

	return optimizations;
};

// Hook for managing mobile-specific performance
export const useMobilePerformance = () => {
	const optimizations = useMobileOptimizations();

	const shouldReduceAnimations =
		optimizations.isLowPowerMode ||
		optimizations.connectionType === 'slow-2g' ||
		optimizations.connectionType === '2g';

	const shouldPreloadImages =
		optimizations.connectionType === '4g' &&
		optimizations.isOnline &&
		!optimizations.isLowPowerMode;

	const shouldUseHighQuality =
		optimizations.devicePixelRatio > 1 &&
		optimizations.connectionType !== 'slow-2g' &&
		optimizations.connectionType !== '2g';

	const maxConcurrentRequests =
		optimizations.connectionType === '4g'
			? 6
			: optimizations.connectionType === '3g'
			? 4
			: 2;

	return {
		...optimizations,
		shouldReduceAnimations,
		shouldPreloadImages,
		shouldUseHighQuality,
		maxConcurrentRequests,
	};
};

// Hook for managing camera optimizations
export const useMobileCameraOptimizations = () => {
	const { isLowPowerMode, connectionType, devicePixelRatio } =
		useMobileOptimizations();

	const getCameraConstraints = useCallback(
		(facingMode: 'user' | 'environment' = 'environment') => {
			const baseConstraints: MediaStreamConstraints = {
				video: {
					facingMode: { ideal: facingMode },
					width: { ideal: 1280 },
					height: { ideal: 720 },
				},
			};

			// Reduce quality for low power mode or slow connections
			if (
				isLowPowerMode ||
				connectionType === 'slow-2g' ||
				connectionType === '2g'
			) {
				baseConstraints.video = {
					...baseConstraints.video,
					width: { ideal: 640 },
					height: { ideal: 480 },
				};
			}

			// Increase quality for high DPI displays with good connections
			if (
				devicePixelRatio > 2 &&
				(connectionType === '4g' || connectionType === '3g')
			) {
				baseConstraints.video = {
					...baseConstraints.video,
					width: { ideal: 1920 },
					height: { ideal: 1080 },
				};
			}

			return baseConstraints;
		},
		[isLowPowerMode, connectionType, devicePixelRatio]
	);

	const getImageQuality = useCallback(() => {
		if (
			isLowPowerMode ||
			connectionType === 'slow-2g' ||
			connectionType === '2g'
		) {
			return 0.6;
		}
		if (connectionType === '4g') {
			return 0.9;
		}
		return 0.8;
	}, [isLowPowerMode, connectionType]);

	const getCaptureInterval = useCallback(() => {
		if (isLowPowerMode) {
			return 10000; // 10 seconds
		}
		if (connectionType === 'slow-2g' || connectionType === '2g') {
			return 8000; // 8 seconds
		}
		return 5000; // 5 seconds (default)
	}, [isLowPowerMode, connectionType]);

	return {
		getCameraConstraints,
		getImageQuality,
		getCaptureInterval,
	};
};

// Hook for managing network status
export const useNetworkStatus = () => {
	const [showNetworkIndicator, setShowNetworkIndicator] = useState(false);
	const { isOnline, connectionType } = useMobileOptimizations();

	useEffect(() => {
		if (!isOnline) {
			setShowNetworkIndicator(true);
		} else {
			const timer = setTimeout(() => {
				setShowNetworkIndicator(false);
			}, 2000);
			return () => clearTimeout(timer);
		}
	}, [isOnline]);

	return {
		isOnline,
		connectionType,
		showNetworkIndicator,
		isSlowConnection: connectionType === 'slow-2g' || connectionType === '2g',
	};
};

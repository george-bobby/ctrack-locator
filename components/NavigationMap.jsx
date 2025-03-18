'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';
import { campusLocations } from '@/lib/campus-data';

// Fix for Leaflet marker icons in Next.js
const fixLeafletIcon = () => {
	delete L.Icon.Default.prototype._getIconUrl;
	L.Icon.Default.mergeOptions({
		iconRetinaUrl:
			'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
		iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
		shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
	});
};

// interface NavigationMapProps {
//   startLocation: string;
//   endLocation: string;
// }

// Component to handle routing
function RoutingMachine({ startLocation, endLocation }) {
	const map = useMap();

	useEffect(() => {
		if (!map) return;

		const startPoint = campusLocations.find(
			(loc) => loc.name === startLocation
		);
		const endPoint = campusLocations.find((loc) => loc.name === endLocation);

		if (!startPoint || !endPoint) return;

		const routingControl = L.Routing.control({
			waypoints: [
				L.latLng(startPoint.lat, startPoint.lng),
				L.latLng(endPoint.lat, endPoint.lng),
			],
			routeWhileDragging: false,
			showAlternatives: true,
			fitSelectedRoutes: true,
			lineOptions: {
				styles: [{ color: '#6366f1', weight: 6 }],
			},
			createMarker: function () {
				return null;
			}, // Don't create default markers
		}).addTo(map);

		return () => {
			map.removeControl(routingControl);
		};
	}, [map, startLocation, endLocation]);

	return null;
}

export default function NavigationMap({ startLocation, endLocation }) {
	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		setIsMounted(true);
		fixLeafletIcon();
	}, []);

	if (!isMounted) {
		return (
			<div className='h-full w-full bg-muted flex items-center justify-center'>
				Loading map...
			</div>
		);
	}

	// Find the center point between start and end locations
	const startPoint = campusLocations.find((loc) => loc.name === startLocation);
	const endPoint = campusLocations.find((loc) => loc.name === endLocation);

	if (!startPoint || !endPoint) {
		return (
			<div className='h-full w-full bg-muted flex items-center justify-center'>
				Location data not found
			</div>
		);
	}

	const centerLat = (startPoint.lat + endPoint.lat) / 2;
	const centerLng = (startPoint.lng + endPoint.lng) / 2;

	return (
		<MapContainer
			center={[centerLat, centerLng]}
			zoom={16}
			style={{ height: '100%', width: '100%' }}
			scrollWheelZoom={false}
		>
			<TileLayer
				attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
				url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
			/>

			{/* Start location marker */}
			<Marker position={[startPoint.lat, startPoint.lng]}>
				<Popup>
					<b>Start:</b> {startLocation}
				</Popup>
			</Marker>

			{/* End location marker */}
			<Marker position={[endPoint.lat, endPoint.lng]}>
				<Popup>
					<b>Destination:</b> {endLocation}
				</Popup>
			</Marker>

			{/* Routing machine */}
			<RoutingMachine startLocation={startLocation} endLocation={endLocation} />
		</MapContainer>
	);
}

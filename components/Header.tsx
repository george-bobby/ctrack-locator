'use client';

import { MapPin } from 'lucide-react';
import Link from 'next/link';
import { Leaf } from 'lucide-react';

export default function Header() {
  return (
    <header className="absolute top-0 w-full z-10 p-4">
    <div className="container mx-auto flex justify-between items-center">
      <Link href="/" className="flex items-center text-white text-2xl font-bold">
        <MapPin className="h-6 w-6 text-white" />
        C-TRACK
      </Link>
      <div className="flex items-center space-x-6 [text-shadow:2px_2px_4px_rgba(0,0,0,0.9)]">
                <Link href="/" className="text-white hover:text-gray-200"style={{
          textShadow: "2px 2px 6px rgba(0, 0, 0, 0.8)",
        }}>Home</Link>
                <Link href="#about" className="text-white hover:text-gray-200"style={{
          textShadow: "2px 2px 6px rgba(0, 0, 0, 0.8)",
        }}>About</Link>
                <Link href="#locations" className="text-white hover:text-gray-200"style={{
          textShadow: "2px 2px 6px rgba(0, 0, 0, 0.8)",
        }}>Campus Locations</Link>
      </div>
    </div>
  </header>);

}
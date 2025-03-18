'use client';

import { MapPin } from 'lucide-react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-black/90 py-12 px-8 border-t border-white/20">
      <div className="container">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-start">
          <div className="mb-8 md:mb-0">
            <div className="flex items-center space-x-2 mb-4">
              <MapPin className="h-6 w-6 text-white" />
              <span className="text-xl font-bold tracking-tight text-white">C-TRACK</span>
            </div>
            <p className="text-sm text-gray-400 max-w-xs">
              Navigate your campus with precision using our AI-powered location detection and routing system.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12">
            <div>
              <h3 className="font-medium mb-4 text-white">Navigation</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="#about" className="text-gray-400 hover:text-white transition-colors">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="#locations" className="text-gray-400 hover:text-white transition-colors">
                    Campus Locations
                  </Link>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium mb-4 text-white">Resources</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                    Campus Map
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                    Feedback
                  </Link>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium mb-4 text-white">Contact</h3>
              <ul className="space-y-2 text-sm">
                <li className="text-gray-400">
                  support@c-track.edu
                </li>
                <li className="text-gray-400">
                  +91 123 456 7890
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="mt-12 pt-6 border-t border-white/20 text-center text-sm text-gray-400">
          <p>© {new Date().getFullYear()} C-TRACK. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

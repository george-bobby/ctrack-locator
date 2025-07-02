'use client';

import { useState } from 'react';
import { MapPin, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="absolute top-0 w-full z-20 p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="flex items-center text-white text-2xl font-bold">
          <MapPin className="h-6 w-6 text-white" />
          C-TRACK
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6 [text-shadow:2px_2px_4px_rgba(0,0,0,0.9)]">
          <Link
            href="/"
            className="text-white hover:text-gray-200 transition-colors"
            style={{ textShadow: "2px 2px 6px rgba(0, 0, 0, 0.8)" }}
          >
            Home
          </Link>
          <Link
            href="#about"
            className="text-white hover:text-gray-200 transition-colors"
            style={{ textShadow: "2px 2px 6px rgba(0, 0, 0, 0.8)" }}
          >
            About
          </Link>
          <Link
            href="#locations"
            className="text-white hover:text-gray-200 transition-colors"
            style={{ textShadow: "2px 2px 6px rgba(0, 0, 0, 0.8)" }}
          >
            Campus Locations
          </Link>
        </nav>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-white hover:bg-white/10"
          onClick={toggleMobileMenu}
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </Button>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-black/90 backdrop-blur-sm border-t border-white/10">
          <nav className="container mx-auto py-4 flex flex-col space-y-4">
            <Link
              href="/"
              className="text-white hover:text-gray-200 transition-colors px-4 py-2"
              style={{ textShadow: "2px 2px 6px rgba(0, 0, 0, 0.8)" }}
              onClick={closeMobileMenu}
            >
              Home
            </Link>
            <Link
              href="#about"
              className="text-white hover:text-gray-200 transition-colors px-4 py-2"
              style={{ textShadow: "2px 2px 6px rgba(0, 0, 0, 0.8)" }}
              onClick={closeMobileMenu}
            >
              About
            </Link>
            <Link
              href="#locations"
              className="text-white hover:text-gray-200 transition-colors px-4 py-2"
              style={{ textShadow: "2px 2px 6px rgba(0, 0, 0, 0.8)" }}
              onClick={closeMobileMenu}
            >
              Campus Locations
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
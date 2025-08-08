'use client';

import { Button } from '@/components/ui/button';
import { ArrowDown } from 'lucide-react';
import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

export default function Hero() {
  const heroRef = useRef(null);



  useEffect(() => {
    if (heroRef.current) {


      gsap.to('.hero-bg', {
        yPercent: 30,
        ease: 'none',
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });
    }
  }, []);

  const scrollToLocationDetection = () => {
    const element = document.getElementById('location-detection');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div
        className="hero-bg absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/christ-image.jpg')`,
          filter: "brightness(0.6)"
        }}
      />
      <div />

      {/* Content */}
      <div className="container relative z-10 flex h-full flex-col items-center justify-center text-center">
        <h1 className=" text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl text-white">
          Navigate CHRIST Campus <br /> With Precision
        </h1>
        <p className="mt-6 max-w-[600px] text-lg text-white/90 [text-shadow:2px_2px_4px_rgba(0,0,0,0.9)]">
          C-TRACK uses AI to identify your location on campus from a simple photo.
          Get directions to building with our advanced navigation system.
        </p>
        <Button
          size="lg"
          className="mt-8 bg-primary hover:bg-primary/90"
          onClick={scrollToLocationDetection}
        >
          Get Started
          <ArrowDown className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}

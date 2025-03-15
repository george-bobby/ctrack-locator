'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Navigation, Image as ImageIcon, Map } from 'lucide-react';

export default function AboutSection() {
  return (
    <section id="about" className="py-16 px-8 bg-muted/50">
      <div className="container">
        <h2 className="text-3xl font-bold tracking-tight text-center mb-12 px-16">
          How C-TRACK Works
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <ImageIcon className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Take a Photo</CardTitle>
              <CardDescription>
                Capture your surroundings with your device camera
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Simply take a photo of any recognizable location on campus. Our system works with various angles and lighting conditions.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>AI Detection</CardTitle>
              <CardDescription>
                Our neural network identifies your location
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                The AI model has been trained on thousands of campus images to accurately recognize 11 distinct locations around the campus.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Map className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Select Destination</CardTitle>
              <CardDescription>
                Choose where you want to go on campus
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Once your location is identified, select your destination from our comprehensive list of campus buildings and facilities.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Navigation className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Get Directions</CardTitle>
              <CardDescription>
                Follow the optimal route to your destination
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Our system calculates the best path using OpenRouteService and displays it on an interactive map with turn-by-turn directions.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
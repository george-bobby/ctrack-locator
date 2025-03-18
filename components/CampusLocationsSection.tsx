'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { campusLocations, locationImages } from '@/lib/campus-data';

export default function CampusLocationsSection() {
  const [selectedLocation, setSelectedLocation] = useState(campusLocations[0].name);

  return (
    <section id="locations" className="py-16 container">
      <h2 className="text-3xl font-bold tracking-tight text-center mb-8">
        Campus Locations
      </h2>
      <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-12">
        Explore the 11 key locations around campus that our AI model can recognize. 
        These are the places you can navigate to and from using C-TRACK.
      </p>
      
      <Tabs defaultValue={campusLocations[0].name} className="w-full max-w-4xl mx-auto">
        <TabsList className="grid grid-cols-3 md:grid-cols-6 h-auto mb-8">
          {campusLocations.slice(0, 6).map((location) => (
            <TabsTrigger 
              key={location.name}
              value={location.name}
              className="py-2 px-3 text-xs md:text-sm"
              onClick={() => setSelectedLocation(location.name)}
            >
              {location.name}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsList className="grid grid-cols-3 md:grid-cols-5 h-auto mb-8">
          {campusLocations.slice(6).map((location) => (
            <TabsTrigger 
              key={location.name}
              value={location.name}
              className="py-2 px-3 text-xs md:text-sm"
              onClick={() => setSelectedLocation(location.name)}
            >
              {location.name}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {campusLocations.map((location) => (
          <TabsContent key={location.name} value={location.name}>
            <Card>
              <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-2">
                  <div className="relative h-64 md:h-auto">
                    <img
                      src={locationImages[location.name as keyof typeof locationImages]}
                      alt={location.name}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div className="p-6 flex flex-col justify-center">
                    <h3 className="text-2xl font-bold mb-4">{location.name}</h3>
                    <p className="text-muted-foreground mb-4">
                      {getLocationDescription(location.name)}
                    </p>
                    <div className="text-sm">
                      <p><strong>Coordinates:</strong> {location.lat.toFixed(6)}, {location.lng.toFixed(6)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}

// Helper function to get location descriptions
function getLocationDescription(locationName: string): string {
  const descriptions: Record<string, string> = {
    "Main Gate": "The primary entrance to the campus, featuring the college emblem and security checkpoint.",
    "Cross road": "A central intersection connecting multiple pathways to different blocks and facilities.",
    "Block 1": "Houses administrative offices and several departments with modern classrooms.",
    "Students Square": "A popular gathering spot for students with seating areas and open space.",
    "Open auditorium": "An outdoor venue for college events, performances and gatherings.",
    "Block 4": "Contains specialized labs and research facilities for engineering students.",
    "Xpress Cafe": "A favorite spot for students to grab coffee and snacks between classes.",
    "Block 6": "The newest academic building with state-of-the-art lecture halls.",
    "Amphi theater": "A semi-circular outdoor theater used for cultural events and ceremonies.",
    "PU Block": "Houses the post-graduate departments and advanced research facilities.",
    "Architecture Block": "Dedicated to architecture students with design studios and model-making workshops."
  };
  
  return descriptions[locationName] || "A key location on campus with modern facilities.";
}
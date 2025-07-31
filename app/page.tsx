import Header from '@/components/Header';
import Hero from '@/components/Hero';
import LocationDetection from '@/components/LocationDetection';
import AboutSection from '@/components/AboutSection';
import CampusLocationsSection from '@/components/CampusLocationsSection';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main className="w-screen min-h-screen bg-gradient-to-b from-background to-secondary/5 overflow-x-hidden">
      {/* <Header /> */}
      {/* <Hero /> */}
      <LocationDetection />
      {/* <AboutSection /> */}
      {/* <CampusLocationsSection /> */}
      {/* <Footer /> */}
    </main>
  );
}
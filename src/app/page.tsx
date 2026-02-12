import SpotlightCarousel from '@/components/home/SpotlightCarousel';
import TopShowcase from '@/components/home/TopShowcase';
import TopPlaylists from '@/components/home/TopPlaylists';

export default function HomePage() {
  return (
    <>
      <SpotlightCarousel />
      <TopShowcase />
      <TopPlaylists />
    </>
  );
}

import SpotlightCarousel from '@/components/home/SpotlightCarousel';
import TopShowcase from '@/components/home/TopShowcase';
import TopPlaylists from '@/components/home/TopPlaylists';
import HomeTopButton from '@/components/home/HomeTopButton';

export default function HomePage() {
  return (
    <>
      <SpotlightCarousel />
      <TopShowcase />
      <TopPlaylists />
      <HomeTopButton />
    </>
  );
}

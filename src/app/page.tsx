import LogoutBridge from '@/components/common/LogoutBridge';
import SpotlightCarousel from '@/components/home/SpotlightCarousel';
import TopShowcase from '@/components/home/TopShowcase';
import TopPlaylists from '@/components/home/TopPlaylists';

export default function HomePage() {
  return (
    <>
      <LogoutBridge />
      <SpotlightCarousel />
      <TopShowcase />
      <TopPlaylists />
    </>
  );
}

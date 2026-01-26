import type { ApiResponse } from './authApi';
import type { BoardCategory } from './boardTypes';

type MockFile = { name: string; url: string };
type MockComment = {
  id: string;
  authorNickname: string;
  content: string;
  createdAt: string;
  likeCount?: number;
  replies?: MockComment[];
};

type MockPost = {
  id: string;
  category: BoardCategory;
  title: string;
  content: string;
  authorId: string;
  authorNickname?: string;
  likeCount?: number;
  viewCount?: number;
  isLiked?: boolean;
  createdAt?: string;
  youtubeUrl?: string;
  playlistThumbnail?: string;
  playlistTitle?: string;
  playlistUrl?: string;
  thumbnail?: string;
  photos?: string[];
  files?: MockFile[];
  comments?: MockComment[];
};

const now = () => new Date().toISOString();
let idCounter = 9000;
const nextId = () => String(++idCounter);

const mockBoards: Record<BoardCategory, MockPost[]> = {
  showcase: [
    {
      id: 's1',
      category: 'showcase',
      title: 'Epic OST Medley',
      content: '오케스트라 버전 하이라이트를 모았습니다.',
      authorId: 'u1',
      authorNickname: 'ComposerLee',
      likeCount: 120,
      viewCount: 2400,
      createdAt: now(),
      youtubeUrl: 'https://www.youtube.com/watch?v=fyHwfLxBugQ',
      thumbnail: 'https://img.youtube.com/vi/fyHwfLxBugQ/hqdefault.jpg',
      comments: [
        { id: 'c1', authorNickname: '팬1', content: '소름...', createdAt: now(), likeCount: 2 },
        { id: 'c2', authorNickname: '팬2',
           content: '몇 자까지 적어야 좋을지 보는 거 몇 자까지 적어야 좋을지 보는 거 몇 자까지 적어야 좋을지 보는 거 몇 자까지 적어야 좋을지 보는 거 몇 자까지 적어야 좋을지 보는 거 몇 자까지 적어야 좋을지 보는 거 몇 자까지 적어야 좋을지 보는 거 몇 자까지 적어야 좋을지 보는 거 몇 자까지 적어야 좋을지 보는 거 몇 자까지 적어야 좋을지 보는 거 몇 자까지 적어야 좋을지 보는 거 몇 자까지 적어야 좋을지 보는 거 몇 자까지 적어야 좋을지 보는 거 몇 자까지 적어야 좋을지 보는 거 몇 자까지 적어야 좋을지 보는 거 몇 자까지 적어야 좋을지 보는 거 몇 자까지 적어야 좋을지 보는 거 몇 자까지 적어야 좋을지 보는 거 몇 자까지 적어야 좋을지 보는 거 몇 자까지 적어야 좋을지 보는 거 몇 자까지 적어야 좋을지 보는 거 몇 자까지 적어야 좋을지 보는 거 몇 자까지 적어야 좋을지 보는 거 몇 자까지 적어야 좋을지 보는 거 몇 자까지 적어야 좋을지 보는 거 몇 자까지 적어야 좋을지 보는 거 몇 자까지 적어야 좋을지 보는 거 몇 자까지 적어야 좋을지 보는 거 몇 자까지 적어야 좋을지 보는 거 몇 자까지 적어야 좋을지 보는 거 몇 자까지 적어야 좋을지 보는 거 몇 자까지 적어야 좋을지 보는 거 몇 자까지 적어야 좋을지 보는 거 몇 자까지 적어야 좋을지 보는 거 ', createdAt: now(), likeCount: 2 }
      ],
    },
    {
      id: 's2',
      category: 'showcase',
      title: 'Chill Piano',
      content: '잔잔한 피아노 솔로 모음',
      authorId: 'u2',
      authorNickname: 'PianistJ',
      likeCount: 84,
      viewCount: 1300,
      createdAt: now(),
      youtubeUrl: 'https://www.youtube.com/watch?v=ZZiOxwyxkHs',
      thumbnail: 'https://img.youtube.com/vi/ZZiOxwyxkHs/hqdefault.jpg',
    },
    {
        id: 's3',
        category: 'showcase',
        title: 'Chill Piano',
        content: '잔잔한 피아노 솔로 모음',
        authorId: 'u3',
        authorNickname: 'PianistJ',
        likeCount: 84,
        viewCount: 1300,
        createdAt: now(),
        youtubeUrl: 'https://www.youtube.com/watch?v=78R18hOUVRk',
        thumbnail: 'https://img.youtube.com/vi/78R18hOUVRk/hqdefault.jpg',
      },
      {
        id: 's4',
        category: 'showcase',
        title: 'Chill Piano',
        content: '잔잔한 피아노 솔로 모음',
        authorId: 'u4',
        authorNickname: 'PianistJ',
        likeCount: 84,
        viewCount: 1300,
        createdAt: now(),
        youtubeUrl: 'https://www.youtube.com/watch?v=Vvc2WgTMI1Q',
        thumbnail: 'https://img.youtube.com/vi/Vvc2WgTMI1Q/hqdefault.jpg',
      },
      {
        id: 's5',
        category: 'showcase',
        title: 'Chill Piano',
        content: '잔잔한 피아노 솔로 모음',
        authorId: 'u5',
        authorNickname: 'PianistJ',
        likeCount: 84,
        viewCount: 1300,
        createdAt: now(),
        youtubeUrl: 'https://www.youtube.com/watch?v=V-_O7nl0Ii0',
        thumbnail: 'https://img.youtube.com/vi/V-_O7nl0Ii0/mqdefault.jpg',
      },
      {
        id: 's6',
        category: 'showcase',
        title: 'Epic OST Medley',
        content: '오케스트라 버전 하이라이트를 모았습니다.',
        authorId: 'u6',
        authorNickname: 'ComposerLee',
        likeCount: 120,
        viewCount: 2400,
        createdAt: now(),
        youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
        comments: [
          { id: 'c1', authorNickname: '팬1', content: '소름...', createdAt: now(), likeCount: 2 },
        ],
      },
      {
        id: 's7',
        category: 'showcase',
        title: 'Chill Piano',
        content: '잔잔한 피아노 솔로 모음',
        authorId: 'u7',
        authorNickname: 'PianistJ',
        likeCount: 84,
        viewCount: 1300,
        createdAt: now(),
        youtubeUrl: 'https://www.youtube.com/watch?v=V-_O7nl0Ii0',
        thumbnail: 'https://img.youtube.com/vi/V-_O7nl0Ii0/mqdefault.jpg',
      },
      {
          id: 's8',
          category: 'showcase',
          title: 'Chill Piano',
          content: '잔잔한 피아노 솔로 모음',
          authorId: 'u8',
          authorNickname: 'PianistJ',
          likeCount: 84,
          viewCount: 1300,
          createdAt: now(),
          youtubeUrl: 'https://www.youtube.com/watch?v=V-_O7nl0Ii0',
          thumbnail: 'https://img.youtube.com/vi/V-_O7nl0Ii0/mqdefault.jpg',
        },
        {
          id: 's9',
          category: 'showcase',
          title: 'Chill Piano',
          content: '잔잔한 피아노 솔로 모음',
          authorId: 'u9',
          authorNickname: 'PianistJ',
          likeCount: 84,
          viewCount: 1300,
          createdAt: now(),
          youtubeUrl: 'https://www.youtube.com/watch?v=V-_O7nl0Ii0',
          thumbnail: 'https://img.youtube.com/vi/V-_O7nl0Ii0/mqdefault.jpg',
        },
        {
          id: 's10',
          category: 'showcase',
          title: 'Chill Piano',
          content: '잔잔한 피아노 솔로 모음',
          authorId: 'u10',
          authorNickname: 'PianistJ',
          likeCount: 84,
          viewCount: 1300,
          createdAt: now(),
          youtubeUrl: 'https://www.youtube.com/watch?v=V-_O7nl0Ii0',
          thumbnail: 'https://img.youtube.com/vi/V-_O7nl0Ii0/mqdefault.jpg',
        },
        {
          id: 's11',
          category: 'showcase',
          title: 'Chill Piano',
          content: '잔잔한 피아노 솔로 모음',
          authorId: 'u11',
          authorNickname: 'PianistJ',
          likeCount: 84,
          viewCount: 1300,
          createdAt: now(),
          youtubeUrl: 'https://www.youtube.com/watch?v=V-_O7nl0Ii0',
          thumbnail: 'https://img.youtube.com/vi/V-_O7nl0Ii0/mqdefault.jpg',
        },
        {
          id: 's12',
          category: 'showcase',
          title: 'Chill Piano',
          content: '잔잔한 피아노 솔로 모음',
          authorId: 'u12',
          authorNickname: 'PianistJ',
          likeCount: 84,
          viewCount: 1300,
          createdAt: now(),
          youtubeUrl: 'https://www.youtube.com/watch?v=V-_O7nl0Ii0',
          thumbnail: 'https://img.youtube.com/vi/V-_O7nl0Ii0/mqdefault.jpg',
        },
        {
            id: 's13',
            category: 'showcase',
            title: 'Epic OST Medley',
            content: '오케스트라 버전 하이라이트를 모았습니다.',
            authorId: 'u13',
            authorNickname: 'ComposerLee',
            likeCount: 120,
            viewCount: 2400,
            createdAt: now(),
            youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
            comments: [
              { id: 'c1', authorNickname: '팬1', content: '소름...', createdAt: now(), likeCount: 2 },
            ],
          },
          {
            id: 's14',
            category: 'showcase',
            title: 'Chill Piano',
            content: '잔잔한 피아노 솔로 모음',
            authorId: 'u14',
            authorNickname: 'PianistJ',
            likeCount: 84,
            viewCount: 1300,
            createdAt: now(),
            youtubeUrl: 'https://www.youtube.com/watch?v=V-_O7nl0Ii0',
            thumbnail: 'https://img.youtube.com/vi/V-_O7nl0Ii0/mqdefault.jpg',
          },
          {
              id: 's15',
              category: 'showcase',
              title: 'Chill Piano',
              content: '잔잔한 피아노 솔로 모음',
              authorId: 'u15',
              authorNickname: 'PianistJ',
              likeCount: 84,
              viewCount: 1300,
              createdAt: now(),
              youtubeUrl: 'https://www.youtube.com/watch?v=V-_O7nl0Ii0',
              thumbnail: 'https://img.youtube.com/vi/V-_O7nl0Ii0/mqdefault.jpg',
            },
            {
              id: 's16',
              category: 'showcase',
              title: 'Chill Piano',
              content: '잔잔한 피아노 솔로 모음',
              authorId: 'u16',
              authorNickname: 'PianistJ',
              likeCount: 84,
              viewCount: 1300,
              createdAt: now(),
              youtubeUrl: 'https://www.youtube.com/watch?v=V-_O7nl0Ii0',
              thumbnail: 'https://img.youtube.com/vi/V-_O7nl0Ii0/mqdefault.jpg',
            },
            {
              id: 's17',
              category: 'showcase',
              title: 'Chill Piano',
              content: '잔잔한 피아노 솔로 모음',
              authorId: 'u17',
              authorNickname: 'PianistJ',
              likeCount: 84,
              viewCount: 1300,
              createdAt: now(),
              youtubeUrl: 'https://www.youtube.com/watch?v=V-_O7nl0Ii0',
              thumbnail: 'https://img.youtube.com/vi/V-_O7nl0Ii0/mqdefault.jpg',
            },
            {
              id: 's18',
              category: 'showcase',
              title: 'Chill Piano',
              content: '잔잔한 피아노 솔로 모음',
              authorId: 'u18',
              authorNickname: 'PianistJ',
              likeCount: 84,
              viewCount: 1300,
              createdAt: now(),
              youtubeUrl: 'https://www.youtube.com/watch?v=V-_O7nl0Ii0',
              thumbnail: 'https://img.youtube.com/vi/V-_O7nl0Ii0/mqdefault.jpg',
            },
            {
              id: 's19',
              category: 'showcase',
              title: 'Chill Piano',
              content: '잔잔한 피아노 솔로 모음',
              authorId: 'u19',
              authorNickname: 'PianistJ',
              likeCount: 84,
              viewCount: 1300,
              createdAt: now(),
              youtubeUrl: 'https://www.youtube.com/watch?v=V-_O7nl0Ii0',
              thumbnail: 'https://img.youtube.com/vi/V-_O7nl0Ii0/mqdefault.jpg',
            },
            {
                id: 's20',
                category: 'showcase',
                title: 'Epic OST Medley',
                content: '오케스트라 버전 하이라이트를 모았습니다.',
                authorId: 'u20',
                authorNickname: 'ComposerLee',
                likeCount: 120,
                viewCount: 2400,
                createdAt: now(),
                youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
                comments: [
                  { id: 'c1', authorNickname: '팬1', content: '소름...', createdAt: now(), likeCount: 2 },
                ],
              },
              {
                id: 's21',
                category: 'showcase',
                title: 'Chill Piano',
                content: '잔잔한 피아노 솔로 모음',
                authorId: 'u21',
                authorNickname: 'PianistJ',
                likeCount: 84,
                viewCount: 1300,
                createdAt: now(),
                youtubeUrl: 'https://www.youtube.com/watch?v=V-_O7nl0Ii0',
                thumbnail: 'https://img.youtube.com/vi/V-_O7nl0Ii0/mqdefault.jpg',
              },
              {
                  id: 's22',
                  category: 'showcase',
                  title: 'Chill Piano',
                  content: '잔잔한 피아노 솔로 모음',
                  authorId: 'u22',
                  authorNickname: 'PianistJ',
                  likeCount: 84,
                  viewCount: 1300,
                  createdAt: now(),
                  youtubeUrl: 'https://www.youtube.com/watch?v=V-_O7nl0Ii0',
                  thumbnail: 'https://img.youtube.com/vi/V-_O7nl0Ii0/mqdefault.jpg',
                },
                {
                  id: 's23',
                  category: 'showcase',
                  title: 'Chill Piano',
                  content: '잔잔한 피아노 솔로 모음',
                  authorId: 'u23',
                  authorNickname: 'PianistJ',
                  likeCount: 84,
                  viewCount: 1300,
                  createdAt: now(),
                  youtubeUrl: 'https://www.youtube.com/watch?v=V-_O7nl0Ii0',
                  thumbnail: 'https://img.youtube.com/vi/V-_O7nl0Ii0/mqdefault.jpg',
                },
                {
                  id: 's24',
                  category: 'showcase',
                  title: 'Chill Piano',
                  content: '잔잔한 피아노 솔로 모음',
                  authorId: 'u24',
                  authorNickname: 'PianistJ',
                  likeCount: 84,
                  viewCount: 1300,
                  createdAt: now(),
                  youtubeUrl: 'https://www.youtube.com/watch?v=V-_O7nl0Ii0',
                  thumbnail: 'https://img.youtube.com/vi/V-_O7nl0Ii0/mqdefault.jpg',
                },
                {
                  id: 's25',
                  category: 'showcase',
                  title: 'Chill Piano',
                  content: '잔잔한 피아노 솔로 모음',
                  authorId: 'u25',
                  authorNickname: 'PianistJ',
                  likeCount: 84,
                  viewCount: 1300,
                  createdAt: now(),
                  youtubeUrl: 'https://www.youtube.com/watch?v=V-_O7nl0Ii0',
                  thumbnail: 'https://img.youtube.com/vi/V-_O7nl0Ii0/mqdefault.jpg',
                },
                {
                  id: 's26',
                  category: 'showcase',
                  title: 'Chill Piano',
                  content: '잔잔한 피아노 솔로 모음',
                  authorId: 'u26',
                  authorNickname: 'PianistJ',
                  likeCount: 84,
                  viewCount: 1300,
                  createdAt: now(),
                  youtubeUrl: 'https://www.youtube.com/watch?v=V-_O7nl0Ii0',
                  thumbnail: 'https://img.youtube.com/vi/V-_O7nl0Ii0/mqdefault.jpg',
                },
  ],
  playlists: [
    {
      id: 'p1',
      category: 'playlists',
      title: 'Morning Boost',
      content: '활기찬 아침 플레이리스트',
      authorId: 'u3',
      authorNickname: 'DJ_sun',
      likeCount: 61,
      viewCount: 900,
      createdAt: now(),
      playlistTitle: 'Morning Boost',
      playlistThumbnail: '/placeholder-playlist.png',
      playlistUrl: 'https://example.com/playlist/morning',
      thumbnail: 'https://i.ytimg.com/vi/OZOOMgOshEg/hqdefault.jpg',
    },
    {
      id: 'p2',
      category: 'playlists',
      title: 'Morning Boost',
      content: '활기찬 아침 플레이리스트',
      authorId: 'u3',
      authorNickname: 'DJ_sun',
      likeCount: 61,
      viewCount: 900,
      createdAt: now(),
      playlistTitle: 'Morning Boost',
      playlistThumbnail: '/placeholder-playlist.png',
      playlistUrl: 'https://example.com/playlist/morning',
      thumbnail: 'https://i.ytimg.com/vi/OZOOMgOshEg/hqdefault.jpg',
    },
    {
      id: 'p3',
      category: 'playlists',
      title: 'Morning Boost',
      content: '활기찬 아침 플레이리스트',
      authorId: 'u3',
      authorNickname: 'DJ_sun',
      likeCount: 61,
      viewCount: 900,
      createdAt: now(),
      playlistTitle: 'Morning Boost',
      playlistThumbnail: '/placeholder-playlist.png',
      playlistUrl: 'https://example.com/playlist/morning',
      thumbnail: 'https://i.ytimg.com/vi/OZOOMgOshEg/hqdefault.jpg',
    },
    {
      id: 'p4',
      category: 'playlists',
      title: 'Morning Boost',
      content: '활기찬 아침 플레이리스트',
      authorId: 'u3',
      authorNickname: 'DJ_sun',
      likeCount: 61,
      viewCount: 900,
      createdAt: now(),
      playlistTitle: 'Morning Boost',
      playlistThumbnail: '/placeholder-playlist.png',
      playlistUrl: 'https://example.com/playlist/morning',
      thumbnail: 'https://i.ytimg.com/vi/OZOOMgOshEg/hqdefault.jpg',
    },
    {
      id: 'p5',
      category: 'playlists',
      title: 'Morning Boost',
      content: '활기찬 아침 플레이리스트',
      authorId: 'u3',
      authorNickname: 'DJ_sun',
      likeCount: 61,
      viewCount: 900,
      createdAt: now(),
      playlistTitle: 'Morning Boost',
      playlistThumbnail: '/placeholder-playlist.png',
      playlistUrl: 'https://example.com/playlist/morning',
      thumbnail: 'https://i.ytimg.com/vi/OZOOMgOshEg/hqdefault.jpg',
    },
    {
      id: 'p6',
      category: 'playlists',
      title: 'Morning Boost',
      content: '활기찬 아침 플레이리스트',
      authorId: 'u3',
      authorNickname: 'DJ_sun',
      likeCount: 61,
      viewCount: 900,
      createdAt: now(),
      playlistTitle: 'Morning Boost',
      playlistThumbnail: '/placeholder-playlist.png',
      playlistUrl: 'https://example.com/playlist/morning',
      thumbnail: 'https://i.ytimg.com/vi/OZOOMgOshEg/hqdefault.jpg',
    },
    {
      id: 'p7',
      category: 'playlists',
      title: 'Morning Boost',
      content: '활기찬 아침 플레이리스트',
      authorId: 'u3',
      authorNickname: 'DJ_sun',
      likeCount: 61,
      viewCount: 900,
      createdAt: now(),
      playlistTitle: 'Morning Boost',
      playlistThumbnail: '/placeholder-playlist.png',
      playlistUrl: 'https://example.com/playlist/morning',
      thumbnail: 'https://i.ytimg.com/vi/OZOOMgOshEg/hqdefault.jpg',
    },
    {
      id: 'p8',
      category: 'playlists',
      title: 'Morning Boost',
      content: '활기찬 아침 플레이리스트',
      authorId: 'u3',
      authorNickname: 'DJ_sun',
      likeCount: 61,
      viewCount: 900,
      createdAt: now(),
      playlistTitle: 'Morning Boost',
      playlistThumbnail: '/placeholder-playlist.png',
      playlistUrl: 'https://example.com/playlist/morning',
      thumbnail: 'https://i.ytimg.com/vi/OZOOMgOshEg/hqdefault.jpg',
    },
    {
      id: 'p9',
      category: 'playlists',
      title: 'Morning Boost',
      content: '활기찬 아침 플레이리스트',
      authorId: 'u3',
      authorNickname: 'DJ_sun',
      likeCount: 61,
      viewCount: 900,
      createdAt: now(),
      playlistTitle: 'Morning Boost',
      playlistThumbnail: '/placeholder-playlist.png',
      playlistUrl: 'https://example.com/playlist/morning',
      thumbnail: 'https://i.ytimg.com/vi/OZOOMgOshEg/hqdefault.jpg',
    },
    {
      id: 'p10',
      category: 'playlists',
      title: 'Morning Boost',
      content: '활기찬 아침 플레이리스트',
      authorId: 'u3',
      authorNickname: 'DJ_sun',
      likeCount: 61,
      viewCount: 900,
      createdAt: now(),
      playlistTitle: 'Morning Boost',
      playlistThumbnail: '/placeholder-playlist.png',
      playlistUrl: 'https://example.com/playlist/morning',
      thumbnail: 'https://i.ytimg.com/vi/OZOOMgOshEg/hqdefault.jpg',
    }

  ],
  spotlight: [
    {
      id: 'sp1',
      category: 'spotlight',
      title: '카드1',
      content: '따뜻한 거리 공연 사진 모음',
      authorId: 'u5',
      authorNickname: 'StreetBand',
      likeCount: 32,
      viewCount: 410,
      createdAt: now(),
      photos: ['https://images.unsplash.com/photo-1500530855697-b586d89ba3ee'],
      thumbnail: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee',
    },
    {
      id: 'sp2',
      category: 'spotlight',
      title: '카드2',
      content: '올해 페스티벌 스냅',
      authorId: 'u6',
      authorNickname: 'FestFan',
      likeCount: 27,
      viewCount: 350,
      createdAt: now(),
      photos: ['https://images.unsplash.com/photo-1506157786151-b8491531f063'],
      thumbnail: 'https://images.unsplash.com/photo-1506157786151-b8491531f063',
    },
    {
        id: 'sp3',
        category: 'spotlight',
        title: '카드3',
        content: '따뜻한 거리 공연 사진 모음',
        authorId: 'u5',
        authorNickname: 'StreetBand',
        likeCount: 32,
        viewCount: 410,
        createdAt: now(),
        photos: ['https://images.unsplash.com/photo-1504674900247-0877df9cc836'],
        thumbnail: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836',
      },
      {
        id: 'sp4',
        category: 'spotlight',
        title: '카드4',
        content: '올해 페스티벌 스냅',
        authorId: 'u6',
        authorNickname: 'FestFan',
        likeCount: 27,
        viewCount: 350,
        createdAt: now(),
        photos: ['https://images.unsplash.com/photo-1492684223066-81342ee5ff30'],
        thumbnail: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30',
      },
      {
        id: 'sp5',
        category: 'spotlight',
        title: '카드5',
        content: '따뜻한 거리 공연 사진 모음',
        authorId: 'u5',
        authorNickname: 'StreetBand',
        likeCount: 32,
        viewCount: 410,
        createdAt: now(),
        photos: ['https://images.unsplash.com/photo-1506157786151-b8491531f063'],
        thumbnail: 'https://images.unsplash.com/photo-1506157786151-b8491531f063',
      },
      {
        id: 'sp6',
        category: 'spotlight',
        title: '카드6',
        content: '올해 페스티벌 스냅',
        authorId: 'u6',
        authorNickname: 'FestFan',
        likeCount: 27,
        viewCount: 350,
        createdAt: now(),
        photos: ['https://images.unsplash.com/photo-1500530855697-b586d89ba3ee'],
        thumbnail: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee',
      },
      {
        id: 'sp7',
        category: 'spotlight',
        title: '카드7',
        content: '따뜻한 거리 공연 사진 모음',
        authorId: 'u5',
        authorNickname: 'StreetBand',
        likeCount: 32,
        viewCount: 410,
        createdAt: now(),
        photos: ['https://images.unsplash.com/photo-1470225620780-dba8ba36b745'],
        thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745',
      },
      {
        id: 'sp8',
        category: 'spotlight',
        title: '카드8',
        content: '올해 페스티벌 스냅',
        authorId: 'u6',
        authorNickname: 'FestFan',
        likeCount: 27,
        viewCount: 350,
        createdAt: now(),
        photos: ['https://images.unsplash.com/photo-1497032205916-ac775f0649ae'],
        thumbnail: 'https://images.unsplash.com/photo-1497032205916-ac775f0649ae',
      },
      {
        id: 'sp9',
        category: 'spotlight',
        title: '카드9',
        content: '따뜻한 거리 공연 사진 모음',
        authorId: 'u5',
        authorNickname: 'StreetBand',
        likeCount: 32,
        viewCount: 410,
        createdAt: now(),
        photos: ['https://images.unsplash.com/photo-1507874457470-272b3c8d8ee2'],
        thumbnail: 'https://images.unsplash.com/photo-1507874457470-272b3c8d8ee2',
      },
      {
        id: 'sp10',
        category: 'spotlight',
        title: '카드10',
        content: '올해 페스티벌 스냅',
        authorId: 'u6',
        authorNickname: 'FestFan',
        likeCount: 27,
        viewCount: 350,
        createdAt: now(),
        photos: ['https://images.unsplash.com/photo-1497032205916-ac775f0649ae'],
        thumbnail: 'https://images.unsplash.com/photo-1497032205916-ac775f0649ae',
      }
  ],
  community: [
    {
      id: 'cmt1',
      category: 'community',
      title: '장비 추천 요청',
      content: '홈 레코딩 입문 장비 추천 부탁드립니다.',
      authorId: 'u7',
      authorNickname: 'Newbie',
      likeCount: 10,
      viewCount: 210,
      createdAt: now(),
      files: [{ name: 'spec.pdf', url: '#' }],
    },
  ],
  reviews: [
    {
      id: 'rev1',
      category: 'reviews',
      title: '신형 오디오 인터페이스 리뷰',
      content: '라운드트립 레이턴시가 크게 개선되었습니다.',
      authorId: 'u8',
      authorNickname: 'Reviewer',
      likeCount: 14,
      viewCount: 180,
      createdAt: now(),
      files: [{ name: 'latency.png', url: '#' }],
    },
  ],
};

const mockSpotlights = mockBoards.spotlight.map((p) => ({
  id: p.id,
  title: p.title,
  description: p.content,
  image: p.thumbnail,
  category: p.category,
}));

function makeResponse<T>(data: T): ApiResponse<T> {
  return { success: true, message: null, data };
}

function filterPosts(category: BoardCategory, search?: string) {
  const list = mockBoards[category] || [];
  if (!search) return list;
  const kw = search.toLowerCase();
  return list.filter(
    (p) =>
      p.title.toLowerCase().includes(kw) ||
      (p.authorNickname || '').toLowerCase().includes(kw)
  );
}

export const mockBoardData = {
  getBoards: () => makeResponse({ spotlights: mockSpotlights }),

  getBoardByCategory: (category: BoardCategory, params?: { page?: number; search?: string }) => {
    const page = params?.page ?? 1;
    const pageSize = 20;
    const list = filterPosts(category, params?.search);
    const slice = list.slice((page - 1) * pageSize, page * pageSize);
    return makeResponse({ posts: slice.map((p, i) => ({ ...p, number: list.length - i })) as unknown[], total: list.length });
  },

  getPost: (category: BoardCategory, boardId: string) => {
    const post = (mockBoards[category] || []).find((p) => p.id === boardId);
    return makeResponse(post || null);
  },

  createPost: (category: BoardCategory, body: Record<string, unknown>) => {
    const id = nextId();
    const newPost: MockPost = {
      id,
      category,
      title: String(body.title || '새 글'),
      content: String(body.content || ''),
      authorId: 'mock-user',
      authorNickname: 'MockUser',
      createdAt: now(),
      likeCount: 0,
      viewCount: 0,
    };
    mockBoards[category] = [newPost, ...(mockBoards[category] || [])];
    return makeResponse({ boardId: id });
  },

  updatePost: (category: BoardCategory, boardId: string, body: Record<string, unknown>) => {
    mockBoards[category] = (mockBoards[category] || []).map((p) =>
      p.id === boardId ? { ...p, ...body } : p
    );
    return makeResponse(null);
  },

  deletePost: (category: BoardCategory, boardId: string) => {
    mockBoards[category] = (mockBoards[category] || []).filter((p) => p.id !== boardId);
    return makeResponse(null);
  },

  likePost: (category: BoardCategory, boardId: string) => {
    mockBoards[category] = (mockBoards[category] || []).map((p) =>
      p.id === boardId ? { ...p, likeCount: (p.likeCount ?? 0) + 1, isLiked: true } : p
    );
    return makeResponse(null);
  },

  pinPost: () => makeResponse(null),
  reportPost: () => makeResponse(null),

  // Comments
  createComment: (category: BoardCategory, boardId: string, content: string) => {
    const comment: MockComment = {
      id: `c-${nextId()}`,
      authorNickname: 'MockUser',
      content,
      createdAt: now(),
      likeCount: 0,
      replies: [],
    };
    mockBoards[category] = (mockBoards[category] || []).map((p) =>
      p.id === boardId ? { ...p, comments: [...(p.comments || []), comment] } : p
    );
    return makeResponse(null);
  },

  updateComment: (category: BoardCategory, boardId: string, commentId: string, content: string) => {
    mockBoards[category] = (mockBoards[category] || []).map((p) =>
      p.id === boardId
        ? {
            ...p,
            comments: (p.comments || []).map((c) => (c.id === commentId ? { ...c, content } : c)),
          }
        : p
    );
    return makeResponse(null);
  },

  deleteComment: (category: BoardCategory, boardId: string, commentId: string) => {
    mockBoards[category] = (mockBoards[category] || []).map((p) =>
      p.id === boardId ? { ...p, comments: (p.comments || []).filter((c) => c.id !== commentId) } : p
    );
    return makeResponse(null);
  },

  likeComment: (category: BoardCategory, boardId: string, commentId: string) => {
    mockBoards[category] = (mockBoards[category] || []).map((p) =>
      p.id === boardId
        ? {
            ...p,
            comments: (p.comments || []).map((c) =>
              c.id === commentId ? { ...c, likeCount: (c.likeCount ?? 0) + 1 } : c
            ),
          }
        : p
    );
    return makeResponse(null);
  },

  reportComment: () => makeResponse(null),

  createReply: (
    category: BoardCategory,
    boardId: string,
    commentId: string,
    _replyId: string,
    content: string
  ) => {
    mockBoards[category] = (mockBoards[category] || []).map((p) =>
      p.id === boardId
        ? {
            ...p,
            comments: (p.comments || []).map((c) =>
              c.id === commentId
                ? {
                    ...c,
                    replies: [...(c.replies || []), { id: `r-${nextId()}`, authorNickname: 'MockUser', content, createdAt: now() }],
                  }
                : c
            ),
          }
        : p
    );
    return makeResponse(null);
  },

  deleteReply: (category: BoardCategory, boardId: string, commentId: string, replyId: string) => {
    mockBoards[category] = (mockBoards[category] || []).map((p) =>
      p.id === boardId
        ? {
            ...p,
            comments: (p.comments || []).map((c) =>
              c.id === commentId
                ? { ...c, replies: (c.replies || []).filter((r) => r.id !== replyId) }
                : c
            ),
          }
        : p
    );
    return makeResponse(null);
  },

  reportReply: () => makeResponse(null),
};

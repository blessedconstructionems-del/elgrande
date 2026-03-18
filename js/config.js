// ===== ELGRANDE CONFIG =====
const CONFIG = {
  // TMDB API
  TMDB_KEY: '8265bd1679663a7ea12ac168da84d2e8',
  TMDB_BASE: 'https://api.themoviedb.org/3',
  TMDB_IMG: 'https://image.tmdb.org/t/p',

  // Streaming embed providers — tested working March 2026
  // Order matters: most reliable first
  EMBED_SERVERS: [
    { name: 'Server 1', url: (id) => `https://vidsrc.to/embed/movie/${id}` },
    { name: 'Server 2', url: (id) => `https://www.2embed.cc/embed/${id}` },
    { name: 'Server 3', url: (id) => `https://multiembed.mov/?video_id=${id}&tmdb=1` },
    { name: 'Server 4', url: (id) => `https://autoembed.co/movie/tmdb/${id}` },
    { name: 'Server 5', url: (id) => `https://player.videasy.net/movie/${id}` },
    { name: 'Server 6', url: (id) => `https://vidsrcme.ru/embed/movie?tmdb=${id}` },
    { name: 'Server 7', url: (id) => `https://vsembed.ru/embed/movie?tmdb=${id}` },
    { name: 'Server 8', url: (id) => `https://vidlink.pro/movie/${id}` },
  ],

  // TV show embed providers
  TV_EMBED_SERVERS: [
    { name: 'Server 1', url: (id, s, e) => `https://player.videasy.net/tv/${id}/${s}/${e}` },
    { name: 'Server 2', url: (id, s, e) => `https://embed.su/embed/tv/${id}/${s}/${e}` },
    { name: 'Server 3', url: (id, s, e) => `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}` },
    { name: 'Server 4', url: (id, s, e) => `https://autoembed.co/tv/tmdb/${id}-${s}-${e}` },
    { name: 'Server 5', url: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}` },
    { name: 'Server 6', url: (id, s, e) => `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}` },
    { name: 'Server 7', url: (id, s, e) => `https://moviesapi.club/tv/${id}-${s}-${e}` },
    { name: 'Server 8', url: (id, s, e) => `https://vidsrc.me/embed/tv/${id}/${s}/${e}` },
  ],

  SITE_NAME: 'ElGrande',
  TAGLINE: 'Stream Anything. Free.',
};

// Movie genre map
const GENRES = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 53: 'Thriller',
  10752: 'War', 37: 'Western'
};

// TV genre map (TMDB uses different IDs for TV)
const TV_GENRES = {
  10759: 'Action & Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 10762: 'Kids',
  9648: 'Mystery', 10763: 'News', 10764: 'Reality', 10765: 'Sci-Fi & Fantasy',
  10766: 'Soap', 10767: 'Talk', 10768: 'War & Politics', 37: 'Western'
};

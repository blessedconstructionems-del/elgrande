// ===== EMILYFLIX API =====

// Show all released movies — embed servers have content day-of-release
const STREAMING_DELAY_DAYS = 0;

const API = {
  // Returns a date string STREAMING_DELAY_DAYS ago (YYYY-MM-DD)
  streamingCutoffDate() {
    const d = new Date();
    d.setDate(d.getDate() - STREAMING_DELAY_DAYS);
    return d.toISOString().split('T')[0];
  },

  // True if a movie is old enough to be on streaming/embed servers
  isStreamable(movie) {
    if (!movie.release_date) return false;
    return movie.release_date <= this.streamingCutoffDate();
  },

  // Filter a results array to only streamable movies
  filterStreamable(results) {
    if (!Array.isArray(results)) return [];
    return results.filter(m => this.isStreamable(m));
  },

  async fetch(endpoint, params = {}) {
    const url = new URL(`${CONFIG.TMDB_BASE}${endpoint}`);
    url.searchParams.set('api_key', CONFIG.TMDB_KEY);
    url.searchParams.set('language', 'en-US');
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
    try {
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error('API Error:', e);
      return null;
    }
  },

  img(path, size = 'w500') {
    if (!path) return 'https://via.placeholder.com/500x750/1a1a1a/666?text=No+Image';
    return `${CONFIG.TMDB_IMG}/${size}${path}`;
  },

  backdrop(path, size = 'w1280') {
    if (!path) return '';
    return `${CONFIG.TMDB_IMG}/${size}${path}`;
  },

  // Fetch and auto-filter to only streamable movies
  async _fetchFiltered(endpoint, params = {}) {
    const data = await this.fetch(endpoint, params);
    if (data && data.results) {
      data.results = this.filterStreamable(data.results);
    }
    return data;
  },

  async trending(page = 1) {
    return this.fetch('/trending/movie/week', { page });
  },

  async popular(page = 1) {
    return this.fetch('/movie/popular', { page });
  },

  async topRated(page = 1) {
    return this.fetch('/movie/top_rated', { page });
  },

  // "Now Playing" removed — use discoverStreamable instead
  // "Upcoming" removed — those movies aren't out yet

  // New releases — movies from the last 6 months, sorted by release date
  async recentlyStreaming(page = 1) {
    const today = new Date().toISOString().split('T')[0];
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const oldestStr = sixMonthsAgo.toISOString().split('T')[0];
    return this.fetch('/discover/movie', {
      page,
      sort_by: 'release_date.desc',
      'release_date.lte': today,
      'release_date.gte': oldestStr,
      'vote_count.gte': 10
    });
  },

  // All-time popular by genre — no date cap, surfaces classics + new hits
  async byGenre(genreId, page = 1) {
    return this.fetch('/discover/movie', {
      with_genres: genreId,
      page,
      sort_by: 'popularity.desc',
      'vote_count.gte': 200
    });
  },

  // Discover with full param control
  async discover(params = {}, page = 1) {
    return this.fetch('/discover/movie', {
      page,
      sort_by: 'popularity.desc',
      'vote_count.gte': 100,
      ...params
    });
  },

  async details(id) {
    return this.fetch(`/movie/${id}`, { append_to_response: 'credits,similar,videos' });
  },

  async search(query, page = 1) {
    // Search doesn't support release_date.lte param, so filter client-side
    const data = await this.fetch('/search/movie', { query, page });
    if (data && data.results) {
      data.results = this.filterStreamable(data.results);
    }
    return data;
  },

  // ===== TV SHOW ENDPOINTS =====
  async trendingTV(page = 1) {
    return this.fetch('/trending/tv/week', { page });
  },

  async popularTV(page = 1) {
    return this.fetch('/tv/popular', { page });
  },

  async topRatedTV(page = 1) {
    return this.fetch('/tv/top_rated', { page });
  },

  async tvByGenre(genreId, page = 1) {
    return this.fetch('/discover/tv', {
      with_genres: genreId,
      page,
      sort_by: 'popularity.desc',
      'vote_count.gte': 50
    });
  },

  async discoverTV(params = {}, page = 1) {
    return this.fetch('/discover/tv', {
      page,
      sort_by: 'popularity.desc',
      'vote_count.gte': 20,
      ...params
    });
  },

  async tvDetails(id) {
    return this.fetch(`/tv/${id}`, { append_to_response: 'credits,similar,videos' });
  },

  async tvSeasonDetails(tvId, seasonNumber) {
    return this.fetch(`/tv/${tvId}/season/${seasonNumber}`);
  },

  async searchTV(query, page = 1) {
    return this.fetch('/search/tv', { query, page });
  },

  // ===== EMILY'S CUSTOM GENRES =====
  async zombieMovies(page = 1) {
    return this.fetch('/discover/movie', {
      with_keywords: '12377', // zombie
      page,
      sort_by: 'popularity.desc',
      'vote_count.gte': 50
    });
  },

  async zombieTV(page = 1) {
    return this.fetch('/discover/tv', {
      with_keywords: '12377',
      page,
      sort_by: 'popularity.desc',
      'vote_count.gte': 20
    });
  },

  async cleanComedy(page = 1) {
    return this.fetch('/discover/movie', {
      with_genres: '35',
      without_genres: '27,53,80', // exclude horror, thriller, crime
      certification_country: 'US',
      'certification.lte': 'PG-13',
      page,
      sort_by: 'popularity.desc',
      'vote_count.gte': 100
    });
  },

  async cleanComedyTV(page = 1) {
    return this.fetch('/discover/tv', {
      with_genres: '35',
      without_genres: '80', // exclude crime
      page,
      sort_by: 'popularity.desc',
      'vote_count.gte': 50
    });
  },

  async dystopianMovies(page = 1) {
    return this.fetch('/discover/movie', {
      with_keywords: '4565|161176', // dystopia | dystopian
      page,
      sort_by: 'popularity.desc',
      'vote_count.gte': 50
    });
  },

  async dystopianTV(page = 1) {
    return this.fetch('/discover/tv', {
      with_keywords: '4565|161176',
      page,
      sort_by: 'popularity.desc',
      'vote_count.gte': 20
    });
  },

  async psychThrillerMovies(page = 1) {
    return this.fetch('/discover/movie', {
      with_genres: '53',
      with_keywords: '11949|6075', // psychological thriller | psychological
      page,
      sort_by: 'popularity.desc',
      'vote_count.gte': 50
    });
  },

  async psychThrillerTV(page = 1) {
    return this.fetch('/discover/tv', {
      with_genres: '9648', // mystery (closest TV genre)
      with_keywords: '11949|6075',
      page,
      sort_by: 'popularity.desc',
      'vote_count.gte': 20
    });
  },

  // Long-running TV series (high episode count, well-known)
  async longSeriesTV(page = 1) {
    return this.fetch('/discover/tv', {
      page,
      sort_by: 'vote_count.desc',
      'vote_count.gte': 500,
      'first_air_date.lte': '2023-01-01',
      with_type: '0' // scripted
    });
  },

  async searchMulti(query, page = 1) {
    const data = await this.fetch('/search/multi', { query, page });
    if (data && data.results) {
      // Filter to only movies and tv shows
      data.results = data.results.filter(r => r.media_type === 'movie' || r.media_type === 'tv');
    }
    return data;
  },

  tvGenreNames(ids = []) {
    return ids.slice(0, 3).map(id => TV_GENRES[id] || GENRES[id] || '').filter(Boolean);
  },

  formatRuntime(mins) {
    if (!mins) return '';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  },

  formatRating(r) {
    if (!r) return 'N/A';
    return (Math.round(r * 10) / 10).toFixed(1);
  },

  getYear(date) {
    if (!date) return '';
    return date.split('-')[0];
  },

  genreNames(ids = []) {
    return ids.slice(0, 3).map(id => GENRES[id] || '').filter(Boolean);
  }
};

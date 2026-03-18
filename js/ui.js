// ===== EMILYFLIX UI HELPERS =====

function getMaturityFromGenres(genreIds) {
  if (!genreIds) return 'PG-13';
  if (genreIds.includes(27) || genreIds.includes(53)) return 'TV-MA';
  if (genreIds.includes(10751) || genreIds.includes(16)) return 'PG';
  if (genreIds.includes(28) || genreIds.includes(80) || genreIds.includes(10759)) return 'TV-14';
  if (genreIds.includes(18) || genreIds.includes(878)) return 'TV-14';
  return 'PG-13';
}

const UI = {
  // Create a movie/TV card element — Netflix style
  card(item, wide = false) {
    const isTV = item.media_type === 'tv' || (item.name !== undefined && !item.title);
    const title = item.title || item.name || 'Unknown';
    const date = item.release_date || item.first_air_date || '';
    const type = isTV ? 'tv' : 'movie';

    const el = document.createElement('div');
    el.className = `movie-card${wide ? ' wide' : ''}`;
    const imgSrc = wide
      ? API.img(item.backdrop_path, 'w780')
      : API.img(item.poster_path, 'w342');
    const matchPct = Math.round((item.vote_average || 0) * 10);
    const year = API.getYear(date);
    const genres = isTV ? API.tvGenreNames(item.genre_ids || []) : API.genreNames(item.genre_ids || []);
    const maturity = getMaturityFromGenres(item.genre_ids);

    el.innerHTML = `
      <img src="${imgSrc}" alt="${title}" loading="lazy"
           onerror="this.src='https://via.placeholder.com/${wide ? '780x440' : '342x513'}/1a1a1a/555?text=No+Image'">
      ${isTV ? '<div class="tv-badge">TV</div>' : ''}
      <div class="movie-card-overlay">
        <div class="movie-card-actions">
          <button class="card-btn play-btn" title="Play">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#111"><polygon points="5,3 19,12 5,21"/></svg>
          </button>
          <button class="card-btn add-btn" title="Add to My List">+</button>
          <button class="card-btn like-btn" title="Like">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
          </button>
          <span class="card-btn-spacer"></span>
          <button class="card-btn info-btn" title="More Info">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>
        <div class="movie-card-meta">
          <span class="movie-card-rating">${matchPct}% Match</span>
          <span class="movie-card-maturity">${maturity}</span>
          <span>${year}</span>
        </div>
        <div class="movie-card-meta" style="margin-top:3px;">
          ${genres.slice(0, 2).map(g => `<span class="movie-card-genre">${g}</span>`).join('<span style="color:#555;margin:0 1px;">&#8226;</span>')}
        </div>
      </div>
    `;

    const watchUrl = isTV
      ? `watch.html?id=${item.id}&type=tv&season=1&episode=1`
      : `watch.html?id=${item.id}`;

    // Play button -> go to player
    el.querySelector('.play-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      window.location.href = watchUrl;
    });

    // Info button -> open modal
    el.querySelector('.info-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      Modal.open(item.id, type);
    });

    // Add to list button
    el.querySelector('.add-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      UI.toast('Added to My List');
    });

    // Like button
    el.querySelector('.like-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      UI.toast('Liked!');
    });

    // Card click -> open modal
    el.addEventListener('click', () => Modal.open(item.id, type));

    return el;
  },

  // Render skeleton placeholders
  skeletons(count = 6, wide = false) {
    return Array.from({ length: count }, () => {
      const el = document.createElement('div');
      el.className = `skeleton skeleton-card${wide ? ' wide' : ''}`;
      if (wide) el.style.aspectRatio = '16/9';
      return el;
    });
  },

  // Setup carousel scroll buttons
  setupCarousel(wrapper) {
    const carousel = wrapper.querySelector('.carousel');
    const prev = wrapper.querySelector('.carousel-btn.prev');
    const next = wrapper.querySelector('.carousel-btn.next');
    if (!carousel || !prev || !next) return;

    const scroll = (dir) => {
      const amount = carousel.clientWidth * 0.85;
      carousel.scrollBy({ left: dir * amount, behavior: 'smooth' });
    };

    prev.addEventListener('click', () => scroll(-1));
    next.addEventListener('click', () => scroll(1));

    const updateBtns = () => {
      prev.style.visibility = carousel.scrollLeft > 10 ? 'visible' : 'hidden';
      next.style.visibility = carousel.scrollLeft < carousel.scrollWidth - carousel.clientWidth - 10 ? 'visible' : 'hidden';
    };

    carousel.addEventListener('scroll', updateBtns);
    setTimeout(updateBtns, 100);
  },

  // Show a toast notification
  toast(msg, duration = 2500) {
    let t = document.querySelector('.toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), duration);
  },

  // Navbar scroll behavior
  initNavbar() {
    const nav = document.querySelector('.navbar');
    if (!nav) return;
    if (nav.classList.contains('solid')) return;
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 10);
    });
  },

  // Render a full section with carousel
  async renderSection(container, title, fetchFn, wide = false) {
    const section = document.createElement('div');
    section.className = 'section';
    section.innerHTML = `
      <div class="section-title">
        ${title}
        <span class="explore-more">Explore All &#x203a;</span>
      </div>
      <div class="carousel-wrapper">
        <button class="carousel-btn prev">&#x2039;</button>
        <div class="carousel">
          ${UI.skeletons(wide ? 4 : 6, wide).map(s => s.outerHTML).join('')}
        </div>
        <button class="carousel-btn next">&#x203a;</button>
      </div>
    `;
    container.appendChild(section);
    UI.setupCarousel(section.querySelector('.carousel-wrapper'));

    const data = await fetchFn();
    const carousel = section.querySelector('.carousel');
    carousel.innerHTML = '';

    if (data && data.results) {
      data.results.slice(0, 18).forEach(movie => {
        carousel.appendChild(UI.card(movie, wide));
      });
    }

    // Re-check button visibility after cards load
    UI.setupCarousel(section.querySelector('.carousel-wrapper'));
    return section;
  }
};

// ===== MODAL =====
const Modal = {
  el: null,

  init() {
    this.el = document.getElementById('modal');
    if (!this.el) return;

    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });
  },

  async open(id, type = 'movie') {
    if (!this.el) return;
    this.el.classList.add('active');
    document.body.style.overflow = 'hidden';

    this.el.innerHTML = `
      <div class="modal">
        <div class="modal-hero">
          <div class="skeleton" style="width:100%;height:100%;position:absolute;inset:0;"></div>
        </div>
        <div class="modal-body">
          <div class="spinner"></div>
        </div>
        <button class="modal-close" onclick="Modal.close()">&#10005;</button>
      </div>
    `;

    const isTV = type === 'tv';
    const item = isTV ? await API.tvDetails(id) : await API.details(id);
    if (!item) {
      this.el.innerHTML = `<div class="modal" style="padding:40px;text-align:center;">
        <button class="modal-close" onclick="Modal.close()">&#10005;</button>
        <p>Failed to load details.</p>
      </div>`;
      return;
    }

    const title = item.title || item.name || 'Unknown';
    const genres = (item.genres || []).map(g => g.name);
    const runtime = isTV
      ? (item.episode_run_time && item.episode_run_time[0] ? API.formatRuntime(item.episode_run_time[0]) : '')
      : API.formatRuntime(item.runtime);
    const year = API.getYear(item.release_date || item.first_air_date);
    const matchPct = Math.round((item.vote_average || 0) * 10);
    const backdropUrl = API.backdrop(item.backdrop_path, 'w1280');
    const watchUrl = isTV
      ? `watch.html?id=${item.id}&type=tv&season=1&episode=1`
      : `watch.html?id=${item.id}`;
    const seasons = isTV && item.seasons ? item.seasons.filter(s => s.season_number > 0) : [];
    const maturity = getMaturityFromGenres((item.genres || []).map(g => g.id));

    this.el.innerHTML = `
      <div class="modal">
        <button class="modal-close" onclick="Modal.close()">&#10005;</button>
        <div class="modal-hero">
          ${backdropUrl ? `<img src="${backdropUrl}" alt="${title}" loading="lazy">` : ''}
          <div class="modal-hero-content">
            <a href="${watchUrl}" class="btn btn-play" style="font-size:0.9rem;padding:8px 20px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#111"><polygon points="5,3 19,12 5,21"/></svg>
              Play
            </a>
          </div>
        </div>
        <div class="modal-body">
          <h2 class="modal-title">${title}</h2>
          <div class="modal-meta">
            <span class="modal-rating">${matchPct}% Match</span>
            <span class="modal-year">${year}</span>
            ${runtime ? `<span class="modal-runtime">${runtime}</span>` : ''}
            <span class="modal-hd">HD</span>
            <span class="maturity-badge">${maturity}</span>
            ${isTV && seasons.length ? `<span style="color:#aaa;">${seasons.length} Season${seasons.length > 1 ? 's' : ''}</span>` : ''}
          </div>
          <p class="modal-description">${item.overview || 'No description available.'}</p>
          ${genres.length ? `
          <div class="modal-genres">
            ${genres.map(g => `<span class="modal-genre-tag">${g}</span>`).join('')}
          </div>` : ''}
          <div class="modal-actions">
            <a href="${watchUrl}" class="btn btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
              Watch Now
            </a>
          </div>
        </div>
      </div>
    `;
  },

  close() {
    if (!this.el) return;
    this.el.classList.remove('active');
    document.body.style.overflow = '';
  }
};

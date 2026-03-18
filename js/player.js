// ===== EMILYFLIX NATIVE PLAYER =====
// Fetches direct stream URLs and plays via HLS.js
// Falls back to iframe if stream unavailable

const Player = {
  hls: null,
  video: null,
  movieId: null,
  mediaType: 'movie', // 'movie' or 'tv'
  season: 1,
  episode: 1,
  streamData: null,
  hideControlsTimer: null,
  isMuted: false,
  isFullscreen: false,

  // Stream source APIs (tried in order) — disabled, these CORS proxies are unreliable
  STREAM_APIS: [],

  // Fallback embed iframes — ordered by reliability (movies)
  FALLBACK_EMBEDS: [
    (id) => `https://player.videasy.net/movie/${id}`,
    (id) => `https://embed.su/embed/movie/${id}`,
    (id) => `https://multiembed.mov/?video_id=${id}&tmdb=1`,
    (id) => `https://autoembed.co/movie/tmdb/${id}`,
    (id) => `https://vidlink.pro/movie/${id}`,
    (id) => `https://www.2embed.cc/embed/${id}`,
    (id) => `https://vidsrc.cc/v2/embed/movie/${id}`,
    (id) => `https://moviesapi.club/movie/${id}`,
  ],

  // TV show embed iframes
  TV_FALLBACK_EMBEDS: [
    (id, s, e) => `https://player.videasy.net/tv/${id}/${s}/${e}`,
    (id, s, e) => `https://embed.su/embed/tv/${id}/${s}/${e}`,
    (id, s, e) => `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}`,
    (id, s, e) => `https://autoembed.co/tv/tmdb/${id}-${s}-${e}`,
    (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}`,
    (id, s, e) => `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}`,
    (id, s, e) => `https://moviesapi.club/tv/${id}-${s}-${e}`,
    (id, s, e) => `https://vidsrc.me/embed/tv/${id}/${s}/${e}`,
  ],

  getEmbeds() {
    if (this.mediaType === 'tv') return this.TV_FALLBACK_EMBEDS;
    return this.FALLBACK_EMBEDS;
  },

  getEmbedUrl(embedFn, idx) {
    if (this.mediaType === 'tv') {
      return embedFn(this.movieId, this.season, this.episode);
    }
    return embedFn(this.movieId);
  },

  async init(movieId, type = 'movie', season = 1, episode = 1) {
    this.movieId = movieId;
    this.mediaType = type;
    this.season = season;
    this.episode = episode;
    this.renderShell();
    await this.tryNativeStream();
  },

  renderShell() {
    const wrapper = document.getElementById('playerWrapper');
    wrapper.innerHTML = `
      <div class="bf-player" id="bfPlayer">
        <video id="bfVideo" preload="metadata" playsinline></video>

        <!-- Overlay for click-to-play -->
        <div class="bf-overlay" id="bfOverlay"></div>

        <!-- Big play button (center) -->
        <div class="bf-center-play" id="bfCenterPlay">
          <svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="38" fill="rgba(0,0,0,0.6)" stroke="rgba(255,255,255,0.3)" stroke-width="2"/><polygon points="32,24 60,40 32,56" fill="white"/></svg>
        </div>

        <!-- Loading spinner -->
        <div class="bf-spinner-wrap" id="bfSpinner">
          <div class="bf-spin"></div>
          <p id="bfLoadMsg">Finding stream...</p>
        </div>

        <!-- Controls bar -->
        <div class="bf-controls" id="bfControls">
          <!-- Progress bar -->
          <div class="bf-progress-wrap">
            <div class="bf-progress-bar" id="bfProgressBar">
              <div class="bf-buffered" id="bfBuffered"></div>
              <div class="bf-played" id="bfPlayed"></div>
              <div class="bf-thumb" id="bfThumb"></div>
            </div>
          </div>

          <!-- Bottom row -->
          <div class="bf-bottom-row">
            <div class="bf-left-controls">
              <!-- Play/Pause -->
              <button class="bf-btn" id="bfPlayBtn" title="Play/Pause">
                <svg id="bfPlayIcon" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21" fill="white"/></svg>
              </button>

              <!-- Volume -->
              <div class="bf-vol-group">
                <button class="bf-btn" id="bfMuteBtn" title="Mute">
                  <svg id="bfVolIcon" viewBox="0 0 24 24">
                    <path d="M3 9v6h4l5 5V4L7 9H3z" fill="white"/>
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" fill="white"/>
                    <path d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" fill="white"/>
                  </svg>
                </button>
                <input type="range" class="bf-vol-slider" id="bfVolSlider" min="0" max="1" step="0.05" value="1">
              </div>

              <!-- Time -->
              <span class="bf-time" id="bfTime">0:00 / 0:00</span>
            </div>

            <div class="bf-right-controls">
              <!-- Quality selector -->
              <div class="bf-quality-wrap" id="bfQualityWrap" style="display:none;">
                <button class="bf-btn bf-quality-btn" id="bfQualityBtn">HD ▾</button>
                <div class="bf-quality-menu" id="bfQualityMenu"></div>
              </div>

              <!-- Subtitles -->
              <button class="bf-btn" id="bfSubBtn" title="Subtitles" style="display:none;">
                <svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2" fill="none" stroke="white" stroke-width="1.5"/><line x1="6" y1="10" x2="18" y2="10" stroke="white" stroke-width="1.5"/><line x1="6" y1="14" x2="14" y2="14" stroke="white" stroke-width="1.5"/></svg>
              </button>

              <!-- Fullscreen -->
              <button class="bf-btn" id="bfFsBtn" title="Fullscreen">
                <svg id="bfFsIcon" viewBox="0 0 24 24">
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" fill="white"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Server selector overlay -->
        <div class="bf-server-bar" id="bfServerBar">
          <span class="bf-server-label">Source:</span>
          <div id="bfServerBtns"></div>
        </div>

        <!-- Error state -->
        <div class="bf-error" id="bfError" style="display:none;">
          <svg viewBox="0 0 24 24" width="48" height="48"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="#0066ff"/></svg>
          <p id="bfErrorMsg">Stream unavailable</p>
          <div id="bfErrorActions"></div>
        </div>
      </div>
    `;

    this.video = document.getElementById('bfVideo');
    this.bindControls();
  },

  async tryNativeStream() {
    this.showSpinner('Finding stream...');

    // Try each stream API
    for (let i = 0; i < this.STREAM_APIS.length; i++) {
      try {
        const url = this.STREAM_APIS[i](this.movieId);
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) continue;
        const data = await res.json();

        // Parse stream URL from response
        const streamUrl = this.extractStreamUrl(data);
        if (streamUrl) {
          this.streamData = data;
          await this.loadStream(streamUrl, data);
          return;
        }
      } catch (e) {
        console.warn('Stream API failed:', e.message);
      }
    }

    // All APIs failed — fall back to embed iframe
    this.loadFallbackEmbed(0);
  },

  extractStreamUrl(data) {
    // Handle various API response shapes
    if (data?.url) return data.url;
    if (data?.stream) return data.stream;
    if (data?.source) return data.source;
    if (data?.sources?.[0]?.url) return data.sources[0].url;
    if (data?.sources?.[0]?.file) return data.sources[0].file;
    if (data?.result?.sources?.[0]?.url) return data.result.sources[0].url;
    if (data?.data?.sources?.[0]?.url) return data.data.sources[0].url;
    if (Array.isArray(data?.sources)) {
      const hls = data.sources.find(s => s.url?.includes('.m3u8') || s.file?.includes('.m3u8'));
      if (hls) return hls.url || hls.file;
      return data.sources[0]?.url || data.sources[0]?.file;
    }
    return null;
  },

  async loadStream(streamUrl, data) {
    this.showSpinner('Loading...');
    const video = this.video;

    // Destroy previous HLS instance
    if (this.hls) { this.hls.destroy(); this.hls = null; }

    const isHLS = streamUrl.includes('.m3u8');
    const isMP4 = streamUrl.includes('.mp4') || streamUrl.includes('.mkv') || streamUrl.includes('.webm');

    if (isHLS && typeof Hls !== 'undefined' && Hls.isSupported()) {
      this.hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
      });
      this.hls.loadSource(streamUrl);
      this.hls.attachMedia(video);

      this.hls.on(Hls.Events.MANIFEST_PARSED, (e, data) => {
        this.hideSpinner();
        this.showCenterPlay();

        // Build quality menu
        if (data.levels && data.levels.length > 1) {
          this.buildQualityMenu(data.levels);
        }

        video.play().catch(() => {});
      });

      this.hls.on(Hls.Events.ERROR, (e, data) => {
        if (data.fatal) {
          console.warn('HLS fatal error:', data.type);
          this.loadFallbackEmbed(0);
        }
      });

    } else if (isMP4 || (isHLS && video.canPlayType('application/vnd.apple.mpegurl'))) {
      // Native HLS (Safari) or direct MP4
      video.src = streamUrl;
      video.addEventListener('canplay', () => {
        this.hideSpinner();
        this.showCenterPlay();
        video.play().catch(() => {});
      }, { once: true });
      video.addEventListener('error', () => {
        this.loadFallbackEmbed(0);
      }, { once: true });
      video.load();

    } else {
      // Unknown format — fallback
      this.loadFallbackEmbed(0);
    }

    // Build server bar with fallback options
    this.buildServerBar();

    // Load subtitles if available
    this.loadSubtitles(data);
  },

  loadFallbackEmbed(idx) {
    const wrapper = document.getElementById('playerWrapper');
    const embeds = this.getEmbeds();
    if (idx >= embeds.length) {
      this.showError('No streams available right now. Try again later.');
      return;
    }

    this._currentEmbedIdx = idx;

    // Build player-frame URL with TV params if needed
    let playerUrl = `player-frame.html?id=${this.movieId}&s=${idx}`;
    if (this.mediaType === 'tv') {
      playerUrl += `&type=tv&season=${this.season}&episode=${this.episode}`;
    }

    wrapper.innerHTML = `
      <div style="position:relative;width:100%;height:100%;background:#000;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:20px;">
        <div style="text-align:center;">
          <div onclick="window.open('${playerUrl}','_blank')" style="
            width:100px;height:100px;border-radius:50%;background:rgba(0,102,255,0.9);
            display:flex;align-items:center;justify-content:center;margin:0 auto 16px;cursor:pointer;
            transition:transform 0.2s;
          " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
          </div>
          <div style="color:white;font-size:1.2rem;font-weight:600;margin-bottom:8px;">Click to Watch</div>
          <div style="color:#aaa;font-size:0.8rem;">Opens player with ad-blocking</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:center;">
          <span style="color:#aaa;font-size:0.75rem;">Server:</span>
          ${embeds.map((_, i) => {
            let srvUrl = `player-frame.html?id=${this.movieId}&s=${i}`;
            if (this.mediaType === 'tv') srvUrl += `&type=tv&season=${this.season}&episode=${this.episode}`;
            return `
            <button onclick="window.open('${srvUrl}','_blank')"
              style="background:${i===idx?'#0066ff':'rgba(255,255,255,0.15)'};border:none;color:white;padding:4px 12px;border-radius:4px;cursor:pointer;font-size:0.75rem;">
              ${i+1}
            </button>`;
          }).join('')}
        </div>
      </div>
    `;
  },

  buildServerBar() {
    const bar = document.getElementById('bfServerBar');
    const btns = document.getElementById('bfServerBtns');
    if (!bar || !btns) return;
    const embeds = this.getEmbeds();
    btns.innerHTML = `
      <button class="bf-srv active" onclick="">Native</button>
      ${embeds.map((_, i) => `
        <button class="bf-srv" onclick="Player.loadFallbackEmbed(${i})">Server ${i+1}</button>
      `).join('')}
    `;
    bar.style.display = 'flex';
  },

  buildQualityMenu(levels) {
    const wrap = document.getElementById('bfQualityWrap');
    const menu = document.getElementById('bfQualityMenu');
    const btn = document.getElementById('bfQualityBtn');
    if (!wrap || !menu) return;

    wrap.style.display = 'block';
    const sorted = [...levels].sort((a, b) => b.height - a.height);
    menu.innerHTML = sorted.map((l, i) => `
      <div class="bf-q-item" onclick="Player.setQuality(${levels.indexOf(l)}, '${l.height}p')">
        ${l.height}p ${i === 0 ? '<span style="color:#46d369;font-size:0.7rem;">Best</span>' : ''}
      </div>
    `).join('') + `<div class="bf-q-item" onclick="Player.setQuality(-1,'Auto')">Auto</div>`;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('open');
    });
    document.addEventListener('click', () => menu.classList.remove('open'));
  },

  setQuality(level, label) {
    if (!this.hls) return;
    this.hls.currentLevel = level;
    document.getElementById('bfQualityBtn').textContent = label + ' ▾';
    document.getElementById('bfQualityMenu').classList.remove('open');
  },

  loadSubtitles(data) {
    const tracks = data?.subtitles || data?.tracks || data?.captions || [];
    if (!tracks.length) return;
    const video = this.video;
    const btn = document.getElementById('bfSubBtn');
    if (btn) btn.style.display = 'block';

    tracks.forEach(t => {
      const track = document.createElement('track');
      track.kind = 'subtitles';
      track.label = t.label || t.lang || 'English';
      track.srclang = t.lang || 'en';
      track.src = t.url || t.src;
      if ((t.lang || '') === 'en' || (t.label || '').toLowerCase().includes('english')) {
        track.default = true;
      }
      video.appendChild(track);
    });

    btn?.addEventListener('click', () => {
      const mode = video.textTracks[0]?.mode;
      if (video.textTracks[0]) {
        video.textTracks[0].mode = mode === 'showing' ? 'hidden' : 'showing';
      }
    });
  },

  bindControls() {
    const video = this.video;
    const overlay = document.getElementById('bfOverlay');
    const centerPlay = document.getElementById('bfCenterPlay');
    const playBtn = document.getElementById('bfPlayBtn');
    const muteBtn = document.getElementById('bfMuteBtn');
    const volSlider = document.getElementById('bfVolSlider');
    const fsBtn = document.getElementById('bfFsBtn');
    const progressBar = document.getElementById('bfProgressBar');
    const controls = document.getElementById('bfControls');

    if (!video) return;

    // Play/Pause toggle
    const togglePlay = () => {
      if (video.paused) { video.play(); } else { video.pause(); }
    };

    overlay?.addEventListener('click', togglePlay);
    centerPlay?.addEventListener('click', togglePlay);
    playBtn?.addEventListener('click', togglePlay);

    video.addEventListener('play', () => {
      this.setPlayIcon(true);
      this.hideCenterPlay();
    });
    video.addEventListener('pause', () => {
      this.setPlayIcon(false);
      this.showCenterPlay();
    });
    video.addEventListener('waiting', () => this.showSpinner('Buffering...'));
    video.addEventListener('canplay', () => this.hideSpinner());
    video.addEventListener('playing', () => this.hideSpinner());

    // Progress
    video.addEventListener('timeupdate', () => {
      if (!video.duration) return;
      const pct = (video.currentTime / video.duration) * 100;
      const played = document.getElementById('bfPlayed');
      const thumb = document.getElementById('bfThumb');
      if (played) played.style.width = pct + '%';
      if (thumb) thumb.style.left = pct + '%';
      document.getElementById('bfTime').textContent =
        `${this.fmtTime(video.currentTime)} / ${this.fmtTime(video.duration)}`;
    });

    video.addEventListener('progress', () => {
      if (!video.duration) return;
      const buf = video.buffered;
      if (buf.length > 0) {
        const pct = (buf.end(buf.length - 1) / video.duration) * 100;
        const buffered = document.getElementById('bfBuffered');
        if (buffered) buffered.style.width = pct + '%';
      }
    });

    // Seek on progress bar click
    progressBar?.addEventListener('click', (e) => {
      if (!video.duration) return;
      const rect = progressBar.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      video.currentTime = pct * video.duration;
    });

    // Drag seek
    let seeking = false;
    progressBar?.addEventListener('mousedown', () => { seeking = true; });
    document.addEventListener('mousemove', (e) => {
      if (!seeking || !video.duration) return;
      const rect = progressBar.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      video.currentTime = pct * video.duration;
    });
    document.addEventListener('mouseup', () => { seeking = false; });

    // Volume
    volSlider?.addEventListener('input', (e) => {
      video.volume = parseFloat(e.target.value);
      video.muted = video.volume === 0;
      this.updateVolIcon();
    });
    muteBtn?.addEventListener('click', () => {
      video.muted = !video.muted;
      if (volSlider) volSlider.value = video.muted ? 0 : video.volume;
      this.updateVolIcon();
    });

    // Fullscreen
    fsBtn?.addEventListener('click', () => this.toggleFullscreen());
    document.addEventListener('fullscreenchange', () => this.onFullscreenChange());

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      const player = document.getElementById('bfPlayer');
      if (!player) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      switch(e.key) {
        case ' ': case 'k': e.preventDefault(); togglePlay(); break;
        case 'ArrowRight': video.currentTime = Math.min(video.duration, video.currentTime + 10); break;
        case 'ArrowLeft': video.currentTime = Math.max(0, video.currentTime - 10); break;
        case 'ArrowUp': video.volume = Math.min(1, video.volume + 0.1); if(volSlider) volSlider.value = video.volume; this.updateVolIcon(); break;
        case 'ArrowDown': video.volume = Math.max(0, video.volume - 0.1); if(volSlider) volSlider.value = video.volume; this.updateVolIcon(); break;
        case 'm': video.muted = !video.muted; this.updateVolIcon(); break;
        case 'f': this.toggleFullscreen(); break;
      }
    });

    // Auto-hide controls + cursor in fullscreen
    const playerEl = document.getElementById('bfPlayer');
    let idleTimer = null;

    const showControls = () => {
      controls?.classList.add('visible');
      document.getElementById('bfServerBar')?.classList.add('visible');
      playerEl?.classList.remove('bf-idle');
      clearTimeout(this.hideControlsTimer);
      clearTimeout(idleTimer);
      if (!video.paused) {
        this.hideControlsTimer = setTimeout(() => {
          controls?.classList.remove('visible');
          document.getElementById('bfServerBar')?.classList.remove('visible');
        }, 3000);
        // Hide cursor too in fullscreen after 3s idle
        idleTimer = setTimeout(() => {
          if (document.fullscreenElement) {
            playerEl?.classList.add('bf-idle');
          }
        }, 3000);
      }
    };
    playerEl?.addEventListener('mousemove', showControls);
    playerEl?.addEventListener('touchstart', showControls);
    playerEl?.addEventListener('mouseleave', () => {
      if (!video.paused) {
        clearTimeout(this.hideControlsTimer);
        clearTimeout(idleTimer);
        controls?.classList.remove('visible');
        document.getElementById('bfServerBar')?.classList.remove('visible');
      }
    });

    // Show controls initially
    showControls();
  },

  toggleFullscreen() {
    const player = document.getElementById('bfPlayer');
    if (!document.fullscreenElement) {
      player?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  },

  onFullscreenChange() {
    const icon = document.getElementById('bfFsIcon');
    if (document.fullscreenElement) {
      if (icon) icon.innerHTML = '<path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" fill="white"/>';
    } else {
      if (icon) icon.innerHTML = '<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" fill="white"/>';
    }
  },

  setPlayIcon(playing) {
    const icon = document.getElementById('bfPlayIcon');
    if (!icon) return;
    if (playing) {
      icon.innerHTML = '<rect x="6" y="4" width="4" height="16" fill="white"/><rect x="14" y="4" width="4" height="16" fill="white"/>';
    } else {
      icon.innerHTML = '<polygon points="5,3 19,12 5,21" fill="white"/>';
    }
  },

  updateVolIcon() {
    const video = this.video;
    const icon = document.getElementById('bfVolIcon');
    if (!icon) return;
    if (video.muted || video.volume === 0) {
      icon.innerHTML = '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" fill="white"/>';
    } else if (video.volume < 0.5) {
      icon.innerHTML = '<path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" fill="white"/>';
    } else {
      icon.innerHTML = '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" fill="white"/>';
    }
  },

  showSpinner(msg) {
    const s = document.getElementById('bfSpinner');
    const m = document.getElementById('bfLoadMsg');
    if (s) s.style.display = 'flex';
    if (m) m.textContent = msg || 'Loading...';
    const cp = document.getElementById('bfCenterPlay');
    if (cp) cp.style.display = 'none';
  },

  hideSpinner() {
    const s = document.getElementById('bfSpinner');
    if (s) s.style.display = 'none';
  },

  showCenterPlay() {
    const cp = document.getElementById('bfCenterPlay');
    if (cp) cp.style.display = 'flex';
  },

  hideCenterPlay() {
    const cp = document.getElementById('bfCenterPlay');
    if (cp) cp.style.display = 'none';
  },

  showError(msg) {
    const err = document.getElementById('bfError');
    const errMsg = document.getElementById('bfErrorMsg');
    const errActions = document.getElementById('bfErrorActions');
    if (err) err.style.display = 'flex';
    if (errMsg) errMsg.textContent = msg;
    this.hideSpinner();
    if (errActions) {
      const embeds = this.getEmbeds();
      errActions.innerHTML = embeds.map((_, i) => `
        <button onclick="Player.loadFallbackEmbed(${i})"
          style="background:rgba(255,255,255,0.15);border:none;color:white;padding:8px 20px;border-radius:6px;cursor:pointer;font-size:0.85rem;margin:4px;">
          Try Server ${i+1}
        </button>
      `).join('');
    }
  },

  _checkEmbedHealth(idx) {
    // Auto-skip to next server after 5s if iframe appears blocked/empty
    setTimeout(() => {
      try {
        const frame = document.getElementById('bfEmbedFrame');
        if (!frame) return;
        // If we're still on this embed index and user hasn't manually switched
        if (this._currentEmbedIdx === idx) {
          // Try to detect sandbox error by checking if iframe body is tiny (error page)
          try {
            const doc = frame.contentDocument || frame.contentWindow?.document;
            const text = doc?.body?.innerText || '';
            if (text.includes('Sandbox') || text.includes('sandbox') || text.includes('blocked')) {
              console.warn(`Server ${idx+1} blocked, trying next...`);
              if (idx + 1 < this.FALLBACK_EMBEDS.length) {
                this.loadFallbackEmbed(idx + 1);
              }
            }
          } catch(e) {
            // Cross-origin — can't read, that's normal and means it loaded
          }
        }
      } catch(e) {}
    }, 4000);
  },

  fmtTime(s) {
    if (!s || isNaN(s)) return '0:00';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
    return `${m}:${String(sec).padStart(2,'0')}`;
  }
};

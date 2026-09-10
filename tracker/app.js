/**
 * Job Application Tracker - Frontend Application Logic
 * Supports:
 * - Clean quick-switch tabs: Active Applications, Not Applied, Total Applied, Archived
 * - Date-based grouping with chronological sorting
 * - Primary status workflow (Not Applied, Applied, Did Not Apply)
 * - Response status workflow (No Answer Yet, Interviewing, Interview Completed, Selected, Rejected)
 * - Secondary response status filtering
 * - Dual persistence (API + LocalStorage) & Folder sync
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'ajac_tracker_status_v3';
  const LEGACY_KEYS = ['ajac_tracker_status_v2', 'ajac_tracker_status_v1'];
  const API_APPS_URL = '/api/applications';
  const API_STATUS_URL = '/api/status';
  const API_SYNC_URL = '/api/sync';
  const STATIC_DATA_URL = 'data.json';

  // Application State
  let applications = [];
  let currentTab = 'active'; // 'active' | 'not_applied' | 'applied' | 'archived'
  let responseFilter = 'all'; // 'all' | 'no_answer' | 'interviewing' | 'interview_completed' | 'selected' | 'rejected'
  let searchQuery = '';
  let currentSort = 'date-desc';

  // DOM Elements - Quick-Switch Tabs
  const elQuickTabs = document.querySelectorAll('.quick-tab');
  const elCountActive = document.getElementById('countActive');
  const elCountNotApplied = document.getElementById('countNotApplied');
  const elCountApplied = document.getElementById('countApplied');
  const elCountArchived = document.getElementById('countArchived');

  // DOM Elements - Response Filter Bar
  const elResponseFilterBar = document.getElementById('responseFilterBar');
  const elResponseChips = document.querySelectorAll('.response-chip');
  const elCountRespAll = document.getElementById('countRespAll');
  const elCountRespNoAnswer = document.getElementById('countRespNoAnswer');
  const elCountRespInterviewing = document.getElementById('countRespInterviewing');
  const elCountRespInterviewCompleted = document.getElementById('countRespInterviewCompleted');
  const elCountRespSelected = document.getElementById('countRespSelected');
  const elCountRespRejected = document.getElementById('countRespRejected');

  // DOM Elements - Search & Sort
  const elSearchInput = document.getElementById('searchInput');
  const elClearSearch = document.getElementById('clearSearch');
  const elSearchBox = elSearchInput.closest('.search-box');
  const elSortSelect = document.getElementById('sortSelect');

  // DOM Elements - Main Content
  const elList = document.getElementById('applicationsList');
  const elEmptyState = document.getElementById('emptyState');
  const elEmptyTitle = document.getElementById('emptyTitle');
  const elEmptyMessage = document.getElementById('emptyMessage');
  const elResultsCount = document.getElementById('resultsCount');
  const elResetFiltersBtn = document.getElementById('resetFiltersBtn');

  // DOM Elements - Header & Sync
  const elSyncStatus = document.getElementById('syncStatus');
  const elSyncText = elSyncStatus.querySelector('.sync-text');
  const elSyncDot = elSyncStatus.querySelector('.sync-dot');
  const elSyncAppsBtn = document.getElementById('syncApplicationsBtn');
  const elThemeToggle = document.getElementById('themeToggle');

  // --------------------------------------------------------------------------
  // LocalStorage Helpers
  // --------------------------------------------------------------------------
  function getStoredStatus() {
    try {
      let data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        for (const k of LEGACY_KEYS) {
          data = localStorage.getItem(k);
          if (data) break;
        }
      }
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.warn('LocalStorage read error:', e);
      return {};
    }
  }

  function setStoredStatus(slug, status, responseStatus) {
    try {
      const store = getStoredStatus();
      store[slug] = {
        status,
        response_status: responseStatus,
        updated_at: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (e) {
      console.warn('LocalStorage write error:', e);
    }
  }

  // --------------------------------------------------------------------------
  // Data Loading & Syncing
  // --------------------------------------------------------------------------
  async function loadData() {
    indicateSyncing('Loading...');
    let rawApps = [];
    let isLiveApi = false;

    // 1. Try Live Server API
    try {
      const res = await fetch(API_APPS_URL, { cache: 'no-cache' });
      if (res.ok) {
        rawApps = await res.json();
        isLiveApi = true;
      }
    } catch (e) {
      // Offline or static view
    }

    // 2. Fallback to static data.json
    if (!rawApps || rawApps.length === 0) {
      try {
        const res = await fetch(STATIC_DATA_URL, { cache: 'no-cache' });
        if (res.ok) {
          rawApps = await res.json();
        }
      } catch (e) {
        console.error('Failed to load static data.json:', e);
      }
    }

    // 3. Merge with localStorage
    const localStore = getStoredStatus();
    applications = rawApps.map(app => {
      const cached = localStore[app.slug];
      if (cached) {
        const status = cached.status || app.status || 'not_applied';
        let respStatus = null;
        if (status === 'applied') {
          // Normalize legacy 'completed' to 'selected'
          let rawResp = cached.response_status || app.response_status || 'no_answer';
          if (rawResp === 'completed') rawResp = 'selected';
          respStatus = rawResp;
        }
        return {
          ...app,
          status,
          response_status: respStatus,
          updated_at: cached.updated_at || app.updated_at || ''
        };
      }
      return {
        ...app,
        status: app.status || 'not_applied',
        response_status: app.status === 'applied' ? (app.response_status || 'no_answer') : null
      };
    });

    indicateSynced(isLiveApi ? 'Disk & Storage Synced' : 'Saved to Storage');
    updateMetrics();
    render();
  }

  // --------------------------------------------------------------------------
  // Status Transitions & Persistence
  // --------------------------------------------------------------------------
  async function updateApplicationStatus(slug, newStatus, newResponseStatus) {
    const app = applications.find(a => a.slug === slug);
    if (!app) return;

    let finalStatus = newStatus;
    let finalResponseStatus = null;

    if (finalStatus === 'applied') {
      let targetResp = newResponseStatus || app.response_status || 'no_answer';
      if (targetResp === 'completed') targetResp = 'selected';
      finalResponseStatus = targetResp;
    } else if (finalStatus === 'did_not_apply') {
      finalStatus = 'did_not_apply';
      finalResponseStatus = null;
    } else {
      finalStatus = 'not_applied';
      finalResponseStatus = null;
    }

    // Update in-memory state
    app.status = finalStatus;
    app.response_status = finalResponseStatus;
    app.updated_at = new Date().toISOString();

    // 1. Save to LocalStorage immediately
    setStoredStatus(slug, finalStatus, finalResponseStatus);

    // 2. Refresh metrics and UI
    updateMetrics();
    render();

    // 3. Post to API for Disk Persistence
    indicateSyncing('Saving...');
    try {
      const res = await fetch(API_STATUS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          status: finalStatus,
          response_status: finalResponseStatus
        })
      });

      if (res.ok) {
        indicateSynced('Disk & Storage Synced');
      } else {
        indicateSynced('Saved to Storage');
      }
    } catch (e) {
      indicateSynced('Saved to Storage');
    }
  }

  function indicateSyncing(text) {
    if (elSyncText) elSyncText.textContent = text;
    if (elSyncDot) elSyncDot.classList.add('syncing');
  }

  function indicateSynced(text) {
    if (elSyncText) elSyncText.textContent = text;
    if (elSyncDot) elSyncDot.classList.remove('syncing');
  }

  // --------------------------------------------------------------------------
  // Formatting Helpers
  // --------------------------------------------------------------------------
  function formatDateHeader(dateStr) {
    if (!dateStr) return 'Unspecified Date';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const monthIndex = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const months = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        if (months[monthIndex]) {
          return `${months[monthIndex]} ${day}, ${year}`;
        }
      }
    } catch (e) {}
    return dateStr;
  }

  function formatDateBadge(dateStr) {
    if (!dateStr) return 'Unknown date';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const monthIndex = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        if (months[monthIndex]) {
          return `${months[monthIndex]} ${day}, ${year}`;
        }
      }
    } catch (e) {}
    return dateStr;
  }

  function cleanCompanyDisplay(company) {
    if (!company) return '';
    return company.replace(/\s*\([^)]*(?:LLC|Inc|Corporation|Solutions|Ltd)[^)]*\)/i, '').trim();
  }

  // --------------------------------------------------------------------------
  // Metrics Calculation
  // --------------------------------------------------------------------------
  function updateMetrics() {
    let activeTotal = 0;
    let notApplied = 0;
    let applied = 0;
    let archived = 0;

    let noAnswer = 0;
    let interviewing = 0;
    let interviewCompleted = 0;
    let selected = 0;
    let rejected = 0;

    applications.forEach(app => {
      if (app.status === 'did_not_apply') {
        archived++;
      } else {
        activeTotal++;
        if (app.status === 'applied') {
          applied++;
          const resp = app.response_status || 'no_answer';
          if (resp === 'interviewing') {
            interviewing++;
          } else if (resp === 'interview_completed') {
            interviewCompleted++;
          } else if (resp === 'selected' || resp === 'completed') {
            selected++;
          } else if (resp === 'rejected') {
            rejected++;
          } else {
            noAnswer++;
          }
        } else {
          notApplied++;
        }
      }
    });

    // Update Quick-Switch Tab Badges
    if (elCountActive) elCountActive.textContent = activeTotal;
    if (elCountNotApplied) elCountNotApplied.textContent = notApplied;
    if (elCountApplied) elCountApplied.textContent = applied;
    if (elCountArchived) elCountArchived.textContent = archived;

    // Update Response Status Chip Badges
    if (elCountRespAll) elCountRespAll.textContent = applied;
    if (elCountRespNoAnswer) elCountRespNoAnswer.textContent = noAnswer;
    if (elCountRespInterviewing) elCountRespInterviewing.textContent = interviewing;
    if (elCountRespInterviewCompleted) elCountRespInterviewCompleted.textContent = interviewCompleted;
    if (elCountRespSelected) elCountRespSelected.textContent = selected;
    if (elCountRespRejected) elCountRespRejected.textContent = rejected;
  }

  // --------------------------------------------------------------------------
  // Rendering & Grouping
  // --------------------------------------------------------------------------
  function render() {
    // Determine response filter visibility
    if (elResponseFilterBar) {
      if (currentTab === 'applied' || currentTab === 'active') {
        elResponseFilterBar.classList.remove('hidden');
      } else {
        elResponseFilterBar.classList.add('hidden');
      }
    }

    // 1. Primary Tab Filtering
    let targetApps = [];
    if (currentTab === 'archived') {
      targetApps = applications.filter(a => a.status === 'did_not_apply');
    } else if (currentTab === 'not_applied') {
      targetApps = applications.filter(a => a.status === 'not_applied');
    } else if (currentTab === 'applied') {
      targetApps = applications.filter(a => a.status === 'applied');
    } else {
      // 'active': all except did_not_apply
      targetApps = applications.filter(a => a.status !== 'did_not_apply');
    }

    // 2. Secondary Response Status Filtering (if active or applied tab)
    if ((currentTab === 'applied' || currentTab === 'active') && responseFilter !== 'all') {
      targetApps = targetApps.filter(a => {
        if (a.status !== 'applied') return false;
        const resp = a.response_status || 'no_answer';
        if (responseFilter === 'selected') {
          return resp === 'selected' || resp === 'completed';
        }
        return resp === responseFilter;
      });
    }

    // 3. Search Query Filtering
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      targetApps = targetApps.filter(app => {
        const matchCompany = (app.company || '').toLowerCase().includes(q);
        const matchTitle = (app.title || '').toLowerCase().includes(q);
        const matchLocation = (app.location || '').toLowerCase().includes(q);
        const matchDate = (app.date || '').toLowerCase().includes(q);
        const matchSlug = (app.slug || '').toLowerCase().includes(q);
        return matchCompany || matchTitle || matchLocation || matchDate || matchSlug;
      });
    }

    // Update Results count text
    if (elResultsCount) {
      let tabLabel = 'applications';
      if (currentTab === 'active') tabLabel = 'active applications';
      else if (currentTab === 'not_applied') tabLabel = 'not applied applications';
      else if (currentTab === 'applied') tabLabel = 'applied applications';
      else if (currentTab === 'archived') tabLabel = 'archived applications';
      elResultsCount.textContent = `Showing ${targetApps.length} ${tabLabel}`;
    }

    // Handle Empty State
    if (targetApps.length === 0) {
      elList.innerHTML = '';
      elEmptyState.classList.remove('hidden');
      if (currentTab === 'archived') {
        elEmptyTitle.textContent = 'No archived applications';
        elEmptyMessage.textContent = 'Applications marked as "Did Not Apply" will appear here.';
      } else if (currentTab === 'not_applied') {
        elEmptyTitle.textContent = 'No pending applications';
        elEmptyMessage.textContent = 'All applications have either been applied to or archived.';
      } else if (currentTab === 'applied') {
        elEmptyTitle.textContent = 'No applied applications';
        elEmptyMessage.textContent = 'Applications marked as "Applied" will appear here.';
      } else {
        elEmptyTitle.textContent = 'No applications match your filter';
        elEmptyMessage.textContent = 'Try clearing your search query or selecting a different tab.';
      }
      return;
    }

    elEmptyState.classList.add('hidden');

    // 4. Group by Fetched/Generated Date
    const groups = {};
    targetApps.forEach(app => {
      const d = app.date || 'Unspecified';
      if (!groups[d]) groups[d] = [];
      groups[d].push(app);
    });

    // Sort Dates
    const sortedDates = Object.keys(groups).sort((a, b) => {
      if (currentSort === 'date-asc') {
        return a.localeCompare(b);
      }
      return b.localeCompare(a); // date-desc (default)
    });

    // Render HTML with Date Sections
    let html = '';
    sortedDates.forEach(dateKey => {
      const dateApps = groups[dateKey];
      // Sort within date group alphabetically by company
      dateApps.sort((a, b) => a.company.localeCompare(b.company));

      const countText = dateApps.length === 1 ? '1 application' : `${dateApps.length} applications`;
      const formattedDate = formatDateHeader(dateKey);

      html += `
        <section class="date-group" id="date-group-${escapeHtml(dateKey)}">
          <div class="date-group-header">
            <div class="date-header-left">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <h2 class="date-heading">${escapeHtml(formattedDate)}</h2>
              <span class="date-count-badge">${countText}</span>
            </div>
          </div>
          <div class="date-group-cards">
            ${dateApps.map(app => renderCardHtml(app)).join('')}
          </div>
        </section>
      `;
    });

    elList.innerHTML = html;
    attachCardListeners();
  }

  function renderCardHtml(app) {
    const isArchived = app.status === 'did_not_apply';
    const isApplied = app.status === 'applied';
    const isNotApplied = app.status === 'not_applied' || (!isArchived && !isApplied);
    let responseStatus = app.response_status || 'no_answer';
    if (responseStatus === 'completed') responseStatus = 'selected';

    // State class for card left accent border
    let stateClass = 'state-not-applied';
    if (isArchived) {
      stateClass = 'state-did-not-apply';
    } else if (isApplied) {
      if (responseStatus === 'interviewing') stateClass = 'state-applied-interviewing';
      else if (responseStatus === 'interview_completed') stateClass = 'state-applied-interview-completed';
      else if (responseStatus === 'selected') stateClass = 'state-applied-selected';
      else if (responseStatus === 'rejected') stateClass = 'state-applied-rejected';
      else stateClass = 'state-applied-no-answer';
    }

    // Top Status Badges Display
    let statusBadgesHtml = '';
    if (isArchived) {
      statusBadgesHtml = `<span class="badge badge-muted">Did Not Apply (Archived)</span>`;
    } else if (isNotApplied) {
      statusBadgesHtml = `<span class="badge badge-neutral">Not Applied</span>`;
    } else if (isApplied) {
      let respBadge = `<span class="badge badge-warning">No Answer Yet</span>`;
      if (responseStatus === 'interviewing') {
        respBadge = `<span class="badge badge-indigo">Interviewing</span>`;
      } else if (responseStatus === 'interview_completed') {
        respBadge = `<span class="badge badge-teal">Interview Completed</span>`;
      } else if (responseStatus === 'selected') {
        respBadge = `<span class="badge badge-selected">Selected</span>`;
      } else if (responseStatus === 'rejected') {
        respBadge = `<span class="badge badge-error">Rejected</span>`;
      }
      statusBadgesHtml = `
        <span class="badge badge-success">Applied</span>
        ${respBadge}
      `;
    }

    // Source link
    const sourceLinkHtml = app.source_url
      ? `<a href="${app.source_url}" target="_blank" rel="noopener noreferrer" class="meta-link" title="Open original job posting">
           <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
           Original Posting
         </a>`
      : '';

    return `
      <article class="app-card ${stateClass}" id="card-${app.slug}" data-slug="${app.slug}">
        <div class="card-content">
          <!-- Job Details -->
          <div class="card-info">
            <div class="card-top-row">
              <h3 class="company-name">${escapeHtml(cleanCompanyDisplay(app.company))}</h3>
              <div class="date-badge" title="Date fetched / generated">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span>Fetched: ${escapeHtml(formatDateBadge(app.date))}</span>
              </div>
            </div>

            <p class="job-title">${escapeHtml(app.title)}</p>

            <div class="card-meta">
              <span class="meta-item">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                ${escapeHtml(app.location)}
              </span>
              ${sourceLinkHtml}
            </div>
          </div>

          <!-- Workflow Controls -->
          <div class="card-actions">
            <div class="status-badge-container">
              ${statusBadgesHtml}
            </div>

            <div class="workflow-group">
              <!-- 1. Primary Application Status -->
              <div class="control-row">
                <span class="control-label">Status:</span>
                <div class="segmented-control" role="group" aria-label="Application Status">
                  <button type="button" class="segment-btn btn-not-applied ${isNotApplied ? 'selected' : ''}" data-action="set-status" data-status="not_applied" title="Application generated, not yet submitted">
                    Not Applied
                  </button>
                  <button type="button" class="segment-btn btn-applied ${isApplied ? 'selected' : ''}" data-action="set-status" data-status="applied" title="Application has been submitted">
                    Applied
                  </button>
                  <button type="button" class="segment-btn btn-did-not-apply ${isArchived ? 'selected' : ''}" data-action="set-status" data-status="did_not_apply" title="Archive application under Did Not Apply">
                    Did Not Apply
                  </button>
                </div>
              </div>

              <!-- 2. Response Status (Visible only when Applied) -->
              <div class="response-status-wrapper ${!isApplied ? 'hidden' : ''}">
                <div class="control-row">
                  <span class="control-label">Response:</span>
                  <div class="segmented-control" role="group" aria-label="Response Status">
                    <button type="button" class="segment-btn btn-no-answer ${isApplied && responseStatus === 'no_answer' ? 'selected' : ''}" data-action="set-response" data-response="no_answer">
                      No Answer
                    </button>
                    <button type="button" class="segment-btn btn-interviewing ${isApplied && responseStatus === 'interviewing' ? 'selected' : ''}" data-action="set-response" data-response="interviewing">
                      Interviewing
                    </button>
                    <button type="button" class="segment-btn btn-interview-completed ${isApplied && responseStatus === 'interview_completed' ? 'selected' : ''}" data-action="set-response" data-response="interview_completed">
                      Interview Completed
                    </button>
                    <button type="button" class="segment-btn btn-selected ${isApplied && responseStatus === 'selected' ? 'selected' : ''}" data-action="set-response" data-response="selected">
                      Selected
                    </button>
                    <button type="button" class="segment-btn btn-rejected ${isApplied && responseStatus === 'rejected' ? 'selected' : ''}" data-action="set-response" data-response="rejected">
                      Rejected
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card-bottom-bar">
          <span class="slug-id">ID: <code>${escapeHtml(app.slug)}</code></span>
          ${isArchived ? `<span class="archived-banner">📦 Archived Application</span>` : ''}
        </div>
      </article>
    `;
  }

  function attachCardListeners(scope = document) {
    const statusBtns = scope.querySelectorAll('[data-action="set-status"]');
    statusBtns.forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const card = btn.closest('.app-card');
        const slug = card.getAttribute('data-slug');
        const targetStatus = btn.getAttribute('data-status');
        updateApplicationStatus(slug, targetStatus);
      });
    });

    const responseBtns = scope.querySelectorAll('[data-action="set-response"]');
    responseBtns.forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const card = btn.closest('.app-card');
        const slug = card.getAttribute('data-slug');
        const targetResponse = btn.getAttribute('data-response');
        updateApplicationStatus(slug, 'applied', targetResponse);
      });
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --------------------------------------------------------------------------
  // Event Handlers & Navigation
  // --------------------------------------------------------------------------
  function setTab(tabName) {
    currentTab = tabName;

    elQuickTabs.forEach(tab => {
      const active = tab.getAttribute('data-tab') === tabName;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    render();
  }

  function setResponseFilter(resp) {
    responseFilter = resp;

    elResponseChips.forEach(chip => {
      const active = chip.getAttribute('data-response-filter') === resp;
      chip.classList.toggle('active', active);
    });

    render();
  }

  function setupEvents() {
    // Quick-Switch Navigation Tabs
    elQuickTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        setTab(tab.getAttribute('data-tab'));
      });
    });

    // Secondary Response Status Chips
    elResponseChips.forEach(chip => {
      chip.addEventListener('click', () => {
        setResponseFilter(chip.getAttribute('data-response-filter'));
      });
    });

    // Search Input
    elSearchInput.addEventListener('input', e => {
      searchQuery = e.target.value.trim();
      elSearchBox.classList.toggle('has-query', searchQuery.length > 0);
      render();
    });

    elClearSearch.addEventListener('click', () => {
      elSearchInput.value = '';
      searchQuery = '';
      elSearchBox.classList.remove('has-query');
      elSearchInput.focus();
      render();
    });

    // Sort Selector
    elSortSelect.addEventListener('change', e => {
      currentSort = e.target.value;
      render();
    });

    // Reset Filters Button in Empty State
    elResetFiltersBtn.addEventListener('click', () => {
      elSearchInput.value = '';
      searchQuery = '';
      elSearchBox.classList.remove('has-query');
      setResponseFilter('all');
      setTab('active');
    });

    // Sync Folder Button
    if (elSyncAppsBtn) {
      elSyncAppsBtn.addEventListener('click', () => {
        syncApplicationsFolder();
      });
    }

    // Theme Toggle
    elThemeToggle.addEventListener('click', () => {
      const isDark = document.body.classList.contains('theme-dark');
      if (isDark) {
        document.body.classList.remove('theme-dark');
        document.body.classList.add('theme-light');
        localStorage.setItem('ajac_theme', 'light');
      } else {
        document.body.classList.remove('theme-light');
        document.body.classList.add('theme-dark');
        localStorage.setItem('ajac_theme', 'dark');
      }
    });

    const savedTheme = localStorage.getItem('ajac_theme');
    if (savedTheme === 'light') {
      document.body.classList.remove('theme-dark');
      document.body.classList.add('theme-light');
    }
  }

  // --------------------------------------------------------------------------
  // Folder Sync
  // --------------------------------------------------------------------------
  async function syncApplicationsFolder() {
    const btn = document.getElementById('syncApplicationsBtn');
    const icon = btn ? btn.querySelector('.sync-btn-icon') : null;
    const label = btn ? btn.querySelector('.sync-btn-label') : null;

    if (btn) btn.disabled = true;
    if (icon) icon.classList.add('spinning');
    if (label) label.textContent = 'Syncing...';
    indicateSyncing('Scanning applications...');

    let syncedCount = 0;
    let success = false;

    try {
      const res = await fetch(API_SYNC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-cache'
      });

      if (res.ok) {
        const data = await res.json();
        const rawApps = data.applications || data;
        syncedCount = rawApps.length;

        const localStore = getStoredStatus();
        applications = rawApps.map(app => {
          const cached = localStore[app.slug];
          if (cached) {
            const status = cached.status || app.status || 'not_applied';
            let respStatus = null;
            if (status === 'applied') {
              let r = cached.response_status || app.response_status || 'no_answer';
              if (r === 'completed') r = 'selected';
              respStatus = r;
            }
            return {
              ...app,
              status,
              response_status: respStatus,
              updated_at: cached.updated_at || app.updated_at || ''
            };
          }
          return {
            ...app,
            status: app.status || 'not_applied',
            response_status: app.status === 'applied' ? (app.response_status || 'no_answer') : null
          };
        });

        updateMetrics();
        render();
        indicateSynced('Disk & Storage Synced');
        showToast(`Synced ${syncedCount} applications from folder`);
        success = true;
      }
    } catch (e) {
      console.warn('Sync API failed, falling back to static reload:', e);
    }

    if (!success) {
      try {
        const res = await fetch(`${STATIC_DATA_URL}?t=${Date.now()}`);
        if (res.ok) {
          const rawApps = await res.json();
          const localStore = getStoredStatus();
          applications = rawApps.map(app => {
            const cached = localStore[app.slug];
            if (cached) {
              const status = cached.status || app.status || 'not_applied';
              let respStatus = null;
              if (status === 'applied') {
                let r = cached.response_status || app.response_status || 'no_answer';
                if (r === 'completed') r = 'selected';
                respStatus = r;
              }
              return {
                ...app,
                status,
                response_status: respStatus,
                updated_at: cached.updated_at || app.updated_at || ''
              };
            }
            return app;
          });
          updateMetrics();
          render();
          showToast(`Reloaded ${applications.length} applications`);
        }
      } catch (err) {
        showToast('Sync completed with local storage');
      }
    }

    setTimeout(() => {
      if (icon) icon.classList.remove('spinning');
      if (label) label.textContent = 'Sync Folder';
      if (btn) btn.disabled = false;
    }, 450);
  }

  function showToast(message) {
    const existing = document.querySelector('.toast-notice');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-notice';
    toast.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span>${escapeHtml(message)}</span>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // --------------------------------------------------------------------------
  // Initialization
  // --------------------------------------------------------------------------
  setupEvents();
  loadData();

})();

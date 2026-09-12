// ==UserScript==
// @name         YouTube Filters
// @namespace    http://tampermonkey.net/
// @version      5.5
// @description  Youtube Filters
// @author       You
// @match        *://*.youtube.com/*
// @grant        none
// @updateURL    https://github.com/jernyx/Backup/raw/refs/heads/main/Browser/Tampermonkey/YouTube%20Filters.js
// @downloadURL  https://github.com/jernyx/Backup/raw/refs/heads/main/Browser/Tampermonkey/YouTube%20Filters.js
// ==/UserScript==

(function () {
    'use strict';

    // =========================================================================
    // FEATURE 1: YOUTUBE SUBSCRIPTIONS FILTERS
    // =========================================================================
    function initYoutubeFilters() {

        /*************************************************************
         * CONFIGURATION
         *************************************************************/
        const channelMaxMinutes = {
            "Trent The Traveler": 30,
            "HealthyGamerGG": 45,
            "MrBeast": 30,
            "Sam Sulek": 15,
            "FREESTYLEBENDER": 18,
            "Sam Hyde": 10,
            "jacobjonesMONEY":50,
            "BBC Earth": 60,
            "ESOTERICA": 45,
            "Absolute Terry Davis": 120,
            "Bind": 60,
            "Kevin Frasard": 15,
            "Anton Petrov": 20,
            "jacobjonesMONEY": 50,
            "Hafthor Bjornsson": 60,
        };

        const channelMinMinutes = {
            "Inspiraggio": 10,
            "FREESTYLEBENDER": 11,
            "Curt Jaimungal": 60,
            "Absolute Terry Davis": 60,
            "BBC Earth": 4,
            "Father Spyridon": 15,
            "HealthyGamerGG": 30,
            "jacobjonesMONEY":45,
            "Trent The Traveler": 25,
            "Sam Sulek": 10,
            "ESOTERICA": 20,
            "South Park Studios": 1,
            "Lessons in Internet Culture": 5,
            "Nightshift – Kurzgesagt After Dark": 5,
            "Kurzgesagt – In a Nutshell": 5,
            "Danit Friedman": 20,
            "Anton Petrov": 16,
            "jacobjonesMONEY": 45,
            "Hyperborean Knowledge": 30
        };

        const channelBlockedKeywords = {
            "Channel 5 with Andrew Callaghan": ["5CAST"],
            "Sam Hyde": ["Sam Hyde"],
            "ElectroBOOM": ["ElectroVLOG"],
            "The Onion": [", Episode"],
            "jacobjonesMONEY": ["VLOG", "Vlog"],
            "Quanta Magazine": ["PODCAST", "Podcast"],
        };

        const blockedCollabChannels = [
            "3 more", "2 more", "4 more", "5 more",
            "FREESTYLEBENDER",
            "MrBeast",
            "JiDion",
            "HealthyGamerGG",
            "Chubbyemu",
            "BBC Earth",
            "BBC Earth Relax",
            "Astrum",
            "Sam Hyde",
            "Absolute Terry Davis",
            "Coffeezilla",
            "Kevin Frasard",
            "Hafthor Bjornsson",
            "Channel 5 with Andrew Callaghan",
            "Gates of Imagination",
            "Folding Ideas",
            "The Tim Dillon Show",
            "Mighty",
            "The Onion",
            "After Skool",
            "Infowars",
            "THE MMA GURU",
            "PBS Eons"
        ];

        const channelThumbnailOverrides = {
            "Absolute Terry Davis": "https://upload.wikimedia.org/wikipedia/commons/8/81/TempleOS_logo.png",
        };

        /*************************************************************
         * AUTOPLAY DISABLER
         *************************************************************/
        function toggleAutoplayIfOn() {
            const btn = document.querySelector('.ytp-autonav-toggle-button');
            if (btn && btn.getAttribute('aria-checked') === 'true') btn.click();
        }

        function startAutoplayWatchdog() {
            toggleAutoplayIfOn();
            if (!window._ytAutoplayInterval) {
                window._ytAutoplayInterval = setInterval(toggleAutoplayIfOn, 10000);
            }
        }

        /*************************************************************
         * INTERNAL SETUP
         *************************************************************/
        function normalize(s) {
            return (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
        }

        const channelMaxSec = {};
        const channelMinSec = {};
        const normalizedKeywordConfig = {};

        for (const [k, v] of Object.entries(channelMaxMinutes))
            channelMaxSec[normalize(k)] = v * 60;

        for (const [k, v] of Object.entries(channelMinMinutes))
            channelMinSec[normalize(k)] = v * 60;

        for (const [k, words] of Object.entries(channelBlockedKeywords)) {
            normalizedKeywordConfig[normalize(k)] = words.map(w => w.toLowerCase());
        }

        function parseDurationText(txt) {
            if (!txt) return null;
            const m = txt.replace(/\u00A0/g, ' ').match(/(\d{1,2}:\d{2}:\d{2}|\d{1,2}:\d{2})/);
            if (!m) return null;
            const p = m[0].split(':').map(Number);
            return p.length === 3 ? p[0]*3600 + p[1]*60 + p[2] : p[0]*60 + p[1];
        }

        function getChannelName(item) {
            const nameEl = item.querySelector('ytd-channel-name .yt-simple-endpoint, #text-container.ytd-channel-name');
            if (nameEl && nameEl.textContent.trim()) return nameEl.textContent.trim();

            const links = item.querySelectorAll('a[href^="/@"],a[href^="/channel/"],a[href*="/c/"]');
            for (const a of links) {
                const txt = a.textContent.trim();
                if (txt) return txt;
            }

            const metaRow = item.querySelector('.ytContentMetadataViewModelMetadataRow, .yt-content-metadata-view-model__metadata-row');
            if (metaRow && metaRow.textContent.trim()) return metaRow.textContent.trim();

            return null;
        }

        function getVideoTitle(item) {
            const titleEl = item.querySelector('.ytLockupMetadataViewModelTitle span, .ytLockupMetadataViewModelTitle, .yt-lockup-metadata-view-model__title span, #video-title');
            if (titleEl && titleEl.textContent) return titleEl.textContent.trim();

            const headingEl = item.querySelector('.ytLockupMetadataViewModelHeadingReset, .yt-lockup-metadata-view-model__heading-reset');
            if (headingEl && headingEl.getAttribute('title')) return headingEl.getAttribute('title').trim();

            return null;
        }

        function getDurationSec(item) {
            const candidates = item.querySelectorAll('.yt-badge-shape__text, ytd-thumbnail-overlay-time-status-renderer span, .ytd-thumbnail-badge-renderer-text, badge-shape');
            for (const el of candidates) {
                const sec = parseDurationText(el.textContent);
                if (sec != null) return sec;
            }
            return null;
        }

        // FIX: explicitly grab the byline row (first .ytContentMetadataViewModelMetadataRow),
        // never let querySelector fall through to the stats row ("7:38 • 36K views • 2 days ago"),
        // which shares the same class and never contains "more".
        function isBlockedCollab(item) {
            const metaRows = item.querySelectorAll('.ytLockupMetadataViewModelMetadata .ytContentMetadataViewModelMetadataRow, .ytContentMetadataViewModelMetadataRow, #metadata, .yt-lockup-metadata-view-model__metadata, .yt-lockup-view-model__metadata');
            if (!metaRows.length) return false;

            // The byline row (channel name + "and N more") is always the first metadata row.
            const bylineRow = metaRows[0];
            const t = normalize(bylineRow.textContent);
            const mainChannel = normalize(getChannelName(item));
            const channelLinks = bylineRow.querySelectorAll('a[href^="/@"], a[href^="/channel/"], a[href*="/c/"]');

            return blockedCollabChannels.some(c => {
                const n = normalize(c);

                if (n.includes("more")) {
                    return new RegExp(`\\b${n}\\b`, 'i').test(t);
                }

                if (!t.includes(n)) return false;

                if (mainChannel === n && channelLinks.length <= 1) {
                    return false;
                }

                return true;
            });
        }

        /*************************************************************
         * THUMBNAIL OVERRIDE
         *************************************************************/
        function applyThumbnailOverride(item, channelName) {
            const imageUrl = channelThumbnailOverrides[channelName];
            if (!imageUrl || item.dataset.thumbOverridden) return;

            const thumbContainer = item.querySelector('yt-thumbnail-view-model, ytd-thumbnail, #thumbnail');
            if (!thumbContainer) return;

            item.dataset.thumbOverridden = '1';

            const img = thumbContainer.querySelector('img');
            if (img) {
                img.style.setProperty('opacity', '0', 'important');
            }

            const targetDiv = thumbContainer.querySelector('.ytThumbnailViewModelImage') || thumbContainer;

            targetDiv.style.backgroundImage = `url("${imageUrl}")`;
            targetDiv.style.backgroundSize = 'cover';
            targetDiv.style.backgroundPosition = 'center';
            targetDiv.style.backgroundRepeat = 'no-repeat';
            targetDiv.style.borderRadius = '12px';
            targetDiv.style.overflow = 'hidden';
            targetDiv.style.backgroundColor = '#000';
        }

        /*************************************************************
         * CORE FILTER
         *************************************************************/
        function filterOnce() {
            if (!location.pathname.startsWith('/feed/subscriptions')) return;

            document.querySelectorAll('ytd-rich-item-renderer, ytd-rich-grid-media, yt-lockup-view-model').forEach(item => {
                const gridContainer = item.closest('ytd-rich-item-renderer') || item;

                if (isBlockedCollab(item)) {
                    gridContainer.remove();
                    return;
                }

                const channel = getChannelName(item);
                const dur = getDurationSec(item);
                const title = getVideoTitle(item);

                if (!channel) return;

                const n = normalize(channel);

                const thumbKey = Object.keys(channelThumbnailOverrides).find(k => n.includes(normalize(k)));
                if (thumbKey) {
                    applyThumbnailOverride(item, thumbKey);
                }

                let hide = false;

                if (title) {
                    const lowerTitle = title.toLowerCase();
                    for (const [keyChannel, words] of Object.entries(normalizedKeywordConfig)) {
                        if (n.includes(keyChannel)) {
                            if (words.some(word => lowerTitle.includes(word))) hide = true;
                        }
                    }
                }

                if (item.dataset.durationFilterChecked) {
                    if (hide) gridContainer.remove();
                    return;
                }
                if (dur == null) return;
                item.dataset.durationFilterChecked = '1';

                for (const [key, maxSec] of Object.entries(channelMaxSec)) {
                    if (n.includes(key) && dur > maxSec) hide = true;
                }
                for (const [key, minSec] of Object.entries(channelMinSec)) {
                    if (n.includes(key) && dur < minSec) hide = true;
                }

                if (hide) {
                    gridContainer.remove();
                }
            });
        }

        /*************************************************************
         * RESILIENT SPA + OFFLINE HANDLING
         *************************************************************/
        function scheduleFilter() {
            clearTimeout(window._ytDebounce);
            window._ytDebounce = setTimeout(() => {
                filterOnce();
                setTimeout(filterOnce, 1000);
            }, 50);
        }

        function waitForMainContent(callback) {
            const el = document.querySelector('ytd-app #content, ytd-rich-grid-renderer');
            if (el) return callback(el);
            const observer = new MutationObserver(() => {
                const target = document.querySelector('ytd-app #content, ytd-rich-grid-renderer');
                if (target) {
                    observer.disconnect();
                    callback(target);
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }

        // Initialize Filter Watchdogs
        waitForMainContent((main) => {
            const obs = new MutationObserver(scheduleFilter);
            obs.observe(main, { childList: true, subtree: true });

            const appObserver = new MutationObserver(scheduleFilter);
            appObserver.observe(document.querySelector('ytd-app') || document.body, { childList: true, subtree: true });

            scheduleFilter();
            startAutoplayWatchdog();
            setInterval(filterOnce, 500);
        });
    }

    // =========================================================================
    // FEATURE 2: YOUTUBE DURATION IN METADATA
    // =========================================================================
    function initDurationInMetadata() {

        function moveDurationToMetadata() {
            // ------------------------------------------
            // LAYOUT 1: Homepage, Subscriptions, & Channel Grid
            // ------------------------------------------
            const gridVideos = document.querySelectorAll('yt-lockup-view-model:not([data-duration-in-meta="true"])');

            gridVideos.forEach(video => {
                const durationBadge = video.querySelector('yt-thumbnail-view-model .ytBadgeShapeText');
                if (!durationBadge) return;

                const durationText = durationBadge.textContent.trim();
                if (!durationText) return;

                const metadataRows = video.querySelectorAll('.ytContentMetadataViewModelMetadataRow');
                if (metadataRows.length === 0) return;

                const statsRow = metadataRows[metadataRows.length - 1];

                const viewsSpan = statsRow.querySelector('.ytContentMetadataViewModelMetadataText');
                if (!viewsSpan) return;

                const durationSpan = document.createElement('span');
                durationSpan.className = 'ytAttributedStringHost ytContentMetadataViewModelMetadataText ytAttributedStringWhiteSpacePreWrap ytAttributedStringLinkInheritColor';
                durationSpan.setAttribute('dir', 'auto');
                durationSpan.setAttribute('role', 'text');
                durationSpan.textContent = durationText;

                const newDelimiter = document.createElement('span');
                newDelimiter.className = 'ytContentMetadataViewModelDelimiter';
                newDelimiter.setAttribute('aria-hidden', 'true');
                newDelimiter.textContent = ' • ';

                statsRow.insertBefore(durationSpan, viewsSpan);
                statsRow.insertBefore(newDelimiter, viewsSpan);

                video.setAttribute('data-duration-in-meta', 'true');
            });

            // ------------------------------------------
            // LAYOUT 2: Search Results & Sidebar List
            // ------------------------------------------
            const listVideos = document.querySelectorAll('ytd-video-renderer:not([data-duration-in-meta="true"]), ytd-compact-video-renderer:not([data-duration-in-meta="true"])');

            listVideos.forEach(video => {
                const durationBadge = video.querySelector('ytd-thumbnail-overlay-time-status-renderer .ytBadgeShapeText, ytd-thumbnail-overlay-time-status-renderer #text');
                if (!durationBadge) return;

                const durationText = durationBadge.textContent.trim();
                if (!durationText) return;

                const metadataLine = video.querySelector('#metadata-line');
                if (!metadataLine) return;

                // Remove any pre-existing stale duration spans before inserting.
                // YouTube sometimes recycles DOM nodes with leftover duration values
                // from previously rendered items, causing the wrong time to display.
                metadataLine.querySelectorAll('.inline-metadata-item').forEach(span => {
                    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(span.textContent.trim())) {
                        span.remove();
                    }
                });

                const metaItems = metadataLine.querySelectorAll('.inline-metadata-item');
                if (metaItems.length === 0) return;

                const firstMetaItem = metaItems[0];

                const durationSpan = document.createElement('span');
                durationSpan.className = 'inline-metadata-item style-scope ytd-video-meta-block';
                durationSpan.textContent = durationText;

                metadataLine.insertBefore(durationSpan, firstMetaItem);

                video.setAttribute('data-duration-in-meta', 'true');
            });
        }

        // Initialize Metadata Watchdogs
        const observer = new MutationObserver(() => {
            moveDurationToMetadata();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        moveDurationToMetadata();
    }

    // =========================================================================
    // INITIALIZATION RUNNER
    // =========================================================================
    initYoutubeFilters();
    initDurationInMetadata();

})();

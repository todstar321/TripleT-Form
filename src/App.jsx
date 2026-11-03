import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import SmeFanRegistration from './components/SmeFanRegistration';
import SmeFanAdmin from './components/SmeFanAdmin';
import FormHubViewer from './components/FormHubViewer';
import FormBuilder from './components/FormBuilder';
import ThemeCustomizer from './components/ThemeCustomizer';
import FormViewer from './components/FormViewer';
import GoogleSheetsModal from './components/GoogleSheetsModal';
import ShareModal from './components/ShareModal';
import AdminLoginModal from './components/AdminLoginModal';
import TicketModal from './components/TicketModal';
import OwnerPortalHub from './components/OwnerPortalHub';
import EventCheckInHub from './components/EventCheckInHub';
import ContestJudgeModal from './components/ContestJudgeModal';
import { initialSmeFanConfig, initialRegistrations } from './data/smeFanData';
import { initialFormsList, FORMS_STORAGE_KEY } from './data/formsData';
import { defaultFormData } from './data/defaultForm';
import { submitSmeFanTicketToSheets } from './utils/googleSheets';
import { 
  isSupabaseConfigured, 
  fetchRegistrationsFromCloud, 
  upsertRegistrationToCloud,
  fetchEventConfigFromCloud,
  saveEventConfigToCloud,
  subscribeToRegistrations,
  subscribeToEventConfig
} from './utils/supabaseClient';

const CONFIG_STORAGE_KEY = 'sme_fan_config_v3';
const REGISTRATIONS_STORAGE_KEY = 'sme_fan_registrations_v4';
const USER_STORAGE_KEY = 'sme_fan_admin_user_v5';
const ACTIVE_TAB_STORAGE_KEY = 'sme_fan_active_tab_v3';

// Global Session Cutoff Timestamp (Revokes any session created before this exact millisecond)
export const GLOBAL_AUTH_EPOCH = 1793668600000; // 2026-11-03 08:16:40+07:00

// Helper to strictly validate active admin sessions
export const isValidAdminSession = (user, config) => {
  if (!user || typeof user !== 'object') return false;
  if (!user.role || !['owner', 'manager', 'admin'].includes(user.role)) return false;
  // Require explicit login timestamp from AdminLoginModal
  if (!user.authTimestamp || typeof user.authTimestamp !== 'number') return false;
  if (user.authTimestamp < GLOBAL_AUTH_EPOCH) return false;

  // Check cloud forceLogoutBefore if set
  if (config?.forceLogoutBefore) {
    const minTime = new Date(config.forceLogoutBefore).getTime();
    if (!isNaN(minTime) && user.authTimestamp < minTime) return false;
  }
  return true;
};

// URL Hash to Tab identifier mapping
export const hashToTab = (hashStr) => {
  if (!hashStr) return null;
  const h = hashStr.replace(/^#\/?/, '').trim().toLowerCase();
  if (['portal', 'sme_portal', 'owner'].includes(h)) return 'sme_portal';
  if (['checkin', 'sme_checkin', 'event'].includes(h)) return 'sme_checkin';
  if (['admin', 'sme_admin', 'settings'].includes(h)) return 'sme_admin';
  if (['judge', 'contest_judge', 'vote', 'contest'].includes(h)) return 'contest_judge';
  if (['viewer', 'form_viewer'].includes(h)) return 'form_viewer';
  if (['builder'].includes(h)) return 'builder';
  if (['theme'].includes(h)) return 'theme';
  if (['preview'].includes(h)) return 'preview';
  if (['register', 'form', 'sme_register'].includes(h)) return 'sme_register';
  return null;
};

// Tab identifier to URL Hash mapping
export const tabToHash = (tab) => {
  switch (tab) {
    case 'sme_portal': return 'portal';
    case 'sme_checkin': return 'checkin';
    case 'sme_admin': return 'admin';
    case 'contest_judge': return 'judge';
    case 'form_viewer': return 'viewer';
    case 'builder': return 'builder';
    case 'theme': return 'theme';
    case 'preview': return 'preview';
    case 'sme_register':
    default:
      return 'register';
  }
};

export const getInitialTab = () => {
  if (typeof window !== 'undefined') {
    let hasLoggedInUser = false;
    try {
      const savedUser = localStorage.getItem(USER_STORAGE_KEY);
      if (savedUser) {
        const u = JSON.parse(savedUser);
        if (isValidAdminSession(u, initialSmeFanConfig)) {
          hasLoggedInUser = true;
        } else {
          localStorage.removeItem(USER_STORAGE_KEY);
        }
      }
    } catch (e) {}

    // 1. Check URL query params first (e.g. ?judge=true, ?checkin=true, ?admin=true, ?portal=true)
    const params = new URLSearchParams(window.location.search);
    if (params.get('judge') === 'true' || params.get('contest') === 'true') return 'contest_judge';
    if (params.get('checkin') === 'true') return hasLoggedInUser ? 'sme_checkin' : 'sme_register';
    if (params.get('portal') === 'true' || params.get('owner') === 'true') return hasLoggedInUser ? 'sme_portal' : 'sme_register';
    if (params.get('admin') === 'true' || params.get('settings') === 'true') return hasLoggedInUser ? 'sme_admin' : 'sme_register';
    if (params.get('form')) {
      const f = params.get('form');
      return f === 'form_1_sme_event' ? 'sme_register' : 'form_viewer';
    }

    // 2. Check window.location.hash
    const fromHash = hashToTab(window.location.hash);
    if (fromHash) {
      if (['sme_portal', 'sme_admin', 'sme_checkin'].includes(fromHash) && !hasLoggedInUser) {
        return 'sme_register';
      }
      return fromHash;
    }

    // 3. Fallback to localStorage saved active tab
    try {
      const saved = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
      if (saved && ['sme_portal', 'sme_checkin', 'sme_admin', 'contest_judge', 'sme_register', 'form_viewer', 'builder', 'theme', 'preview'].includes(saved)) {
        if (['sme_portal', 'sme_admin', 'sme_checkin'].includes(saved) && !hasLoggedInUser) {
          return 'sme_register';
        }
        return saved;
      }
    } catch (e) {}
  }
  return 'sme_register';
};

export default function App() {
  // 1. SME FAN Event Config State (Form 1)
  const [eventConfig, setEventConfig] = useState(() => {
    try {
      const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Automatically replace old stock Unsplash conference photo or legacy heavy base64 with official Cloudinary banner
        if (
          !parsed.bannerImage ||
          parsed.bannerImage.includes('photo-1511578314322-379afb476865') ||
          parsed.bannerImage.startsWith('data:image')
        ) {
          parsed.bannerImage = initialSmeFanConfig.bannerImage;
        }
        // Automatically sync official 71 SongSaphat + 6 Rotary members if local storage only has old mock members
        if (!parsed.members || !Array.isArray(parsed.members) || parsed.members.length < initialSmeFanConfig.members.length) {
          parsed.members = initialSmeFanConfig.members;
        }
        return parsed;
      }
    } catch (e) {
      console.warn("Could not load eventConfig:", e);
    }
    return initialSmeFanConfig;
  });

  // 2. Registrations List State (Preserves real registered attendees across reloads)
  const [registrations, setRegistrations] = useState(() => {
    try {
      // Auto-purge test registrations & contest data from previous test runs across all devices
      [
        'sme_fan_registrations', 'sme_fan_registrations_v1', 'sme_fan_registrations_v2', 'sme_fan_registrations_v3',
        'sme_fan_contest_teams', 'sme_fan_contest_teams_v1',
        'sme_fan_contest_votes', 'sme_fan_contest_all_votes', 'sme_fan_contest_all_votes_v1'
      ].forEach(k => {
        try { localStorage.removeItem(k); } catch (e) {}
      });
      const saved = localStorage.getItem(REGISTRATIONS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Could not load registrations:", e);
    }
    return [];
  });

  // 3. Multi-Form Hub List State (Forms 1, 2, 3, 4)
  const [formsList, setFormsList] = useState(() => {
    try {
      const saved = localStorage.getItem(FORMS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Could not load formsList:", e);
    }
    return initialFormsList;
  });

  // 4. Current Logged-in Admin User (Guaranteed NULL for regular attendees, requires valid timestamp)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      // Purge all legacy storage keys across all devices
      ['sme_fan_admin_user', 'sme_fan_admin_user_v1', 'sme_fan_admin_user_v2', 'sme_fan_admin_user_v3', 'sme_fan_admin_user_v4'].forEach(k => {
        localStorage.removeItem(k);
      });
      const saved = localStorage.getItem(USER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (isValidAdminSession(parsed, initialSmeFanConfig)) {
          return parsed;
        } else {
          localStorage.removeItem(USER_STORAGE_KEY);
        }
      }
    } catch (e) {
      console.warn("Could not load user:", e);
    }
    return null; // Public guest by default (NOT admin)
  });

  // 5. Active form viewing in FormHubViewer
  const [activeFormId, setActiveFormId] = useState('form_1_sme_event');

  // 6. Generic Form Data State (for optional generic builder)
  const [formData, setFormData] = useState(defaultFormData);

  // Active Tab & Modal States: Persisted across browser refresh via URL Hash & localStorage
  const [currentTab, setCurrentTab] = useState(getInitialTab);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [verifiedTicket, setVerifiedTicket] = useState(null);

  // Auto-sync currentTab to URL Hash and localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, currentTab);
      const targetHash = '#' + tabToHash(currentTab);
      if (window.location.hash !== targetHash) {
        window.history.replaceState(null, '', targetHash);
      }
    } catch (e) {
      console.warn("Could not sync active tab to hash/storage:", e);
    }
  }, [currentTab]);

  // Listen for browser Hash changes (e.g. Back/Forward navigation or direct link clicks)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleHashChange = () => {
      const nextTab = hashToTab(window.location.hash);
      if (nextTab && nextTab !== currentTab) {
        if (['sme_portal', 'sme_admin', 'sme_checkin'].includes(nextTab) && !currentUser) {
          setIsLoginModalOpen(true);
          setCurrentTab('sme_register');
        } else {
          setCurrentTab(nextTab);
        }
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentTab, currentUser]);

  // Immediate Security Watchdog: Kicks unauthorized users out of admin tabs instantly
  useEffect(() => {
    if (!currentUser && ['sme_portal', 'sme_admin', 'sme_checkin'].includes(currentTab)) {
      console.warn("🔒 Security: Unauthorized tab access revoked, redirecting to #register");
      setCurrentTab('sme_register');
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', '#register');
        localStorage.removeItem(ACTIVE_TAB_STORAGE_KEY);
      }
    }
  }, [currentUser, currentTab]);

  // Auto-save eventConfig locally & sync to Supabase Cloud
  useEffect(() => {
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(eventConfig));
    } catch (e) {
      console.error("Failed to save eventConfig locally:", e);
      if (e.name === 'QuotaExceededError') {
        try {
          const sanitized = { ...eventConfig };
          if (sanitized.bannerImage?.startsWith('data:image')) {
            sanitized.bannerImage = initialSmeFanConfig.bannerImage;
          }
          if (sanitized.backgroundImage?.startsWith('data:image')) {
            sanitized.backgroundImage = initialSmeFanConfig.backgroundImage;
          }
          if (sanitized.subBannerImage?.startsWith('data:image')) {
            sanitized.subBannerImage = '';
          }
          localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(sanitized));
        } catch (err) {}
      }
    }

    // CRITICAL FIX: Only authenticated Admin users (owner, manager, admin) are permitted to sync eventConfig to Supabase Cloud!
    // Regular public visitors / guests must NEVER overwrite eventConfig on Supabase!
    if (isSupabaseConfigured() && currentUser && ['owner', 'manager', 'admin'].includes(currentUser.role)) {
      const timer = setTimeout(() => {
        saveEventConfigToCloud(eventConfig).catch(err => {
          console.warn("Cloud config sync warning:", err);
        });
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [eventConfig, currentUser]);

  // Auto-save registrations (Debounced by 400ms to keep button taps instant and lag-free)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(REGISTRATIONS_STORAGE_KEY, JSON.stringify(registrations));
      } catch (e) {
        console.error("Failed to save registrations:", e);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [registrations]);

  // Auto-save formsList
  useEffect(() => {
    try {
      localStorage.setItem(FORMS_STORAGE_KEY, JSON.stringify(formsList));
    } catch (e) {
      console.error("Failed to save formsList:", e);
    }
  }, [formsList]);

  // Auto-save currentUser
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    } catch (e) {
      console.error("Failed to save currentUser:", e);
    }
  }, [currentUser]);

  // Last Cloud Sync tracking
  const [lastCloudSync, setLastCloudSync] = useState(new Date());

  // Background Cloud Sync Helper (Fire-and-await with error logging)
  const syncTicketToCloud = async (ticket) => {
    if (isSupabaseConfigured() && ticket) {
      try {
        const ok = await upsertRegistrationToCloud(ticket);
        if (ok) {
          setLastCloudSync(new Date());
        }
        return ok;
      } catch (err) {
        console.warn("Supabase background sync error:", err);
        return false;
      }
    }
    return false;
  };

  // 1. Initial Cloud Hydration from Supabase on mount
  useEffect(() => {
    if (isSupabaseConfigured()) {
      // 1.1 Hydrate eventConfig (Banner, Sub-banner, Titles, Themes across all devices)
      fetchEventConfigFromCloud().then(cloudConfig => {
        if (cloudConfig && typeof cloudConfig === 'object') {
          const sanitizedCloud = { ...cloudConfig };
          if (
            !sanitizedCloud.bannerImage ||
            sanitizedCloud.bannerImage.includes('photo-1511578314322-379afb476865') ||
            sanitizedCloud.bannerImage.startsWith('data:image')
          ) {
            sanitizedCloud.bannerImage = initialSmeFanConfig.bannerImage;
          }
          setEventConfig(prev => ({ ...prev, ...sanitizedCloud }));
          // Verify active user against cloud force-logout policy
          setCurrentUser(prevUser => {
            if (prevUser && !isValidAdminSession(prevUser, cloudConfig)) {
              console.warn("🔒 Cloud Security: Force logging out unauthorized session");
              localStorage.removeItem(USER_STORAGE_KEY);
              return null;
            }
            return prevUser;
          });
        }
      }).catch(err => console.warn('Supabase config fetch warning:', err));

      // 1.2 Hydrate registrations (Authoritative cloud source + merge offline/local)
      fetchRegistrationsFromCloud().then(cloudData => {
        if (cloudData && Array.isArray(cloudData)) {
          setRegistrations(prev => {
            const cloudTicketNos = new Set(cloudData.map(r => r.ticketNo));
            const localOnly = (prev || []).filter(r => r && r.ticketNo && !cloudTicketNos.has(r.ticketNo));

            // Sync any local tickets to cloud if missing in cloud
            if (localOnly.length > 0) {
              localOnly.forEach(t => syncTicketToCloud(t));
            }

            const merged = [...cloudData, ...localOnly];
            try {
              localStorage.setItem(REGISTRATIONS_STORAGE_KEY, JSON.stringify(merged));
            } catch (e) {}
            return merged;
          });
          setLastCloudSync(new Date());
        }
      }).catch(err => console.warn('Supabase initial fetch warning:', err));
    }
  }, []);

  // 2. Supabase Real-time Cloud Synchronization (Immediate multi-device sync)
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    // 2.1 Realtime registrations sync
    const unsubscribeRegs = subscribeToRegistrations((changedAttendee, eventType, ticketNo) => {
      console.log(`⚡ Supabase Realtime: [${eventType}] ticket: ${ticketNo}`);
      setLastCloudSync(new Date());

      if (eventType === 'DELETE') {
        setRegistrations(prev => prev.filter(r => r.ticketNo !== ticketNo));
      } else if (changedAttendee && changedAttendee.ticketNo) {
        setRegistrations(prev => {
          const index = prev.findIndex(r => r.ticketNo === changedAttendee.ticketNo);
          if (index >= 0) {
            const next = [...prev];
            next[index] = { ...prev[index], ...changedAttendee };
            return next;
          } else {
            return [...prev, changedAttendee];
          }
        });
      }
    });

    // 2.2 Realtime event_config sync (Broadcast instant force-logout across all open devices)
    const unsubscribeConfig = subscribeToEventConfig((cloudConfig) => {
      if (cloudConfig && typeof cloudConfig === 'object') {
        console.log("⚡ Supabase Realtime: event_config updated from cloud");
        const sanitizedCloud = { ...cloudConfig };
        if (
          !sanitizedCloud.bannerImage ||
          sanitizedCloud.bannerImage.includes('photo-1511578314322-379afb476865') ||
          sanitizedCloud.bannerImage.startsWith('data:image')
        ) {
          sanitizedCloud.bannerImage = initialSmeFanConfig.bannerImage;
        }
        setEventConfig(prev => ({ ...prev, ...sanitizedCloud }));
        setCurrentUser(prevUser => {
          if (prevUser && !isValidAdminSession(prevUser, cloudConfig)) {
            console.warn("🔒 Cloud Realtime: Session revoked by server policy");
            localStorage.removeItem(USER_STORAGE_KEY);
            return null;
          }
          return prevUser;
        });
      }
    });

    return () => {
      if (typeof unsubscribeRegs === 'function') unsubscribeRegs();
      if (typeof unsubscribeConfig === 'function') unsubscribeConfig();
    };
  }, []);

  // 3. Fallback Auto-polling every 25 seconds when on Event Check-In or Admin tabs (Realtime WebSocket handles instant sync)
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    if (['sme_checkin', 'sme_portal', 'contest_judge'].includes(currentTab)) {
      const pollTimer = setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) return;
        fetchRegistrationsFromCloud().then(cloudData => {
          if (cloudData && Array.isArray(cloudData)) {
            setRegistrations(prev => {
              // Quick check if data changed by ticket count, checkedIn count, or photos
              const prevSummary = prev.map(p => `${p.ticketNo}_${p.checkedIn}_${!!p.photoUrl}_${p.giftNumber}`).join('|');
              const newSummary = cloudData.map(p => `${p.ticketNo}_${p.checkedIn}_${!!p.photoUrl}_${p.giftNumber}`).join('|');
              if (prevSummary !== newSummary) {
                setLastCloudSync(new Date());
                return cloudData;
              }
              return prev;
            });
          }
        }).catch(err => console.warn('Auto-polling sync check warning:', err));
      }, 25000);

      return () => clearInterval(pollTimer);
    }
  }, [currentTab]);

  // Check URL ticket verification parameter (e.g. ?verify=SME-004 or ?ticket=SME-004)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const verifyParam = params.get('verify') || params.get('ticket');

    if (verifyParam && registrations.length > 0) {
      const found = registrations.find(r => r.ticketNo?.toLowerCase() === verifyParam.toLowerCase());
      if (found) {
        setVerifiedTicket(found);
      }
    }
  }, [registrations]);

  // Handle Admin entry click from public registration form (Navigates to Owner Portal Selector)
  const handleAdminClick = () => {
    if (currentUser) {
      setCurrentTab('sme_portal');
    } else {
      setIsLoginModalOpen(true);
    }
  };

  // Handle Logout (Clears admin user session and returns to public form)
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(ACTIVE_TAB_STORAGE_KEY);
    window.location.hash = '#register';
    setCurrentTab('sme_register');
  };

  // Handle View Form from Hub
  const handleViewForm = (formId) => {
    setActiveFormId(formId);
    if (formId === 'form_1_sme_event') {
      setCurrentTab('sme_register');
    } else {
      setCurrentTab('form_viewer');
    }
  };

  // Handle Add Form Response (Forms 2, 3, 4)
  const handleSubmitFormResponse = (formId, newResponse) => {
    setFormsList(prev => prev.map(f => {
      if (f.id === formId) {
        return {
          ...f,
          responses: [newResponse, ...(f.responses || [])]
        };
      }
      return f;
    }));
  };

  // Handle Add Registration for Form 1 (Optimistic Background sync to Google Sheets & Supabase)
  const handleAddRegistration = (newTicket) => {
    setRegistrations(prev => [newTicket, ...prev]);

    // Push asynchronously in background to Google Sheets
    if (eventConfig.googleSheetsUrl) {
      submitSmeFanTicketToSheets(eventConfig.googleSheetsUrl, newTicket).catch(err => {
        console.warn("Background sheet sync failed:", err);
      });
    }

    // Push asynchronously to Supabase
    syncTicketToCloud(newTicket);
  };

  // Handle Update Registration
  const handleUpdateRegistration = (updatedTicket) => {
    setRegistrations(prev => 
      prev.map(r => r.ticketNo === updatedTicket.ticketNo ? updatedTicket : r)
    );

    // Push updated ticket to Google Sheets
    if (eventConfig.googleSheetsUrl) {
      submitSmeFanTicketToSheets(eventConfig.googleSheetsUrl, updatedTicket).catch(err => {
        console.warn("Background sheet sync failed:", err);
      });
    }

    // Push updated ticket to Supabase
    syncTicketToCloud(updatedTicket);
  };

  // Handle Record Ticket Download (Tracks download count & timestamps per attendee)
  const handleRecordDownload = (ticketNo) => {
    if (!ticketNo) return;
    const now = new Date();
    const formatted = now.toLocaleDateString('th-TH', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    }) + ' ' + now.toLocaleTimeString('th-TH', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    }) + ' น.';

    setRegistrations(prev => {
      let updatedTicket = null;
      const nextList = prev.map(r => {
        if (r.ticketNo === ticketNo) {
          const newCount = (r.downloadCount || 0) + 1;
          const newHistory = [...(r.downloadHistory || []), formatted];
          updatedTicket = {
            ...r,
            downloadCount: newCount,
            lastDownloadedAt: formatted,
            downloadHistory: newHistory
          };
          return updatedTicket;
        }
        return r;
      });

      if (updatedTicket && eventConfig.googleSheetsUrl) {
        submitSmeFanTicketToSheets(eventConfig.googleSheetsUrl, updatedTicket).catch(err => {
          console.warn("Background sheet sync failed for download record:", err);
        });
      }

      if (updatedTicket) {
        syncTicketToCloud(updatedTicket);
      }

      return nextList;
    });
  };

  // Handle Check-in Attendee at Event
  const handleCheckIn = (ticketNo, status = true) => {
    if (!ticketNo) return;
    const nowTime = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
    setRegistrations(prev => {
      let updatedTicket = null;
      const nextList = prev.map(r => {
        if (r.ticketNo === ticketNo) {
          updatedTicket = {
            ...r,
            checkedIn: status,
            checkedInAt: status ? nowTime : null
          };
          return updatedTicket;
        }
        return r;
      });

      if (updatedTicket) {
        if (eventConfig.googleSheetsUrl) {
          submitSmeFanTicketToSheets(eventConfig.googleSheetsUrl, updatedTicket).catch(err => {
            console.warn("Background sheet sync failed for check-in:", err);
          });
        }
        syncTicketToCloud(updatedTicket);
      }

      return nextList;
    });
  };

  // Handle Register Gift for Attendee
  const handleRegisterGift = (ticketNo, giftNumber) => {
    if (!ticketNo) return;
    const nowTime = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
    setRegistrations(prev => {
      let updatedTicket = null;
      const nextList = prev.map(r => {
        if (r.ticketNo === ticketNo) {
          updatedTicket = {
            ...r,
            giftNumber: giftNumber,
            giftRegisteredAt: nowTime
          };
          return updatedTicket;
        }
        return r;
      });

      if (updatedTicket) {
        if (eventConfig.googleSheetsUrl) {
          submitSmeFanTicketToSheets(eventConfig.googleSheetsUrl, updatedTicket).catch(err => {
            console.warn("Background sheet sync failed for gift registration:", err);
          });
        }
        syncTicketToCloud(updatedTicket);
      }

      return nextList;
    });
  };

  // Handle Remove Gift Registration
  const handleRemoveGift = (ticketNo) => {
    if (!ticketNo) return;
    setRegistrations(prev => {
      let updatedTicket = null;
      const nextList = prev.map(r => {
        if (r.ticketNo === ticketNo) {
          updatedTicket = {
            ...r,
            giftNumber: null,
            giftRegisteredAt: null
          };
          return updatedTicket;
        }
        return r;
      });

      if (updatedTicket) {
        if (eventConfig.googleSheetsUrl) {
          submitSmeFanTicketToSheets(eventConfig.googleSheetsUrl, updatedTicket).catch(err => {
            console.warn("Background sheet sync failed for gift removal:", err);
          });
        }
        syncTicketToCloud(updatedTicket);
      }

      return nextList;
    });
  };

  // Handle Update Attendee Photo (with option to mark checkedIn: true upon capture)
  const handleUpdateAttendeePhoto = (ticketNo, photoUrl, alsoCheckIn = true) => {
    if (!ticketNo) return;
    const nowTime = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
    setRegistrations(prev => {
      let updatedTicket = null;
      const nextList = prev.map(r => {
        if (r.ticketNo === ticketNo) {
          updatedTicket = {
            ...r,
            photoUrl: photoUrl,
            costumePhoto: photoUrl,
            checkedIn: alsoCheckIn ? true : (r.checkedIn || false),
            checkedInAt: (alsoCheckIn || r.checkedIn) ? (r.checkedInAt || nowTime) : null
          };
          return updatedTicket;
        }
        return r;
      });

      if (updatedTicket) {
        syncTicketToCloud(updatedTicket);
      }
      return nextList;
    });
  };

  // Handle Toggle Shirt Received
  const handleToggleShirtReceived = (ticketNo, received = true) => {
    if (!ticketNo) return;
    const nowTime = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
    setRegistrations(prev => {
      let updatedTicket = null;
      const nextList = prev.map(r => {
        if (r.ticketNo === ticketNo) {
          updatedTicket = {
            ...r,
            shirtReceived: received,
            shirtReceivedAt: received ? nowTime : null
          };
          return updatedTicket;
        }
        return r;
      });

      if (updatedTicket) {
        syncTicketToCloud(updatedTicket);
      }
      return nextList;
    });
  };

  // Handle Delete Registration (Owner only)
  const handleDeleteRegistration = (ticketNo) => {
    setRegistrations(prev => prev.filter(r => r.ticketNo !== ticketNo));
  };

  // Handle Delete Single Slip (Purges image storage while keeping registration record)
  const handleDeleteSlip = (ticketNo) => {
    setRegistrations(prev => prev.map(r => {
      if (r.ticketNo === ticketNo) {
        return { ...r, slipUrl: "" };
      }
      return r;
    }));
    alert("ลบรูปสลิปนี้ออกจากฐานข้อมูลเรียบร้อยแล้ว (ข้อมูลการลงทะเบียนยังคงอยู่)");
  };

  // Handle Purge Expired Slips (> 6 months / 180 days)
  const handlePurgeExpiredSlips = () => {
    let count = 0;
    const now = new Date();
    setRegistrations(prev => prev.map(r => {
      if (r.slipUrl && r.slipExpiresAt && now > new Date(r.slipExpiresAt)) {
        count++;
        return { ...r, slipUrl: "" };
      }
      return r;
    }));
    alert(`ล้างรูปสลิปที่หมดอายุเกิน 6 เดือนเรียบร้อยแล้วทั้งหมด ${count} รูป`);
  };

  // Reset all data to initial defaults
  const handleReset = () => {
    if (window.confirm("คุณต้องการคืนค่าข้อมูลกิจกรรมปีใหม่ SME FAN เป็นค่าเริ่มต้นใช่หรือไม่?")) {
      setEventConfig(initialSmeFanConfig);
      setRegistrations(initialRegistrations);
      setFormsList(initialFormsList);
      setCurrentUser(null);
      localStorage.removeItem(CONFIG_STORAGE_KEY);
      localStorage.removeItem(REGISTRATIONS_STORAGE_KEY);
      localStorage.removeItem(FORMS_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem("sme_fan_contest_teams_v2");
      localStorage.removeItem("sme_fan_contest_all_votes_v2");
      alert("รีเซ็ตข้อมูลเรียบร้อยแล้ว");
    }
  };

  // Dedicated Reset All Registrations & Scores (Preserves 95 members, clubs, and all images 100%)
  const handleResetRegistrationsAndScores = async () => {
    try {
      // 1. Delete all records from Supabase registrations table
      if (isSupabaseConfigured()) {
        const client = getSupabase();
        if (client) {
          const { error } = await client.from('registrations').delete().neq('ticket_no', 'NEVER_MATCH');
          if (error) console.warn("Supabase wipe registrations warning:", error);
        }
      }

      // 2. Clear registrations state
      setRegistrations([]);
      try {
        localStorage.removeItem(REGISTRATIONS_STORAGE_KEY);
        [
          'sme_fan_registrations', 'sme_fan_registrations_v1', 'sme_fan_registrations_v2', 'sme_fan_registrations_v3', 'sme_fan_registrations_v4',
          'sme_fan_contest_teams_v1', 'sme_fan_contest_teams_v2', 'sme_fan_contest_teams',
          'sme_fan_contest_all_votes_v1', 'sme_fan_contest_all_votes_v2', 'sme_fan_contest_votes',
          'sme_fan_judge_scores_v1', 'sme_fan_verified_judge_v1', 'sme_fan_judge_id_v1',
          'sme_fan_grand_winners_v1', 'sme_fan_gift_queue_v1', 'sme_fan_general_draw_counts_v1'
        ].forEach(k => localStorage.removeItem(k));
      } catch (e) {}

      // 3. Clear contestVotes and contestTeams in eventConfig on Cloud
      if (isSupabaseConfigured() && currentUser && ['owner', 'manager', 'admin'].includes(currentUser.role)) {
        try {
          const currentCfg = await fetchEventConfigFromCloud();
          if (currentCfg) {
            const updatedCfg = {
              ...currentCfg,
              contestVotes: [],
              contestTeams: []
            };
            await saveEventConfigToCloud(updatedCfg);
            setEventConfig(updatedCfg);
          }
        } catch (cfgErr) {
          console.warn("Could not clear contest in cloud config:", cfgErr);
        }
      }

      // 4. Trigger storage event to notify other open tabs
      try {
        window.dispatchEvent(new Event('storage'));
      } catch (e) {}

      alert("ล้างข้อมูลการลงทะเบียนและคะแนนการประกวดทั้งหมดเรียบร้อยแล้วครับ! (สังกัดและสมาชิก 95 ท่านคงอยู่ครบถ้วน 100%)");
      return true;
    } catch (err) {
      console.error("handleResetRegistrationsAndScores error:", err);
      alert("เกิดข้อผิดพลาดในการล้างข้อมูล: " + (err?.message || err));
      throw err;
    }
  };

  // Force sync from Supabase Cloud and purge stale local cache
  const handleForceSyncCloud = async () => {
    try {
      if (!isSupabaseConfigured()) {
        alert("ยังไม่ได้เชื่อมต่อ Supabase ครับ");
        return;
      }
      const cloudData = await fetchRegistrationsFromCloud();
      if (cloudData && Array.isArray(cloudData)) {
        setRegistrations(cloudData);
        localStorage.setItem(REGISTRATIONS_STORAGE_KEY, JSON.stringify(cloudData));
        alert(`ซิงค์ข้อมูลจาก Cloud สำเร็จ 100%! พบข้อมูลผู้ลงทะเบียน ${cloudData.length} รายการ (ล้างข้อมูลจำลองเดิมเรียบร้อยแล้วครับ)`);
      }
    } catch (e) {
      alert("เกิดข้อผิดพลาดในการซิงค์ข้อมูล: " + e.message);
    }
  };

  // Sync Google Sheets URL across both config states
  const handleSetFormDataWithSheets = (updater) => {
    setFormData(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (next.settings?.googleSheetsUrl !== eventConfig.googleSheetsUrl) {
        setEventConfig(ec => ({ ...ec, googleSheetsUrl: next.settings.googleSheetsUrl }));
      }
      return next;
    });
  };

  // Active Form Object for Viewer
  const currentViewingForm = formsList.find(f => f.id === activeFormId) || formsList[1];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Top Navbar: Only shown in generic builder / theme views, hidden in public forms & Owner portal */}
      {currentTab !== 'sme_register' && currentTab !== 'sme_admin' && currentTab !== 'sme_portal' && currentTab !== 'sme_checkin' && currentTab !== 'form_viewer' && (
        <Navbar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          onReset={handleReset}
          eventConfig={eventConfig}
          openSheetsModal={() => setIsSheetsModalOpen(true)}
          openShareModal={() => setIsShareModalOpen(true)}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      )}

      {/* Main View Area */}
      <main className="flex-1">
        {/* View 0: Owner Portal Hub (Landing with 2 choices: ลงทะเบียนเข้างาน & ตั้งค่าระบบ) */}
        {currentTab === 'sme_portal' && (
          <OwnerPortalHub
            eventConfig={eventConfig}
            currentUser={currentUser}
            registrations={registrations}
            onSelectCheckIn={() => setCurrentTab('sme_checkin')}
            onSelectSettings={() => setCurrentTab('sme_admin')}
            onSwitchToPublicForm={() => setCurrentTab('sme_register')}
            onLogout={handleLogout}
          />
        )}

        {/* View 1: On-Site Event Hub (5 Tabs: Check-in, Gifts, Shirts, Contest, Lucky Draw) */}
        {currentTab === 'sme_checkin' && (
          <EventCheckInHub
            eventConfig={eventConfig}
            currentUser={currentUser}
            registrations={registrations}
            onCheckIn={handleCheckIn}
            onRegisterGift={handleRegisterGift}
            onRemoveGift={handleRemoveGift}
            onUpdateAttendeePhoto={handleUpdateAttendeePhoto}
            onToggleShirtReceived={handleToggleShirtReceived}
            onBackToPortal={() => setCurrentTab('sme_portal')}
            onGoToSettings={() => setCurrentTab('sme_admin')}
            onSwitchToPublicForm={() => setCurrentTab('sme_register')}
            onPurgeComplete={(cleaned) => setRegistrations(cleaned)}
            onForceSyncCloud={handleForceSyncCloud}
            onResetAllRegistrations={handleResetRegistrationsAndScores}
            onViewTicket={(ticket) => setVerifiedTicket(ticket)}
            lastCloudSync={lastCloudSync}
          />
        )}

        {/* View 1.5: Dedicated Contest Judge Mobile Screen (QR Code Access) */}
        {currentTab === 'contest_judge' && (
          <div className="min-h-screen bg-slate-950 p-2 sm:p-4 flex items-center justify-center">
            <ContestJudgeModal
              isOpen={true}
              onClose={() => setCurrentTab('sme_register')}
              attendees={registrations}
              onSaveVotes={(voteData) => {
                try {
                  const saved = localStorage.getItem("sme_fan_contest_all_votes_v2");
                  let list = saved ? JSON.parse(saved) : [];
                  const cleanVPhone = cleanPhoneNumber(voteData.judgePhone);
                  const existingIdx = list.findIndex(v => 
                    (voteData.judgeTicketNo && v.judgeTicketNo === voteData.judgeTicketNo) || 
                    (cleanVPhone && v.judgePhone && cleanPhoneNumber(v.judgePhone) === cleanVPhone) ||
                    (voteData.judgeId && v.judgeId === voteData.judgeId) || 
                    (voteData.judgeName && v.judgeName === voteData.judgeName)
                  );
                  if (existingIdx >= 0) {
                    const mergedAudit = [
                      ...(list[existingIdx].auditLogs || list[existingIdx].auditTrail || []),
                      ...(voteData.auditLogs || voteData.auditTrail || [])
                    ];
                    list[existingIdx] = {
                      ...voteData,
                      auditLogs: mergedAudit,
                      auditTrail: mergedAudit
                    };
                  } else {
                    list.push({
                      ...voteData,
                      auditTrail: voteData.auditLogs || []
                    });
                  }
                  localStorage.setItem("sme_fan_contest_all_votes_v2", JSON.stringify(list));
                } catch (e) {}
              }}
            />
          </div>
        )}

        {/* View 2: Primary SME FAN Registration Experience (Public Form 1) */}
        {currentTab === 'sme_register' && (
          <SmeFanRegistration
            eventConfig={eventConfig}
            setEventConfig={setEventConfig}
            registrations={registrations}
            onAddRegistration={handleAddRegistration}
            onUpdateRegistration={handleUpdateRegistration}
            currentUser={currentUser}
            onAdminClick={handleAdminClick}
            onLogout={handleLogout}
            onRecordDownload={handleRecordDownload}
          />
        )}

        {/* View 3: SME FAN Admin Management Portal with Left Sidebar & Multi-Form Hub */}
        {currentTab === 'sme_admin' && (
          <SmeFanAdmin
            eventConfig={eventConfig}
            setEventConfig={setEventConfig}
            registrations={registrations}
            onOpenGoogleSheetsModal={() => setIsSheetsModalOpen(true)}
            currentUser={currentUser}
            onLoginClick={() => setIsLoginModalOpen(true)}
            onLogout={handleLogout}
            onDeleteRegistration={handleDeleteRegistration}
            onDeleteSlip={handleDeleteSlip}
            onPurgeExpiredSlips={handlePurgeExpiredSlips}
            onSwitchToForm={() => setCurrentTab('sme_register')}
            onBackToPortal={() => setCurrentTab('sme_portal')}
            onGoToCheckIn={() => setCurrentTab('sme_checkin')}
            formsList={formsList}
            setFormsList={setFormsList}
            onViewForm={handleViewForm}
            onPurgeComplete={(cleaned) => setRegistrations(cleaned)}
            onForceSyncCloud={handleForceSyncCloud}
            onResetAllRegistrations={handleResetRegistrationsAndScores}
          />
        )}

        {/* View 3: Multi-Form Hub Public Form Viewer (Forms 2, 3, 4) */}
        {currentTab === 'form_viewer' && (
          <FormHubViewer
            form={currentViewingForm}
            onBackToDashboard={() => setCurrentTab('sme_admin')}
            onSubmitResponse={handleSubmitFormResponse}
            onOpenThemeCustomizer={(formId) => {
              setActiveFormId(formId);
              setCurrentTab('sme_admin');
            }}
          />
        )}

        {/* View 4: Generic Form Builder (Legacy) */}
        {currentTab === 'builder' && (
          <FormBuilder
            formData={formData}
            setFormData={handleSetFormDataWithSheets}
            onPreviewClick={() => setCurrentTab('preview')}
          />
        )}

        {/* View 5: Generic Theme Customizer (Legacy) */}
        {currentTab === 'theme' && (
          <ThemeCustomizer
            formData={formData}
            setFormData={handleSetFormDataWithSheets}
          />
        )}

        {/* View 6: Generic Form Preview (Legacy) */}
        {currentTab === 'preview' && (
          <FormViewer
            formData={formData}
            onBackToBuilder={() => setCurrentTab('builder')}
          />
        )}
      </main>

      {/* Admin Login Modal (RBAC with Email & Phone) */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        adminUsers={eventConfig.adminUsers || []}
        onLoginSuccess={(user) => {
          const authUser = {
            ...user,
            authTimestamp: Date.now()
          };
          setCurrentUser(authUser);
          try {
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authUser));
          } catch (e) {}
          setCurrentTab('sme_portal');
          alert(`เข้าสู่ระบบในฐานะ: ${user.name} (${user.role === 'owner' ? 'เจ้าของ' : user.role === 'manager' ? 'ผู้จัดการ' : 'แอดมิน'})`);
        }}
      />

      {/* Google Sheets Connection Modal (Configures 5 sheets) */}
      <GoogleSheetsModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        formData={{
          ...formData,
          settings: {
            ...formData.settings,
            googleSheetsUrl: eventConfig.googleSheetsUrl || formData.settings.googleSheetsUrl
          }
        }}
        setFormData={(updater) => {
          handleSetFormDataWithSheets(updater);
        }}
      />

      {/* Share / QR Code Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        formData={{
          title: eventConfig.eventTitle,
          ...formData
        }}
        onSwitchToPreview={() => setCurrentTab('sme_register')}
      />

      {/* Verified Ticket Modal (When scanned via QR Code URL) */}
      {verifiedTicket && (
        <TicketModal
          isOpen={!!verifiedTicket}
          onClose={() => setVerifiedTicket(null)}
          ticketData={verifiedTicket}
          eventConfig={eventConfig}
          onRecordDownload={handleRecordDownload}
        />
      )}

    </div>
  );
}

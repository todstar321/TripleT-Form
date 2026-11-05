/**
 * Supabase Cloud Client Utility for Triple T Form & SME FAN 2026
 * Provides real-time synchronization with fallback to localStorage
 */
import { createClient } from '@supabase/supabase-js';

const STORAGE_KEY_CONFIG = 'sme_fan_supabase_config_v1';

// Read config from Environment Variables or localStorage override
export function getSupabaseConfig() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.url && parsed.anonKey) {
          return parsed;
        }
      }
    }
  } catch (e) {
    console.warn('Error reading stored Supabase config:', e);
  }

  const envUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) 
    || 'https://hsswobqnjzwqsczbxmrj.supabase.co';
  const envKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) 
    || 'sb_publishable_fr8rj2iLrQhkl3Yjg7qGPg_O4FnnIYG';

  return {
    url: envUrl,
    anonKey: envKey
  };
}

function cleanSupabaseUrl(url) {
  if (!url) return '';
  return url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
}

export function saveSupabaseConfig(url, anonKey) {
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify({
      url: cleanSupabaseUrl(url),
      anonKey: (anonKey || '').trim()
    }));
    // Re-initialize client
    initClient();
  } catch (e) {
    console.error('Error saving Supabase config:', e);
  }
}

let supabaseInstance = null;

function initClient() {
  const { url, anonKey } = getSupabaseConfig();
  const cleanedUrl = cleanSupabaseUrl(url);
  if (cleanedUrl && anonKey && cleanedUrl.startsWith('http')) {
    try {
      supabaseInstance = createClient(cleanedUrl, anonKey.trim(), {
        auth: { persistSession: false }
      });
      return supabaseInstance;
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      supabaseInstance = null;
    }
  }
  supabaseInstance = null;
  return null;
}

// Initial client initialization
initClient();

export function isSupabaseConfigured() {
  const { url, anonKey } = getSupabaseConfig();
  return Boolean(url && anonKey && url.startsWith('http'));
}

export function getSupabase() {
  if (!supabaseInstance) {
    initClient();
  }
  return supabaseInstance;
}

// Test Connection Helper
export async function testSupabaseConnection() {
  const client = getSupabase();
  if (!client) {
    return {
      success: false,
      message: 'ยังไม่ได้ระบุ Supabase URL หรือ Anon Key ครับ'
    };
  }

  try {
    const { count, error } = await client
      .from('registrations')
      .select('*', { count: 'exact', head: true });

    if (error) {
      return {
        success: false,
        message: `เชื่อมต่อไม่สำเร็จ: ${error.message} (กรุณาตรวจสอบว่าสร้างตาราง registrations หรือยังครับ)`
      };
    }

    return {
      success: true,
      count: count || 0,
      message: `เชื่อมต่อ Supabase สำเร็จ 100%! พบข้อมูลผู้ลงทะเบียน ${count || 0} รายการ`
    };
  } catch (err) {
    return {
      success: false,
      message: `เกิดข้อผิดพลาดในการเชื่อมต่อ: ${err.message}`
    };
  }
}

/**
 * Safely converts any date, ISO string, Thai time string ("14:25 น."), or Buddhist year string ("11/2/2569")
 * into a standard ISO 8601 string acceptable by PostgreSQL timestamptz.
 * Returns null if input is empty/falsy.
 */
export function toSafeIsoTimestamp(val) {
  if (!val) return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val.toISOString();
  }

  const str = String(val).trim();
  if (!str) return null;

  // 1. Check if already standard ISO 8601 e.g. "2026-11-02T07:25:00.000Z"
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // 2. Check if Buddhist year ISO e.g. "2569-11-02..."
  const beIsoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (beIsoMatch && parseInt(beIsoMatch[1], 10) > 2400) {
    const ceYear = parseInt(beIsoMatch[1], 10) - 543;
    const adjusted = str.replace(/^\d{4}/, String(ceYear));
    const d = new Date(adjusted);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // 3. Check if Thai Date time e.g. "11/2/2569 14:21:30" or "11/2/2026"
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (slashMatch) {
    let year = parseInt(slashMatch[3], 10);
    if (year > 2400) year -= 543;
    const month = parseInt(slashMatch[2], 10) - 1;
    const day = parseInt(slashMatch[1], 10);
    const hour = parseInt(slashMatch[4] || '0', 10);
    const minute = parseInt(slashMatch[5] || '0', 10);
    const second = parseInt(slashMatch[6] || '0', 10);
    const d = new Date(year, month, day, hour, minute, second);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // 4. Check if Time-only string e.g. "14:25 น." or "14:25"
  const timeMatch = str.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (timeMatch) {
    const now = new Date();
    now.setHours(parseInt(timeMatch[1], 10), parseInt(timeMatch[2], 10), parseInt(timeMatch[3] || '0', 10), 0);
    return now.toISOString();
  }

  // 5. General Date parsing fallback
  const fallback = new Date(str);
  if (!isNaN(fallback.getTime())) {
    if (fallback.getFullYear() > 2400) {
      fallback.setFullYear(fallback.getFullYear() - 543);
    }
    return fallback.toISOString();
  }

  return new Date().toISOString();
}

/**
 * Formats an ISO timestamp or date string into a user-friendly Thai time e.g. "14:25 น."
 */
export function formatThaiDisplayTime(val) {
  if (!val) return null;
  const str = String(val).trim();
  if (str.endsWith('น.')) return str;
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
  }
  return str;
}

/**
 * Formats an ISO timestamp or date string into user-friendly Thai Date and Time
 * e.g. "3 พ.ย. 69 18:06 น."
 */
export function formatThaiDisplayDateTime(val) {
  if (!val) return '-';
  const str = String(val).trim();
  if (str.includes('น.') && (str.includes('พ.ย.') || str.includes('/') || str.includes(' '))) return str;
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const datePart = d.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: '2-digit'
    });
    const timePart = d.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit'
    });
    return `${datePart} ${timePart} น.`;
  }
  return str;
}

// Track whether Supabase table has shirt_photo column
let shirtPhotoColAvailable = null;

// Convert DB snake_case to frontend camelCase
export function mapCloudToRegistration(r) {
  if (!r) return null;
  return {
    ticketNo: r.ticket_no,
    name: r.name,
    nickname: r.nickname || '',
    phone: r.phone || '',
    email: r.email || '',
    regType: r.reg_type || 'member',
    club: r.club || 'สงสพัท',
    amount: Number(r.amount) || 500,
    paidAmount: Number(r.paid_amount) || 500,
    paymentStatus: r.payment_status || 'paid',
    paymentSlip: r.payment_slip || null,
    slipUrl: r.payment_slip || null,
    slipUploadedAt: r.slip_uploaded_at || null,
    hasShirt: Boolean(r.has_shirt),
    shirtSize: r.shirt_size || 'L',
    shirtGender: r.shirt_gender || 'ชาย',
    shirtReceived: Boolean(r.shirt_received),
    shirtReceivedAt: r.shirt_received_at ? formatThaiDisplayTime(r.shirt_received_at) : null,
    checkedIn: Boolean(r.checked_in),
    checkedInAt: r.checked_in_at ? formatThaiDisplayTime(r.checked_in_at) : null,
    giftNumber: r.gift_number || null,
    giftRegisteredAt: r.gift_registered_at ? formatThaiDisplayTime(r.gift_registered_at) : null,
    photoUrl: r.photo_url || null,
    shirtPhoto: r.shirt_photo || r.costume_photo || null,
    costumePhoto: r.costume_photo || null,
    recommenderName: r.recommender_name || '',
    recommender: r.recommender_name || '',
    guestTitle: r.guest_title || '',
    prefix: r.guest_title || '',
    createdAt: r.created_at,
    timestamp: r.created_at ? formatThaiDisplayDateTime(r.created_at) : null,
    updatedAt: r.updated_at
  };
}

// Sync Registrations to/from Cloud
export async function fetchRegistrationsFromCloud() {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('registrations')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!data) return [];

    return data.map(mapCloudToRegistration);
  } catch (err) {
    console.warn('fetchRegistrationsFromCloud error:', err);
    return null;
  }
}

export async function upsertRegistrationToCloud(reg) {
  const client = getSupabase();
  if (!client || !reg) return false;

  try {
    let finalTicketNo = reg.ticketNo;

    // Safety Collision Guard: Prevent overwriting another person if ticket_no was already claimed
    if (finalTicketNo) {
      try {
        const { data: existingRows } = await client
          .from('registrations')
          .select('ticket_no, name, phone')
          .eq('ticket_no', finalTicketNo);

        if (existingRows && existingRows.length > 0) {
          const existing = existingRows[0];
          const cleanExistingPhone = (existing.phone || '').replace(/\D/g, '');
          const cleanNewPhone = (reg.phone || '').replace(/\D/g, '');
          const existingName = (existing.name || '').trim().toLowerCase();
          const newName = (reg.name || '').trim().toLowerCase();

          const isSamePerson = (
            (cleanExistingPhone && cleanExistingPhone.length >= 8 && cleanExistingPhone === cleanNewPhone) ||
            (existingName && existingName === newName)
          );

          if (!isSamePerson) {
            console.warn(`[Collision Guard] Ticket ${finalTicketNo} belongs to "${existing.name}". Assigning new number for "${reg.name}".`);
            const { data: allRows } = await client
              .from('registrations')
              .select('ticket_no');

            let maxN = 0;
            if (allRows) {
              allRows.forEach(r => {
                const m = (r.ticket_no || '').match(/\d+/);
                if (m) maxN = Math.max(maxN, parseInt(m[0], 10));
              });
            }
            finalTicketNo = `SME-${String(maxN + 1).padStart(3, '0')}`;
            reg.ticketNo = finalTicketNo;
          }
        }
      } catch (checkErr) {
        console.warn('Collision check warning:', checkErr);
      }
    } else {
      // If no ticket number passed, compute next
      try {
        const { data: allRows } = await client
          .from('registrations')
          .select('ticket_no');

        let maxN = 0;
        if (allRows) {
          allRows.forEach(r => {
            const m = (r.ticket_no || '').match(/\d+/);
            if (m) maxN = Math.max(maxN, parseInt(m[0], 10));
          });
        }
        finalTicketNo = `SME-${String(maxN + 1).padStart(3, '0')}`;
        reg.ticketNo = finalTicketNo;
      } catch (e) {}
    }

    const payload = {
      ticket_no: finalTicketNo,
      name: reg.name,
      nickname: reg.nickname || '',
      phone: reg.phone || '',
      email: reg.email || '',
      reg_type: reg.regType || 'member',
      club: reg.club || 'สงสพัท',
      amount: Number(reg.amount) || 500,
      paid_amount: Number(reg.paidAmount) || 500,
      payment_status: reg.paymentStatus || 'paid',
      payment_slip: reg.paymentSlip || reg.slipUrl || null,
      slip_uploaded_at: toSafeIsoTimestamp(reg.slipUploadedAt),
      has_shirt: Boolean(reg.hasShirt),
      shirt_size: reg.shirtSize || 'L',
      shirt_gender: reg.shirtGender || 'ชาย',
      shirt_received: Boolean(reg.shirtReceived),
      shirt_received_at: toSafeIsoTimestamp(reg.shirtReceivedAt),
      checked_in: Boolean(reg.checkedIn),
      checked_in_at: toSafeIsoTimestamp(reg.checkedInAt),
      gift_number: reg.giftNumber || null,
      gift_registered_at: toSafeIsoTimestamp(reg.giftRegisteredAt),
      photo_url: reg.photoUrl || null,
      costume_photo: reg.shirtPhoto || reg.costumePhoto || null,
      recommender_name: reg.recommenderName || reg.recommender || '',
      guest_title: reg.guestTitle || reg.prefix || '',
      updated_at: new Date().toISOString()
    };

    if (shirtPhotoColAvailable !== false && reg.shirtPhoto) {
      payload.shirt_photo = reg.shirtPhoto;
    }

    let { error } = await client
      .from('registrations')
      .upsert(payload, { onConflict: 'ticket_no' });

    if (error && error.message && error.message.includes('shirt_photo')) {
      shirtPhotoColAvailable = false;
      delete payload.shirt_photo;
      const retry = await client
        .from('registrations')
        .upsert(payload, { onConflict: 'ticket_no' });
      error = retry.error;
    } else if (!error && payload.shirt_photo) {
      shirtPhotoColAvailable = true;
    }

    if (error) {
      console.error('upsertRegistrationToCloud Supabase error:', error);
      throw error;
    }
    return true;
  } catch (err) {
    console.error('upsertRegistrationToCloud caught error:', err);
    return false;
  }
}

/**
 * Subscribe to Supabase Realtime changes on registrations table.
 * Calls callback(mappedAttendee, eventType) whenever an INSERT, UPDATE, or DELETE happens on the cloud.
 */
export function subscribeToRegistrations(onDataChange) {
  const client = getSupabase();
  if (!client) return null;

  try {
    const channelName = `realtime_reg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const channel = client
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'registrations' },
        (payload) => {
          if (!onDataChange) return;
          const { eventType, new: newRecord, old: oldRecord } = payload;
          if (eventType === 'DELETE') {
            onDataChange(null, 'DELETE', oldRecord?.ticket_no);
          } else if (newRecord) {
            const mapped = mapCloudToRegistration(newRecord);
            onDataChange(mapped, eventType, mapped.ticketNo);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('🟢 Supabase Realtime channel connected for registrations');
        }
      });

    return () => {
      try {
        client.removeChannel(channel);
      } catch (e) {
        console.warn('Error removing Supabase realtime channel:', e);
      }
    };
  } catch (err) {
    console.warn('Failed to setup Supabase realtime subscription:', err);
    return null;
  }
}

/**
 * Subscribe to Supabase Realtime changes on event_config table.
 * Used for instant security policy sync (e.g. force logout broadcast).
 */
export function subscribeToEventConfig(onConfigChange) {
  const client = getSupabase();
  if (!client) return null;

  try {
    const channelName = `realtime_cfg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const channel = client
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_config' },
        (payload) => {
          if (!onConfigChange) return;
          if (payload.new && payload.new.config) {
            onConfigChange(payload.new.config);
          }
        }
      )
      .subscribe();

    return () => {
      try {
        client.removeChannel(channel);
      } catch (e) {}
    };
  } catch (err) {
    return null;
  }
}

// Bulk Photo Purge on Supabase
export async function purgePhotosInCloud(purgeType = 'all') {
  const client = getSupabase();
  if (!client) return { success: true, count: 0, message: 'Local purge only' };

  try {
    let updatePayload = {};
    if (purgeType === 'attendees') {
      updatePayload = { photo_url: null, costume_photo: null };
      if (shirtPhotoColAvailable) updatePayload.shirt_photo = null;
    } else if (purgeType === 'slips') {
      updatePayload = { payment_slip: null };
    } else {
      updatePayload = { photo_url: null, costume_photo: null, payment_slip: null };
      if (shirtPhotoColAvailable) updatePayload.shirt_photo = null;
    }

    const { error, count } = await client
      .from('registrations')
      .update(updatePayload)
      .neq('ticket_no', '')
      .select('*', { count: 'exact' });

    if (error) throw error;
    return {
      success: true,
      count: count || 0,
      message: `ล้างรูปภาพบน Supabase สำเร็จเรียบร้อย (${count || 0} รายการ)`
    };
  } catch (err) {
    console.error('purgePhotosInCloud error:', err);
    return {
      success: false,
      message: `เกิดข้อผิดพลาดในการล้างรูปภาพบน Supabase: ${err.message}`
    };
  }
}

// Fetch Event Config (Banner, Theme, Settings) from Cloud
export async function fetchEventConfigFromCloud() {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('event_config')
      .select('config')
      .eq('id', 'current')
      .maybeSingle();

    if (error || !data) return null;
    return data.config;
  } catch (err) {
    console.warn('fetchEventConfigFromCloud warning:', err);
    return null;
  }
}

// Save Event Config to Cloud
export async function saveEventConfigToCloud(config) {
  const client = getSupabase();
  if (!client || !config) return false;

  try {
    const { error } = await client
      .from('event_config')
      .upsert({
        id: 'current',
        config: config,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('saveEventConfigToCloud warning:', err);
    return false;
  }
}

// Fetch Sponsors list from Cloud
export async function fetchSponsorsFromCloud() {
  const client = getSupabase();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('event_config')
      .select('config')
      .eq('id', 'sponsors_data')
      .maybeSingle();

    if (error || !data || !data.config) return [];
    return Array.isArray(data.config.sponsors) ? data.config.sponsors : [];
  } catch (err) {
    console.warn('fetchSponsorsFromCloud warning:', err);
    return [];
  }
}

// Save Full Sponsors list to Cloud
export async function saveSponsorsToCloud(sponsorsList) {
  const client = getSupabase();
  if (!client) return false;

  try {
    const { error } = await client
      .from('event_config')
      .upsert({
        id: 'sponsors_data',
        config: { sponsors: Array.isArray(sponsorsList) ? sponsorsList : [] },
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('saveSponsorsToCloud error:', err);
    return false;
  }
}

// Add a single Sponsor to Cloud
export async function addSponsorToCloud(newSponsor) {
  const client = getSupabase();
  if (!client || !newSponsor) return false;

  try {
    const existing = await fetchSponsorsFromCloud();
    const updated = [newSponsor, ...existing];
    return await saveSponsorsToCloud(updated);
  } catch (err) {
    console.error('addSponsorToCloud error:', err);
    return false;
  }
}

// Fetch Admin Audit Logs from Cloud (event_config id: 'registration_edit_logs')
export async function fetchAuditLogsFromCloud(ticketNo = null) {
  const client = getSupabase();
  if (!client) return ticketNo ? [] : {};

  try {
    const { data, error } = await client
      .from('event_config')
      .select('config')
      .eq('id', 'registration_edit_logs')
      .maybeSingle();

    if (error || !data || !data.config) {
      return ticketNo ? [] : {};
    }

    const allLogs = data.config.logs || {};
    if (ticketNo) {
      return Array.isArray(allLogs[ticketNo]) ? allLogs[ticketNo] : [];
    }
    return allLogs;
  } catch (err) {
    console.warn('fetchAuditLogsFromCloud warning:', err);
    return ticketNo ? [] : {};
  }
}

// Add an Admin Audit Log entry for a ticket
export async function addAuditLogToCloud(ticketNo, logEntry) {
  const client = getSupabase();
  if (!client || !ticketNo || !logEntry) return false;

  try {
    const allLogs = await fetchAuditLogsFromCloud();
    const ticketLogs = Array.isArray(allLogs[ticketNo]) ? allLogs[ticketNo] : [];
    const updatedTicketLogs = [logEntry, ...ticketLogs];
    const updatedAllLogs = {
      ...allLogs,
      [ticketNo]: updatedTicketLogs
    };

    const { error } = await client
      .from('event_config')
      .upsert({
        id: 'registration_edit_logs',
        config: { logs: updatedAllLogs },
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('addAuditLogToCloud error:', err);
    return false;
  }
}

/**
 * Completely wipe all registrations, contest votes, contest teams, and form responses from Supabase Cloud.
 */
export async function wipeRegistrationsFromCloud() {
  const client = getSupabase();
  if (!client) {
    return { success: false, message: 'Supabase client is not configured' };
  }

  const results = { registrations: false, votes: false, teams: false, responses: false };

  // 1. Delete all registrations
  try {
    const { error } = await client
      .from('registrations')
      .delete()
      .neq('ticket_no', 'NEVER_MATCH');
    if (!error) results.registrations = true;
  } catch (err) {
    console.warn('wipeRegistrations registrations error:', err);
  }

  // Fallback deletion by timestamp if ticket_no is null in any legacy row
  try {
    await client
      .from('registrations')
      .delete()
      .gt('created_at', '1970-01-01T00:00:00Z');
  } catch (e) {}

  // 2. Delete contest votes
  try {
    const { error } = await client
      .from('contest_votes')
      .delete()
      .neq('id', 'NEVER_MATCH');
    if (!error) results.votes = true;
  } catch (err) {
    console.warn('wipeRegistrations votes warning:', err);
  }

  // 3. Delete contest teams
  try {
    const { error } = await client
      .from('contest_teams')
      .delete()
      .neq('id', 'NEVER_MATCH');
    if (!error) results.teams = true;
  } catch (err) {
    console.warn('wipeRegistrations teams warning:', err);
  }

  // 4. Delete form responses
  try {
    const { error } = await client
      .from('form_responses')
      .delete()
      .neq('form_key', 'NEVER_MATCH');
    if (!error) results.responses = true;
  } catch (err) {
    console.warn('wipeRegistrations form_responses warning:', err);
  }

  return { success: true, results };
}

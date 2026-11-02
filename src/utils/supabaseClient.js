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
    costumePhoto: r.costume_photo || null,
    recommenderName: r.recommender_name || '',
    guestTitle: r.guest_title || '',
    createdAt: r.created_at,
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
  if (!client || !reg || !reg.ticketNo) return false;

  try {
    const payload = {
      ticket_no: reg.ticketNo,
      name: reg.name,
      nickname: reg.nickname || '',
      phone: reg.phone || '',
      email: reg.email || '',
      reg_type: reg.regType || 'member',
      club: reg.club || 'สงสพัท',
      amount: Number(reg.amount) || 500,
      paid_amount: Number(reg.paidAmount) || 500,
      payment_status: reg.paymentStatus || 'paid',
      payment_slip: reg.paymentSlip || null,
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
      costume_photo: reg.costumePhoto || null,
      recommender_name: reg.recommenderName || '',
      guest_title: reg.guestTitle || '',
      updated_at: new Date().toISOString()
    };

    const { error } = await client
      .from('registrations')
      .upsert(payload, { onConflict: 'ticket_no' });

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

// Bulk Photo Purge on Supabase
export async function purgePhotosInCloud(purgeType = 'all') {
  const client = getSupabase();
  if (!client) return { success: true, count: 0, message: 'Local purge only' };

  try {
    let updatePayload = {};
    if (purgeType === 'attendees') {
      updatePayload = { photo_url: null, costume_photo: null };
    } else if (purgeType === 'slips') {
      updatePayload = { payment_slip: null };
    } else {
      updatePayload = { photo_url: null, costume_photo: null, payment_slip: null };
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

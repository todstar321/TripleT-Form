/**
 * Supabase Cloud Client Utility for Triple T Form & SME FAN 2026
 * Provides real-time synchronization with fallback to localStorage
 */
import { createClient } from '@supabase/supabase-js';

const STORAGE_KEY_CONFIG = 'sme_fan_supabase_config_v1';

// Read config from Environment Variables or localStorage override
export function getSupabaseConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.url && parsed.anonKey) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading stored Supabase config:', e);
  }

  return {
    url: import.meta.env.VITE_SUPABASE_URL || 'https://hsswobqnjzwqsczbxmrj.supabase.co',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_fr8rj2iLrQhkl3Yjg7qGPg_O4FnnIYG'
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

    // Map database snake_case to frontend camelCase
    return data.map(r => ({
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
      shirtReceivedAt: r.shirt_received_at || null,
      checkedIn: Boolean(r.checked_in),
      checkedInAt: r.checked_in_at || null,
      giftNumber: r.gift_number || null,
      giftRegisteredAt: r.gift_registered_at || null,
      photoUrl: r.photo_url || null,
      costumePhoto: r.costume_photo || null,
      recommenderName: r.recommender_name || '',
      guestTitle: r.guest_title || '',
      createdAt: r.created_at
    }));
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
      slip_uploaded_at: reg.slipUploadedAt || null,
      has_shirt: Boolean(reg.hasShirt),
      shirt_size: reg.shirtSize || 'L',
      shirt_gender: reg.shirtGender || 'ชาย',
      shirt_received: Boolean(reg.shirtReceived),
      shirt_received_at: reg.shirtReceivedAt || null,
      checked_in: Boolean(reg.checkedIn),
      checked_in_at: reg.checkedInAt || null,
      gift_number: reg.giftNumber || null,
      gift_registered_at: reg.giftRegisteredAt || null,
      photo_url: reg.photoUrl || null,
      costume_photo: reg.costumePhoto || null,
      recommender_name: reg.recommenderName || '',
      guest_title: reg.guestTitle || '',
      updated_at: new Date().toISOString()
    };

    const { error } = await client
      .from('registrations')
      .upsert(payload, { onConflict: 'ticket_no' });

    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('upsertRegistrationToCloud error:', err);
    return false;
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

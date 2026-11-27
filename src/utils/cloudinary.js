/**
 * Cloudinary Upload Utility for Triple T Form & SME FAN
 * Supports direct client-side upload via Unsigned Upload Preset
 */

const STORAGE_KEY_CLOUDINARY = 'sme_fan_cloudinary_config_v1';

export function getCloudinaryConfig(overrideConfig = {}) {
  let stored = {};
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CLOUDINARY);
    if (saved) stored = JSON.parse(saved);
  } catch (e) {}

  const envCloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dx2asgfo7';
  const envPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'sme_fan_uploads';
  const envFolder = import.meta.env.VITE_CLOUDINARY_FOLDER || 'triple_t_forms/sme_fan_2026';

  return {
    cloudName: overrideConfig.cloudName || stored.cloudName || envCloudName,
    uploadPreset: overrideConfig.uploadPreset || stored.uploadPreset || envPreset,
    folderPrefix: overrideConfig.folderPrefix || stored.folderPrefix || envFolder
  };
}

export function saveCloudinaryConfig(cloudName, uploadPreset, folderPrefix) {
  try {
    localStorage.setItem(STORAGE_KEY_CLOUDINARY, JSON.stringify({
      cloudName: (cloudName || '').trim(),
      uploadPreset: (uploadPreset || '').trim(),
      folderPrefix: (folderPrefix || 'triple_t_forms/sme_fan_2026').trim()
    }));
  } catch (e) {
    console.error('Error saving Cloudinary config:', e);
  }
}

export function isCloudinaryConfigured() {
  const config = getCloudinaryConfig();
  return Boolean(config.cloudName && config.uploadPreset);
}

export async function uploadToCloudinaryWithMeta(fileOrDataUrl, config = {}, customSubfolder = "slips") {
  const effectiveConfig = getCloudinaryConfig(config);
  const { cloudName, uploadPreset, folderPrefix } = effectiveConfig;

  const fallbackLocal = async () => {
    if (typeof fileOrDataUrl === 'string') return { url: fileOrDataUrl, deleteToken: null, publicId: null };
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(fileOrDataUrl);
    });
    return { url: dataUrl, deleteToken: null, publicId: null };
  };

  if (!cloudName || !uploadPreset) {
    console.log("Cloudinary not configured; storing image locally as Data URL");
    return fallbackLocal();
  }

  try {
    const targetFolder = `${folderPrefix}/${customSubfolder}`.replace(/\/+/g, '/');
    const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    const formData = new FormData();
    formData.append("file", fileOrDataUrl);
    formData.append("upload_preset", uploadPreset);
    formData.append("folder", targetFolder);

    const response = await fetch(endpoint, {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Cloudinary upload failed with status ${response.status}`);
    }

    const data = await response.json();
    return {
      url: data.secure_url || data.url,
      deleteToken: data.delete_token || null,
      publicId: data.public_id || null
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    return fallbackLocal();
  }
}

export async function deleteCloudinaryByToken(deleteToken, config = {}) {
  if (!deleteToken) return false;
  const { cloudName } = getCloudinaryConfig(config);
  if (!cloudName) return false;
  try {
    const formData = new FormData();
    formData.append("token", deleteToken);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/delete_by_token`, {
      method: "POST",
      body: formData
    });
    return res.ok;
  } catch (err) {
    console.warn("deleteCloudinaryByToken warning:", err);
    return false;
  }
}

export async function uploadToCloudinary(fileOrDataUrl, config = {}, customSubfolder = "slips") {
  const result = await uploadToCloudinaryWithMeta(fileOrDataUrl, config, customSubfolder);
  return result.url;
}

// Test Cloudinary connection using a 1x1 transparent pixel
export async function testCloudinaryConnection(config = {}) {
  const { cloudName, uploadPreset } = getCloudinaryConfig(config);
  if (!cloudName || !uploadPreset) {
    return {
      success: false,
      message: 'กรุณาระบุ Cloud Name และ Upload Preset ให้ครบถ้วนครับ'
    };
  }

  try {
    const tinyPixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    const resultUrl = await uploadToCloudinary(tinyPixel, { cloudName, uploadPreset }, "test");
    if (resultUrl && resultUrl.startsWith('http')) {
      return {
        success: true,
        url: resultUrl,
        message: `เชื่อมต่อ Cloudinary สำเร็จ 100%! (Cloud: ${cloudName})`
      };
    }
    return {
      success: false,
      message: 'ไม่สามารถอัปโหลดไฟล์ทดสอบไปยัง Cloudinary ได้ครับ'
    };
  } catch (err) {
    return {
      success: false,
      message: `เกิดข้อผิดพลาด: ${err.message}`
    };
  }
}


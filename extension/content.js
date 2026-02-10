// Content Script for 115 Offline Helper
// Only handles link detection on web pages. UI is in popup.html.

const CONFIG_KEYS = {
  SAVE_PATH: 'push115_save_path',
  SAVE_PATH_CID: 'push115_save_path_cid',
  AUTO_DELETE_SMALL: 'push115_auto_delete_small',
  DELETE_SIZE_THRESHOLD: 'push115_delete_size_threshold',
  AUTO_ORGANIZE: 'push115_auto_organize',
  I18N_LOCALE: 'push115_i18n_locale',
  THEME: 'push115_theme',
  MATCH_DOMAINS: 'push115_match_domains',
};

const DEFAULT_CONFIG = {
  [CONFIG_KEYS.SAVE_PATH]: '',
  [CONFIG_KEYS.SAVE_PATH_CID]: '0',
  [CONFIG_KEYS.AUTO_DELETE_SMALL]: false,
  [CONFIG_KEYS.DELETE_SIZE_THRESHOLD]: 100,
  [CONFIG_KEYS.AUTO_ORGANIZE]: false,
  [CONFIG_KEYS.I18N_LOCALE]: 'zh-CN',
  [CONFIG_KEYS.THEME]: 'auto',
  [CONFIG_KEYS.MATCH_DOMAINS]: '',
};

const I18N_STRINGS = {
  'zh-CN': {
    modal_title: '发现磁力/ED2K 链接',
    modal_detect: '检测到',
    modal_link_type: '链接',
    modal_path: '保存路径:',
    modal_cancel: '取消',
    modal_confirm: '推送到 115',
    pushing: '推送中...',
    push_success: '✅ 推送成功！',
    push_fail: '❌ 推送失败: ',
    panel_title: '115离线下载助手',
  },
  'en-US': {
    modal_title: 'Magnet/ED2K Link Detected',
    modal_detect: 'Detected',
    modal_link_type: 'Link',
    modal_path: 'Save Path:',
    modal_cancel: 'Cancel',
    modal_confirm: 'Push to 115',
    pushing: 'Pushing...',
    push_success: '✅ Push success!',
    push_fail: '❌ Push failed: ',
    panel_title: '115 Offline Helper',
  },
};

let configCache = { ...DEFAULT_CONFIG };

function t(key) {
  const locale = configCache[CONFIG_KEYS.I18N_LOCALE] || 'zh-CN';
  const strings = I18N_STRINGS[locale] || I18N_STRINGS['zh-CN'];
  return strings[key] || key;
}

function sendMessage(action, details = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action, details }, response => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else if (response && response.success) {
        resolve(response);
      } else {
        reject(new Error(response?.error || 'Unknown error'));
      }
    });
  });
}

function getConfig(key) {
  return configCache[key];
}

// Inject modal styles
function injectModalStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .push115-modal-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.4);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      z-index: 2147483647;
      display: flex; align-items: center; justify-content: center;
      animation: push115Fade 0.2s ease;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
    }
    @keyframes push115Fade { from { opacity: 0; } to { opacity: 1; } }
    .push115-modal {
      background: #fff; border-radius: 16px;
      width: 400px; max-width: 90vw;
      box-shadow: 0 20px 60px rgba(0,0,0,0.2);
      animation: push115Slide 0.25s cubic-bezier(0.4,0,0.2,1);
      overflow: hidden;
    }
    @keyframes push115Slide {
      from { opacity: 0; transform: scale(0.95) translateY(8px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    .push115-modal-header {
      padding: 16px 20px;
      border-bottom: 1px solid rgba(0,0,0,0.06);
      background: #fafafa;
    }
    .push115-modal-title {
      font-size: 16px; font-weight: 600; color: #1d1d1f; margin: 0;
    }
    .push115-modal-body { padding: 16px 20px; }
    .push115-modal-info {
      font-size: 13px; color: #86868b; margin-bottom: 8px;
    }
    .push115-modal-link {
      background: #f5f5f7; padding: 10px 12px; border-radius: 8px;
      word-break: break-all; font-size: 11px; color: #1d1d1f;
      max-height: 60px; overflow-y: auto; margin-bottom: 12px;
      font-family: 'SF Mono', Monaco, monospace;
    }
    .push115-modal-footer {
      padding: 14px 20px; display: flex; gap: 10px;
      justify-content: flex-end; background: #fafafa;
    }
    .push115-modal-btn {
      padding: 8px 20px; border: none; border-radius: 8px;
      font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s;
    }
    .push115-modal-btn-cancel {
      background: rgba(0,0,0,0.05); color: #007AFF;
    }
    .push115-modal-btn-cancel:hover { background: rgba(0,0,0,0.08); }
    .push115-modal-btn-confirm {
      background: #007AFF; color: #fff;
    }
    .push115-modal-btn-confirm:hover { background: #0066d6; }
    .push115-modal-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .push115-toast {
      position: fixed; top: 16px; right: 16px;
      padding: 12px 20px; border-radius: 10px;
      font-size: 13px; font-weight: 500; z-index: 2147483647;
      box-shadow: 0 4px 16px rgba(0,0,0,0.12);
      animation: push115Slide 0.2s ease;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", Arial, sans-serif;
    }
    .push115-toast.success { background: #34c759; color: #fff; }
    .push115-toast.error { background: #ff3b30; color: #fff; }
  `;
  document.head.appendChild(style);
}

function showToast(type, msg, timeout = 3000) {
  const existing = document.querySelector('.push115-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = `push115-toast ${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  if (timeout) setTimeout(() => toast.remove(), timeout);
}

function createConfirmModal(url, type) {
  const existing = document.getElementById('push115-modal-overlay');
  if (existing) existing.remove();

  const cid = getConfig(CONFIG_KEYS.SAVE_PATH_CID);
  const savePath = getConfig(CONFIG_KEYS.SAVE_PATH) || (cid === '0' ? 'Root' : `CID:${cid}`);

  const overlay = document.createElement('div');
  overlay.className = 'push115-modal-overlay';
  overlay.id = 'push115-modal-overlay';
  overlay.innerHTML = `
    <div class="push115-modal">
      <div class="push115-modal-header">
        <h3 class="push115-modal-title">${t('modal_title')}</h3>
      </div>
      <div class="push115-modal-body">
        <div class="push115-modal-info">${t('modal_detect')} <strong>${type}</strong> ${t('modal_link_type')}</div>
        <div class="push115-modal-link">${url}</div>
        <div class="push115-modal-info">${t('modal_path')} <strong>${savePath}</strong></div>
      </div>
      <div class="push115-modal-footer">
        <button class="push115-modal-btn push115-modal-btn-cancel" id="push115-modal-cancel">${t('modal_cancel')}</button>
        <button class="push115-modal-btn push115-modal-btn-confirm" id="push115-modal-confirm">${t('modal_confirm')}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById('push115-modal-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  document.getElementById('push115-modal-confirm').addEventListener('click', async () => {
    const btn = document.getElementById('push115-modal-confirm');
    btn.disabled = true;
    btn.textContent = t('pushing');

    try {
      // Get UID
      const userRes = await sendMessage('API_REQUEST', {
        url: 'https://my.115.com/?ct=ajax&ac=nav', method: 'GET'
      });
      const uid = userRes.data?.data?.user_id;

      // Get Sign
      const tokenRes = await sendMessage('API_REQUEST', {
        url: 'https://115.com/?ct=offline&ac=space', method: 'GET'
      });
      const sign = tokenRes.data?.sign;
      const time = tokenRes.data?.time;

      const savePathCid = getConfig(CONFIG_KEYS.SAVE_PATH_CID) || '0';

      const res = await sendMessage('API_REQUEST', {
        url: 'https://115.com/web/lixian/?ct=lixian&ac=add_task_url',
        method: 'POST',
        data: { url, uid, sign, time, wp_path_id: savePathCid },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      if (res.data && res.data.state) {
        overlay.remove();
        showToast('success', t('push_success'));
      } else {
        throw new Error(res.data?.error_msg || 'Unknown error');
      }
    } catch (e) {
      btn.disabled = false;
      btn.textContent = t('modal_confirm');
      showToast('error', t('push_fail') + e.message);
    }
  });
}

async function init() {
  // Load config
  const items = await chrome.storage.local.get(null);
  configCache = { ...DEFAULT_CONFIG, ...items };

  // Domain check
  const matchDomains = getConfig(CONFIG_KEYS.MATCH_DOMAINS);
  if (matchDomains) {
    const domains = matchDomains.split('\n').filter(d => d.trim());
    if (domains.length > 0) {
      const hostname = window.location.hostname;
      if (!domains.some(d => hostname.includes(d.trim()))) {
        return; // Don't activate on this domain
      }
    }
  }

  // Inject styles for modals
  injectModalStyles();

  // Link click listener
  document.addEventListener('click', e => {
    const link = e.target.closest('a');
    if (!link) return;

    const href = link.href;
    if (href && href.startsWith('magnet:')) {
      e.preventDefault();
      createConfirmModal(href, 'Magnet');
    } else if (href && href.startsWith('ed2k://')) {
      e.preventDefault();
      createConfirmModal(href, 'ED2K');
    }
  });
}

init();

// Popup Script for 115 Offline Helper

// Config Keys
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
    panel_title: '115离线下载助手',
    tab_home: '主页',
    tab_settings: '设置',
    save_path_label: '默认保存路径 (CID):',
    save_path_placeholder: '例如: 0或22987888062956554',
    cid_hint: '提示: 直接填写CID，或填写 "文件夹名:CID" 格式。根目录CID为0',
    auto_delete_label: '自动删除小文件',
    delete_size_label_pre: '删除小于',
    delete_size_label_post: 'MB的文件',
    auto_organize_label: '自动整理视频文件夹',
    organize_hint: '自动将散乱的视频文件整理到同名文件夹中',
    check_login_text: '检查115登录状态',
    login_btn: '扫码登录115',
    login_success: '115账号已登录',
    login_fail: '未登录，请先登录115',
    processing: '处理中...',
    settings_language_label: '语言 / Language',
    settings_theme_label: '主题 / Theme',
    theme_auto: '跟随系统',
    theme_light: '浅色',
    theme_dark: '深色',
    settings_domains_label: '启用域名 (一行一个)',
    domains_placeholder: '不填则在所有页面显示面板',
    domains_hint: '支持域名匹配，不包含协议 (http/https)',
  },
  'en-US': {
    panel_title: '115 Offline Helper',
    tab_home: 'Home',
    tab_settings: 'Settings',
    save_path_label: 'Default Save Path (CID):',
    save_path_placeholder: 'e.g., 0 or 22987888062956554',
    cid_hint: 'Tip: Enter CID directly, or "FolderName:CID". Root CID is 0',
    auto_delete_label: 'Auto delete small files',
    delete_size_label_pre: 'Delete files <',
    delete_size_label_post: 'MB',
    auto_organize_label: 'Auto organize video folders',
    organize_hint: 'Automatically organize scattered video files into folders',
    check_login_text: 'Check 115 Status',
    login_btn: 'Scan QR Login',
    login_success: '115 is logged in',
    login_fail: 'Not logged in, please login first',
    processing: 'Processing...',
    settings_language_label: 'Language',
    settings_theme_label: 'Theme',
    theme_auto: 'System',
    theme_light: 'Light',
    theme_dark: 'Dark',
    settings_domains_label: 'Enabled Domains (One per line)',
    domains_placeholder: 'Empty = show on all pages',
    domains_hint: 'Supports domain matching, exclude protocol (http/https)',
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

function setConfig(key, value) {
  configCache[key] = value;
  chrome.storage.local.set({ [key]: value });
}

function showStatus(type, msg, timeout = 3000) {
  const area = document.getElementById('push115-status-area');
  area.innerHTML = `<div class="push115-status ${type}">${msg}</div>`;
  if (timeout) {
    setTimeout(() => area.innerHTML = '', timeout);
  }
}

function applyTheme(theme) {
  document.body.classList.remove('dark-theme');
  if (theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.body.classList.add('dark-theme');
  }
}

function applyLocale() {
  // Update all text elements
  document.getElementById('push115-title').textContent = t('panel_title');
  document.querySelector('[data-tab="home"]').textContent = t('tab_home');
  document.querySelector('[data-tab="settings"]').textContent = t('tab_settings');
  document.getElementById('label-save-path').textContent = t('save_path_label');
  document.getElementById('push115-path-combo').placeholder = t('save_path_placeholder');
  document.getElementById('hint-cid').textContent = t('cid_hint');
  document.getElementById('label-auto-delete').textContent = t('auto_delete_label');
  document.getElementById('label-delete-pre').textContent = t('delete_size_label_pre');
  document.getElementById('label-delete-post').textContent = t('delete_size_label_post');
  document.getElementById('label-auto-organize').textContent = t('auto_organize_label');
  document.getElementById('hint-organize').textContent = t('organize_hint');
  document.getElementById('push115-check-login').textContent = t('check_login_text');
  document.getElementById('push115-login-btn').textContent = t('login_btn');
}

async function init() {
  // Load config
  const items = await chrome.storage.local.get(null);
  configCache = { ...DEFAULT_CONFIG, ...items };

  // Apply theme & locale
  applyTheme(getConfig(CONFIG_KEYS.THEME));
  applyLocale();

  // Fill in saved values
  const savedPath = getConfig(CONFIG_KEYS.SAVE_PATH);
  const savedCid = getConfig(CONFIG_KEYS.SAVE_PATH_CID);
  if (savedPath && savedCid && savedCid !== '0') {
    document.getElementById('push115-path-combo').value = `${savedPath}:${savedCid}`;
  } else if (savedCid && savedCid !== '0') {
    document.getElementById('push115-path-combo').value = savedCid;
  }

  document.getElementById('push115-auto-organize').checked = getConfig(CONFIG_KEYS.AUTO_ORGANIZE);
  document.getElementById('push115-auto-delete').checked = getConfig(CONFIG_KEYS.AUTO_DELETE_SMALL);
  document.getElementById('push115-delete-size').value = getConfig(CONFIG_KEYS.DELETE_SIZE_THRESHOLD);
  document.getElementById('push115-language-select').value = getConfig(CONFIG_KEYS.I18N_LOCALE);
  document.getElementById('push115-theme-select').value = getConfig(CONFIG_KEYS.THEME);
  document.getElementById('push115-domains-input').value = getConfig(CONFIG_KEYS.MATCH_DOMAINS);

  if (getConfig(CONFIG_KEYS.AUTO_DELETE_SMALL)) {
    document.getElementById('push115-delete-section').style.display = 'block';
  }

  // Bind events
  bindEvents();
}

function bindEvents() {
  // Tab switching
  document.querySelectorAll('.push115-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.push115-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.push115-tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`push115-tab-${tab.dataset.tab}`).classList.add('active');
    });
  });

  // Theme
  document.getElementById('push115-theme-select').addEventListener('change', e => {
    setConfig(CONFIG_KEYS.THEME, e.target.value);
    applyTheme(e.target.value);
  });

  // Language
  document.getElementById('push115-language-select').addEventListener('change', e => {
    setConfig(CONFIG_KEYS.I18N_LOCALE, e.target.value);
    applyLocale();
  });

  // Domain config
  document.getElementById('push115-domains-input').addEventListener('change', e => {
    setConfig(CONFIG_KEYS.MATCH_DOMAINS, e.target.value);
  });

  // Auto organize
  document.getElementById('push115-auto-organize').addEventListener('change', e => {
    setConfig(CONFIG_KEYS.AUTO_ORGANIZE, e.target.checked);
  });

  // Auto delete
  document.getElementById('push115-auto-delete').addEventListener('change', e => {
    setConfig(CONFIG_KEYS.AUTO_DELETE_SMALL, e.target.checked);
    document.getElementById('push115-delete-section').style.display = e.target.checked ? 'block' : 'none';
  });

  document.getElementById('push115-delete-size').addEventListener('change', e => {
    setConfig(CONFIG_KEYS.DELETE_SIZE_THRESHOLD, e.target.value);
  });

  // Path
  document.getElementById('push115-path-combo').addEventListener('change', e => {
    const val = e.target.value;
    if (val.includes(':')) {
      const parts = val.split(':');
      setConfig(CONFIG_KEYS.SAVE_PATH, parts[0]);
      setConfig(CONFIG_KEYS.SAVE_PATH_CID, parts[1]);
    } else {
      setConfig(CONFIG_KEYS.SAVE_PATH, '');
      setConfig(CONFIG_KEYS.SAVE_PATH_CID, val || '0');
    }
  });

  // Check Login
  document.getElementById('push115-check-login').addEventListener('click', async () => {
    const btn = document.getElementById('push115-check-login');
    btn.disabled = true;
    btn.textContent = t('processing');
    try {
      const response = await sendMessage('API_REQUEST', {
        url: 'https://webapi.115.com/files?cid=0&limit=1',
        method: 'GET'
      });
      const isLogin = response.data && response.data.state;
      showStatus(isLogin ? 'success' : 'error', isLogin ? t('login_success') : t('login_fail'));
    } catch (e) {
      showStatus('error', t('login_fail'));
    }
    btn.disabled = false;
    btn.textContent = t('check_login_text');
  });

  // Login Button
  document.getElementById('push115-login-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://115.com/?tab=login' });
  });
}

// Start
document.addEventListener('DOMContentLoaded', init);

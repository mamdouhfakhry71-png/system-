const { app, BrowserWindow, shell, Menu, session, ipcMain, dialog } = require('electron');
const fs = require('fs');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
const path = require('path');
// أجهزة ويندوز 7 القديمة: إيقاف تسريع الكرت لتفادي الشاشة البيضاء
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');
// سجل أخطاء لو التطبيق وقع على ويندوز 7
process.on('uncaughtException',e=>{try{require('fs').appendFileSync(path.join(app.getPath('userData'),'error.log'),new Date().toISOString()+' '+(e&&e.stack||e)+'\n')}catch(_){}});

function createWindow() {
  Menu.setApplicationMenu(null);
  const w = new BrowserWindow({
    width: 1200, height: 800, minWidth: 420, autoHideMenuBar: true, title: 'نظام محل الإكسسوارات', show: false, backgroundColor: '#edf0f6',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, preload: path.join(__dirname, 'preload.js') }
  });
  w.once('ready-to-show',()=>w.show());
  setTimeout(()=>{if(!w.isVisible())w.show()},4000);
  w.loadFile(path.join(__dirname, 'index.html'));
  // روابط الواتساب تتفتح في المتصفح/تطبيق الواتساب، وأي حاجة تانية تتمنع
  w.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  w.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file://')) e.preventDefault(); });
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.whenReady().then(() => {
    session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(perm === 'media'));
    createWindow();
  });
  app.on('window-all-closed', () => app.quit());
}

// حفظ الصفحة الحالية (الفاتورة) كملف PDF — شغال على ويندوز 7 بدون أي برنامج إضافي
ipcMain.handle('pdf', async (e, o) => {
  try {
    const win = BrowserWindow.fromWebContents(e.sender);
    const buf = await e.sender.printToPDF({ printBackground: true, preferCSSPageSize: true });
    const safe = String(o && o.name || 'invoice').replace(/[\\/:*?"<>|]/g, '-');
    const r = await dialog.showSaveDialog(win, { defaultPath: path.join(app.getPath('documents'), safe + '.pdf'), filters: [{ name: 'PDF', extensions: ['pdf'] }] });
    if (r.canceled || !r.filePath) return { ok: false, why: 'cancel' };
    fs.writeFileSync(r.filePath, buf);
    shell.openPath(r.filePath);
    return { ok: true };
  } catch (err) { return { ok: false, why: String(err && err.message || err) }; }
});
// طباعة على أي طابعة (عادية أو رول فواتير)
ipcMain.handle('print', (e, o) => new Promise(res => {
  const opt = { silent: !!o.silent, printBackground: true, margins: { marginType: o.roll ? 'none' : 'default' } };
  if (o.printer) opt.deviceName = o.printer;
  if (o.roll) opt.pageSize = { width: Math.round(o.w * 1000), height: Math.round(o.h * 1000) };
  try { e.sender.print(opt, (ok, why) => res({ ok, why })); } catch (err) { res({ ok: false, why: String(err.message || err) }); }
}));
ipcMain.handle('printers', async e => {
  try { return (await e.sender.getPrintersAsync()).map(p => ({ name: p.name, label: p.displayName || p.name, def: !!p.isDefault })); } catch (_) { return []; }
});

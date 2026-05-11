import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions/StringSession';
import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'tg_session';
const API_ID_KEY = 'tg_api_id';
const API_HASH_KEY = 'tg_api_hash';

export interface FileMetadata {
  id: number;
  folderId: number | null;
  name: string;
  size: number;
  sizeStr: string;
  mimeType?: string;
  fileExt?: string;
  createdAt: string;
  iconType: string;
}

export interface FolderMetadata {
  id: number;
  name: string;
  parentId?: number;
}

class TelegramService {
  private client: TelegramClient | null = null;
  private _apiId: number = 0;
  private _apiHash: string = '';
  private _isConnected: boolean = false;

  get isConnected() { return this._isConnected; }

  async saveCredentials(apiId: string, apiHash: string) {
    await SecureStore.setItemAsync(API_ID_KEY, apiId);
    await SecureStore.setItemAsync(API_HASH_KEY, apiHash);
  }

  async loadCredentials() {
    const apiId = await SecureStore.getItemAsync(API_ID_KEY);
    const apiHash = await SecureStore.getItemAsync(API_HASH_KEY);
    return apiId && apiHash ? { apiId, apiHash } : null;
  }

  async saveSession() {
    if (this.client) {
      const session = (this.client.session as StringSession).save();
      await SecureStore.setItemAsync(SESSION_KEY, session);
    }
  }

  async loadSession() { return (await SecureStore.getItemAsync(SESSION_KEY)) || ''; }

  async initialize(apiId: number, apiHash: string): Promise<void> {
    this._apiId = apiId;
    this._apiHash = apiHash;
    const sessionStr = await this.loadSession();
    const session = new StringSession(sessionStr);
    this.client = new TelegramClient(session, apiId, apiHash, {
      connectionRetries: 5,
      useWSS: true,
    });
    await this.client.connect();
    this._isConnected = true;
  }

  async isAuthorized(): Promise<boolean> {
    if (!this.client) return false;
    try { await this.client.getMe(); return true; } catch { return false; }
  }

  async sendCode(phone: string) {
    if (!this.client) throw new Error('Client not initialized');
    const res = await this.client.sendCode({ apiId: this._apiId, apiHash: this._apiHash }, phone);
    return { phoneCodeHash: res.phoneCodeHash };
  }

  async signIn(phone: string, code: string, phoneCodeHash: string) {
    if (!this.client) throw new Error('Client not initialized');
    try {
      await this.client.invoke(new Api.auth.SignIn({ phoneNumber: phone, phoneCodeHash, phoneCode: code }));
      await this.saveSession();
      return { needsPassword: false };
    } catch (e: any) {
      if (e.errorMessage === 'SESSION_PASSWORD_NEEDED') return { needsPassword: true };
      throw e;
    }
  }

  async checkPassword(password: string) {
    if (!this.client) throw new Error('Client not initialized');
    const { computeCheck } = require('telegram/Password');
    const pwdData = await this.client.invoke(new Api.account.GetPassword());
    const check = await computeCheck(pwdData, password);
    await this.client.invoke(new Api.auth.CheckPassword({ password: check }));
    await this.saveSession();
  }

  async getUserInfo() {
    if (!this.client) throw new Error('Client not initialized');
    const me = await this.client.getMe() as Api.User;
    return {
      id: me.id.toJSNumber ? me.id.toJSNumber() : Number(me.id),
      firstName: me.firstName || '',
      lastName: me.lastName || undefined,
      username: me.username || undefined,
    };
  }

  async getProfilePhoto() {
    if (!this.client) throw new Error('Client not initialized');
    const me = await this.client.getMe() as Api.User;
    if (!me.photo) return null;
    try {
      const buffer = await this.client.downloadProfilePhoto(me);
      return `data:image/jpeg;base64,${Buffer.from(buffer).toString('base64')}`;
    } catch { return null; }
  }

  async logout() {
    if (this.client) {
      try { await this.client.invoke(new Api.auth.LogOut()); } catch {}
      this.client.disconnect();
    }
    this.client = null;
    this._isConnected = false;
    await SecureStore.deleteItemAsync(SESSION_KEY);
  }

  async scanFolders(): Promise<FolderMetadata[]> {
    if (!this.client) throw new Error('Client not initialized');
    const folders: FolderMetadata[] = [];
    const dialogs = await this.client.getDialogs({ limit: 100 });
    for (const d of dialogs) {
      const entity = d.entity;
      if (entity && (entity.className === 'Channel' || entity.className === 'Chat')) {
        const chan = entity as any;
        const title = chan.title || '';
        if (title.toLowerCase().includes('[td]')) {
          let parentId: number | undefined;
          try {
            const full = await this.client.invoke(new Api.channels.GetFullChannel({ channel: chan }));
            const about = (full as any).fullChat?.about || (full as any).about || '';
            const match = about.match(/parent_id:(-?\d+)/);
            if (match) parentId = Number(match[1]);
          } catch {}
          folders.push({
            id: chan.id.toJSNumber ? chan.id.toJSNumber() : Number(chan.id),
            name: title.replace(/ \[TD\]/gi, '').replace(/\[TD\]/gi, '').trim(),
            parentId
          });
        }
      }
    }
    return folders;
  }

  async getFiles(folderId: number | null): Promise<FileMetadata[]> {
    if (!this.client) throw new Error('Client not initialized');
    const peer = folderId ? await this._resolvePeer(folderId) : 'me';
    const messages = await this.client.getMessages(peer, { limit: 100 });
    const files: FileMetadata[] = [];
    for (const msg of messages) {
      if (msg.media) {
        let name = 'Unknown', size = 0, mime: string | undefined, ext: string | undefined;
        if (msg.media instanceof Api.MessageMediaDocument && msg.media.document instanceof Api.Document) {
          const doc = msg.media.document;
          size = Number(doc.size);
          mime = doc.mimeType;
          const fn = doc.attributes.find((a: any) => a.className === 'DocumentAttributeFilename') as any;
          name = fn?.fileName || 'file';
          const dot = name.lastIndexOf('.');
          ext = dot > -1 ? name.slice(dot + 1) : undefined;
        } else if (msg.media instanceof Api.MessageMediaPhoto) {
          name = 'Photo.jpg'; mime = 'image/jpeg'; ext = 'jpg';
        }
        files.push({
          id: msg.id, folderId, name, size, sizeStr: this._formatBytes(size),
          mimeType: mime, fileExt: ext, createdAt: msg.date ? new Date(msg.date * 1000).toISOString() : '',
          iconType: 'file'
        });
      }
    }
    return files;
  }

  async uploadFile(uri: string, folderId: number | null, onProgress?: (p: number) => void) {
    if (!this.client) throw new Error('Client not initialized');
    const { readAsStringAsync } = require('expo-file-system');
    const base64 = await readAsStringAsync(uri, { encoding: 'base64' });
    const buffer = Buffer.from(base64, 'base64');
    const peer = folderId ? await this._resolvePeer(folderId) : 'me';
    await this.client.sendFile(peer, {
      file: buffer,
      fileName: uri.split('/').pop() || 'file',
      workers: 1,
      progressCallback: onProgress ? (p: number) => onProgress(Math.round(p * 100)) : undefined
    });
  }

  async downloadFile(messageId: number, folderId: number | null, onProgress?: (p: number) => void): Promise<Buffer> {
    if (!this.client) throw new Error('Client not initialized');
    const peer = folderId ? await this._resolvePeer(folderId) : 'me';
    const msgs = await this.client.getMessages(peer, { ids: [messageId] });
    if (!msgs.length || !msgs[0].media) throw new Error('File not found');
    const buffer = await this.client.downloadMedia(msgs[0].media, {
      workers: 1,
      progressCallback: onProgress ? (p: number) => onProgress(Math.round(p * 100)) : undefined
    });
    return Buffer.from(buffer as Uint8Array);
  }

  async createFolder(name: string) {
    if (!this.client) throw new Error('Client not initialized');
    const res = await this.client.invoke(new Api.channels.CreateChannel({ broadcast: true, title: `${name} [TD]`, about: 'Telegram Drive Storage Folder\n[telegram-drive-folder]' }));
    const chat = (res as any).chats[0] as Api.Channel;
    return { id: chat.id.toJSNumber ? chat.id.toJSNumber() : Number(chat.id), name };
  }

  async deleteFolder(id: number) {
    if (!this.client) throw new Error('Client not initialized');
    const peer = await this._resolvePeer(id);
    await this.client.invoke(new Api.channels.DeleteChannel({ channel: peer }));
  }

  async renameFolder(id: number, name: string) {
    if (!this.client) throw new Error('Client not initialized');
    const peer = await this._resolvePeer(id);
    await this.client.invoke(new Api.channels.EditTitle({ channel: peer, title: `${name} [TD]` }));
  }

  async getFolderProperties(id: number) {
    if (!this.client) throw new Error('Client not initialized');
    const peer = await this._resolvePeer(id);
    const msgs = await this.client.getMessages(peer, { limit: 1000 });
    let count = 0, size = 0, date = 0;
    for (const m of msgs) {
      if (m.media) {
        count++;
        if (m.media instanceof Api.MessageMediaDocument && m.media.document instanceof Api.Document) size += Number(m.media.document.size);
      }
      if (m.date && (date === 0 || m.date < date)) date = m.date;
    }
    return { file_count: count, total_size: size, created_at: date ? new Date(date * 1000).toISOString() : 'N/A' };
  }

  async deleteFile(id: number, folderId: number | null) {
    if (!this.client) throw new Error('Client not initialized');
    const peer = folderId ? await this._resolvePeer(folderId) : 'me';
    await this.client.deleteMessages(peer, [id], { revoke: true });
  }

  async searchGlobal(query: string): Promise<FileMetadata[]> {
    if (!this.client) throw new Error('Client not initialized');
    const res = await this.client.invoke(new Api.messages.SearchGlobal({ q: query, filter: new Api.InputMessagesFilterDocument(), minDate: 0, maxDate: 0, offsetRate: 0, offsetPeer: new Api.InputPeerEmpty(), offsetId: 0, limit: 50 }));
    const files: FileMetadata[] = [];
    const msgs = (res as any).messages || [];
    for (const msg of msgs) {
      if (msg.media?.document) {
        const doc = msg.media.document;
        const fn = doc.attributes?.find((a: any) => a.className === 'DocumentAttributeFilename') as any;
        const name = fn?.fileName || 'file';
        const size = Number(doc.size || 0);
        files.push({ id: msg.id, folderId: null, name, size, sizeStr: this._formatBytes(size), mimeType: doc.mimeType, createdAt: msg.date ? new Date(msg.date * 1000).toISOString() : '', iconType: 'file' });
      }
    }
    return files;
  }

  async moveItems(ids: number[], fids: number[], source: number | null, target: number | null) {
    if (!this.client) throw new Error('Client not initialized');
    if (ids.length > 0 && source !== target) {
      const sPeer = source ? await this._resolvePeer(source) : 'me', tPeer = target ? await this._resolvePeer(target) : 'me';
      await this.client.forwardMessages(tPeer, { messages: ids, fromPeer: sPeer });
      await this.client.deleteMessages(sPeer, ids, { revoke: true });
    }
    for (const fid of fids) {
      const peer = await this._resolvePeer(fid);
      const full = await this.client.invoke(new Api.channels.GetFullChannel({ channel: peer }));
      const lines = ((full as any).fullChat?.about || '').split('\n').filter((l: string) => !l.startsWith('parent_id:'));
      if (target !== null) lines.push(`parent_id:${target}`);
      await this.client.invoke(new Api.messages.EditChatAbout({ peer, about: lines.join('\n') }));
    }
  }

  async copyItems(ids: number[], fids: number[], source: number | null, target: number | null) {
    if (!this.client) throw new Error('Client not initialized');
    if (ids.length > 0 && source !== target) {
      const sPeer = source ? await this._resolvePeer(source) : 'me', tPeer = target ? await this._resolvePeer(target) : 'me';
      await this.client.forwardMessages(tPeer, { messages: ids, fromPeer: sPeer });
    }
    for (const fid of fids) {
      const sPeer = await this._resolvePeer(fid);
      const full = await this.client.invoke(new Api.channels.GetFullChannel({ channel: sPeer }));
      const chat = (full as any).chats[0] as Api.Channel;
      const newF = await this.createFolder(`${chat.title.replace(' [TD]', '')} (Copy)`);
      if (target !== null) {
        const nPeer = await this._resolvePeer(newF.id);
        await this.client.invoke(new Api.messages.EditChatAbout({ peer: nPeer, about: `Telegram Drive Folder\nparent_id:${target}` }));
      }
      const msgs = await this.client.getMessages(sPeer, { limit: 100 });
      const mIds = msgs.filter(m => m.media).map(m => m.id);
      if (mIds.length > 0) await this.client.forwardMessages(await this._resolvePeer(newF.id), { messages: mIds, fromPeer: sPeer });
    }
  }

  private async _resolvePeer(fid: number): Promise<Api.TypeInputPeer> {
    if (!this.client) throw new Error('Client not initialized');
    const dialogs = await this.client.getDialogs({ limit: 100 });
    for (const d of dialogs) {
      const entity = d.entity;
      if (entity && 'id' in entity) {
        const id = (entity.id as any).toJSNumber ? (entity.id as any).toJSNumber() : Number(entity.id);
        if (id === fid) return await this.client.getInputEntity(entity);
      }
    }
    throw new Error('Peer not found');
  }

  private _formatBytes(b: number) {
    if (b === 0) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB'], i = Math.floor(Math.log(b) / Math.log(k));
    return parseFloat((b / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}

export const telegramService = new TelegramService();

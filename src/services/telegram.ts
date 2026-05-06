import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions/StringSession';
import { computeCheck } from 'telegram/Password';
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

  get isConnected() {
    return this._isConnected;
  }

  async saveCredentials(apiId: string, apiHash: string) {
    await SecureStore.setItemAsync(API_ID_KEY, apiId);
    await SecureStore.setItemAsync(API_HASH_KEY, apiHash);
  }

  async loadCredentials(): Promise<{ apiId: string; apiHash: string } | null> {
    const apiId = await SecureStore.getItemAsync(API_ID_KEY);
    const apiHash = await SecureStore.getItemAsync(API_HASH_KEY);
    if (apiId && apiHash) return { apiId, apiHash };
    return null;
  }

  async saveSession() {
    if (this.client) {
      const session = (this.client.session as StringSession).save();
      await SecureStore.setItemAsync(SESSION_KEY, session);
    }
  }

  async loadSession(): Promise<string> {
    return (await SecureStore.getItemAsync(SESSION_KEY)) || '';
  }

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
    try {
      await this.client.getMe();
      return true;
    } catch {
      return false;
    }
  }

  async sendCode(phone: string): Promise<{ phoneCodeHash: string }> {
    if (!this.client) throw new Error('Client not initialized');
    const result = await this.client.sendCode(
      { apiId: this._apiId, apiHash: this._apiHash },
      phone
    );
    return { phoneCodeHash: result.phoneCodeHash };
  }

  async signIn(phone: string, code: string, phoneCodeHash: string): Promise<{ needsPassword: boolean }> {
    if (!this.client) throw new Error('Client not initialized');
    try {
      await this.client.invoke(
        new Api.auth.SignIn({
          phoneNumber: phone,
          phoneCodeHash,
          phoneCode: code,
        })
      );
      await this.saveSession();
      return { needsPassword: false };
    } catch (e: any) {
      if (e.errorMessage === 'SESSION_PASSWORD_NEEDED') {
        return { needsPassword: true };
      }
      throw e;
    }
  }

  async checkPassword(password: string): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');
    const { computeCheck } = require('telegram/Password');
    const passwordData = await this.client.invoke(new Api.account.GetPassword());
    const check = await computeCheck(passwordData, password);
    await this.client.invoke(new Api.auth.CheckPassword({
      password: check,
    }));
    await this.saveSession();
  }

  async logout(): Promise<void> {
    if (this.client) {
      try { await this.client.invoke(new Api.auth.LogOut()); } catch {}
      this.client.disconnect();
    }
    this.client = null;
    this._isConnected = false;
    await SecureStore.deleteItemAsync(SESSION_KEY);
    await SecureStore.deleteItemAsync(API_ID_KEY);
    await SecureStore.deleteItemAsync(API_HASH_KEY);
  }

  async scanFolders(): Promise<FolderMetadata[]> {
    if (!this.client) throw new Error('Client not initialized');
    const folders: FolderMetadata[] = [];
    const dialogs = await this.client.getDialogs({ limit: 200 });

    for (const dialog of dialogs) {
      const entity = dialog.entity;
      if (entity && entity.className === 'Channel') {
        const channel = entity as Api.Channel;
        const title = channel.title || '';
        if (title.toLowerCase().includes('[td]')) {
          const displayName = title
            .replace(/ \[TD\]/gi, '')
            .replace(/\[TD\]/gi, '')
            .trim();
          folders.push({
            id: channel.id.toJSNumber ? channel.id.toJSNumber() : Number(channel.id),
            name: displayName,
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
        let name = 'Unknown';
        let size = 0;
        let mime: string | undefined;
        let ext: string | undefined;

        if (msg.media instanceof Api.MessageMediaDocument && msg.media.document instanceof Api.Document) {
          const doc = msg.media.document;
          size = Number(doc.size);
          mime = doc.mimeType;
          const fnAttr = doc.attributes.find(
            (a: any) => a.className === 'DocumentAttributeFilename'
          ) as any;
          name = fnAttr?.fileName || 'Unknown';
          const dotIdx = name.lastIndexOf('.');
          ext = dotIdx > -1 ? name.slice(dotIdx + 1) : undefined;
        } else if (msg.media instanceof Api.MessageMediaPhoto) {
          name = 'Photo.jpg';
          mime = 'image/jpeg';
          ext = 'jpg';
        }

        files.push({
          id: msg.id,
          folderId,
          name,
          size,
          sizeStr: this._formatBytes(size),
          mimeType: mime,
          fileExt: ext,
          createdAt: msg.date ? new Date(msg.date * 1000).toISOString() : '',
          iconType: 'file',
        });
      }
    }
    return files;
  }

  async createFolder(name: string): Promise<FolderMetadata> {
    if (!this.client) throw new Error('Client not initialized');
    const result = await this.client.invoke(
      new Api.channels.CreateChannel({
        broadcast: true,
        title: `${name} [TD]`,
        about: 'Telegram Drive Storage Folder\n[telegram-drive-folder]',
      })
    );
    const updates = result as Api.Updates;
    const chat = updates.chats[0] as Api.Channel;
    const id = chat.id.toJSNumber ? chat.id.toJSNumber() : Number(chat.id);
    return { id, name };
  }

  async deleteFolder(folderId: number): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');
    const peer = await this._resolvePeer(folderId);
    const inputChannel = new Api.InputChannel({
      channelId: (peer as any).id || folderId,
      accessHash: (peer as any).accessHash || BigInt(0),
    });
    await this.client.invoke(new Api.channels.DeleteChannel({ channel: inputChannel }));
  }

  async deleteFile(messageId: number, folderId: number | null): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');
    const peer = folderId ? await this._resolvePeer(folderId) : 'me';
    await this.client.deleteMessages(peer, [messageId], { revoke: true });
  }

  async uploadFile(
    filePath: string,
    folderId: number | null,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');
    const peer = folderId ? await this._resolvePeer(folderId) : 'me';
    await this.client.sendFile(peer, {
      file: filePath,
      progressCallback: onProgress
        ? (progress: number) => onProgress(Math.round(progress * 100))
        : undefined,
    });
  }

  async downloadFile(
    messageId: number,
    folderId: number | null,
    onProgress?: (progress: number) => void
  ): Promise<Buffer> {
    if (!this.client) throw new Error('Client not initialized');
    const peer = folderId ? await this._resolvePeer(folderId) : 'me';
    const messages = await this.client.getMessages(peer, { ids: [messageId] });
    const msg = messages[0];
    if (!msg || !msg.media) throw new Error('Message not found or has no media');

    const buffer = await this.client.downloadMedia(msg.media, {
      progressCallback: onProgress
        ? (downloaded: any, total: any) => {
            const d = Number(downloaded);
            const t = Number(total);
            if (t > 0) onProgress(Math.round((d / t) * 100));
          }
        : undefined,
    });
    return buffer as Buffer;
  }

  async searchGlobal(query: string): Promise<FileMetadata[]> {
    if (!this.client) throw new Error('Client not initialized');
    const result = await this.client.invoke(
      new Api.messages.SearchGlobal({
        q: query,
        filter: new Api.InputMessagesFilterDocument(),
        minDate: 0,
        maxDate: 0,
        offsetRate: 0,
        offsetPeer: new Api.InputPeerEmpty(),
        offsetId: 0,
        limit: 50,
      })
    );

    const files: FileMetadata[] = [];
    const msgs = (result as any).messages || [];
    for (const msg of msgs) {
      if (msg.media?.document) {
        const doc = msg.media.document;
        const fnAttr = doc.attributes?.find((a: any) => a.className === 'DocumentAttributeFilename') as any;
        const name = fnAttr?.fileName || 'Unknown';
        const size = Number(doc.size || 0);
        const dotIdx = name.lastIndexOf('.');
        files.push({
          id: msg.id,
          folderId: null,
          name,
          size,
          sizeStr: this._formatBytes(size),
          mimeType: doc.mimeType,
          fileExt: dotIdx > -1 ? name.slice(dotIdx + 1) : undefined,
          createdAt: msg.date ? new Date(msg.date * 1000).toISOString() : '',
          iconType: 'file',
        });
      }
    }
    return files;
  }

  async moveFiles(
    messageIds: number[],
    sourceFolderId: number | null,
    targetFolderId: number | null
  ): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');
    const sourcePeer = sourceFolderId ? await this._resolvePeer(sourceFolderId) : 'me';
    const targetPeer = targetFolderId ? await this._resolvePeer(targetFolderId) : 'me';
    await this.client.forwardMessages(targetPeer, { messages: messageIds, fromPeer: sourcePeer });
    await this.client.deleteMessages(sourcePeer, messageIds, { revoke: true });
  }

  private async _resolvePeer(folderId: number): Promise<Api.TypeInputPeer> {
    if (!this.client) throw new Error('Client not initialized');
    const dialogs = await this.client.getDialogs({ limit: 200 });
    for (const d of dialogs) {
      const entity = d.entity;
      if (entity && 'id' in entity) {
        const id = (entity.id as any).toJSNumber ? (entity.id as any).toJSNumber() : Number(entity.id);
        if (id === folderId) {
          return await this.client.getInputEntity(entity);
        }
      }
    }
    throw new Error(`Peer not found for folder ${folderId}`);
  }

  private _formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}

export const telegramService = new TelegramService();

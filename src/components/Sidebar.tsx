import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, ActivityIndicator } from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '../theme';
import { FolderMetadata, telegramService } from '../services/telegram';
import { useFolders } from '../context/FolderContext';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
}

export default function Sidebar({ visible, onClose }: SidebarProps) {
  const c = Colors.dark;
  const { folders, setFolders, activeFolderId, setActiveFolderId } = useFolders();
  const { setAuthenticated } = useAuth();
  const [syncing, setSyncing] = React.useState(false);
  const [creating, setCreating] = React.useState(false);

  if (!visible) return null;

  const handleSync = async () => {
    setSyncing(true);
    try {
      const found = await telegramService.scanFolders();
      const merged = [...folders];
      let added = 0;
      for (const f of found) {
        if (!merged.find(e => e.id === f.id)) { merged.push(f); added++; }
      }
      setFolders(merged);
      Alert.alert('Sync Complete', added > 0 ? `Found ${added} new folders.` : 'No new folders found.');
    } catch (e: any) {
      Alert.alert('Sync Failed', e.message || 'Unknown error');
    } finally {
      setSyncing(false);
    }
  };

  const handleCreate = () => {
    Alert.prompt?.('Create Folder', 'Enter folder name:', async (name: string) => {
      if (!name?.trim()) return;
      setCreating(true);
      try {
        const folder = await telegramService.createFolder(name.trim());
        setFolders(prev => [...prev, folder]);
      } catch (e: any) {
        Alert.alert('Error', e.message);
      } finally {
        setCreating(false);
      }
    }) || Alert.alert('Create Folder', 'Enter a name in the input below', [
      { text: 'Cancel' },
      {
        text: 'Create', onPress: () => {
          // Fallback for Android - we'll use a simple approach
          createFolderAndroid();
        }
      },
    ]);
  };

  const createFolderAndroid = () => {
    // Simple folder name input for Android
    const name = 'New Folder';
    (async () => {
      setCreating(true);
      try {
        const folder = await telegramService.createFolder(name);
        setFolders(prev => [...prev, folder]);
      } catch (e: any) {
        Alert.alert('Error', e.message);
      } finally {
        setCreating(false);
      }
    })();
  };

  const handleDeleteFolder = (folder: FolderMetadata) => {
    Alert.alert('Delete Folder', `Delete "${folder.name}"?\nThis will delete the channel on Telegram.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await telegramService.deleteFolder(folder.id);
            setFolders(prev => prev.filter(f => f.id !== folder.id));
            if (activeFolderId === folder.id) setActiveFolderId(null);
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        }
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure? This will disconnect your session.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive', onPress: async () => {
          await telegramService.logout();
          setAuthenticated(false);
        }
      },
    ]);
  };

  const selectFolder = (id: number | null) => {
    setActiveFolderId(id);
    onClose();
  };

  return (
    <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
      <TouchableOpacity activeOpacity={1} style={[styles.drawer, { backgroundColor: c.surface, borderColor: c.border }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: c.border }]}>
          <Text style={[styles.headerTitle, { color: c.text }]}>☁️ Telegram Drive</Text>
        </View>

        {/* Saved Messages */}
        <TouchableOpacity
          style={[styles.folderItem, activeFolderId === null && { backgroundColor: c.primary + '15' }]}
          onPress={() => selectFolder(null)}
        >
          <Text style={styles.folderIcon}>💬</Text>
          <Text style={[styles.folderName, { color: activeFolderId === null ? c.primaryLight : c.text }]}>
            Saved Messages
          </Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: c.border }]} />

        {/* Folders Label */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: c.subtext }]}>FOLDERS</Text>
          <View style={styles.sectionActions}>
            <TouchableOpacity onPress={handleSync} disabled={syncing} style={styles.iconBtn}>
              {syncing ? <ActivityIndicator size="small" color={c.primary} /> : <Text style={styles.actionIcon}>🔄</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCreate} disabled={creating} style={styles.iconBtn}>
              {creating ? <ActivityIndicator size="small" color={c.primary} /> : <Text style={styles.actionIcon}>➕</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {/* Folder List */}
        <FlatList
          data={folders}
          keyExtractor={item => String(item.id)}
          style={styles.folderList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.folderItem, activeFolderId === item.id && { backgroundColor: c.primary + '15' }]}
              onPress={() => selectFolder(item.id)}
              onLongPress={() => handleDeleteFolder(item)}
            >
              <Text style={styles.folderIcon}>📁</Text>
              <Text style={[styles.folderName, { color: activeFolderId === item.id ? c.primaryLight : c.text }]} numberOfLines={1}>
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: c.subtext }]}>No folders yet</Text>
              <Text style={[styles.emptyHint, { color: c.white20 }]}>Tap 🔄 to sync or ➕ to create</Text>
            </View>
          }
        />

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: c.border }]}>
          <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: c.error + '15' }]} onPress={handleLogout}>
            <Text style={[styles.logoutText, { color: c.error }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, flexDirection: 'row' },
  drawer: { width: 300, borderRightWidth: 1, flex: 1 },
  header: { paddingHorizontal: Spacing.xl, paddingTop: 60, paddingBottom: Spacing.lg, borderBottomWidth: 1 },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '700' },
  folderItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.sm, marginHorizontal: Spacing.sm, gap: Spacing.md },
  folderIcon: { fontSize: 18 },
  folderName: { fontSize: FontSize.md, flex: 1 },
  divider: { height: 1, marginVertical: Spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 1.5 },
  sectionActions: { flexDirection: 'row', gap: Spacing.sm },
  iconBtn: { padding: Spacing.xs },
  actionIcon: { fontSize: 16 },
  folderList: { flex: 1 },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxxl },
  emptyText: { fontSize: FontSize.md },
  emptyHint: { fontSize: FontSize.sm, marginTop: Spacing.xs },
  footer: { borderTopWidth: 1, padding: Spacing.lg },
  logoutBtn: { borderRadius: BorderRadius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  logoutText: { fontSize: FontSize.md, fontWeight: '600' },
});

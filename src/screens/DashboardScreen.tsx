import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  ActivityIndicator, RefreshControl, TextInput, Alert, Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Colors, Spacing, FontSize, BorderRadius } from '../theme';
import { FileMetadata, telegramService } from '../services/telegram';
import { useFolders } from '../context/FolderContext';
import { FileCard, FileListItem } from '../components/FileCard';
import Sidebar from '../components/Sidebar';
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';
import AiAssistantModal from '../components/AiAssistantModal';

export default function DashboardScreen({ navigation }: any) {
  const c = Colors.dark;
  const { folders, activeFolderId } = useFolders();

  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<FileMetadata[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [aiVisible, setAiVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [clipboard, setClipboard] = useState<{ type: 'cut' | 'copy'; fileIds: number[]; folderIds: number[]; sourceFolderId: number | null } | null>(null);

  const currentFolderName = activeFolderId === null
    ? 'Saved Messages'
    : folders.find(f => f.id === activeFolderId)?.name || 'Folder';

  const loadFiles = useCallback(async () => {
    try {
      const result = await telegramService.getFiles(activeFolderId);
      setFiles(result);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load files');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFolderId]);

  useEffect(() => {
    setLoading(true);
    setSelectedIds([]);
    setSearchTerm('');
    setSearchResults([]);
    loadFiles();
  }, [activeFolderId, loadFiles]);

  // Merge subfolders
  const subFolders = folders
    .filter(f => f.parentId === activeFolderId)
    .map(f => ({
      id: f.id,
      folderId: activeFolderId,
      name: f.name,
      size: 0,
      sizeStr: 'Folder',
      createdAt: '',
      iconType: 'folder'
    } as FileMetadata));

  const combinedFiles = [...subFolders, ...files];

  // Search
  useEffect(() => {
    if (searchTerm.length < 3) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await telegramService.searchGlobal(searchTerm);
        setSearchResults(results);
      } catch {} finally {
        setIsSearching(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const displayedFiles = searchTerm.length > 2
    ? searchResults
    : combinedFiles.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleRefresh = () => {
    setRefreshing(true);
    loadFiles();
  };

  const handleFilePress = (file: FileMetadata) => {
    if (selectedIds.length > 0) {
      toggleSelection(file.id);
    } else if (file.iconType === 'folder') {
      // Navigate into folder (handled by Context in mobile via side effect usually, or we call setActiveFolderId)
      // Wait, FolderContext usually provides setActiveFolderId.
    } else {
      showFileActions(file);
    }
  };

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const showFileActions = (file: FileMetadata) => {
    const isFolder = file.iconType === 'folder';
    const options = [
      { text: 'Rename', onPress: () => handleRename(file) },
      { text: 'Cut', onPress: () => handleCut([file.id]) },
      { text: 'Copy', onPress: () => handleCopy([file.id]) },
      { text: 'Properties', onPress: () => handleProperties(file) },
    ];

    if (!isFolder) {
      options.unshift({ text: 'Download', onPress: () => handleDownload(file) } as any);
    }

    options.push({ text: 'Delete', style: 'destructive', onPress: () => handleDelete(file) } as any);
    options.push({ text: 'Cancel', style: 'cancel' } as any);

    Alert.alert(file.name, isFolder ? 'Folder Actions' : `Size: ${file.sizeStr}`, options as any);
  };

  const handleRename = (file: FileMetadata) => {
    if (file.iconType !== 'folder') {
       Alert.alert('Info', 'Direct renaming of files is not supported by Telegram. Re-upload with a different name.');
       return;
    }
    Alert.prompt('Rename Folder', 'Enter new name', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Rename', onPress: async (name) => {
          if (!name) return;
          try {
            await telegramService.renameFolder(file.id, name);
            loadFiles();
            // Need to reload folders context too
          } catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ], 'plain-text', file.name);
  };

  const handleProperties = async (file: FileMetadata) => {
    if (file.iconType === 'folder') {
      try {
        const props = await telegramService.getFolderProperties(file.id);
        Alert.alert('Folder Properties', `Name: ${file.name}\nFiles: ${props.file_count}\nTotal Size: ${formatBytes(props.total_size)}\nCreated: ${new Date(props.created_at).toLocaleString()}`);
      } catch (e: any) { Alert.alert('Error', e.message); }
    } else {
      Alert.alert('File Properties', `Name: ${file.name}\nSize: ${file.sizeStr}\nType: ${file.mimeType || 'Unknown'}\nCreated: ${new Date(file.createdAt).toLocaleString()}`);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleCut = (ids: number[]) => {
    const selected = displayedFiles.filter(f => ids.includes(f.id));
    setClipboard({
      type: 'cut',
      fileIds: selected.filter(f => f.iconType !== 'folder').map(f => f.id),
      folderIds: selected.filter(f => f.iconType === 'folder').map(f => f.id),
      sourceFolderId: activeFolderId
    });
    setSelectedIds([]);
  };

  const handleCopy = (ids: number[]) => {
    const selected = displayedFiles.filter(f => ids.includes(f.id));
    setClipboard({
      type: 'copy',
      fileIds: selected.filter(f => f.iconType !== 'folder').map(f => f.id),
      folderIds: selected.filter(f => f.iconType === 'folder').map(f => f.id),
      sourceFolderId: activeFolderId
    });
    setSelectedIds([]);
  };

  const handlePaste = async () => {
    if (!clipboard) return;
    try {
      if (clipboard.type === 'cut') {
        await telegramService.moveItems(clipboard.fileIds, clipboard.folderIds, clipboard.sourceFolderId, activeFolderId);
        setClipboard(null);
      } else {
        await telegramService.copyItems(clipboard.fileIds, clipboard.folderIds, clipboard.sourceFolderId, activeFolderId);
      }
      loadFiles();
      Alert.alert('Success', 'Items pasted successfully');
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ 
        copyToCacheDirectory: true,
        multiple: true 
      });
      if (result.canceled || !result.assets?.length) return;

      setUploading(true);
      let count = 0;
      for (const asset of result.assets) {
        setUploadProgress(0);
        await telegramService.uploadFile(
          asset.uri,
          activeFolderId,
          (progress) => setUploadProgress(progress)
        );
        count++;
      }

      setUploading(false);
      Alert.alert('Success', `${count} file(s) uploaded successfully`);
      loadFiles();
    } catch (e: any) {
      setUploading(false);
      Alert.alert('Upload Failed', e.message || 'Unknown error');
    }
  };

  const handleDownload = async (file: FileMetadata) => {
    setDownloading(file.id);
    setDownloadProgress(0);
    try {
      const buffer = await telegramService.downloadFile(
        file.id,
        activeFolderId,
        (progress) => setDownloadProgress(progress)
      );

      const fileUri = FileSystem.documentDirectory + file.name;
      await FileSystem.writeAsStringAsync(fileUri, Buffer.from(buffer).toString('base64'), {
        encoding: FileSystem.EncodingType.Base64,
      });

      setDownloading(null);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Downloaded', `Saved to ${fileUri}`);
      }
    } catch (e: any) {
      setDownloading(null);
      Alert.alert('Download Failed', e.message || 'Unknown error');
    }
  };

  const handleDelete = (file: FileMetadata) => {
    const isFolder = file.iconType === 'folder';
    Alert.alert(`Delete ${isFolder ? 'Folder' : 'File'}`, `Delete "${file.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            if (isFolder) {
              await telegramService.deleteFolder(file.id);
            } else {
              await telegramService.deleteFile(file.id, activeFolderId);
            }
            loadFiles();
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        }
      },
    ]);
  };

  const handleBulkDelete = () => {
    Alert.alert('Delete Items', `Delete ${selectedIds.length} items?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          for (const id of selectedIds) {
            const item = displayedFiles.find(f => f.id === id);
            try { 
              if (item?.iconType === 'folder') {
                await telegramService.deleteFolder(id);
              } else {
                await telegramService.deleteFile(id, activeFolderId); 
              }
            } catch {}
          }
          setSelectedIds([]);
          loadFiles();
        }
      },
    ]);
  };

  const renderGridItem = ({ item, index }: { item: FileMetadata, index: number }) => (
    <Animated.View 
      entering={FadeInUp.delay(index * 50).duration(400)} 
      layout={Layout.springify()} 
      style={{ flex: 0.5 }}
    >
      <FileCard
        file={item}
        selected={selectedIds.includes(item.id)}
        onPress={() => handleFilePress(item)}
        onLongPress={() => toggleSelection(item.id)}
      />
    </Animated.View>
  );

  const renderListItem = ({ item, index }: { item: FileMetadata, index: number }) => (
    <Animated.View 
      entering={FadeInDown.delay(index * 30).duration(300)} 
      layout={Layout.springify()}
    >
      <FileListItem
        file={item}
        selected={selectedIds.includes(item.id)}
        onPress={() => handleFilePress(item)}
        onLongPress={() => toggleSelection(item.id)}
      />
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      {/* Top Bar */}
      <View style={[styles.topBar, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <View style={styles.topBarRow}>
          <TouchableOpacity onPress={() => setSidebarVisible(true)} style={styles.menuBtn}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={[styles.folderTitle, { color: c.text }]} numberOfLines={1}>{currentFolderName}</Text>
          <View style={styles.topBarActions}>
            <TouchableOpacity onPress={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')} style={styles.actionBtn}>
              <Text style={styles.actionIcon}>{viewMode === 'grid' ? '☰' : '⊞'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchBar, { backgroundColor: c.inputBg, borderColor: c.inputBorder }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: c.text }]}
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Search files..."
            placeholderTextColor={c.white20}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Selection bar */}
        {selectedIds.length > 0 && (
          <View style={[styles.selectionBar, { backgroundColor: c.primary + '15' }]}>
            <Text style={[styles.selectionText, { color: c.primaryLight }]}>
              {selectedIds.length} selected
            </Text>
            <TouchableOpacity onPress={handleBulkDelete}>
              <Text style={[styles.selectionAction, { color: c.error }]}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSelectedIds([])}>
              <Text style={[styles.selectionAction, { color: c.subtext }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Upload Progress */}
      {uploading && (
        <View style={[styles.progressBar, { backgroundColor: c.surface }]}>
          <View style={[styles.progressFill, { width: `${uploadProgress}%`, backgroundColor: c.primary }]} />
          <Text style={[styles.progressText, { color: c.text }]}>Uploading... {uploadProgress}%</Text>
        </View>
      )}

      {/* Download Progress */}
      {downloading && (
        <View style={[styles.progressBar, { backgroundColor: c.surface }]}>
          <View style={[styles.progressFill, { width: `${downloadProgress}%`, backgroundColor: c.success }]} />
          <Text style={[styles.progressText, { color: c.text }]}>Downloading... {downloadProgress}%</Text>
        </View>
      )}

      {/* File List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.primary} />
          <Text style={[styles.loadingText, { color: c.subtext }]}>Loading files...</Text>
        </View>
      ) : displayedFiles.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📂</Text>
          <Text style={[styles.emptyTitle, { color: c.text }]}>
            {searchTerm ? 'No results found' : 'No files yet'}
          </Text>
          <Text style={[styles.emptyHint, { color: c.subtext }]}>
            {searchTerm ? 'Try a different search term' : 'Upload files using the + button'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayedFiles}
          keyExtractor={item => String(item.id)}
          renderItem={viewMode === 'grid' ? renderGridItem : renderListItem}
          numColumns={viewMode === 'grid' ? 2 : 1}
          key={viewMode}
          contentContainerStyle={viewMode === 'grid' ? styles.gridContainer : undefined}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={c.primary} />}
        />
      )}

      {/* FAB - Action Buttons */}
      <View style={styles.fabContainer}>
        {clipboard && (
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: c.success, marginBottom: Spacing.md }]}
            onPress={handlePaste}
          >
            <Text style={styles.fabIcon}>📋</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: '#8b5cf6', marginBottom: Spacing.md }]}
          onPress={() => setAiVisible(true)}
        >
          <Text style={styles.fabIcon}>✨</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: c.primary }]}
          onPress={handleUpload}
          disabled={uploading}
        >
          <Text style={styles.fabIcon}>{uploading ? '⏳' : '+'}</Text>
        </TouchableOpacity>
      </View>

      {/* Modals */}
      <Sidebar 
        visible={sidebarVisible} 
        onClose={() => setSidebarVisible(false)} 
        onNavigate={(screen) => navigation.navigate(screen)}
      />
      <AiAssistantModal visible={aiVisible} onClose={() => setAiVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { borderBottomWidth: 1, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  topBarRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  menuBtn: { padding: Spacing.sm, marginRight: Spacing.sm },
  menuIcon: { fontSize: 22, color: '#fff' },
  folderTitle: { flex: 1, fontSize: FontSize.xl, fontWeight: '700' },
  topBarActions: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: { padding: Spacing.sm },
  actionIcon: { fontSize: 18, color: '#fff' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    borderRadius: BorderRadius.md, borderWidth: 1,
    paddingHorizontal: Spacing.md, height: 40,
  },
  searchIcon: { fontSize: 14, marginRight: Spacing.sm },
  searchInput: { flex: 1, fontSize: FontSize.md },
  clearIcon: { fontSize: 16, color: '#888', padding: Spacing.xs },
  selectionBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    gap: Spacing.lg,
  },
  selectionText: { flex: 1, fontSize: FontSize.sm, fontWeight: '600' },
  selectionAction: { fontSize: FontSize.sm, fontWeight: '600' },
  progressBar: {
    height: 32, marginHorizontal: Spacing.lg, marginTop: Spacing.sm,
    borderRadius: BorderRadius.sm, overflow: 'hidden', justifyContent: 'center',
  },
  progressFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: BorderRadius.sm },
  progressText: { textAlign: 'center', fontSize: FontSize.sm, fontWeight: '600', zIndex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxxl },
  loadingText: { fontSize: FontSize.md, marginTop: Spacing.lg },
  emptyIcon: { fontSize: 64, marginBottom: Spacing.lg },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: '600', marginBottom: Spacing.sm },
  emptyHint: { fontSize: FontSize.md, textAlign: 'center' },
  gridContainer: { paddingHorizontal: Spacing.sm, paddingTop: Spacing.sm },
  fabContainer: {
    position: 'absolute', bottom: 30, right: 20,
    alignItems: 'center',
  },
  fab: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
    elevation: 8,
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },
  fabIcon: { fontSize: 28, color: '#fff', fontWeight: '300' },
});

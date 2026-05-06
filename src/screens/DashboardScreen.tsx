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

export default function DashboardScreen() {
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
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

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
    : files.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleRefresh = () => {
    setRefreshing(true);
    loadFiles();
  };

  const handleFilePress = (file: FileMetadata) => {
    if (selectedIds.length > 0) {
      toggleSelection(file.id);
    } else {
      // Preview or show action sheet
      showFileActions(file);
    }
  };

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const showFileActions = (file: FileMetadata) => {
    Alert.alert(file.name, `Size: ${file.sizeStr}`, [
      { text: 'Download', onPress: () => handleDownload(file) },
      { text: 'Delete', style: 'destructive', onPress: () => handleDelete(file) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      setUploading(true);
      setUploadProgress(0);

      await telegramService.uploadFile(
        asset.uri,
        activeFolderId,
        (progress) => setUploadProgress(progress)
      );

      setUploading(false);
      Alert.alert('Success', `"${asset.name}" uploaded successfully`);
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
    Alert.alert('Delete File', `Delete "${file.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await telegramService.deleteFile(file.id, activeFolderId);
            setFiles(prev => prev.filter(f => f.id !== file.id));
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        }
      },
    ]);
  };

  const handleBulkDelete = () => {
    Alert.alert('Delete Files', `Delete ${selectedIds.length} files?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          for (const id of selectedIds) {
            try { await telegramService.deleteFile(id, activeFolderId); } catch {}
          }
          setSelectedIds([]);
          loadFiles();
        }
      },
    ]);
  };

  const renderGridItem = ({ item }: { item: FileMetadata }) => (
    <FileCard
      file={item}
      selected={selectedIds.includes(item.id)}
      onPress={() => handleFilePress(item)}
      onLongPress={() => toggleSelection(item.id)}
    />
  );

  const renderListItem = ({ item }: { item: FileMetadata }) => (
    <FileListItem
      file={item}
      selected={selectedIds.includes(item.id)}
      onPress={() => handleFilePress(item)}
      onLongPress={() => toggleSelection(item.id)}
    />
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

      {/* FAB - Upload Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: c.primary }]}
        onPress={handleUpload}
        disabled={uploading}
      >
        <Text style={styles.fabIcon}>{uploading ? '⏳' : '+'}</Text>
      </TouchableOpacity>

      {/* Sidebar */}
      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
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
  fab: {
    position: 'absolute', bottom: 30, right: 20,
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
    elevation: 8,
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },
  fabIcon: { fontSize: 28, color: '#fff', fontWeight: '300' },
});

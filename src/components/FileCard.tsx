import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '../theme';
import { FileMetadata } from '../services/telegram';

const FILE_ICONS: Record<string, string> = {
  pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊', ppt: '📎', pptx: '📎',
  zip: '📦', rar: '📦', '7z': '📦', tar: '📦', gz: '📦',
  jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', webp: '🖼️', svg: '🖼️', bmp: '🖼️',
  mp4: '🎬', mkv: '🎬', avi: '🎬', mov: '🎬', webm: '🎬',
  mp3: '🎵', flac: '🎵', wav: '🎵', ogg: '🎵', aac: '🎵',
  py: '🐍', js: '⚡', ts: '⚡', html: '🌐', css: '🎨', json: '📋',
  txt: '📝', md: '📝', csv: '📊',
  exe: '⚙️', apk: '📱', dmg: '💿', iso: '💿',
};

function getIcon(name: string, iconType?: string): string {
  if (iconType === 'folder' || name.endsWith('/')) return '📂';
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return FILE_ICONS[ext] || '📎';
}

interface FileCardProps {
  file: FileMetadata;
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

export function FileCard({ file, selected, onPress, onLongPress }: FileCardProps) {
  const c = Colors.dark;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: c.cardBg, borderColor: selected ? c.primary : c.border },
        selected && { borderWidth: 2 },
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconArea, { backgroundColor: c.white05 }]}>
        <Text style={styles.fileIcon}>{getIcon(file.name, file.iconType)}</Text>
      </View>
      <Text style={[styles.fileName, { color: c.text }]} numberOfLines={2}>{file.name}</Text>
      <Text style={[styles.fileSize, { color: c.subtext }]}>{file.sizeStr}</Text>
    </TouchableOpacity>
  );
}

interface FileListItemProps {
  file: FileMetadata;
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

export function FileListItem({ file, selected, onPress, onLongPress }: FileListItemProps) {
  const c = Colors.dark;

  return (
    <TouchableOpacity
      style={[
        styles.listItem,
        { backgroundColor: selected ? c.primary + '15' : 'transparent', borderBottomColor: c.border },
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View style={[styles.listIcon, { backgroundColor: c.white05 }]}>
        <Text style={styles.listIconText}>{getIcon(file.name, file.iconType)}</Text>
      </View>
      <View style={styles.listInfo}>
        <Text style={[styles.listName, { color: c.text }]} numberOfLines={1}>{file.name}</Text>
        <Text style={[styles.listMeta, { color: c.subtext }]}>
          {file.sizeStr} • {file.createdAt ? new Date(file.createdAt).toLocaleDateString() : ''}
        </Text>
      </View>
      {selected && <View style={[styles.checkmark, { backgroundColor: c.primary }]}><Text style={styles.checkText}>✓</Text></View>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: Spacing.xs,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    minHeight: 130,
  },
  iconArea: {
    width: 48, height: 48, borderRadius: BorderRadius.md,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm,
  },
  fileIcon: { fontSize: 24 },
  fileName: { fontSize: FontSize.sm, fontWeight: '500', marginBottom: Spacing.xs },
  fileSize: { fontSize: FontSize.xs },
  listItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, gap: Spacing.md,
  },
  listIcon: {
    width: 40, height: 40, borderRadius: BorderRadius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  listIconText: { fontSize: 20 },
  listInfo: { flex: 1 },
  listName: { fontSize: FontSize.md, fontWeight: '500' },
  listMeta: { fontSize: FontSize.xs, marginTop: 2 },
  checkmark: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  checkText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

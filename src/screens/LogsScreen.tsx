import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '../theme';

const MOCK_LOGS = [
  { id: '1', action: 'Uploaded', file: 'document.pdf', time: '2 mins ago', type: 'success' },
  { id: '2', action: 'Downloaded', file: 'image.jpg', time: '15 mins ago', type: 'success' },
  { id: '3', action: 'Created Folder', file: 'Work Projects', time: '1 hour ago', type: 'info' },
  { id: '4', action: 'Failed Upload', file: 'video.mp4', time: '3 hours ago', type: 'error' },
];

export default function LogsScreen({ navigation }: any) {
  const c = Colors.dark;

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ color: c.text, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.text }]}>Activity Logs</Text>
      </View>

      <FlatList
        data={MOCK_LOGS}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => (
          <View style={[styles.logItem, { backgroundColor: c.surface, borderLeftColor: item.type === 'error' ? c.error : c.primary }]}>
            <View style={styles.logHeader}>
              <Text style={[styles.logAction, { color: item.type === 'error' ? c.error : c.text }]}>{item.action}</Text>
              <Text style={[styles.logTime, { color: c.subtext }]}>{item.time}</Text>
            </View>
            <Text style={[styles.logFile, { color: c.text }]}>{item.file}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingBottom: Spacing.lg, paddingHorizontal: Spacing.xl, borderBottomWidth: 1 },
  backBtn: { padding: Spacing.sm, marginRight: Spacing.md },
  title: { fontSize: FontSize.xl, fontWeight: '700' },
  content: { padding: Spacing.xl, gap: Spacing.md },
  logItem: { padding: Spacing.lg, borderRadius: BorderRadius.md, borderLeftWidth: 4 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  logAction: { fontWeight: '700', fontSize: FontSize.sm },
  logTime: { fontSize: FontSize.xs },
  logFile: { fontSize: FontSize.md },
});

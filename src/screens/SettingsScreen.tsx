import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, TextInput, Alert } from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '../theme';
import { aiService } from '../services/ai';

export default function SettingsScreen({ navigation }: any) {
  const c = Colors.dark;
  const [apiKey, setApiKey] = useState('');
  const [proxyUrl, setProxyUrl] = useState('');
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const key = await aiService.getApiKey();
    const url = await aiService.getProxyUrl();
    setApiKey(key);
    setProxyUrl(url);
  };

  const handleSave = async () => {
    try {
      await aiService.setApiKey(apiKey);
      await aiService.setProxyUrl(proxyUrl);
      Alert.alert('Success', 'Settings saved');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ color: c.text, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.text }]}>Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: c.subtext }]}>AI CONFIGURATION</Text>
          
          <View style={[styles.inputGroup, { backgroundColor: c.surface, marginBottom: Spacing.md }]}>
            <Text style={[styles.label, { color: c.text }]}>Gemini API Key</Text>
            <TextInput
              style={[styles.input, { color: c.text, borderBottomColor: c.border }]}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="Paste your API key here..."
              placeholderTextColor={c.white20}
              secureTextEntry
            />
          </View>

          <View style={[styles.inputGroup, { backgroundColor: c.surface }]}>
            <Text style={[styles.label, { color: c.text }]}>AI Proxy URL</Text>
            <TextInput
              style={[styles.input, { color: c.text, borderBottomColor: c.border }]}
              value={proxyUrl}
              onChangeText={setProxyUrl}
              placeholder="https://your-proxy.com/chat"
              placeholderTextColor={c.white20}
            />
            <Text style={{ color: c.subtext, fontSize: 10, marginTop: 4 }}>
              Default: https://telegram-drive-desktop.onrender.com/chat
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: c.subtext }]}>PREFERENCES</Text>
          <View style={[styles.row, { backgroundColor: c.surface }]}>
            <Text style={[styles.label, { color: c.text }]}>Dark Mode</Text>
            <Switch value={isDark} onValueChange={setIsDark} trackColor={{ true: c.primary }} />
          </View>
        </View>

        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: c.primary }]} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Save Changes</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingBottom: Spacing.lg, paddingHorizontal: Spacing.xl, borderBottomWidth: 1 },
  backBtn: { padding: Spacing.sm, marginRight: Spacing.md },
  title: { fontSize: FontSize.xl, fontWeight: '700' },
  content: { flex: 1, padding: Spacing.xl },
  section: { marginBottom: Spacing.xxxl },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 1.2, marginBottom: Spacing.md },
  inputGroup: { padding: Spacing.lg, borderRadius: BorderRadius.md },
  label: { fontSize: FontSize.md, fontWeight: '500', marginBottom: Spacing.sm },
  input: { borderBottomWidth: 1, paddingVertical: Spacing.sm, fontSize: FontSize.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg, borderRadius: BorderRadius.md },
  saveBtn: { padding: Spacing.lg, borderRadius: BorderRadius.md, alignItems: 'center', marginTop: Spacing.xl },
  saveBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
});

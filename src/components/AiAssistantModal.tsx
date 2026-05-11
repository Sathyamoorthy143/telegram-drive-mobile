import React, { useState } from 'react';
import {
  View, Text, Modal, TextInput, TouchableOpacity, 
  StyleSheet, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '../theme';
import { aiService } from '../services/ai';

interface Message {
  text: string;
  isAi: boolean;
}

export default function AiAssistantModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const c = Colors.dark;
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { text: "Hello! I'm your AI drive assistant. How can I help you today?", isAi: true }
  ]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { text: userMsg, isAi: false }]);
    setLoading(true);

    try {
      const aiResponse = await aiService.chat(userMsg);
      setMessages(prev => [...prev, { text: aiResponse, isAi: true }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { text: `Error: ${e.message}`, isAi: true }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.container, { backgroundColor: c.bg }]}
        >
          <View style={[styles.header, { borderBottomColor: c.border }]}>
            <Text style={[styles.title, { color: c.text }]}>AI Assistant</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={{ color: c.subtext, fontSize: 18 }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.chatArea}>
            {messages.map((m, i) => (
              <View 
                key={i} 
                style={[
                  styles.bubble, 
                  m.isAi ? styles.aiBubble : styles.userBubble,
                  { backgroundColor: m.isAi ? c.surface : c.primary }
                ]}
              >
                <Text style={[styles.msgText, { color: '#fff' }]}>{m.text}</Text>
              </View>
            ))}
            {loading && (
              <View style={[styles.bubble, styles.aiBubble, { backgroundColor: c.surface }]}>
                <ActivityIndicator size="small" color={c.primary} />
              </View>
            )}
          </ScrollView>

          <View style={[styles.inputRow, { backgroundColor: c.surface, borderTopColor: c.border }]}>
            <TextInput
              style={[styles.input, { color: c.text }]}
              value={input}
              onChangeText={setInput}
              placeholder="Ask me anything..."
              placeholderTextColor={c.white20}
              multiline
            />
            <TouchableOpacity onPress={handleSend} style={[styles.sendBtn, { backgroundColor: c.primary }]}>
              <Text style={styles.sendIcon}>➔</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { height: '80%', borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg, borderBottomWidth: 1 },
  title: { fontSize: FontSize.lg, fontWeight: '700' },
  closeBtn: { padding: Spacing.sm },
  chatArea: { padding: Spacing.lg, gap: Spacing.md },
  bubble: { padding: Spacing.md, borderRadius: BorderRadius.lg, maxWidth: '85%' },
  aiBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  msgText: { fontSize: FontSize.md },
  inputRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderTopWidth: 1 },
  input: { flex: 1, maxHeight: 100, fontSize: FontSize.md, paddingHorizontal: Spacing.sm },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginLeft: Spacing.sm },
  sendIcon: { color: '#fff', fontSize: 18 },
});

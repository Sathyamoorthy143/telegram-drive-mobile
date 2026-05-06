import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '../theme';
import { telegramService } from '../services/telegram';
import { useAuth } from '../context/AuthContext';

type Step = 'setup' | 'phone' | 'code' | 'password';

export default function AuthScreen() {
  const { setAuthenticated, checkAuth } = useAuth();
  const [step, setStep] = useState<Step>('setup');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [apiId, setApiId] = useState('');
  const [apiHash, setApiHash] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [phoneCodeHash, setPhoneCodeHash] = useState('');
  const [floodWait, setFloodWait] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const creds = await telegramService.loadCredentials();
      if (creds) { setApiId(creds.apiId); setApiHash(creds.apiHash); }
    })();
  }, []);

  useEffect(() => {
    if (!floodWait) return;
    const interval = setInterval(() => {
      setFloodWait(prev => (prev && prev > 1 ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(interval);
  }, [floodWait]);

  const handleSetup = async () => {
    if (!apiId.trim() || !apiHash.trim()) {
      setError('Both API ID and Hash are required.'); return;
    }
    if (apiId.includes(' ') || apiHash.includes(' ')) {
      setError('Credentials cannot contain spaces.'); return;
    }
    setError(null);
    setLoading(true);
    try {
      await telegramService.saveCredentials(apiId.trim(), apiHash.trim());
      await telegramService.initialize(parseInt(apiId.trim()), apiHash.trim());
      const authed = await telegramService.isAuthorized();
      if (authed) {
        setAuthenticated(true);
      } else {
        setStep('phone');
      }
    } catch (e: any) {
      setError(e.message || 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePhone = async () => {
    setLoading(true); setError(null);
    try {
      const result = await telegramService.sendCode(phone);
      setPhoneCodeHash(result.phoneCodeHash);
      setStep('code');
    } catch (e: any) {
      const msg = e.message || String(e);
      if (msg.includes('FLOOD_WAIT_')) {
        const parts = msg.split('FLOOD_WAIT_');
        const seconds = parseInt(parts[1]);
        if (!isNaN(seconds)) { setFloodWait(seconds); return; }
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCode = async () => {
    setLoading(true); setError(null);
    try {
      const result = await telegramService.signIn(phone, code, phoneCodeHash);
      if (result.needsPassword) {
        setStep('password');
      } else {
        setAuthenticated(true);
      }
    } catch (e: any) {
      setError(e.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePassword = async () => {
    setLoading(true); setError(null);
    try {
      await telegramService.checkPassword(password);
      setAuthenticated(true);
    } catch (e: any) {
      setError(e.message || '2FA failed');
    } finally {
      setLoading(false);
    }
  };

  const c = Colors.dark;

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: c.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Logo Area */}
        <View style={styles.logoArea}>
          <View style={[styles.logoCircle, { backgroundColor: c.primary + '20' }]}>
            <Text style={styles.logoEmoji}>☁️</Text>
          </View>
          <Text style={[styles.title, { color: c.text }]}>Telegram Drive</Text>
          <Text style={[styles.subtitle, { color: c.white60 }]}>Secure Cloud Storage</Text>
        </View>

        {/* Flood Wait */}
        {floodWait ? (
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.floodTitle, { color: c.text }]}>⏳ Too Many Requests</Text>
            <Text style={[styles.floodSubtext, { color: c.subtext }]}>Please wait before trying again.</Text>
            <Text style={[styles.floodTimer, { color: c.primaryLight }]}>
              {Math.floor(floodWait / 60)}:{(floodWait % 60).toString().padStart(2, '0')}
            </Text>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            {step === 'setup' && (
              <>
                <Text style={[styles.label, { color: c.subtext }]}>API ID</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]}
                  value={apiId}
                  onChangeText={setApiId}
                  placeholder="12345678"
                  placeholderTextColor={c.white20}
                  keyboardType="number-pad"
                />
                <Text style={[styles.label, { color: c.subtext, marginTop: Spacing.lg }]}>API HASH</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]}
                  value={apiHash}
                  onChangeText={setApiHash}
                  placeholder="abcdef123456..."
                  placeholderTextColor={c.white20}
                  autoCapitalize="none"
                />
                <TouchableOpacity style={[styles.button, { backgroundColor: c.primary }]} onPress={handleSetup} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Configure & Connect</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => Alert.alert(
                  'Getting API Credentials',
                  '1. Visit my.telegram.org\n2. Log in with your phone\n3. Go to "API development tools"\n4. Create a new app\n5. Copy API ID and API Hash',
                )}>
                  <Text style={[styles.helpLink, { color: c.primaryLight }]}>How do I get my API credentials?</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 'phone' && (
              <>
                <Text style={[styles.label, { color: c.subtext }]}>PHONE NUMBER</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+1 234 567 8900"
                  placeholderTextColor={c.white20}
                  keyboardType="phone-pad"
                  autoFocus
                />
                <TouchableOpacity style={[styles.button, { backgroundColor: '#fff' }]} onPress={handlePhone} disabled={loading}>
                  {loading ? <ActivityIndicator color="#000" /> : <Text style={[styles.buttonText, { color: '#000' }]}>Continue →</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setStep('setup')}>
                  <Text style={[styles.backLink, { color: c.subtext }]}>← Back to Configuration</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 'code' && (
              <>
                <Text style={[styles.label, { color: c.subtext }]}>TELEGRAM CODE</Text>
                <TextInput
                  style={[styles.input, styles.codeInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]}
                  value={code}
                  onChangeText={setCode}
                  placeholder="1 2 3 4 5"
                  placeholderTextColor={c.white20}
                  keyboardType="number-pad"
                  autoFocus
                  maxLength={5}
                />
                <TouchableOpacity style={[styles.button, { backgroundColor: '#fff' }]} onPress={handleCode} disabled={loading}>
                  {loading ? <ActivityIndicator color="#000" /> : <Text style={[styles.buttonText, { color: '#000' }]}>Sign In</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setStep('phone')}>
                  <Text style={[styles.backLink, { color: c.subtext }]}>← Change Phone Number</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 'password' && (
              <>
                <View style={[styles.infoBanner, { backgroundColor: c.primary + '15', borderColor: c.primary + '30' }]}>
                  <Text style={[styles.infoText, { color: c.primaryLight }]}>
                    Your account has Two-Factor Authentication. Enter your cloud password.
                  </Text>
                </View>
                <Text style={[styles.label, { color: c.subtext }]}>CLOUD PASSWORD</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={c.white20}
                  secureTextEntry
                  autoFocus
                />
                <TouchableOpacity style={[styles.button, { backgroundColor: '#fff' }]} onPress={handlePassword} disabled={loading || !password}>
                  {loading ? <ActivityIndicator color="#000" /> : <Text style={[styles.buttonText, { color: '#000' }]}>Unlock</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setStep('code'); setPassword(''); setError(null); }}>
                  <Text style={[styles.backLink, { color: c.subtext }]}>← Back to Code Entry</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {error && (
          <View style={[styles.errorBox, { backgroundColor: c.errorBg, borderColor: c.error + '30' }]}>
            <View style={[styles.errorDot, { backgroundColor: c.error }]} />
            <Text style={[styles.errorText, { color: c.error }]}>{error}</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: Spacing.xxl },
  logoArea: { alignItems: 'center', marginBottom: Spacing.xxxl },
  logoCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
  logoEmoji: { fontSize: 36 },
  title: { fontSize: FontSize.xxxl, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { fontSize: FontSize.md, marginTop: Spacing.xs },
  card: { borderRadius: BorderRadius.xl, borderWidth: 1, padding: Spacing.xxl },
  label: { fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: Spacing.sm },
  input: { borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md + 2, fontSize: FontSize.md, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  codeInput: { fontSize: FontSize.xxl, textAlign: 'center', letterSpacing: 12 },
  button: { borderRadius: BorderRadius.md, paddingVertical: Spacing.lg, alignItems: 'center', marginTop: Spacing.xl },
  buttonText: { fontSize: FontSize.lg, fontWeight: '700', color: '#fff' },
  helpLink: { textAlign: 'center', fontSize: FontSize.sm, marginTop: Spacing.lg },
  backLink: { textAlign: 'center', fontSize: FontSize.sm, marginTop: Spacing.lg },
  errorBox: { borderRadius: BorderRadius.md, borderWidth: 1, padding: Spacing.lg, marginTop: Spacing.lg, flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  errorDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  errorText: { fontSize: FontSize.sm, flex: 1, lineHeight: 20 },
  floodTitle: { fontSize: FontSize.xl, fontWeight: '700', textAlign: 'center', marginBottom: Spacing.sm },
  floodSubtext: { fontSize: FontSize.sm, textAlign: 'center', marginBottom: Spacing.xl },
  floodTimer: { fontSize: 48, fontWeight: '700', textAlign: 'center', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  infoBanner: { borderRadius: BorderRadius.md, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.lg },
  infoText: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
});

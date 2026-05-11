import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Image, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, interpolate, Extrapolate } from 'react-native-reanimated';
import { Colors, Spacing, FontSize, BorderRadius } from '../theme';
import { FolderMetadata, telegramService } from '../services/telegram';
import { useFolders } from '../context/FolderContext';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = 280;

interface UserInfo {
  firstName: string;
  lastName?: string;
  username?: string;
  photo?: string | null;
}

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
  onNavigate?: (screen: string) => void;
}

export default function Sidebar({ visible, onClose, onNavigate }: SidebarProps) {
  const c = Colors.dark;
  const { folders, setFolders, activeFolderId, setActiveFolderId } = useFolders();
  const { setAuthenticated } = useAuth();
  
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const translateX = useSharedValue(-DRAWER_WIDTH);

  useEffect(() => {
    translateX.value = withSpring(visible ? 0 : -DRAWER_WIDTH, { damping: 20 });
    if (visible && !userInfo) {
      fetchUser();
    }
  }, [visible]);

  const fetchUser = async () => {
    try {
      const info = await telegramService.getUserInfo();
      const photo = await telegramService.getProfilePhoto();
      setUserInfo({ ...info, photo });
    } catch {}
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-DRAWER_WIDTH, 0], [0, 1], Extrapolate.CLAMP),
    display: translateX.value === -DRAWER_WIDTH ? 'none' : 'flex',
  }));

  const handleSync = async () => {
    setSyncing(true);
    try {
      const found = await telegramService.scanFolders();
      setFolders(found);
      Alert.alert('Sync Complete', `Updated ${found.length} folders.`);
    } catch (e: any) {
      Alert.alert('Sync Failed', e.message);
    } finally {
      setSyncing(false);
    }
  };

  const toggleExpand = (id: number) => {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIds(next);
  };

  const selectFolder = (id: number | null) => {
    setActiveFolderId(id);
    onClose();
  };

  const renderTree = (parentId: number | null = null, level = 0) => {
    const children = folders.filter(f => f.parentId === parentId);
    if (children.length === 0 && level > 0) return null;

    return children.map(folder => {
      const hasChildren = folders.some(f => f.parentId === folder.id);
      const isExpanded = expandedIds.has(folder.id);
      const isActive = activeFolderId === folder.id;

      return (
        <View key={folder.id}>
          <TouchableOpacity
            style={[
              styles.folderItem,
              { paddingLeft: Spacing.xl + level * 20 },
              isActive && { backgroundColor: c.primary + '15' }
            ]}
            onPress={() => selectFolder(folder.id)}
            onLongPress={() => toggleExpand(folder.id)}
          >
            <TouchableOpacity onPress={() => toggleExpand(folder.id)} style={styles.chevron}>
              <Text style={[styles.chevronText, { color: c.subtext }]}>
                {hasChildren ? (isExpanded ? '▼' : '▶') : ' '}
              </Text>
            </TouchableOpacity>
            <Text style={styles.folderIcon}>📁</Text>
            <Text style={[styles.folderName, { color: isActive ? c.primaryLight : c.text }]} numberOfLines={1}>
              {folder.name}
            </Text>
          </TouchableOpacity>
          {isExpanded && renderTree(folder.id, level + 1)}
        </View>
      );
    });
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Disconnect session?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
          await telegramService.logout();
          setAuthenticated(false);
      }},
    ]);
  };

  return (
    <View style={styles.container} pointerEvents={visible ? 'auto' : 'none'}>
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.drawer, animatedStyle, { backgroundColor: c.bg }]}>
        {/* User Profile */}
        <View style={[styles.profile, { borderBottomColor: c.border }]}>
          {userInfo?.photo ? (
            <Image source={{ uri: userInfo.photo }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: c.primary }]}>
              <Text style={styles.avatarInitial}>{userInfo?.firstName[0] || 'U'}</Text>
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: c.text }]}>
              {userInfo?.firstName} {userInfo?.lastName}
            </Text>
            <Text style={[styles.userHandle, { color: c.subtext }]}>
              @{userInfo?.username || 'user'}
            </Text>
          </View>
        </View>

        <ScrollView style={styles.content}>
          <TouchableOpacity
            style={[styles.navItem, activeFolderId === null && { backgroundColor: c.primary + '15' }]}
            onPress={() => selectFolder(null)}
          >
            <Text style={styles.navIcon}>💬</Text>
            <Text style={[styles.navText, { color: activeFolderId === null ? c.primaryLight : c.text }]}>
              Saved Messages
            </Text>
          </TouchableOpacity>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: c.subtext }]}>FOLDERS</Text>
            <TouchableOpacity onPress={handleSync} disabled={syncing}>
              {syncing ? <ActivityIndicator size="small" color={c.primary} /> : <Text style={styles.syncIcon}>🔄</Text>}
            </TouchableOpacity>
          </View>

          {renderTree()}
          
          <View style={[styles.divider, { backgroundColor: c.border }]} />
          
          <TouchableOpacity style={styles.navItem} onPress={() => { onClose(); onNavigate?.('Settings'); }}>
            <Text style={styles.navIcon}>⚙️</Text>
            <Text style={[styles.navText, { color: c.text }]}>Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => { onClose(); onNavigate?.('Logs'); }}>
            <Text style={styles.navIcon}>📋</Text>
            <Text style={[styles.navText, { color: c.text }]}>Activity Logs</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: c.border }]}>
          <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: c.error + '15' }]} onPress={handleLogout}>
            <Text style={[styles.logoutText, { color: c.error }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, zIndex: 1000 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  drawer: { width: DRAWER_WIDTH, flex: 1, elevation: 16, shadowColor: '#000', shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.3, shadowRadius: 10 },
  profile: { paddingHorizontal: Spacing.xl, paddingTop: 60, paddingBottom: Spacing.xl, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  avatarPlaceholder: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#fff', fontSize: FontSize.xl, fontWeight: '700' },
  userInfo: { flex: 1 },
  userName: { fontSize: FontSize.md, fontWeight: '700' },
  userHandle: { fontSize: FontSize.xs },
  content: { flex: 1, paddingVertical: Spacing.md },
  navItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, gap: Spacing.md, marginHorizontal: Spacing.sm, borderRadius: BorderRadius.md },
  navIcon: { fontSize: 18 },
  navText: { fontSize: FontSize.md, fontWeight: '500' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 1.2 },
  syncIcon: { fontSize: 16 },
  folderItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, paddingRight: Spacing.lg, gap: Spacing.xs, marginHorizontal: Spacing.sm, borderRadius: BorderRadius.sm },
  chevron: { width: 24, alignItems: 'center' },
  chevronText: { fontSize: 10 },
  folderIcon: { fontSize: 16 },
  folderName: { fontSize: FontSize.md, flex: 1 },
  divider: { height: 1, marginVertical: Spacing.md, marginHorizontal: Spacing.xl },
  footer: { borderTopWidth: 1, padding: Spacing.xl },
  logoutBtn: { padding: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center' },
  logoutText: { fontWeight: '600' },
});

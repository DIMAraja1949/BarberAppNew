import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Modal,
  TextInput,
  Switch,
  Image,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabaseClient';

export default function ProfileScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const currentService = (params.bookedService as string) || 'Classic Fade & Beard Trim';
  const currentDate = (params.bookedDate as string) || 'غداً';
  const currentTime = (params.bookedTime as string) || '14:30 زوالاً';
  const remainingDays = params.remainingDays ? String(params.remainingDays) + ' أيام' : '10 أيام';

  const [whatsappModalVisible, setWhatsappModalVisible] = useState(false);
  const [servicesModalVisible, setServicesModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);

  const [clientName, setClientName] = useState('سيمو (Simo)');
  const [clientPhone, setClientPhone] = useState('+212 600-000000');
  const [primaryColor, setPrimaryColor] = useState('#CD813E');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      alert('يجب منح الإذن للوصول إلى معرض الصور لتغيير الصورة الشخصية!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const [servicesList, setServicesList] = useState([
    { id: '1', name: 'Classic Fade & Beard Trim', isFavorite: true },
    { id: '2', name: 'Royal Haircut & Hot Towel', isFavorite: false },
    { id: '3', name: 'Beard Styling & Shaving', isFavorite: true },
    { id: '4', name: 'Kids Haircut', isFavorite: false },
  ]);

  const toggleFavoriteService = (id: string) => {
    setServicesList(servicesList.map(s => s.id === id ? { ...s, isFavorite: !s.isFavorite } : s));
  };

  const handleSignOut = () => {
    Alert.alert(
      'تسجيل الخروج',
      'هل أنت متأكد أنك تريد تسجيل الخروج من التطبيق؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        { 
          text: 'تسجيل الخروج', 
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.auth.signOut();
              if (error) throw error;
              router.replace('/login');
            } catch (error: any) {
              Alert.alert('خطأ', error.message || 'حدث خطأ أثناء تسجيل الخروج');
            }
          } 
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#0B0B0B' }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0B0B" />
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
              <View style={[styles.avatarPlaceholder, { borderColor: primaryColor }]}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.avatarImage} />
                ) : (
                  <FontAwesome5 name="user-alt" size={38} color={primaryColor} />
                )}
              </View>
              <View style={[styles.editBadge, { backgroundColor: primaryColor }]}>
                <Ionicons name="camera" size={14} color="#121212" />
              </View>
            </TouchableOpacity>
          </View>
          <Text style={styles.nameText}>{clientName}</Text>
          <Text style={styles.phoneText}>{clientPhone}</Text>
          <View style={[styles.badgeContainer, { borderColor: primaryColor, backgroundColor: `${primaryColor}15` }]}>
            <MaterialCommunityIcons name="crown" size={16} color={primaryColor} />
            <Text style={[styles.badgeText, { color: primaryColor }]}>زبون ملكي مميز</Text>
          </View>
        </View>

        {/* Tracking & Next Appointment Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="time-outline" size={22} color={primaryColor} />
            <Text style={styles.cardTitle}>حجزك الملكي القادم</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${primaryColor}25` }]}>
              <Text style={[styles.statusText, { color: primaryColor }]}>مؤكد</Text>
            </View>
          </View>

          <View style={styles.appointmentDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>الموعد:</Text>
              <Text style={styles.detailValue}>{currentDate}، {currentTime}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>القصة المفضلة:</Text>
              <Text style={styles.detailValue} numberOfLines={1}>{currentService}</Text>
            </View>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressInfo}>
              <Text style={styles.progressLabel}>الوقت المتبقي للحلاقة:</Text>
              <Text style={[styles.progressTime, { color: primaryColor }]}>{remainingDays}</Text>
            </View>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: '65%', backgroundColor: primaryColor }]} />
            </View>
          </View>
        </View>

        {/* Loyalty & Points */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <MaterialCommunityIcons name="star-face" size={26} color={primaryColor} />
            <Text style={styles.statNumber}>120</Text>
            <Text style={styles.statLabel}>نقطة الولاء</Text>
          </View>
          <View style={styles.statBox}>
            <FontAwesome5 name="history" size={22} color={primaryColor} />
            <Text style={styles.statNumber}>8</Text>
            <Text style={styles.statLabel}>الزيارات السابقة</Text>
          </View>
        </View>

        {/* Menu Options */}
        <View style={styles.menuContainer}>
          <TouchableOpacity style={styles.menuItem} onPress={() => setWhatsappModalVisible(true)}>
            <View style={[styles.menuIconContainer, { backgroundColor: `${primaryColor}15` }]}>
              <Ionicons name="notifications-outline" size={20} color={primaryColor} />
            </View>
            <Text style={styles.menuText}>إشعارات واتساب التلقائية</Text>
            <Ionicons name="chevron-forward" size={18} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => setServicesModalVisible(true)}>
            <View style={[styles.menuIconContainer, { backgroundColor: `${primaryColor}15` }]}>
              <Ionicons name="heart-outline" size={20} color={primaryColor} />
            </View>
            <Text style={styles.menuText}>القصات والخدمات المفضلة</Text>
            <Ionicons name="chevron-forward" size={18} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => setSettingsModalVisible(true)}>
            <View style={[styles.menuIconContainer, { backgroundColor: `${primaryColor}15` }]}>
              <Ionicons name="settings-outline" size={20} color={primaryColor} />
            </View>
            <Text style={styles.menuText}>إعدادات الحساب والثيم</Text>
            <Ionicons name="chevron-forward" size={18} color="#666" />
          </TouchableOpacity>

          {/* Privacy Policy Option */}
          <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => router.push("/privacy" as any)}>
            <View style={[styles.menuIconContainer, { backgroundColor: `${primaryColor}15` }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={primaryColor} />
            </View>
            <Text style={styles.menuText}>سياسة الخصوصية (Privacy Policy)</Text>
            <Ionicons name="chevron-forward" size={18} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color="#FF4D4D" />
          <Text style={styles.signOutText}>تسجيل الخروج</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* --- MODALS --- */}
      <Modal visible={whatsappModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MaterialCommunityIcons name="whatsapp" size={40} color="#25D366" style={{ alignSelf: 'center', marginBottom: 10 }} />
            <Text style={styles.modalTitle}>إشعارات واتساب والتتبع</Text>
            <Text style={styles.modalDescription}>
              النظام مرتبط مباشرة مع حسابك لتذكيرك بموعد الحلاقة القادم عبر واتساب وتنبيهات الهاتف لضمان أناقتك المستمرة.
            </Text>
            <View style={styles.modalSettingRow}>
              <Text style={{ color: '#fff', fontSize: 13 }}>تفعيل التنبيهات التلقائية</Text>
              <Switch 
                value={notificationsEnabled} 
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#333', true: '#25D366' }}
              />
            </View>
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: primaryColor }]} onPress={() => setWhatsappModalVisible(false)}>
              <Text style={styles.modalButtonText}>حفظ وإغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={servicesModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="heart" size={38} color={primaryColor} style={{ alignSelf: 'center', marginBottom: 10 }} />
            <Text style={styles.modalTitle}>القصات والخدمات المفضلة ⭐</Text>
            <Text style={styles.modalSubTitle}>اختر خدماتك المفضلة لتظهر مباشرة عند الحجز:</Text>
            
            <ScrollView style={{ maxHeight: 200, marginVertical: 10 }}>
              {servicesList.map((service) => (
                <TouchableOpacity 
                  key={service.id} 
                  style={styles.serviceItemRow}
                  onPress={() => toggleFavoriteService(service.id)}
                >
                  <Text style={{ color: service.isFavorite ? '#fff' : '#888', fontSize: 13, flex: 1 }}>{service.name}</Text>
                  <Ionicons 
                    name={service.isFavorite ? "heart" : "heart-outline"} 
                    size={20} 
                    color={service.isFavorite ? primaryColor : "#555"} 
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={[styles.modalButton, { backgroundColor: primaryColor }]} onPress={() => setServicesModalVisible(false)}>
              <Text style={styles.modalButtonText}>تأكيد المفضلة</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={settingsModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="settings" size={38} color={primaryColor} style={{ alignSelf: 'center', marginBottom: 10 }} />
            <Text style={styles.modalTitle}>إعدادات الحساب والثيم ⚙️</Text>
            
            <Text style={styles.inputLabel}>تعديل اسم الزبون:</Text>
            <TextInput 
              style={styles.textInput} 
              value={clientName} 
              onChangeText={setClientName}
              placeholderTextColor="#666"
            />

            <Text style={styles.inputLabel}>تعديل رقم الهاتف:</Text>
            <TextInput 
              style={styles.textInput} 
              value={clientPhone} 
              onChangeText={setClientPhone}
              placeholderTextColor="#666"
              keyboardType="phone-pad"
            />

            <Text style={[styles.inputLabel, { marginTop: 10 }]}>تخصيص لون التطبيق (الثيم):</Text>
            <View style={styles.colorPickerRow}>
              {['#CD813E', '#E50914', '#007AFF', '#2ECC71', '#9B59B6', '#F39C12'].map((colorHex) => (
                <TouchableOpacity 
                  key={colorHex}
                  style={[styles.colorCircle, { backgroundColor: colorHex, borderWidth: primaryColor === colorHex ? 2.5 : 0, borderColor: '#fff' }]}
                  onPress={() => setPrimaryColor(colorHex)}
                />
              ))}
            </View>

            <TouchableOpacity style={[styles.modalButton, { backgroundColor: primaryColor, marginTop: 15 }]} onPress={() => setSettingsModalVisible(false)}>
              <Text style={styles.modalButtonText}>حفظ التغييرات</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 22,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#161616',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    padding: 6,
    borderRadius: 10,
    overflow: 'hidden',
  },
  nameText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  phoneText: {
    color: '#888888',
    fontSize: 13,
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  card: {
    backgroundColor: '#161616',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#262626',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 8,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  appointmentDetails: {
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    paddingBottom: 10,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailLabel: {
    color: '#888888',
    fontSize: 13,
  },
  detailValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
    maxWidth: '60%',
    textAlign: 'left',
  },
  progressSection: {
    marginTop: 2,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    color: '#888888',
    fontSize: 12,
  },
  progressTime: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#222',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#161616',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#262626',
  },
  statNumber: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 2,
  },
  statLabel: {
    color: '#888888',
    fontSize: 11,
  },
  menuContainer: {
    backgroundColor: '#161616',
    borderRadius: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#262626',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  menuIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: {
    color: '#FFFFFF',
    fontSize: 13,
    flex: 1,
    marginLeft: 10,
    fontWeight: '500',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1111',
    borderWidth: 1,
    borderColor: '#3D1C1C',
    borderRadius: 16,
    paddingVertical: 14,
  },
  signOutText: {
    color: '#FF4D4D',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#161616',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#262626',
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  modalSubTitle: {
    color: '#888',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 10,
  },
  modalDescription: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 18,
  },
  modalSettingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  serviceItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  inputLabel: {
    color: '#888',
    fontSize: 11,
    marginBottom: 4,
    marginTop: 8,
  },
  textInput: {
    backgroundColor: '#1E1E1E',
    color: '#fff',
    padding: 10,
    borderRadius: 10,
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#2E2E2E',
  },
  colorPickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 6,
    marginBottom: 4,
  },
  colorCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  modalButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  modalButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
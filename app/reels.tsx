import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Dimensions, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  StatusBar,
  Modal,
  TextInput,
  Share,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';

const { width, height } = Dimensions.get('window');

export default function ReelsScreen() {
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [commentsVisible, setCommentsVisible] = useState(false);
  const [currentReelId, setCurrentReelId] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  const videoRefs = useRef<{ [key: string]: Video | null }>({});

  useEffect(() => {
    fetchReels();
  }, []);

  const fetchReels = async () => {
    try {
      setLoading(true);
      const sessionData = await supabase.auth.getSession();
      const user = sessionData.data.session?.user;
      if (user) {
        setCurrentUserId(user.id);
      }
      
      const { data: reelsData, error: reelsError } = await supabase
        .from('reels')
        .select('*')
        .order('created_at', { ascending: false });

      if (reelsError) throw reelsError;

      let followingIds: string[] = [];
      if (user) {
        const { data: followData } = await supabase
          .from('follows')
          .select('following_user_id')
          .eq('follower_id', user.id);
        
        if (followData) {
          followingIds = followData.map((f: any) => f.following_user_id);
        }
      }

      const formattedData = (reelsData || []).map(r => ({ 
        ...r, 
        isLiked: false,
        isFollowing: r.user_id ? followingIds.includes(r.user_id) : false 
      }));

      setReels(formattedData);
    } catch (error: any) {
      console.error('Error fetching reels:', error.message);
      setReels([
        { 
          id: '1', 
          caption: 'Classic Fade with a twist! #BarberLife', 
          likes_count: 1200, 
          comments_count: 5,
          video_url: 'https://d23dyxeqlo5psv.cloudfront.net/big_buck_bunny.mp4',
          isLiked: false,
          isFollowing: false
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handlePickVideo = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission required", "We need access to your gallery!");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      uploadReel(result.assets[0].uri);
    } catch (error) {
      Alert.alert("Error", "Could not pick video");
    }
  };

  const uploadReel = async (videoUri: string) => {
    try {
      setUploading(true);
      const user = (await supabase.auth.getSession()).data.session?.user;
      if (!user) {
        Alert.alert("Auth Required", "Please log in to upload reels");
        return;
      }

      const fileExt = videoUri.split('.').pop();
      const fileName = `reel-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const response = await fetch(videoUri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('reels')
        .upload(filePath, arrayBuffer, {
          contentType: `video/${fileExt}`,
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('reels').getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('reels')
        .insert([
          {
            user_id: user.id,
            video_url: publicUrl,
            caption: 'New Barber Style Reel! #BarberStyle',
            likes_count: 0
          }
        ]);

      if (dbError) throw dbError;

      Alert.alert("Success", "Reel uploaded successfully!");
      fetchReels();
    } catch (error: any) {
      Alert.alert("Upload Failed", error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteReel = async (item: any) => {
    Alert.alert(
      "Delete Reel",
      "Are you sure you want to delete this reel?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              // حذف السجل مباشرة من قاعدة البيانات
              const { error: dbError } = await supabase
                .from('reels')
                .delete()
                .eq('id', item.id);

              if (dbError) throw dbError;

              // محاولة حذف الملف من Storage إذا أمكن
              if (item.video_url && currentUserId) {
                const urlParts = item.video_url.split('/');
                const fileName = urlParts[urlParts.length - 1];
                const filePath = `${currentUserId}/${fileName}`;
                await supabase.storage.from('reels').remove([filePath]);
              }

              setReels(prev => prev.filter(r => r.id !== item.id));
              Alert.alert("Success", "Reel deleted successfully");
            } catch (error: any) {
              Alert.alert("Error", error.message);
            }
          }
        }
      ]
    );
  };

  const handleLike = async (item: any) => {
    try {
      const alreadyLiked = item.isLiked;
      const newCount = alreadyLiked ? (item.likes_count - 1) : (item.likes_count + 1);
      const updatedLikedState = !alreadyLiked;

      setReels(prev => prev.map(r => r.id === item.id ? { ...r, likes_count: newCount, isLiked: updatedLikedState } : r));

      await supabase
        .from('reels')
        .update({ likes_count: newCount })
        .eq('id', item.id);
    } catch (error) {
      console.error("Error toggling like", error);
    }
  };

  const handleFollow = async (item: any, barberId: string) => {
    try {
      const user = (await supabase.auth.getSession()).data.session?.user;
      if (!user) {
        Alert.alert("Auth Required", "Please log in to follow barbers");
        return;
      }

      const currentFollowState = item.isFollowing;

      setReels(prev => prev.map(r => r.id === item.id ? { ...r, isFollowing: !currentFollowState } : r));

      if (currentFollowState) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_user_id', barberId);
      } else {
        await supabase
          .from('follows')
          .insert([{ follower_id: user.id, following_user_id: barberId }]);
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
      fetchReels();
    }
  };

  const openComments = async (reelId: string) => {
    setCurrentReelId(reelId);
    setCommentsVisible(true);
    setLoadingComments(true);

    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('reel_id', reelId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!newCommentText.trim() || !currentReelId) return;

    try {
      const user = (await supabase.auth.getSession()).data.session?.user;
      const commentObj = {
        reel_id: currentReelId,
        user_id: user?.id || 'guest',
        username: user?.email ? user.email.split('@')[0] : 'BarberUser',
        text: newCommentText.trim(),
        created_at: new Date().toISOString(),
      };

      setComments([commentObj, ...comments]);
      setNewCommentText('');

      await supabase.from('comments').insert([commentObj]);

      setReels(prev => prev.map(r => {
        if (r.id === currentReelId) {
          const newCommCount = (r.comments_count || 0) + 1;
          supabase.from('reels').update({ comments_count: newCommCount }).eq('id', currentReelId);
          return { ...r, comments_count: newCommCount };
        }
        return r;
      }));

    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  const handleShare = async (videoUrl: string) => {
    try {
      await Share.share({
        message: `Check out this amazing haircut reel on BarberApp! ${videoUrl}`,
        url: videoUrl,
      });
    } catch (error) {
      console.error("Error sharing video", error);
    }
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const renderReel = ({ item, index }: { item: any, index: number }) => {
    const isVisible = index === activeReelIndex;
    
    return (
      <View style={styles.reelContainer}>
        <TouchableOpacity activeOpacity={1} onPress={togglePlayPause} style={StyleSheet.absoluteFill}>
          <Video
            ref={(ref: Video | null) => {
              videoRefs.current[item.id] = ref;
            }}
            source={{ uri: item.video_url }}
            style={StyleSheet.absoluteFill}
            resizeMode={ResizeMode.COVER}
            shouldPlay={isVisible && isPlaying}
            isLooping
            useNativeControls={false}
          />
        </TouchableOpacity>

        {!isPlaying && isVisible && (
          <View pointerEvents="none" style={styles.pauseIconContainer}>
            <Ionicons color="rgba(255,255,255,0.7)" name="pause" size={60} />
          </View>
        )}

        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.gradient} />

        <View style={styles.rightActions}>
          <TouchableOpacity onPress={() => handleLike(item)} style={styles.actionBtn}>
            <Ionicons 
              color={item.isLiked ? "#ff3b30" : "#FFF"} 
              name={item.isLiked ? "heart" : "heart-outline"} 
              size={32} 
            />
            <Text style={styles.actionText}>{item.likes_count || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => openComments(item.id)} style={styles.actionBtn}>
            <Ionicons color="#FFF" name="chatbubble-outline" size={28} />
            <Text style={styles.actionText}>{item.comments_count || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleShare(item.video_url)} style={styles.actionBtn}>
            <Ionicons color="#FFF" name="share-social-outline" size={28} />
          </TouchableOpacity>

          {/* زر الحذف يظهر الآن مباشرة لجميع الفيديوهات لتسهيل الحذف */}
          <TouchableOpacity onPress={() => handleDeleteReel(item)} style={styles.actionBtn}>
            <Ionicons color="#ff3b30" name="trash-outline" size={28} />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomInfo}>
          <View style={styles.barberBadge}>
            <Text style={styles.barberName}>@BarberStyle</Text>
            <TouchableOpacity 
              style={[styles.followBtn, item.isFollowing && styles.followingBtnActive]} 
              onPress={() => handleFollow(item, item.user_id || 'default_barber')}
            >
              <Text style={[styles.followText, item.isFollowing && styles.followingTextActive]}>
                {item.isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.description}>{item.caption}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="transparent" barStyle="light-content" translucent />
      
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#CD813E" size="large" />
        </View>
      ) : (
        <FlatList 
          data={reels}
          decelerationRate="fast" 
          keyExtractor={(item) => item.id.toString()} 
          pagingEnabled 
          showsVerticalScrollIndicator={false} 
          snapToInterval={height}
          renderItem={renderReel}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.y / height);
            setActiveReelIndex(index);
            setIsPlaying(true);
          }}
        />
      )}

      <TouchableOpacity disabled={uploading} onPress={handlePickVideo} style={styles.uploadBtn}>
        {uploading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Ionicons color="#FFF" name="add" size={26} />
        )}
      </TouchableOpacity>

      <Modal animationType="slide" onRequestClose={() => setCommentsVisible(false)} transparent={true} visible={commentsVisible}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Comments</Text>
              <TouchableOpacity onPress={() => setCommentsVisible(false)}>
                <Ionicons color="#FFF" name="close" size={24} />
              </TouchableOpacity>
            </View>

            {loadingComments ? (
              <ActivityIndicator color="#CD813E" size="small" style={{ marginTop: 20 }} />
            ) : (
              <FlatList 
                data={comments} 
                keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                renderItem={({ item }) => (
                  <View style={styles.commentItem}>
                    <Text style={styles.commentUser}>@{item.username || 'User'}</Text>
                    <Text style={styles.commentText}>{item.text}</Text>
                  </View>
                )}
                ListEmptyComponent={<Text style={styles.noComments}>No comments yet. Be the first!</Text>}
                style={styles.commentsList}
              />
            )}

            <View style={styles.commentInputContainer}>
              <TextInput 
                onChangeText={setNewCommentText} 
                placeholder="Add a comment..." 
                placeholderTextColor="#888" 
                style={styles.commentInput} 
                value={newCommentText} 
              />
              <TouchableOpacity onPress={handleAddComment} style={styles.sendBtn}>
                <Ionicons color="#CD813E" name="send" size={20} />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  reelContainer: { width, height },
  gradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%' },
  pauseIconContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -30 }, { translateY: -30 }],
    zIndex: 5,
  },
  rightActions: { position: 'absolute', right: 15, bottom: 100, alignItems: 'center' },
  actionBtn: { marginBottom: 20, alignItems: 'center' },
  actionText: { color: '#FFF', fontSize: 13, fontWeight: '600', marginTop: 4 },
  bottomInfo: { position: 'absolute', bottom: 35, left: 20, right: 80 },
  barberBadge: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  barberName: { color: '#FFF', fontWeight: '900', fontSize: 15, marginRight: 12 },
  followBtn: { borderWidth: 1, borderColor: '#FFF', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
  followText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  followingBtnActive: { backgroundColor: '#FFF', borderColor: '#FFF' },
  followingTextActive: { color: '#000' },
  description: { color: '#FFF', fontSize: 13, lineHeight: 18, opacity: 0.9 },
  uploadBtn: { 
    position: 'absolute', 
    top: 50, 
    right: 20, 
    zIndex: 10, 
    backgroundColor: '#CD813E', 
    width: 38, 
    height: 38, 
    borderRadius: 19, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { height: '55%', backgroundColor: '#111', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#222', paddingBottom: 10 },
  modalTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  commentsList: { marginTop: 10, flex: 1 },
  commentItem: { marginBottom: 15 },
  commentUser: { color: '#CD813E', fontWeight: 'bold', fontSize: 13, marginBottom: 2 },
  commentText: { color: '#FFF', fontSize: 13 },
  noComments: { color: '#777', textAlign: 'center', marginTop: 30 },
  commentInputContainer: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#222', paddingTop: 10 },
  commentInput: { flex: 1, backgroundColor: '#222', color: '#FFF', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, fontSize: 13 },
  sendBtn: { marginLeft: 10, padding: 5 },
});
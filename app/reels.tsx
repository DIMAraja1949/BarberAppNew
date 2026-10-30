import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    PanResponder,
    Platform,
    Share,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

const { width } = Dimensions.get("window");

type ReportTarget = {
  contentType: "reel" | "comment" | "gallery";
  contentId: string;
  reportedUserId?: string;
};

const ReelItem = ({
  item,
  index,
  scrollY,
  isVisible,
  insets,
  reelHeight,
  isAdmin,
  currentUserId,
  onLike,
  onComment,
  onShare,
  onDelete,
  onReport,
  onBlock,
  onFollow,
  isMuted,
  onToggleMute,
}: any) => {
  const inputRange = [
    (index - 1) * reelHeight,
    index * reelHeight,
    (index + 1) * reelHeight,
  ];

  const scale = scrollY.interpolate({
    inputRange,
    outputRange: [0.9, 1, 0.9],
    extrapolate: "clamp",
  });

  const opacity = scrollY.interpolate({
    inputRange,
    outputRange: [0.6, 1, 0.6],
    extrapolate: "clamp",
  });
  const [progress, setProgress] = useState(0);
  const [showHeart, setShowHeart] = useState(false);
  const heartScale = useRef(new Animated.Value(0)).current;
  const lastTap = useRef(0);
  const isDragging = useRef(false);
  const knobScale = useRef(new Animated.Value(1)).current;

  const player = useVideoPlayer(item.video_url, (player: any) => {
    player.loop = true;
    player.muted = isMuted;
    if (isVisible) {
      player.play();
    }
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        isDragging.current = true;
        player.pause();
        Animated.spring(knobScale, {
          toValue: 1.5,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderMove: (_, gestureState) => {
        const barWidth = width - 40;
        // Adjust for the 20px padding on the left
        const relativeX = gestureState.moveX - 20;
        const newProgress = Math.max(0, Math.min(1, relativeX / barWidth));
        setProgress(newProgress);

        // Real-time seeking for smoothness
        if (player.duration > 0) {
          player.currentTime = newProgress * player.duration;
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        isDragging.current = false;
        Animated.spring(knobScale, {
          toValue: 1,
          useNativeDriver: true,
        }).start();
        const barWidth = width - 40;
        const relativeX = gestureState.moveX - 20;
        const newProgress = Math.max(0, Math.min(1, relativeX / barWidth));

        if (player.duration > 0) {
          player.currentTime = newProgress * player.duration;
        }
        player.play();
      },
    }),
  ).current;

  useEffect(() => {
    player.muted = isMuted;
  }, [isMuted, player]);

  useEffect(() => {
    if (isVisible) {
      player.play();
    } else {
      player.pause();
      // Reset video to start when moving to another reel
      if (player.duration > 0) {
        player.currentTime = 0;
        setProgress(0);
      }
    }
  }, [isVisible, player]);

  // High-precision progress tracking
  useEffect(() => {
    let animationFrame: number;

    const updateProgress = () => {
      if (isVisible && player.duration > 0 && !isDragging.current) {
        const currentProgress = player.currentTime / player.duration;
        setProgress(currentProgress);
      }
      animationFrame = requestAnimationFrame(updateProgress);
    };

    if (isVisible) {
      animationFrame = requestAnimationFrame(updateProgress);
    }

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [isVisible, player]);

  const [localIsPlaying, setLocalIsPlaying] = useState(true);

  const togglePlayPause = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (lastTap.current && now - lastTap.current < DOUBLE_TAP_DELAY) {
      // Double Tap Detected
      handleDoubleTapLike();
    } else {
      // Single Tap Logic
      if (player.playing) {
        player.pause();
        setLocalIsPlaying(false);
      } else {
        player.play();
        setLocalIsPlaying(true);
      }
    }
    lastTap.current = now;
  };

  const handleDoubleTapLike = () => {
    if (!item.isLiked) {
      onLike(item);
    }

    // Heart Animation
    setShowHeart(true);
    Animated.sequence([
      Animated.spring(heartScale, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.timing(heartScale, {
        toValue: 0,
        duration: 200,
        delay: 500,
        useNativeDriver: true,
      }),
    ]).start(() => setShowHeart(false));
  };

  return (
    <Animated.View
      style={[
        styles.reelContainer,
        { width, height: reelHeight, opacity, transform: [{ scale }] },
      ]}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={togglePlayPause}
        style={StyleSheet.absoluteFill}
      >
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
        />
      </TouchableOpacity>

      {!localIsPlaying && isVisible && (
        <View pointerEvents="none" style={styles.pauseIconContainer}>
          <Ionicons color="rgba(255,255,255,0.7)" name="pause" size={60} />
        </View>
      )}

      {/* Double Tap Heart Animation */}
      {showHeart && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.heartAnimationContainer,
            { transform: [{ scale: heartScale }] },
          ]}
        >
          <Ionicons name="heart" size={100} color="#FFF" />
        </Animated.View>
      )}

      {/* Mute/Unmute Button */}
      <TouchableOpacity
        style={[styles.muteBtn, { top: insets.top + 20, left: 20 }]}
        onPress={onToggleMute}
      >
        <Ionicons
          name={isMuted ? "volume-mute" : "volume-high"}
          size={24}
          color="#FFF"
        />
      </TouchableOpacity>

      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.85)"]}
        style={styles.gradient}
      />

      <View style={[styles.rightActions, { bottom: 100 + insets.bottom }]}>
        <TouchableOpacity onPress={() => onLike(item)} style={styles.actionBtn}>
          <Ionicons
            color={item.isLiked ? "#ff3b30" : "#FFF"}
            name={item.isLiked ? "heart" : "heart-outline"}
            size={32}
          />
          <Text style={styles.actionText}>{item.likes_count || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onComment(item.id)}
          style={styles.actionBtn}
        >
          <Ionicons color="#FFF" name="chatbubble-outline" size={28} />
          <Text style={styles.actionText}>{item.comments_count || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onShare(item.video_url)}
          style={styles.actionBtn}
        >
          <Ionicons color="#FFF" name="share-social-outline" size={28} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            onReport({
              contentType: "reel",
              contentId: String(item.id),
              reportedUserId: item.user_id,
            })
          }
          style={styles.actionBtn}
          accessibilityRole="button"
          accessibilityLabel="Report this reel"
        >
          <Ionicons color="#FFF" name="flag-outline" size={25} />
        </TouchableOpacity>
        {item.user_id && item.user_id !== currentUserId && (
            <TouchableOpacity
              onPress={() => onBlock(item.user_id, item.profiles?.name)}
              style={styles.actionBtn}
              accessibilityRole="button"
              accessibilityLabel="Block this user"
            >
              <Ionicons color="#FFF" name="person-remove-outline" size={25} />
            </TouchableOpacity>
        )}

        {(isAdmin || item.user_id === currentUserId) && (
          <TouchableOpacity
            onPress={() => onDelete(item)}
            style={styles.actionBtn}
          >
            <Ionicons color="#ff3b30" name="trash-outline" size={28} />
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.bottomInfo, { bottom: 40 + insets.bottom }]}>
        <View style={styles.barberBadge}>
          <Text style={styles.barberName}>
            @{item.profiles?.name || "BarberUser"}
          </Text>
          <TouchableOpacity
            style={[
              styles.followBtn,
              item.isFollowing && styles.followingBtnActive,
            ]}
            onPress={() => onFollow(item, item.user_id || "default_barber")}
          >
            <Text
              style={[
                styles.followText,
                item.isFollowing && styles.followingTextActive,
              ]}
            >
              {item.isFollowing ? "Following" : "Follow"}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.description}>{item.caption}</Text>
      </View>

      {/* Glowing Progress Bar - Interactive & Draggable */}
      <View
        style={[styles.progressBarContainer, { bottom: insets.bottom + 15 }]}
        {...panResponder.panHandlers}
      >
        <View style={styles.progressBarBackground}>
          <View
            style={[styles.progressBarFill, { width: `${progress * 100}%` }]}
          >
            {/* White Knob (Dot) - Animated for 2027 feel */}
            <Animated.View
              style={[
                styles.progressKnob,
                { transform: [{ scale: knobScale }] },
              ]}
            />
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

export default function ReelsScreen() {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const reelHeight =
    Platform.OS === "android"
      ? height + (StatusBar.currentHeight || 0)
      : height;

  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [primaryColor, setPrimaryColor] = useState("#CD813E");
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [feedError, setFeedError] = useState("");

  const [commentsVisible, setCommentsVisible] = useState(false);
  const [currentReelId, setCurrentReelId] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchReels();
  }, []);

  const fetchReels = async () => {
    try {
      setLoading(true);
      const savedColor = await AsyncStorage.getItem("primaryColor");
      if (savedColor) setPrimaryColor(savedColor);
      const savedBlockedUsers = await AsyncStorage.getItem("blockedUserIds");
      let blockedIds: string[] = [];
      if (savedBlockedUsers) {
        try {
          const parsedBlockedUsers: unknown = JSON.parse(savedBlockedUsers);
          if (
            Array.isArray(parsedBlockedUsers) &&
            parsedBlockedUsers.every((id) => typeof id === "string")
          ) {
            blockedIds = parsedBlockedUsers;
          } else {
            throw new Error("Blocked-account data is invalid.");
          }
        } catch (error) {
          Alert.alert(
            "Blocked accounts unavailable",
            error instanceof Error
              ? error.message
              : "Could not read your blocked-account list.",
          );
        }
      }
      setBlockedUserIds(blockedIds);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (user) {
        setCurrentUserId(user.id);
        setIsAdmin(user.email === "mohameddayan2@gmail.com");
      }

      // 1. Fetch all reels
      const { data: reelsData, error: reelsError } = await supabase
        .from("reels")
        .select("*")
        .order("created_at", { ascending: false });

      if (reelsError) throw reelsError;

      // 2. Fetch all profiles for names
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, name, email");
      const profileMap: any = {};
      if (profilesData)
        profilesData.forEach((p) => {
          profileMap[p.id] = p;
        });

      // 3. Fetch ALL likes to count them accurately
      const { data: allLikes } = await supabase
        .from("reel_likes")
        .select("reel_id, user_id");
      const likeCounts: any = {};
      const userLikedReelIds: string[] = [];

      if (allLikes) {
        allLikes.forEach((l) => {
          const rid = String(l.reel_id);
          likeCounts[rid] = (likeCounts[rid] || 0) + 1;
          if (user && l.user_id === user.id) userLikedReelIds.push(rid);
        });
      }

      // 4. Fetch ALL comments to count them accurately
      const { data: allComments } = await supabase
        .from("comments")
        .select("reel_id");
      const commentCounts: any = {};
      if (allComments) {
        allComments.forEach((c) => {
          const rid = String(c.reel_id);
          commentCounts[rid] = (commentCounts[rid] || 0) + 1;
        });
      }

      // 5. Fetch follows
      let followingIds: string[] = [];
      if (user) {
        const { data: followData } = await supabase
          .from("follows")
          .select("following_user_id")
          .eq("follower_id", user.id);
        if (followData)
          followingIds = followData.map((f: any) => f.following_user_id);
      }

      // 6. Format final data
      const formattedData = (reelsData || []).map((r) => {
        const rid = String(r.id);
        const matchedProfile = profileMap[r.user_id];
        return {
          ...r,
          profiles: matchedProfile
            ? {
                name:
                  matchedProfile.name || matchedProfile.email?.split("@")[0],
              }
            : { name: "BarberUser" },
          isLiked: userLikedReelIds.includes(rid),
          isFollowing: r.user_id ? followingIds.includes(r.user_id) : false,
          likes_count: likeCounts[rid] || 0,
          comments_count: commentCounts[rid] || 0,
        };
      });

      setFeedError("");
      setReels(
        formattedData.filter((reel) => !blockedIds.includes(reel.user_id)),
      );
    } catch (error: any) {
      console.error("Error fetching reels:", error.message);
      setFeedError(error.message || "Could not load reels. Please try again.");
      setReels([]);
    } finally {
      setLoading(false);
    }
  };

  const requestReport = (target: ReportTarget) => {
    setReportTarget(target);
    setReportReason("");
  };

  const submitReport = async () => {
    const reason = reportReason.trim();
    if (!reportTarget || !reason) {
      Alert.alert("Reason required", "Please describe why you are reporting this content.");
      return;
    }

    setSubmittingReport(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const { error } = await supabase.from("content_reports").insert({
        content_type: reportTarget.contentType,
        target_content_id: reportTarget.contentId,
        reported_user_id: reportTarget.reportedUserId ?? null,
        reporter_user_id: session?.user.id ?? null,
        reason,
      });
      if (error) throw error;

      setReportTarget(null);
      setReportReason("");
      Alert.alert(
        "Report received",
        "Thank you. Our moderation team will review this content.",
      );
    } catch (error) {
      Alert.alert(
        "Report not sent",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSubmittingReport(false);
    }
  };

  const blockUser = (userId: string, userName?: string) => {
    Alert.alert(
      "Block this account?",
      `${userName || "This user"}'s reels and comments will be hidden on this device.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            try {
              const savedBlockedUsers =
                await AsyncStorage.getItem("blockedUserIds");
              let existingIds: string[] = [];
              if (savedBlockedUsers) {
                const parsed: unknown = JSON.parse(savedBlockedUsers);
                if (
                  !Array.isArray(parsed) ||
                  !parsed.every((id) => typeof id === "string")
                ) {
                  throw new Error("Your blocked-account list is invalid.");
                }
                existingIds = parsed;
              }
              const nextBlockedIds = Array.from(
                new Set([...existingIds, userId]),
              );
              setBlockedUserIds(nextBlockedIds);
              setReels((current) =>
                current.filter((reel) => reel.user_id !== userId),
              );
              setComments((current) =>
                current.filter((comment) => comment.user_id !== userId),
              );
              setActiveReelIndex(0);
              await AsyncStorage.setItem(
                "blockedUserIds",
                JSON.stringify(nextBlockedIds),
              );

              const {
                data: { session },
              } = await supabase.auth.getSession();
              const { error } = await supabase.from("content_reports").insert({
                content_type: "user_block",
                target_content_id: userId,
                reported_user_id: userId,
                reporter_user_id: session?.user.id ?? null,
                reason: `User blocked ${userName || userId}. Content hidden on this device.`,
              });
              if (error) {
                Alert.alert(
                  "User blocked locally",
                  `This user's content is hidden on this device, but the moderation team could not be notified: ${error.message}`,
                );
              }
            } catch (error) {
              Alert.alert(
                "User blocked locally",
                `This user's content is hidden for now, but the block could not be saved or sent to moderation. ${
                  error instanceof Error ? error.message : "Please try again."
                }`,
              );
            }
          },
        },
      ],
    );
  };

  const handlePickVideo = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission required", "Gallery access needed!");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 1,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    uploadReel(result.assets[0].uri);
  };

  const uploadReel = async (videoUri: string) => {
    try {
      setUploading(true);
      const user = (await supabase.auth.getSession()).data.session?.user;
      if (!user) return;
      const fileExt = videoUri.split(".").pop();
      const fileName = `reel-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      const response = await fetch(videoUri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from("reels")
        .upload(filePath, arrayBuffer, {
          contentType: `video/${fileExt}`,
          upsert: true,
        });
      if (uploadError) throw uploadError;
      const {
        data: { publicUrl },
      } = supabase.storage.from("reels").getPublicUrl(filePath);
      await supabase
        .from("reels")
        .insert([
          {
            user_id: user.id,
            video_url: publicUrl,
            caption: "New Style!",
            likes_count: 0,
          },
        ]);
      fetchReels();
    } catch (error: any) {
      Alert.alert("Upload Failed", error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteReel = async (item: any) => {
    Alert.alert("Delete Reel", "Are you sure?", [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await supabase.from("reels").delete().eq("id", item.id);
          setReels((prev) => prev.filter((r) => r.id !== item.id));
        },
      },
    ]);
  };

  const handleLike = async (item: any) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      Alert.alert("Login Required", "Please login to like reels.");
      return;
    }

    const isCurrentlyLiked = item.isLiked;
    const currentCount = Number(item.likes_count || 0);
    const newCount = isCurrentlyLiked
      ? Math.max(0, currentCount - 1)
      : currentCount + 1;

    // Update UI immediately
    setReels((prev) => [
      ...prev.map((r) =>
        String(r.id) === String(item.id)
          ? { ...r, likes_count: newCount, isLiked: !isCurrentlyLiked }
          : r,
      ),
    ]);

    try {
      const reelIdNum = Number(item.id);
      if (isCurrentlyLiked) {
        await supabase
          .from("reel_likes")
          .delete()
          .eq("user_id", user.id)
          .eq("reel_id", reelIdNum);
      } else {
        await supabase
          .from("reel_likes")
          .insert([{ user_id: user.id, reel_id: reelIdNum }]);
      }
      await supabase
        .from("reels")
        .update({ likes_count: newCount })
        .eq("id", reelIdNum);
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const handleFollow = async (item: any, barberId: string) => {
    const user = (await supabase.auth.getSession()).data.session?.user;
    if (!user) {
      Alert.alert("Login Required", "Please sign in to follow users.");
      return;
    }
    setReels((prev) =>
      prev.map((r) =>
        r.id === item.id ? { ...r, isFollowing: !item.isFollowing } : r,
      ),
    );
    if (item.isFollowing) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_user_id", barberId);
    } else {
      await supabase
        .from("follows")
        .insert([{ follower_id: user.id, following_user_id: barberId }]);
    }
  };

  const openComments = async (reelId: string) => {
    setCurrentReelId(reelId);
    setCommentsVisible(true);
    setLoadingComments(true);

    try {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("reel_id", reelId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setComments(
        (data || []).filter(
          (comment) => !blockedUserIds.includes(comment.user_id),
        ),
      );
    } catch (err) {
      console.error("Error fetching comments:", err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!newCommentText.trim() || !currentReelId) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      Alert.alert("Login Required", "Please login to comment.");
      return;
    }

    const reelIdNum = Number(currentReelId);
    const commentObj = {
      reel_id: reelIdNum,
      user_id: user.id,
      username: user.email ? user.email.split("@")[0] : "BarberUser",
      text: newCommentText.trim(),
      created_at: new Date().toISOString(),
    };

    setComments([commentObj, ...comments]);
    setNewCommentText("");

    try {
      await supabase.from("comments").insert([commentObj]);
      // Update the reel's comment count in the list
      setReels((prev) =>
        prev.map((r) =>
          String(r.id) === String(currentReelId)
            ? { ...r, comments_count: (Number(r.comments_count) || 0) + 1 }
            : r,
        ),
      );
      // Also update in DB
      const currentReel = reels.find(
        (r) => String(r.id) === String(currentReelId),
      );
      const newCommentCount = (Number(currentReel?.comments_count) || 0) + 1;
      await supabase
        .from("reels")
        .update({ comments_count: newCommentCount })
        .eq("id", reelIdNum);
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  const handleShare = async (videoUrl: string) => {
    Share.share({ message: `Check this out! ${videoUrl}` });
  };

  return (
    <View style={styles.container}>
      <StatusBar
        backgroundColor="transparent"
        barStyle="light-content"
        translucent
      />

      {/* Glowing Reels Header */}
      <View style={[styles.reelsHeader, { top: insets.top + 20 }]}>
        <Text style={styles.reelsHeaderText}>Reels</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
      ) : (
        <Animated.FlatList
          data={reels}
          extraData={reels}
          keyExtractor={(item) => String(item.id)}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={reelHeight}
          snapToAlignment="start"
          decelerationRate="fast"
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true },
          )}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(
              e.nativeEvent.contentOffset.y / reelHeight,
            );
            setActiveReelIndex(index);
          }}
          renderItem={({ item, index }) => (
            <ReelItem
              item={item}
              index={index}
              scrollY={scrollY}
              isVisible={index === activeReelIndex}
              insets={insets}
              reelHeight={reelHeight}
              isAdmin={isAdmin}
              currentUserId={currentUserId}
              onLike={handleLike}
              onComment={openComments}
              onShare={handleShare}
              onDelete={handleDeleteReel}
              onReport={requestReport}
              onBlock={blockUser}
              onFollow={handleFollow}
              isMuted={isMuted}
              onToggleMute={() => setIsMuted(!isMuted)}
            />
          )}
          ListEmptyComponent={
            <View style={[styles.emptyFeed, { height: reelHeight }]}>
              <Ionicons
                name={feedError ? "cloud-offline-outline" : "videocam-outline"}
                size={54}
                color={primaryColor}
              />
              <Text style={styles.emptyFeedTitle}>
                {feedError ? "Reels unavailable" : "No reels yet"}
              </Text>
              <Text style={styles.emptyFeedMessage}>
                {feedError
                  ? feedError
                  : "Check back soon for fresh cuts and style inspiration."}
              </Text>
              {feedError ? (
                <TouchableOpacity
                  style={[styles.retryButton, { borderColor: primaryColor }]}
                  onPress={fetchReels}
                >
                  <Text style={[styles.retryButtonText, { color: primaryColor }]}>
                    Try again
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
        />
      )}

      {/* Upload Button */}
      {isAdmin && (
        <TouchableOpacity
          style={[
            styles.uploadBtn2026,
            {
              top: insets.top + 20,
              right: 20,
              backgroundColor: "rgba(255,255,255,0.15)",
              borderColor: primaryColor,
            },
          ]}
          onPress={handlePickVideo}
        >
          {uploading ? (
            <ActivityIndicator color={primaryColor} />
          ) : (
            <View style={styles.uploadBtnContent}>
              <Ionicons name="add-circle" size={24} color={primaryColor} />
              <Text style={[styles.uploadBtnText, { color: primaryColor }]}>
                Post
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Comments Modal */}
      <Modal visible={commentsVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalCloseArea}
            onPress={() => setCommentsVisible(false)}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Comments</Text>
              <TouchableOpacity onPress={() => setCommentsVisible(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            {loadingComments ? (
              <ActivityIndicator style={{ margin: 20 }} color={primaryColor} />
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(_, idx) => idx.toString()}
                renderItem={({ item }) => (
                  <View style={styles.commentItem}>
                    <Text style={styles.commentUser}>@{item.username}</Text>
                    <Text style={styles.commentText}>{item.text}</Text>
                    <View style={styles.commentModeration}>
                      <TouchableOpacity
                        onPress={() => {
                          setCommentsVisible(false);
                          requestReport({
                            contentType: "comment",
                            contentId: String(item.id),
                            reportedUserId: item.user_id,
                          });
                        }}
                        accessibilityRole="button"
                      >
                        <Text style={styles.moderationAction}>Report</Text>
                      </TouchableOpacity>
                      {item.user_id && item.user_id !== currentUserId && (
                        <TouchableOpacity
                          onPress={() =>
                            blockUser(item.user_id, item.username)
                          }
                          accessibilityRole="button"
                        >
                          <Text style={styles.moderationAction}>Block user</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
                ListEmptyComponent={
                  <Text style={styles.noComments}>No comments yet.</Text>
                }
              />
            )}

            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Add a comment..."
                placeholderTextColor="#888"
                value={newCommentText}
                onChangeText={setNewCommentText}
              />
              <TouchableOpacity onPress={handleAddComment}>
                <Ionicons name="send" size={24} color={primaryColor} />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal
        visible={reportTarget !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setReportTarget(null)}
      >
        <View style={styles.reportOverlay}>
          <View style={styles.reportCard}>
            <Text style={styles.modalTitle}>Report content</Text>
            <Text style={styles.reportDescription}>
              Tell us why this {reportTarget?.contentType} violates our
              community standards. Reports are reviewed by the moderation
              team.
            </Text>
            <TextInput
              style={styles.reportInput}
              placeholder="Describe the issue (required)"
              placeholderTextColor="#888"
              value={reportReason}
              onChangeText={setReportReason}
              maxLength={1000}
              multiline
              textAlignVertical="top"
              accessibilityLabel="Reason for reporting"
            />
            <View style={styles.reportActions}>
              <TouchableOpacity
                style={styles.reportCancelButton}
                onPress={() => setReportTarget(null)}
                disabled={submittingReport}
              >
                <Text style={styles.reportCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.reportSubmitButton,
                  { backgroundColor: primaryColor },
                  submittingReport && styles.reportButtonDisabled,
                ]}
                onPress={submitReport}
                disabled={submittingReport}
              >
                <Text style={styles.reportSubmitText}>
                  {submittingReport ? "Sending..." : "Submit report"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyFeed: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    backgroundColor: "#0B0B0B",
  },
  emptyFeedTitle: {
    color: "#FFF",
    fontSize: 22,
    fontWeight: "700",
    marginTop: 18,
  },
  emptyFeedMessage: {
    color: "#999",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 8,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
  },
  retryButtonText: { fontSize: 14, fontWeight: "700" },
  reelContainer: { backgroundColor: "#000" },
  gradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "40%",
  },
  rightActions: {
    position: "absolute",
    right: 15,
    alignItems: "center",
    gap: 20,
  },
  actionBtn: { alignItems: "center" },
  actionText: { color: "#FFF", fontSize: 12, marginTop: 4, fontWeight: "bold" },
  bottomInfo: { position: "absolute", left: 20, right: 80 },
  barberBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  barberName: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
  followBtn: {
    borderWidth: 1,
    borderColor: "#FFF",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  followingBtnActive: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderColor: "transparent",
  },
  followText: { color: "#FFF", fontSize: 12, fontWeight: "bold" },
  followingTextActive: { opacity: 0.8 },
  description: { color: "#FFF", fontSize: 14, lineHeight: 20 },
  pauseIconContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
  },
  heartAnimationContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  muteBtn: {
    position: "absolute",
    zIndex: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  uploadBtn2026: {
    position: "absolute",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 25,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  reelsHeader: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  reelsHeaderText: {
    color: "#FFF",
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "none", // Ensures "Reels" case is preserved
  },
  progressBarContainer: {
    position: "absolute",
    left: 20,
    right: 20,
    height: 20, // Increased hit area for touch
    justifyContent: "center",
    zIndex: 10,
  },
  touchableBar: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#FFF",
    borderRadius: 2,
    shadowColor: "#FFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 5,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  progressKnob: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFF",
    shadowColor: "#FFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 5,
    marginRight: -4,
  },
  uploadBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  uploadBtnText: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  modalContainer: { flex: 1, justifyContent: "flex-end" },
  modalCloseArea: { flex: 1 },
  modalContent: {
    backgroundColor: "#1A1A1A",
    height: "60%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { color: "#FFF", fontSize: 18, fontWeight: "bold" },
  commentItem: {
    marginBottom: 15,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#2A2A2A",
  },
  commentUser: {
    color: "#CD813E",
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 2,
  },
  commentText: { color: "#EEE", fontSize: 14 },
  commentModeration: {
    flexDirection: "row",
    gap: 18,
    marginTop: 8,
  },
  moderationAction: { color: "#CD813E", fontSize: 12, fontWeight: "700" },
  noComments: { color: "#888", textAlign: "center", marginTop: 20 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#333",
    paddingTop: 15,
  },
  input: {
    flex: 1,
    backgroundColor: "#333",
    borderRadius: 20,
    paddingHorizontal: 15,
    height: 40,
    color: "#FFF",
  },
  reportOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
    padding: 20,
  },
  reportCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#1A1A1A",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#333",
    padding: 20,
  },
  reportDescription: {
    color: "#AAA",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    marginBottom: 14,
  },
  reportInput: {
    minHeight: 110,
    maxHeight: 180,
    backgroundColor: "#292929",
    borderRadius: 12,
    padding: 12,
    color: "#FFF",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#3A3A3A",
  },
  reportActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
  },
  reportCancelButton: {
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  reportCancelText: { color: "#BBB", fontSize: 13, fontWeight: "700" },
  reportSubmitButton: {
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  reportSubmitText: { color: "#FFF", fontSize: 13, fontWeight: "800" },
  reportButtonDisabled: { opacity: 0.6 },
});

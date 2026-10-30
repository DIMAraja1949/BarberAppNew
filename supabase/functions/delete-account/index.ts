import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405, headers: corsHeaders },
    );
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return Response.json(
      { error: "A signed-in user is required." },
      { status: 401, headers: corsHeaders },
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return Response.json(
      { error: "Account deletion is not configured on the server." },
      { status: 500, headers: corsHeaders },
    );
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user) {
    return Response.json(
      { error: "The signed-in user could not be verified." },
      { status: 401, headers: corsHeaders },
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) throw profileError;

    const ownedReelIds: (number | string)[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data: ownedReels, error: ownedReelsError } = await admin
        .from("reels")
        .select("id")
        .eq("user_id", user.id)
        .range(offset, offset + 999);
      if (ownedReelsError) throw ownedReelsError;
      ownedReelIds.push(...(ownedReels || []).map((reel) => reel.id));
      if ((ownedReels || []).length < 1000) break;
    }

    const reelFilePaths: string[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data: storedFiles, error: listError } = await admin.storage
        .from("reels")
        .list(user.id, { limit: 1000, offset });
      if (listError) throw listError;
      reelFilePaths.push(
        ...storedFiles.map((file) => `${user.id}/${file.name}`),
      );
      if (storedFiles.length < 1000) break;
    }
    if (reelFilePaths.length > 0) {
      const { error: removeError } = await admin.storage
        .from("reels")
        .remove(reelFilePaths);
      if (removeError) throw removeError;
    }

    const avatarFilePaths: string[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data: storedFiles, error: listError } = await admin.storage
        .from("avatars")
        .list("", { limit: 1000, offset });
      if (listError) throw listError;
      avatarFilePaths.push(
        ...storedFiles
          .filter((file) => file.name.startsWith(`${user.id}-`))
          .map((file) => file.name),
      );
      if (storedFiles.length < 1000) break;
    }
    if (avatarFilePaths.length > 0) {
      const { error: removeError } = await admin.storage
        .from("avatars")
        .remove(avatarFilePaths);
      if (removeError) throw removeError;
    }

    if (profile?.avatar_url) {
      const { error: barberImageError } = await admin
        .from("barbers")
        .update({ image_url: null })
        .eq("image_url", profile.avatar_url);
      if (barberImageError) throw barberImageError;
    }

    const cleanupSteps = [
      admin.from("reel_likes").delete().eq("user_id", user.id),
      admin.from("comments").delete().eq("user_id", user.id),
      admin.from("content_reports").delete().eq("reporter_user_id", user.id),
    ];
    cleanupSteps.push(
      admin
        .from("follows")
        .delete()
        .or(`follower_id.eq.${user.id},following_user_id.eq.${user.id}`),
      admin.from("home_requests").delete().eq("user_id", user.id),
      admin.from("bookings").delete().eq("user_id", user.id),
    );
    for (const operation of cleanupSteps) {
      const { error } = await operation;
      if (error) throw error;
    }
    for (let offset = 0; offset < ownedReelIds.length; offset += 500) {
      const reelIdBatch = ownedReelIds.slice(offset, offset + 500);
      const { error: likesError } = await admin
        .from("reel_likes")
        .delete()
        .in("reel_id", reelIdBatch);
      if (likesError) throw likesError;
      const { error: commentsError } = await admin
        .from("comments")
        .delete()
        .in("reel_id", reelIdBatch);
      if (commentsError) throw commentsError;
    }

    const { error: reelsError } = await admin
      .from("reels")
      .delete()
      .eq("user_id", user.id);
    if (reelsError) throw reelsError;

    const { error: profileDeleteError } = await admin
      .from("profiles")
      .delete()
      .eq("id", user.id);
    if (profileDeleteError) throw profileDeleteError;

    const { error: deleteUserError } = await admin.auth.admin.deleteUser(
      user.id,
    );
    if (deleteUserError) throw deleteUserError;

    return Response.json(
      { success: true },
      { headers: corsHeaders },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Account deletion failed.";
    console.error("Account deletion failed", { userId: user.id, message });
    return Response.json(
      { error: message },
      { status: 500, headers: corsHeaders },
    );
  }
});

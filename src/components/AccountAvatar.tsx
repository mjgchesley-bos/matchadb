"use client";

import { useAuth } from "@/components/AuthProvider";
import { AvatarDesigner } from "@/components/AvatarDesigner";
import { supabase } from "@/lib/supabase";

// "Design your own avatar" on the My matcha title line. Saves straight away, so the new face shows everywhere at once.
export function AccountAvatar({ open, onOpenChange }: { open?: boolean; onOpenChange?: (v: boolean) => void } = {}) {
  const { user, avatar, setAvatar } = useAuth();
  if (!user) return null;
  return (
    <AvatarDesigner
      open={open}
      onOpenChange={onOpenChange}
      current={avatar.key}
      onUse={async (code) => {
        const sb = supabase();
        const { error } = await sb.from("profiles").update({ avatar: code, avatar_path: null }).eq("id", user.id);
        if (error) return;
        if (avatar.path) await sb.storage.from("avatars").remove([avatar.path]);
        setAvatar(code, null);
      }}
    />
  );
}

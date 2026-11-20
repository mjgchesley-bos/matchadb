import { demoMedia } from "@/lib/demo-media";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gropvtwigbddfikcujhz.supabase.co";
export const bannerUrl = (path: string): string => demoMedia.get(path) ?? `${SUPABASE_URL}/storage/v1/object/public/business-banners/${path}`;

import { NextResponse } from "next/server";
import sharp from "sharp";
import {
  AdminAuthError,
  createServiceRoleClient,
  errorResponse,
  requireAdminSession,
} from "@/lib/phrenos-updates";
import { SUGGESTIONS_TABLE } from "@/lib/phrenos-updates/tables";

export const maxDuration = 60;

const BUCKET = "ai-update-images";
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Attach an image to a draft. Stored as PNG because LinkedIn does not accept WebP. */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession(request);
    const { id } = await context.params;

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "That image is over 10 MB." }, { status: 400 });
    }

    let png: Buffer;
    try {
      png = await sharp(Buffer.from(await file.arrayBuffer()))
        .rotate()
        .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
        .png()
        .toBuffer();
    } catch {
      return NextResponse.json(
        { error: "That file could not be read as an image. Use PNG, JPG or WebP." },
        { status: 400 },
      );
    }

    const supabase = createServiceRoleClient();
    const path = `${id}-${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, png, { contentType: "image/png", upsert: false });
    if (uploadError) throw new Error(uploadError.message);

    const imageUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    const { data, error } = await supabase
      .from(SUGGESTIONS_TABLE)
      .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      await supabase.storage.from(BUCKET).remove([path]);
      throw new Error(
        /image_url/.test(error.message)
          ? "The image_url column is missing. Run supabase/migrations/006_suggestion_images.sql in Supabase first."
          : error.message,
      );
    }

    return NextResponse.json({ suggestion: data });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Failed to upload image";
    const { body, status } = errorResponse(message);
    return NextResponse.json(body, { status });
  }
}

/** Remove the attached image from a draft. */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession(request);
    const { id } = await context.params;
    const supabase = createServiceRoleClient();

    const { data: current } = await supabase
      .from(SUGGESTIONS_TABLE)
      .select("image_url")
      .eq("id", id)
      .single();

    const { error } = await supabase
      .from(SUGGESTIONS_TABLE)
      .update({ image_url: null, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);

    const url = (current as { image_url?: string | null } | null)?.image_url;
    const marker = `/${BUCKET}/`;
    if (url && url.includes(marker)) {
      await supabase.storage.from(BUCKET).remove([url.split(marker)[1]]);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Failed to remove image";
    const { body, status } = errorResponse(message);
    return NextResponse.json(body, { status });
  }
}

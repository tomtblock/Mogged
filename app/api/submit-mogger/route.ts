import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to submit a mogger" }, { status: 401 });
  }

  const formData = await request.formData();
  const name = (formData.get("name") as string)?.trim();
  const profession = (formData.get("profession") as string)?.trim();
  const category = (formData.get("category") as string)?.trim() || "internet_personality";
  const file = formData.get("file") as File | null;

  // Social links
  const instagramHandle = (formData.get("instagram") as string)?.trim() || null;
  const tiktokHandle = (formData.get("tiktok") as string)?.trim() || null;
  const youtubeHandle = (formData.get("youtube") as string)?.trim() || null;
  const kickHandle = (formData.get("kick") as string)?.trim() || null;
  const xHandle = (formData.get("x") as string)?.trim() || null;

  if (!name || !profession) {
    return NextResponse.json(
      { error: "Name and profession are required" },
      { status: 400 }
    );
  }

  if (!file) {
    return NextResponse.json(
      { error: "A headshot photo is required" },
      { status: 400 }
    );
  }

  // Validate file
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: "File too large (max 5MB)" },
      { status: 400 }
    );
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "Only JPG, PNG, and WebP allowed" },
      { status: 400 }
    );
  }

  try {
    const serviceClient = await createServiceClient();

    // Upload to Supabase Storage
    const ext = file.name.split(".").pop() || "jpg";
    const storagePath = `submissions/${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await serviceClient.storage
      .from("headshots")
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = serviceClient.storage.from("headshots").getPublicUrl(storagePath);

    // Generate slug
    const slug =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") +
      "-" +
      Math.random().toString(36).substring(2, 8);

    // Create person entry: pending_review, public visibility (visible once approved)
    const { data: person, error: insertError } = await serviceClient
      .from("people")
      .insert({
        slug,
        name,
        profession,
        category,
        source_type: "user_submission",
        created_by: user.id,
        status: "pending_review",
        visibility: "public",
        headshot_path: storagePath,
        headshot_url: publicUrl,
        instagram_handle: instagramHandle,
        tiktok_handle: tiktokHandle,
        youtube_handle: youtubeHandle,
        kick_handle: kickHandle,
        x_handle: xHandle,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ person });
  } catch (err) {
    console.error("Submit mogger error:", err);
    return NextResponse.json(
      { error: "Submission failed" },
      { status: 500 }
    );
  }
}

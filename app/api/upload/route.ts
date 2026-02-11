import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File;
  const name = formData.get("name") as string;
  const ageConfirmed = formData.get("ageConfirmed") === "true";
  const ownershipConfirmed = formData.get("ownershipConfirmed") === "true";
  const isMe = formData.get("isMe") === "true";

  if (!file || !name) {
    return NextResponse.json(
      { error: "File and name required" },
      { status: 400 }
    );
  }

  if (!ageConfirmed || !ownershipConfirmed || !isMe) {
    return NextResponse.json(
      { error: "All consent checkboxes required" },
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
    // Upload to Supabase Storage
    const ext = file.name.split(".").pop() || "jpg";
    const storagePath = `uploads/${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
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
    } = supabase.storage.from("headshots").getPublicUrl(storagePath);

    // Generate slug
    const slug =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") +
      "-" +
      Math.random().toString(36).substring(2, 8);

    // Create person entry (private by default)
    const { data: person, error: insertError } = await supabase
      .from("people")
      .insert({
        slug,
        name,
        profession: "User Upload",
        category: "user",
        source_type: "user_upload",
        created_by: user.id,
        status: "active",
        visibility: "private",
        headshot_path: storagePath,
        headshot_url: publicUrl,
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
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}

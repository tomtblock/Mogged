import { createClient } from "@/lib/supabase/server";
import { getStripe, getOrCreateCustomer } from "@/lib/stripe/server";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    const customerId = await getOrCreateCustomer(
      user.id,
      profile.email,
      profile.full_name || ""
    );

    const subscription = await getStripe().subscriptions.create({
      customer: customerId,
      items: [{ price: process.env.STRIPE_PRICE_ID_MONTHLY! }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
      metadata: { supabase_user_id: user.id },
    });

    const invoice = subscription.latest_invoice as import("stripe").Stripe.Invoice;
    const paymentIntent = invoice.payment_intent as import("stripe").Stripe.PaymentIntent;

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err) {
    console.error("Create subscription error:", err);
    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 }
    );
  }
}

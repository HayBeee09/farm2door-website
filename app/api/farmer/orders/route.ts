import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/utils/supabase/server";

const DEMO_FARMER_ID = "11111111-1111-1111-1111-111111111111";

// Authentic realistic sample inbound orders in Ekiti state when database has 0 transactions
const SAMPLE_INBOUND_ORDERS = [
  {
    id: "ord-demo-1",
    orderReference: "FD-20260907-A41B9C",
    buyerName: "Mrs. Folashade Adeleke",
    deliveryPhone: "+234 803 456 7890",
    deliveryAddress: "Federal Housing Estate, Afao Road, Ado-Ekiti",
    status: "confirmed",
    transitFee: 2500,
    totalFarmerAmount: 17500,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    items: [
      {
        productId: "a1111111-1111-1111-1111-111111111111",
        productName: "Premium Ekiti White Yam",
        unit: "tuber",
        quantity: 5,
        unitPrice: 3500,
        subtotal: 17500,
      },
    ],
  },
  {
    id: "ord-demo-2",
    orderReference: "FD-20260907-B82F1E",
    buyerName: "Chief Tunde Babalola (Restaurant Bulk)",
    deliveryPhone: "+234 805 123 9988",
    deliveryAddress: "Kayode Commercial Complex, College Road, Ikere-Ekiti",
    status: "in_transit",
    transitFee: 1500,
    totalFarmerAmount: 14400,
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    items: [
      {
        productId: "a5555555-5555-5555-5555-555555555555",
        productName: "Sweet Valencia Farm Oranges",
        unit: "crate",
        quantity: 2,
        unitPrice: 7200,
        subtotal: 14400,
      },
    ],
  },
  {
    id: "ord-demo-3",
    orderReference: "FD-20260906-C99D34",
    buyerName: "Dr. Ojo Samuel",
    deliveryPhone: "+234 802 987 1122",
    deliveryAddress: "GRA Extension, Ikere-Ekiti, Ekiti State",
    status: "delivered",
    transitFee: 1000,
    totalFarmerAmount: 7000,
    createdAt: new Date(Date.now() - 3600000 * 26).toISOString(),
    items: [
      {
        productId: "a1111111-1111-1111-1111-111111111111",
        productName: "Premium Ekiti White Yam",
        unit: "tuber",
        quantity: 2,
        unitPrice: 3500,
        subtotal: 7000,
      },
    ],
  },
];

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    const requestedFarmerId = searchParams.get("farmer_id");
    const farmerId = user?.id || requestedFarmerId || DEMO_FARMER_ID;

    // 1. Get farmer's product IDs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: farmerProducts } = await (supabase as any)
      .from("products")
      .select("id, name, unit")
      .eq("farmer_id", farmerId);

    const productIds = farmerProducts?.map((p: { id: string }) => p.id) || [];

    if (productIds.length === 0) {
      return NextResponse.json({
        success: true,
        count: SAMPLE_INBOUND_ORDERS.length,
        orders: SAMPLE_INBOUND_ORDERS,
        isDemo: true,
      });
    }

    // 2. Query order items matching this farmer's products
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: items, error: itemsErr } = await (supabase as any)
      .from("order_items")
      .select(`
        id,
        order_id,
        product_id,
        quantity,
        unit_price,
        subtotal,
        products (
          id,
          name,
          unit
        ),
        orders (
          id,
          order_reference,
          status,
          total_amount,
          transit_fee,
          delivery_address,
          delivery_phone,
          created_at,
          users!buyer_id (
            full_name,
            phone
          )
        )
      `)
      .in("product_id", productIds)
      .order("created_at", { ascending: false });

    // Load any orders from server store for this farmer
    const { getAllOrders } = await import("@/lib/orders-store");
    const storedOrders = getAllOrders();
    const matchingStored = storedOrders.filter((ord) =>
      ord.items.some((item) => productIds.includes(item.productId) || item.farmerId === farmerId)
    );

    const formattedStored = matchingStored.map((ord) => {
      const farmerItems = ord.items.filter(
        (item) => productIds.includes(item.productId) || item.farmerId === farmerId
      );
      const totalFarmerAmount = farmerItems.reduce((acc, i) => acc + i.subtotal, 0);
      return {
        id: ord.id,
        orderReference: ord.orderReference,
        buyerName: ord.buyerName,
        deliveryPhone: ord.deliveryPhone,
        deliveryAddress: ord.deliveryAddress,
        status: ord.status,
        transitFee: ord.transitFee,
        totalFarmerAmount,
        createdAt: ord.createdAt,
        items: farmerItems.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          unit: i.unit,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          subtotal: i.subtotal,
        })),
      };
    });

    if (itemsErr || !items || items.length === 0) {
      const combined = [...formattedStored, ...SAMPLE_INBOUND_ORDERS];
      return NextResponse.json({
        success: true,
        count: combined.length,
        orders: combined,
        isDemo: formattedStored.length === 0,
      });
    }

    // Group order items by order ID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ordersMap = new Map<string, any>();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items.forEach((item: any) => {
      const order = item.orders;
      if (!order) return;

      if (!ordersMap.has(order.id)) {
        ordersMap.set(order.id, {
          id: order.id,
          orderReference: order.order_reference,
          buyerName: order.users?.full_name || "Verified Ekiti Household",
          deliveryPhone: order.delivery_phone || order.users?.phone || "N/A",
          deliveryAddress: order.delivery_address,
          status: order.status,
          transitFee: Number(order.transit_fee || 0),
          totalFarmerAmount: 0,
          createdAt: order.created_at,
          items: [],
        });
      }

      const existingOrder = ordersMap.get(order.id);
      const subtotal = Number(item.subtotal);
      existingOrder.totalFarmerAmount += subtotal;
      existingOrder.items.push({
        productId: item.product_id,
        productName: item.products?.name || "Produce Item",
        unit: item.products?.unit || "unit",
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
        subtotal,
      });
    });

    const ordersList = Array.from(ordersMap.values());

    return NextResponse.json({
      success: true,
      count: ordersList.length,
      orders: ordersList,
      isDemo: false,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error fetching inbound orders";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const body = await request.json();
    const { order_id, status } = body;

    const VALID_STATUSES = ["confirmed", "in_transit", "delivered", "cancelled"];
    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    // Update status in orders table if order_id exists
    if (order_id && !order_id.startsWith("ord-demo-")) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("orders")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", order_id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Order status updated to ${status}`,
      orderId: order_id,
      status,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error updating order status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

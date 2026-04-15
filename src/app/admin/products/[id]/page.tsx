"use client";

import { use, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getProductById } from "@/lib/services/productService";
import type { ProductWithDetails } from "@/types";
import ProductForm from "@/components/admin/ProductForm";
import { Package } from "lucide-react";
import Link from "next/link";

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const sb = createClient();

  const [product, setProduct] = useState<ProductWithDetails | null | undefined>(undefined);

  useEffect(() => {
    getProductById(sb, id).then(setProduct);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (product === undefined) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <div style={{ width: "24px", height: "24px", border: "2px solid var(--border)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px" }}>
        <Package size={48} style={{ margin: "0 auto 16px", color: "var(--muted-foreground)", display: "block" }} />
        <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>המוצר לא נמצא</h2>
        <p style={{ color: "var(--muted-foreground)", marginBottom: "20px" }}>ייתכן שהמוצר נמחק או שהקישור שגוי</p>
        <Link href="/admin/products" style={{ background: "var(--primary)", color: "#09090b", borderRadius: "9px", padding: "10px 20px", textDecoration: "none", fontSize: "13px", fontWeight: 700 }}>
          חזרה למוצרים
        </Link>
      </div>
    );
  }

  return <ProductForm product={product} />;
}

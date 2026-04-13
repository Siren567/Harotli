/**
 * Supabase Database type — matches the schema.sql exactly.
 * Must satisfy supabase-js GenericSchema: Tables + Views + Functions,
 * and each table must have Relationships: [...].
 *
 * Regenerate with:
 *   npx supabase gen types typescript --project-id <ref> > src/types/database.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          image_url: string | null;
          parent_id: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          image_url?: string | null;
          parent_id?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          image_url?: string | null;
          parent_id?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };

      products: {
        Row: {
          id: string;
          name: string;
          slug: string;
          short_description: string | null;
          description: string | null;
          sku: string;
          price: number;
          compare_price: number | null;
          category_id: string | null;
          subcategory_id: string | null;
          status: "active" | "hidden" | "draft" | "out_of_stock";
          is_featured: boolean;
          tags: string[];
          seo_title: string | null;
          seo_description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          short_description?: string | null;
          description?: string | null;
          sku: string;
          price: number;
          compare_price?: number | null;
          category_id?: string | null;
          subcategory_id?: string | null;
          status?: "active" | "hidden" | "draft" | "out_of_stock";
          is_featured?: boolean;
          tags?: string[];
          seo_title?: string | null;
          seo_description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          short_description?: string | null;
          description?: string | null;
          sku?: string;
          price?: number;
          compare_price?: number | null;
          category_id?: string | null;
          subcategory_id?: string | null;
          status?: "active" | "hidden" | "draft" | "out_of_stock";
          is_featured?: boolean;
          tags?: string[];
          seo_title?: string | null;
          seo_description?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      product_images: {
        Row: {
          id: string;
          product_id: string;
          url: string;
          alt_text: string | null;
          sort_order: number;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          url: string;
          alt_text?: string | null;
          sort_order?: number;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          url?: string;
          alt_text?: string | null;
          sort_order?: number;
          is_primary?: boolean;
        };
        Relationships: [];
      };

      inventory: {
        Row: {
          id: string;
          product_id: string;
          quantity: number;
          low_stock_threshold: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          quantity?: number;
          low_stock_threshold?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          quantity?: number;
          low_stock_threshold?: number;
          updated_at?: string;
        };
        Relationships: [];
      };

      inventory_log: {
        Row: {
          id: string;
          product_id: string;
          delta: number;
          reason: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          delta: number;
          reason?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: Record<string, unknown>;
        Relationships: [];
      };

      customers: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          phone: string | null;
          city: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          city?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          city?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      orders: {
        Row: {
          id: string;
          order_number: string;
          customer_id: string | null;
          customer_name: string;
          customer_email: string | null;
          customer_phone: string | null;
          status: "new" | "pending" | "processing" | "shipped" | "completed" | "cancelled" | "refunded";
          payment_status: "paid" | "unpaid" | "partial" | "refunded";
          payment_method: string | null;
          shipping_method: string | null;
          subtotal: number;
          shipping_cost: number;
          discount_amount: number;
          total: number;
          shipping_street: string | null;
          shipping_city: string | null;
          shipping_zip: string | null;
          customer_note: string | null;
          admin_note: string | null;
          coupon_id: string | null;
          coupon_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number: string;
          customer_id?: string | null;
          customer_name: string;
          customer_email?: string | null;
          customer_phone?: string | null;
          status?: "new" | "pending" | "processing" | "shipped" | "completed" | "cancelled" | "refunded";
          payment_status?: "paid" | "unpaid" | "partial" | "refunded";
          payment_method?: string | null;
          shipping_method?: string | null;
          subtotal: number;
          shipping_cost?: number;
          discount_amount?: number;
          total: number;
          shipping_street?: string | null;
          shipping_city?: string | null;
          shipping_zip?: string | null;
          customer_note?: string | null;
          admin_note?: string | null;
          coupon_id?: string | null;
          coupon_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_number?: string;
          customer_id?: string | null;
          customer_name?: string;
          customer_email?: string | null;
          customer_phone?: string | null;
          status?: "new" | "pending" | "processing" | "shipped" | "completed" | "cancelled" | "refunded";
          payment_status?: "paid" | "unpaid" | "partial" | "refunded";
          payment_method?: string | null;
          shipping_method?: string | null;
          subtotal?: number;
          shipping_cost?: number;
          discount_amount?: number;
          total?: number;
          shipping_street?: string | null;
          shipping_city?: string | null;
          shipping_zip?: string | null;
          customer_note?: string | null;
          admin_note?: string | null;
          coupon_id?: string | null;
          coupon_code?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          product_name: string;
          product_image: string | null;
          sku: string | null;
          customization: string | null;
          quantity: number;
          unit_price: number;
          total_price: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          product_name: string;
          product_image?: string | null;
          sku?: string | null;
          customization?: string | null;
          quantity: number;
          unit_price: number;
          total_price: number;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string | null;
          product_name?: string;
          product_image?: string | null;
          sku?: string | null;
          customization?: string | null;
          quantity?: number;
          unit_price?: number;
          total_price?: number;
        };
        Relationships: [];
      };

      order_timeline: {
        Row: {
          id: string;
          order_id: string;
          status: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          status: string;
          note?: string | null;
          created_at?: string;
        };
        Update: Record<string, unknown>;
        Relationships: [];
      };

      coupons: {
        Row: {
          id: string;
          code: string;
          type: "percentage" | "fixed";
          value: number;
          min_order_value: number | null;
          max_uses: number | null;
          used_count: number;
          is_active: boolean;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          type: "percentage" | "fixed";
          value: number;
          min_order_value?: number | null;
          max_uses?: number | null;
          used_count?: number;
          is_active?: boolean;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          type?: "percentage" | "fixed";
          value?: number;
          min_order_value?: number | null;
          max_uses?: number | null;
          used_count?: number;
          is_active?: boolean;
          expires_at?: string | null;
        };
        Relationships: [];
      };

      media_files: {
        Row: {
          id: string;
          name: string;
          storage_path: string;
          public_url: string;
          size_bytes: number | null;
          mime_type: string | null;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          storage_path: string;
          public_url: string;
          size_bytes?: number | null;
          mime_type?: string | null;
          uploaded_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          storage_path?: string;
          public_url?: string;
          size_bytes?: number | null;
          mime_type?: string | null;
        };
        Relationships: [];
      };

      store_settings: {
        Row: {
          id: string;
          store_name: string;
          store_email: string | null;
          store_phone: string | null;
          store_address: string | null;
          currency: string;
          logo_url: string | null;
          favicon_url: string | null;
          free_shipping_threshold: number;
          default_shipping_cost: number;
          seo_title: string | null;
          seo_description: string | null;
          instagram_handle: string | null;
          facebook_handle: string | null;
          whatsapp_number: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_name?: string;
          store_email?: string | null;
          store_phone?: string | null;
          store_address?: string | null;
          currency?: string;
          logo_url?: string | null;
          favicon_url?: string | null;
          free_shipping_threshold?: number;
          default_shipping_cost?: number;
          seo_title?: string | null;
          seo_description?: string | null;
          instagram_handle?: string | null;
          facebook_handle?: string | null;
          whatsapp_number?: string | null;
          updated_at?: string;
        };
        Update: {
          store_name?: string;
          store_email?: string | null;
          store_phone?: string | null;
          store_address?: string | null;
          currency?: string;
          logo_url?: string | null;
          favicon_url?: string | null;
          free_shipping_threshold?: number;
          default_shipping_cost?: number;
          seo_title?: string | null;
          seo_description?: string | null;
          instagram_handle?: string | null;
          facebook_handle?: string | null;
          whatsapp_number?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      homepage_sections: {
        Row: {
          id: string;
          type: string;
          title: string | null;
          subtitle: string | null;
          image_url: string | null;
          cta_text: string | null;
          cta_link: string | null;
          is_visible: boolean;
          sort_order: number;
          extra: Json | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          type: string;
          title?: string | null;
          subtitle?: string | null;
          image_url?: string | null;
          cta_text?: string | null;
          cta_link?: string | null;
          is_visible?: boolean;
          sort_order?: number;
          extra?: Json | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          type?: string;
          title?: string | null;
          subtitle?: string | null;
          image_url?: string | null;
          cta_text?: string | null;
          cta_link?: string | null;
          is_visible?: boolean;
          sort_order?: number;
          extra?: Json | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };

    // Required by Supabase GenericSchema
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// ─── Convenient row-type aliases ─────────────────────────────────────────────
export type DbCategory       = Database["public"]["Tables"]["categories"]["Row"];
export type DbProduct        = Database["public"]["Tables"]["products"]["Row"];
export type DbProductImage   = Database["public"]["Tables"]["product_images"]["Row"];
export type DbInventory      = Database["public"]["Tables"]["inventory"]["Row"];
export type DbInventoryLog   = Database["public"]["Tables"]["inventory_log"]["Row"];
export type DbCustomer       = Database["public"]["Tables"]["customers"]["Row"];
export type DbOrder          = Database["public"]["Tables"]["orders"]["Row"];
export type DbOrderItem      = Database["public"]["Tables"]["order_items"]["Row"];
export type DbOrderTimeline  = Database["public"]["Tables"]["order_timeline"]["Row"];
export type DbCoupon         = Database["public"]["Tables"]["coupons"]["Row"];
export type DbMediaFile      = Database["public"]["Tables"]["media_files"]["Row"];
export type DbStoreSettings  = Database["public"]["Tables"]["store_settings"]["Row"];
export type DbHomepageSection = Database["public"]["Tables"]["homepage_sections"]["Row"];

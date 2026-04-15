import { Sidebar } from "@/components/admin/sidebar";
import { Topbar } from "@/components/admin/topbar";
import { ToastProvider } from "@/components/ui/toast";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div style={{ display: "flex", minHeight: "100svh", background: "var(--background)", color: "var(--foreground)" }}>
        <Sidebar />
        <div
          style={{
            flex: 1,
            marginRight: "var(--sidebar-width)",
            display: "flex",
            flexDirection: "column",
            minHeight: "100svh",
          }}
        >
          <Topbar />
          <main
            style={{
              flex: 1,
              padding: "28px",
              background: "var(--background)",
            }}
          >
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}

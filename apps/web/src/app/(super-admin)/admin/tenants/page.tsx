import { TenantList } from "@/features/platform/admin/components/tenant-list";

export default function SuperAdminTenantsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Tenant Management
        </h1>
        <p className="text-muted-foreground mt-1">
          Approve or reject tenant registrations
        </p>
      </div>
      <TenantList />
    </div>
  );
}

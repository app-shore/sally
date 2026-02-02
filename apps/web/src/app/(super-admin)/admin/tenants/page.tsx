import { TenantList } from '@/components/super-admin/tenant-list';

export default function SuperAdminTenantsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Tenant Management</h1>
        <p className="text-muted-foreground">
          Approve or reject tenant registrations
        </p>
      </div>
      <TenantList />
    </div>
  );
}

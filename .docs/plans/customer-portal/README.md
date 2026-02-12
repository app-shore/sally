# Customer Portal

The Customer/Shipper Portal documentation lives in the **Fleet Management** domain:

- **Design:** [../fleet-management/customer-shipper-portal-design.md](../fleet-management/customer-shipper-portal-design.md)
- **Implementation:** [../fleet-management/customer-shipper-portal-implementation.md](../fleet-management/customer-shipper-portal-implementation.md)

## Why Fleet Management?

The customer portal shares data models (Customer, Load, LoadStop), controllers (CustomerLoadsController, TrackingController), and services with the fleet management domain. Keeping the docs together reflects the code organization.

## Quick Links

| Feature | Status | Description |
|---------|--------|-------------|
| Customer dashboard | ✅ Implemented | `/customer/dashboard` - Active/history load views |
| Load request form | ✅ Implemented | `/customer/request-load` - Submit freight requests |
| Public tracking | ✅ Implemented | `/track/[token]` - No-auth shipment tracking |
| Customer management | ✅ Implemented | Dispatcher-side customer CRUD + portal invitations |
| Email notifications | 🔲 Designed | Status change emails to customers |
| Proof of delivery | 🔲 Designed | POD upload and download |

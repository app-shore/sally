-- Add suspension and reactivation tracking columns to tenants table
ALTER TABLE tenants
ADD COLUMN suspended_at TIMESTAMPTZ,
ADD COLUMN suspended_by VARCHAR(100),
ADD COLUMN suspension_reason TEXT,
ADD COLUMN reactivated_at TIMESTAMPTZ,
ADD COLUMN reactivated_by VARCHAR(100);

-- Add indexes for performance
CREATE INDEX idx_tenants_suspended_at ON tenants(suspended_at);

-- Add comments for documentation
COMMENT ON COLUMN tenants.suspended_at IS 'Timestamp when tenant was suspended';
COMMENT ON COLUMN tenants.suspended_by IS 'Email of super admin who suspended the tenant';
COMMENT ON COLUMN tenants.suspension_reason IS 'Reason for tenant suspension';
COMMENT ON COLUMN tenants.reactivated_at IS 'Timestamp when tenant was reactivated';
COMMENT ON COLUMN tenants.reactivated_by IS 'Email of super admin who reactivated the tenant';

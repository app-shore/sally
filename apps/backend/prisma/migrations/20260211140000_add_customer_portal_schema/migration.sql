-- AlterEnum: Add CUSTOMER role (idempotent - only if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CUSTOMER' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')) THEN
        ALTER TYPE "UserRole" ADD VALUE 'CUSTOMER';
    END IF;
END
$$;

-- Add UNIQUE constraint on users.customer_id (column already exists from load_dispatch_board migration)
CREATE UNIQUE INDEX IF NOT EXISTS "users_customer_id_key" ON "users"("customer_id");

-- Create super_admin_preferences table
CREATE TABLE super_admin_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL,
  notify_new_tenants BOOLEAN DEFAULT TRUE,
  notify_status_changes BOOLEAN DEFAULT TRUE,
  notification_frequency VARCHAR(20) DEFAULT 'immediate',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_super_admin_preferences_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

-- Add indexes
CREATE INDEX idx_super_admin_preferences_user_id ON super_admin_preferences(user_id);

-- Add check constraint for notification frequency
ALTER TABLE super_admin_preferences
ADD CONSTRAINT chk_notification_frequency
CHECK (notification_frequency IN ('immediate', 'daily'));

-- Add comments
COMMENT ON TABLE super_admin_preferences IS 'Stores notification preferences for super admin users';
COMMENT ON COLUMN super_admin_preferences.notify_new_tenants IS 'Email notification for new tenant registrations';
COMMENT ON COLUMN super_admin_preferences.notify_status_changes IS 'Email notification for tenant status changes';
COMMENT ON COLUMN super_admin_preferences.notification_frequency IS 'Email frequency: immediate or daily digest';

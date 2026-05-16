-- Create users table
CREATE TABLE IF NOT EXISTS users (
  uid TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  displayName TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
  assignedShops TEXT[] DEFAULT '{}',
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  disabled BOOLEAN DEFAULT FALSE
);

-- Create shops table
CREATE TABLE IF NOT EXISTS shops (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  ownerId TEXT,
  assignedUsers TEXT[] DEFAULT '{}',
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ownerId) REFERENCES users(uid)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_shops_code ON shops(code);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
-- Admin can do everything
CREATE POLICY "admin_all_users" ON users
  FOR ALL
  USING (auth.uid() IN (SELECT uid FROM users WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT uid FROM users WHERE role = 'admin'));

-- Users can only view themselves
CREATE POLICY "users_view_self" ON users
  FOR SELECT
  USING (auth.uid() = uid);

-- Users cannot update their own role
CREATE POLICY "users_no_role_update" ON users
  FOR UPDATE
  USING (auth.uid() = uid)
  WITH CHECK (auth.uid() = uid AND role = (SELECT role FROM users WHERE uid = auth.uid()));

-- RLS Policies for shops table
-- Admin can do everything
CREATE POLICY "admin_all_shops" ON shops
  FOR ALL
  USING (auth.uid() IN (SELECT uid FROM users WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT uid FROM users WHERE role = 'admin'));

-- Managers can view assigned shops
CREATE POLICY "managers_view_assigned_shops" ON shops
  FOR SELECT
  USING (auth.uid() IN (SELECT unnest(assignedUsers)) OR ownerId = auth.uid());

-- Regular users can view assigned shops
CREATE POLICY "users_view_assigned_shops" ON shops
  FOR SELECT
  USING (auth.uid() IN (SELECT unnest(assignedUsers)));

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  category VARCHAR(100),
  barcode VARCHAR(50) UNIQUE,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
  id SERIAL PRIMARY KEY,
  total_amount DECIMAL(10, 2) NOT NULL,
  items JSONB NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'cash',
  customer_info JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  offline_id VARCHAR(100) UNIQUE
);

-- Create users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'cashier',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample products
INSERT INTO products (name, price, stock, category, barcode) VALUES
('Coffee', 3.50, 100, 'Beverages', '1234567890123'),
('Sandwich', 8.99, 50, 'Food', '1234567890124'),
('Water Bottle', 1.99, 200, 'Beverages', '1234567890125'),
('Chips', 2.49, 75, 'Snacks', '1234567890126'),
('Energy Bar', 4.99, 30, 'Snacks', '1234567890127');

-- Insert sample user
INSERT INTO users (username, email, password_hash, role) VALUES
('admin', 'admin@pos.com', '$2b$10$example_hash', 'admin'),
('cashier', 'cashier@pos.com', '$2b$10$example_hash', 'cashier');

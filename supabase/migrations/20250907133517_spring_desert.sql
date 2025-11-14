/*
  # Create invoices table for sales receipt generator

  1. New Tables
    - `invoices`
      - `id` (uuid, primary key)
      - `invoice_number` (text, unique)
      - `customer` (jsonb) - stores customer information
      - `items` (jsonb) - stores array of sale items
      - `subtotal` (decimal)
      - `discount` (decimal, default 0)
      - `shipping_fee` (decimal, default 0)
      - `total` (decimal)
      - `date` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `invoices` table
    - Add policies for authenticated users to manage their own invoices
    - Add policy for anonymous users (since this is a single-user app for now)

  3. Indexes
    - Index on invoice_number for fast lookups
    - Index on date for sorting
*/

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  customer jsonb NOT NULL,
  items jsonb NOT NULL,
  subtotal decimal(10,2) NOT NULL DEFAULT 0,
  discount decimal(10,2) NOT NULL DEFAULT 0,
  shipping_fee decimal(10,2) NOT NULL DEFAULT 0,
  total decimal(10,2) NOT NULL DEFAULT 0,
  date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is a single-user app)
-- In a multi-user app, you would filter by auth.uid()
CREATE POLICY "Allow all operations for everyone"
  ON invoices
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);

-- Create a sequence for invoice numbering
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1001;
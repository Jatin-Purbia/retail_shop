const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

const normalizeRateInput = (value) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

// MySQL Connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  // password: 'ADMIN', 
  password: 'jatin@0182', // Update with your MySQL password
  database: 'retail_shop'
});

// Connect to MySQL
db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

// Create inventory table if it doesn't exist
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    hindiName VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    rateA DECIMAL(10,2) NULL DEFAULT NULL,
    rateB DECIMAL(10,2) NULL DEFAULT NULL,
    rateC DECIMAL(10,2) NULL DEFAULT NULL
  )
`;

db.query(createTableQuery, (err) => {
  if (err) {
    console.error('Error creating table:', err);
    return;
  }

  // Keep older databases compatible by adding missing columns if needed.
  db.query('SHOW COLUMNS FROM inventory', (columnsErr, columnsResult) => {
    if (columnsErr) {
      console.error('Error reading inventory columns:', columnsErr);
      return;
    }

    const existingColumns = new Set(columnsResult.map((col) => col.Field));
    const requiredRateColumns = [
      { name: 'rateA', sql: 'ALTER TABLE inventory ADD COLUMN rateA DECIMAL(10,2) NULL DEFAULT NULL' },
      { name: 'rateB', sql: 'ALTER TABLE inventory ADD COLUMN rateB DECIMAL(10,2) NULL DEFAULT NULL' },
      { name: 'rateC', sql: 'ALTER TABLE inventory ADD COLUMN rateC DECIMAL(10,2) NULL DEFAULT NULL' },
    ];
    const normalizeRateColumns = [
      'ALTER TABLE inventory MODIFY COLUMN rateA DECIMAL(10,2) NULL DEFAULT NULL',
      'ALTER TABLE inventory MODIFY COLUMN rateB DECIMAL(10,2) NULL DEFAULT NULL',
      'ALTER TABLE inventory MODIFY COLUMN rateC DECIMAL(10,2) NULL DEFAULT NULL',
    ];

    const missingColumns = requiredRateColumns.filter((col) => !existingColumns.has(col.name));

    const schemaUpdates = [
      ...missingColumns.map((column) => ({
        label: `${column.name} column`,
        sql: column.sql,
      })),
      ...normalizeRateColumns.map((sql, index) => ({
        label: `rate schema update ${index + 1}`,
        sql,
      })),
    ];

    if (schemaUpdates.length === 0) {
      console.log('Inventory table ready with rate columns');
      return;
    }

    let pending = schemaUpdates.length;
    schemaUpdates.forEach((statement) => {
      db.query(statement.sql, (alterErr) => {
        if (alterErr) {
          console.error(`Error running ${statement.label}:`, alterErr);
        } else {
          console.log(`${statement.label} applied`);
        }

        pending -= 1;
        if (pending === 0) {
          console.log('Inventory table ready with rate columns');
        }
      });
    });
  });
});

// Create bills table — id is the bill number, auto-incrementing from 1
const createBillsTableQuery = `
  CREATE TABLE IF NOT EXISTS bills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(255) NULL,
    customer_name_hindi VARCHAR(255) NULL,
    customer_mobile VARCHAR(32) NULL,
    alternate_mobile VARCHAR(32) NULL,
    delivery_date DATE NULL,
    delivery_time_hindi VARCHAR(32) NULL,
    items LONGTEXT NULL,
    total_amount DECIMAL(12,2) NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )
`;

db.query(createBillsTableQuery, (err) => {
  if (err) {
    console.error('Error creating bills table:', err);
    return;
  }

  // Add any missing columns for older databases that already had a `bills` table.
  db.query('SHOW COLUMNS FROM bills', (columnsErr, columnsResult) => {
    if (columnsErr) {
      console.error('Error reading bills columns:', columnsErr);
      return;
    }

    const existingColumns = new Set(columnsResult.map((col) => col.Field));
    const knownColumns = new Set([
      'id', 'customer_name', 'customer_name_hindi', 'customer_mobile', 'alternate_mobile',
      'delivery_date', 'delivery_time_hindi', 'items', 'total_amount', 'created_at', 'updated_at',
    ]);
    const requiredColumns = [
      { name: 'customer_name', sql: 'ALTER TABLE bills ADD COLUMN customer_name VARCHAR(255) NULL' },
      { name: 'customer_name_hindi', sql: 'ALTER TABLE bills ADD COLUMN customer_name_hindi VARCHAR(255) NULL' },
      { name: 'customer_mobile', sql: 'ALTER TABLE bills ADD COLUMN customer_mobile VARCHAR(32) NULL' },
      { name: 'alternate_mobile', sql: 'ALTER TABLE bills ADD COLUMN alternate_mobile VARCHAR(32) NULL' },
      { name: 'delivery_date', sql: 'ALTER TABLE bills ADD COLUMN delivery_date DATE NULL' },
      { name: 'delivery_time_hindi', sql: 'ALTER TABLE bills ADD COLUMN delivery_time_hindi VARCHAR(32) NULL' },
      { name: 'items', sql: 'ALTER TABLE bills ADD COLUMN items LONGTEXT NULL' },
      { name: 'total_amount', sql: 'ALTER TABLE bills ADD COLUMN total_amount DECIMAL(12,2) NULL DEFAULT NULL' },
      { name: 'created_at', sql: 'ALTER TABLE bills ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', sql: 'ALTER TABLE bills ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' },
    ];

    const migrations = requiredColumns
      .filter((col) => !existingColumns.has(col.name))
      .map((col) => ({ label: `add ${col.name} column`, sql: col.sql }));

    // Any legacy NOT NULL column with no default (besides id/auto-increment) would
    // break our INSERT — relax them so the table accepts the new payload shape.
    columnsResult.forEach((col) => {
      if (knownColumns.has(col.Field)) return;
      if (col.Extra && col.Extra.includes('auto_increment')) return;
      const isNotNull = col.Null === 'NO';
      const hasNoDefault = col.Default === null || col.Default === undefined;
      if (isNotNull && hasNoDefault) {
        migrations.push({
          label: `relax legacy column ${col.Field}`,
          sql: `ALTER TABLE bills MODIFY COLUMN \`${col.Field}\` ${col.Type} NULL DEFAULT NULL`,
        });
      }
    });

    if (migrations.length === 0) {
      console.log('Bills table ready');
      return;
    }

    let pending = migrations.length;
    migrations.forEach((migration) => {
      db.query(migration.sql, (alterErr) => {
        if (alterErr) {
          console.error(`Error running ${migration.label}:`, alterErr);
        } else {
          console.log(`${migration.label} applied`);
        }
        pending -= 1;
        if (pending === 0) {
          console.log('Bills table ready');
        }
      });
    });
  });
});

const parseBillRow = (row) => {
  if (!row) return null;
  let items = [];
  if (row.items) {
    try {
      items = typeof row.items === 'string' ? JSON.parse(row.items) : row.items;
    } catch (e) {
      console.error('Failed to parse items JSON for bill', row.id, e);
      items = [];
    }
  }
  return { ...row, items };
};

// List all bills (summary only — no items payload for speed)
app.get('/api/bills', (req, res) => {
  const query = `
    SELECT id, customer_name, customer_name_hindi, customer_mobile, alternate_mobile,
           delivery_date, delivery_time_hindi, total_amount, created_at, updated_at
    FROM bills
    ORDER BY id DESC
  `;
  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(results);
  });
});

// Get a single bill with items
app.get('/api/bills/:id', (req, res) => {
  const { id } = req.params;
  db.query('SELECT * FROM bills WHERE id = ?', [id], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (results.length === 0) {
      res.status(404).json({ error: 'Bill not found' });
      return;
    }
    res.json(parseBillRow(results[0]));
  });
});

// Create a new bill — returns the new auto-incremented bill number as id
app.post('/api/bills', (req, res) => {
  const {
    customer_name,
    customer_name_hindi,
    customer_mobile,
    alternate_mobile,
    delivery_date,
    delivery_time_hindi,
    items,
    total_amount,
  } = req.body;

  const itemsJson = JSON.stringify(Array.isArray(items) ? items : []);
  const normalizedTotal = normalizeRateInput(total_amount);

  const query = `
    INSERT INTO bills
      (customer_name, customer_name_hindi, customer_mobile, alternate_mobile,
       delivery_date, delivery_time_hindi, items, total_amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    customer_name || null,
    customer_name_hindi || null,
    customer_mobile || null,
    alternate_mobile || null,
    delivery_date || null,
    delivery_time_hindi || null,
    itemsJson,
    normalizedTotal,
  ];

  db.query(query, params, (err, result) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    db.query('SELECT * FROM bills WHERE id = ?', [result.insertId], (selectErr, selectResults) => {
      if (selectErr) {
        res.status(500).json({ error: selectErr.message });
        return;
      }
      res.status(201).json(parseBillRow(selectResults[0]));
    });
  });
});

// Update an existing bill
app.put('/api/bills/:id', (req, res) => {
  const { id } = req.params;
  const {
    customer_name,
    customer_name_hindi,
    customer_mobile,
    alternate_mobile,
    delivery_date,
    delivery_time_hindi,
    items,
    total_amount,
  } = req.body;

  const itemsJson = JSON.stringify(Array.isArray(items) ? items : []);
  const normalizedTotal = normalizeRateInput(total_amount);

  const query = `
    UPDATE bills SET
      customer_name = ?,
      customer_name_hindi = ?,
      customer_mobile = ?,
      alternate_mobile = ?,
      delivery_date = ?,
      delivery_time_hindi = ?,
      items = ?,
      total_amount = ?
    WHERE id = ?
  `;
  const params = [
    customer_name || null,
    customer_name_hindi || null,
    customer_mobile || null,
    alternate_mobile || null,
    delivery_date || null,
    delivery_time_hindi || null,
    itemsJson,
    normalizedTotal,
    id,
  ];

  db.query(query, params, (err, result) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Bill not found' });
      return;
    }
    db.query('SELECT * FROM bills WHERE id = ?', [id], (selectErr, selectResults) => {
      if (selectErr) {
        res.status(500).json({ error: selectErr.message });
        return;
      }
      res.json(parseBillRow(selectResults[0]));
    });
  });
});

// Delete a bill
app.delete('/api/bills/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM bills WHERE id = ?', [id], (err, result) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Bill not found' });
      return;
    }
    res.json({ message: 'Bill deleted successfully' });
  });
});

// API Endpoints

// Get all items
app.get('/api/inventory', (req, res) => {
  db.query('SELECT * FROM inventory', (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(results);
  });
});

// Search items
app.get('/api/inventory/search', (req, res) => {
  const { q } = req.query;
  if (!q) {
    res.json([]);
    return;
  }

  const searchQuery = `
    SELECT * FROM inventory 
    WHERE name LIKE ? OR hindiName LIKE ?
    LIMIT 10
  `;
  const searchTerm = `%${q}%`;
  
  db.query(searchQuery, [searchTerm, searchTerm], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(results);
  });
});

// Add new item
app.post('/api/inventory', (req, res) => {
  const { name, hindiName, unit, rateA, rateB, rateC } = req.body;
  const normalizedRateA = normalizeRateInput(rateA);
  const normalizedRateB = normalizeRateInput(rateB);
  const normalizedRateC = normalizeRateInput(rateC);
  const query = 'INSERT INTO inventory (name, hindiName, unit, rateA, rateB, rateC) VALUES (?, ?, ?, ?, ?, ?)';
  
  db.query(query, [name, hindiName, unit, normalizedRateA, normalizedRateB, normalizedRateC], (err, result) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.status(201).json({ id: result.insertId, name, hindiName, unit, rateA: normalizedRateA, rateB: normalizedRateB, rateC: normalizedRateC });
  });
});

// Update item
app.put('/api/inventory/:id', (req, res) => {
  const { id } = req.params;
  const { name, hindiName, unit, rateA, rateB, rateC } = req.body;
  const normalizedRateA = normalizeRateInput(rateA);
  const normalizedRateB = normalizeRateInput(rateB);
  const normalizedRateC = normalizeRateInput(rateC);
  const query = 'UPDATE inventory SET name = ?, hindiName = ?, unit = ?, rateA = ?, rateB = ?, rateC = ? WHERE id = ?';
  
  db.query(query, [name, hindiName, unit, normalizedRateA, normalizedRateB, normalizedRateC, id], (err, result) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    res.json({ id, name, hindiName, unit, rateA: normalizedRateA, rateB: normalizedRateB, rateC: normalizedRateC });
  });
});

// Delete item
app.delete('/api/inventory/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM inventory WHERE id = ?';
  
  db.query(query, [id], (err, result) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    res.json({ message: 'Item deleted successfully' });
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 

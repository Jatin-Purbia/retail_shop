const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MySQL Connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'ADMIN', 
  // password: 'jatin@0182', // Update with your MySQL password
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
    rateA DECIMAL(10,2) NOT NULL DEFAULT 0,
    rateB DECIMAL(10,2) NOT NULL DEFAULT 0,
    rateC DECIMAL(10,2) NOT NULL DEFAULT 0
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
      { name: 'rateA', sql: 'ALTER TABLE inventory ADD COLUMN rateA DECIMAL(10,2) NOT NULL DEFAULT 0' },
      { name: 'rateB', sql: 'ALTER TABLE inventory ADD COLUMN rateB DECIMAL(10,2) NOT NULL DEFAULT 0' },
      { name: 'rateC', sql: 'ALTER TABLE inventory ADD COLUMN rateC DECIMAL(10,2) NOT NULL DEFAULT 0' },
    ];

    const missingColumns = requiredRateColumns.filter((col) => !existingColumns.has(col.name));

    if (missingColumns.length === 0) {
      console.log('Inventory table ready with rate columns');
      return;
    }

    let pending = missingColumns.length;
    missingColumns.forEach((column) => {
      db.query(column.sql, (alterErr) => {
        if (alterErr) {
          console.error(`Error adding ${column.name} column:`, alterErr);
        } else {
          console.log(`${column.name} column added`);
        }

        pending -= 1;
        if (pending === 0) {
          console.log('Inventory table ready with rate columns');
        }
      });
    });
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
  const { name, hindiName, unit, rateA = 0, rateB = 0, rateC = 0 } = req.body;
  const query = 'INSERT INTO inventory (name, hindiName, unit, rateA, rateB, rateC) VALUES (?, ?, ?, ?, ?, ?)';
  
  db.query(query, [name, hindiName, unit, rateA, rateB, rateC], (err, result) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.status(201).json({ id: result.insertId, name, hindiName, unit, rateA, rateB, rateC });
  });
});

// Update item
app.put('/api/inventory/:id', (req, res) => {
  const { id } = req.params;
  const { name, hindiName, unit, rateA = 0, rateB = 0, rateC = 0 } = req.body;
  const query = 'UPDATE inventory SET name = ?, hindiName = ?, unit = ?, rateA = ?, rateB = ?, rateC = ? WHERE id = ?';
  
  db.query(query, [name, hindiName, unit, rateA, rateB, rateC, id], (err, result) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    res.json({ id, name, hindiName, unit, rateA, rateB, rateC });
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
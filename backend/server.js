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
  password: 'admin', // Add your MySQL password here
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
    unit VARCHAR(50) NOT NULL
  )
`;

db.query(createTableQuery, (err) => {
  if (err) {
    console.error('Error creating table:', err);
    return;
  }
  console.log('Inventory table ready');
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
  const { name, hindiName, unit } = req.body;
  const query = 'INSERT INTO inventory (name, hindiName, unit) VALUES (?, ?, ?)';
  
  db.query(query, [name, hindiName, unit], (err, result) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.status(201).json({ id: result.insertId, name, hindiName, unit });
  });
});

// Update item
app.put('/api/inventory/:id', (req, res) => {
  const { id } = req.params;
  const { name, hindiName, unit } = req.body;
  const query = 'UPDATE inventory SET name = ?, hindiName = ?, unit = ? WHERE id = ?';
  
  db.query(query, [name, hindiName, unit, id], (err, result) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    res.json({ id, name, hindiName, unit });
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
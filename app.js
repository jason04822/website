// Import required modules
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const session = require('express-session');
const fs = require('fs');
const csv = require('csv-parser');

// Initialize Express app
const app = express();

// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files (e.g., CSS, images)
app.use(express.static(path.join(__dirname, 'public')));

// Session middleware
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false
}));

// MySQL Connection
const db = mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DB,
    port: process.env.MYSQL_PORT,
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err.message);
        process.exit(1);
    } else {
        console.log('Connected to MySQL database.');
    }
});

// Hardcoded dataset (abridged; no longer needed for import but kept for reference)
const dataset = [
    ['', 'ACE', 'ACE', 'ACE', 'ACE', 'ACE', 'ACE', 'ACE', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'PD', 'EDU', 'EDU', 'EDU', 'EDU', 'EDU', 'EDU', 'EDILD', 'EDU', 'EDU', 'EDU', 'EDU', 'EDU', 'EDU'],
    ['', 'TE', 'TE', 'TE', 'TE', 'TE', 'TE', 'TE', 'PD', 'E', 'E', 'E', 'E', 'MHL', 'MHL', 'MHL', 'C', 'C', 'C', 'C', 'C_O', 'C_O', 'I', 'I', 'S', 'S', 'S', 'S', 'S', 'I', 'S', 'IN', 'S', 'E', 'INC', 'SK', 'E', 'S', 'LS', 'E', 'E', 'RE', 'INC', 'INC', 'R', 'IM', 'W', 'IM', 'W', 'W', 'IM', 'EX', 'I', 'S', 'SK', 'S', 'EX', 'EDU', 'skill', 'skill', 'skill', 'explore', 'value', 'SK', 'EDU', 'SK', 'SK', 'V', 'EXP', 'EXP'],
    ['name', 'CT', 'A', 'N', 'HD', 'CLA', 'B', 'F', 'PD', 'ES', 'EE', 'EWB', 'FA', 'JH', 'MHA', 'GA', 'G', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40', '41', 'EDU', '42', '43', '44', '45', '46', '47', '48', '49', '50', '51', '52', '53'],
    ['1', '', '', '', '', '', '', '', 'x', '', '', '', '', '', '', '', '', '', '', '', '', 'x', 'x', '', '', '', '', '', '', '', '', '', '', '', 'x', '', '', '', '', '', '', 'x', 'x', '', 'x', 'x', 'x', 'x', 'x', '', '', '', '', '', '', 'x', '', '', '', '', 'x', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['2', '', '', '', '', '', '', '', 'x', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']
    // Add remaining rows if needed, but assuming CSV is already imported
];

// Routes

// Initialize database (create tables)
app.get('/init_db', (req, res) => {
    const dropToolSetTableQuery = `DROP TABLE IF EXISTS tool_set`;
    const createProductsTableQuery = `
        CREATE TABLE IF NOT EXISTS products (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            price DECIMAL(10, 2) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    const createToolSetTableQuery = `
        CREATE TABLE tool_set (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            category VARCHAR(50),
            subtype VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    db.query(dropToolSetTableQuery, (err) => {
        if (err) return res.status(500).send(`Error dropping tool_set table: ${err.message}`);
        db.query(createProductsTableQuery, (err) => {
            if (err) return res.status(500).send(`Error creating products table: ${err.message}`);
            db.query(createToolSetTableQuery, (err) => {
                if (err) return res.status(500).send(`Error creating tool_set table: ${err.message}`);
                res.send('Database initialized successfully (products and tool_set tables created).');
            });
        });
    });
});

// Import tool_set data from CSV (Updated Route)
app.get('/import_tool_set', (req, res) => {
    db.query('TRUNCATE TABLE tool_set', (err) => {
        if (err) return res.status(500).send(`Error truncating table: ${err.message}`);
        console.log('Tool_set table truncated successfully.');

        const results = [];
        fs.createReadStream(path.join(__dirname, 'tool_set.csv'))
            .pipe(csv())
            .on('data', (row) => results.push(row))
            .on('end', async () => {
                const insertQuery = 'INSERT INTO tool_set (name, category, subtype) VALUES (?, ?, ?)';
                let insertedRows = 0;
                let totalXFound = 0;

                // Extract headers (first row of CSV)
                const headers = Object.keys(results[0]);
                const categories = Object.values(results[0]); // First row: categories
                const subtypes = Object.values(results[1]);   // Second row: subtypes
                const dataRows = results.slice(3); // Data rows start at row 4

                // Array to store all insert promises
                const insertPromises = [];

                dataRows.forEach((row, rowIndex) => {
                    const name = row[headers[0]]; // First column is 'name'
                    headers.forEach((col, colIndex) => {
                        if (col !== headers[0] && row[col] === 'x') { // Skip the 'name' column
                            totalXFound++;
                            const category = categories[colIndex];
                            const subtype = subtypes[colIndex];
                            if (name && category && subtype) {
                                const promise = new Promise((resolve, reject) => {
                                    db.query(insertQuery, [name, category, subtype], (err) => {
                                        if (err) {
                                            console.error(`Error inserting row (name: ${name}, category: ${category}, subtype: ${subtype}): ${err.message}`);
                                            reject(err);
                                        } else {
                                            insertedRows++;
                                            resolve();
                                        }
                                    });
                                });
                                insertPromises.push(promise);
                            } else {
                                console.warn(`Skipping row ${rowIndex + 4}: name=${name}, category=${category}, subtype=${subtype}`);
                            }
                        }
                    });
                });

                try {
                    // Wait for all inserts to complete
                    await Promise.all(insertPromises);
                    console.log(`Total 'x' values found: ${totalXFound}, Total rows inserted: ${insertedRows}`);
                    res.send(`Imported ${insertedRows} rows into tool_set table.`);
                } catch (err) {
                    res.status(500).send(`Error during import: ${err.message}`);
                }
            })
            .on('error', (err) => {
                res.status(500).send(`Error reading CSV: ${err.message}`);
            });
    });
});

// Front portal route
app.get('/', (req, res) => {
    const categoriesQuery = 'SELECT DISTINCT category FROM tool_set WHERE category != ""';
    const subtypesQuery = 'SELECT DISTINCT subtype FROM tool_set WHERE subtype != ""';

    db.query(categoriesQuery, (err, categories) => {
        if (err) return res.status(500).send('Error fetching categories');
        db.query(subtypesQuery, (err, subtypes) => {
            if (err) return res.status(500).send('Error fetching subtypes');
            res.render('index', { categories, subtypes, selected: null, randomName: null, filter: null });
        });
    });
});

// Handle filter submission
app.post('/filter', (req, res) => {
    const { category, subtype } = req.body;
    const query = 'SELECT name FROM tool_set WHERE category = ? AND subtype = ?';
    
    db.query(query, [category, subtype], (err, results) => {
        if (err) return res.status(500).send('Error fetching names');
        if (results.length === 0) {
            const categoriesQuery = 'SELECT DISTINCT category FROM tool_set WHERE category != ""';
            const subtypesQuery = 'SELECT DISTINCT subtype FROM tool_set WHERE subtype != ""';
            db.query(categoriesQuery, (err, categories) => {
                if (err) return res.status(500).send('Error fetching categories');
                db.query(subtypesQuery, (err, subtypes) => {
                    if (err) return res.status(500).send('Error fetching subtypes');
                    res.render('index', { categories, subtypes, selected: { category, subtype }, randomName: null, filter: 'No matches found' });
                });
            });
            return;
        }

        const randomName = results[Math.floor(Math.random() * results.length)].name;
        const filter = `Theme: ${category}, Subtheme: ${subtype}`;
        
        const categoriesQuery = 'SELECT DISTINCT category FROM tool_set WHERE category != ""';
        const subtypesQuery = 'SELECT DISTINCT subtype FROM tool_set WHERE subtype != ""';
        db.query(categoriesQuery, (err, categories) => {
            if (err) return res.status(500).send('Error fetching categories');
            db.query(subtypesQuery, (err, subtypes) => {
                if (err) return res.status(500).send('Error fetching subtypes');
                res.render('index', { categories, subtypes, selected: { category, subtype }, randomName, filter });
            });
        });
    });
});

// Login page
app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

// Handle login
app.post('/login', (req, res) => {
    const { id, password } = req.body;
    if (id === 'apple' && password === 'apple') {
        req.session.loggedIn = true;
        return res.redirect('/admin');
    }
    res.render('login', { error: 'Invalid credentials' });
});

// Middleware to protect admin routes
const isAuthenticated = (req, res, next) => {
    if (req.session.loggedIn) return next();
    res.redirect('/login');
};

// Admin dashboard - Table management
app.get('/admin', isAuthenticated, (req, res) => {
    const query = 'SELECT * FROM tool_set';
    db.query(query, (err, results) => {
        if (err) return res.status(500).send('Error fetching data');
        res.render('admin', { tools: results, columns: ['id', 'name', 'category', 'subtype', 'created_at'], filter: null });
    });
});

// Filter columns
app.post('/admin/filter', isAuthenticated, (req, res) => {
    const { columns } = req.body;
    const selectedColumns = Array.isArray(columns) ? columns : [columns];
    const query = `SELECT ${selectedColumns.join(', ')} FROM tool_set`;
    db.query(query, (err, results) => {
        if (err) return res.status(500).send('Error filtering data');
        res.render('admin', { tools: results, columns: selectedColumns, filter: null });
    });
});

// Search rows
app.post('/admin/search', isAuthenticated, (req, res) => {
    const { search } = req.body;
    const query = 'SELECT * FROM tool_set WHERE name LIKE ? OR category LIKE ? OR subtype LIKE ?';
    db.query(query, [`%${search}%`, `%${search}%`, `%${search}%`], (err, results) => {
        if (err) return res.status(500).send('Error searching data');
        res.render('admin', { tools: results, columns: ['id', 'name', 'category', 'subtype', 'created_at'], filter: search });
    });
});

// Add new entry
app.post('/admin/add', isAuthenticated, (req, res) => {
    const { name, category, subtype } = req.body;
    const query = 'INSERT INTO tool_set (name, category, subtype) VALUES (?, ?, ?)';
    db.query(query, [name, category, subtype], (err) => {
        if (err) return res.status(500).send('Error adding entry');
        res.redirect('/admin');
    });
});

// Remove entry
app.post('/admin/remove', isAuthenticated, (req, res) => {
    const { id } = req.body;
    const query = 'DELETE FROM tool_set WHERE id = ?';
    db.query(query, [id], (err) => {
        if (err) return res.status(500).send('Error removing entry');
        res.redirect('/admin');
    });
});

// Visualization page
app.get('/admin/visualization', isAuthenticated, (req, res) => {
    const query = 'SELECT category, COUNT(*) as count FROM tool_set GROUP BY category';
    db.query(query, (err, results) => {
        if (err) return res.status(500).send('Error fetching visualization data');
        res.render('visualization', { data: results });
    });
});

// Display tool_set data (optional, kept from original)
app.get('/tool_set', (req, res) => {
    const fetchToolSetQuery = 'SELECT * FROM tool_set';
    db.query(fetchToolSetQuery, (err, results) => {
        if (err) return res.status(500).send(`Error fetching tool sets: ${err.message}`);
        res.render('tool_set', { toolSets: results });
    });
});

// Display products (optional, kept from original)
app.get('/products', (req, res) => {
    const fetchProductsQuery = 'SELECT * FROM products';
    db.query(fetchProductsQuery, (err, results) => {
        if (err) return res.status(500).send(`Error fetching products: ${err.message}`);
        res.render('products', { products: results });
    });
});

// Add a new product (optional, kept from original)
app.post('/add_product', (req, res) => {
    const { name, price } = req.body;
    if (!name || !price) return res.status(400).send('Name and price are required.');
    const insertProductQuery = 'INSERT INTO products (name, price) VALUES (?, ?)';
    db.query(insertProductQuery, [name, price], (err) => {
        if (err) return res.status(500).send(`Error adding product: ${err.message}`);
        res.redirect('/products');
    });
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
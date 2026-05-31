const express = require('express');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'portal.db');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Initialize SQLite Database
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error opening SQLite database:', err.message);
    } else {
        console.log('Connected to SQLite database: portal.db');
        initializeDatabase();
    }
});

function initializeDatabase() {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS roads (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            contractor TEXT NOT NULL,
            last_relaying TEXT,
            budget_sanctioned TEXT,
            budget_spent TEXT,
            authority TEXT,
            quality_score REAL,
            surface_temp REAL,
            vibration REAL,
            flow TEXT,
            coordinates TEXT
        )`, (err) => {
            if (err) console.error('Error creating roads table:', err.message);
            else seedRoads();
        });

        db.run(`CREATE TABLE IF NOT EXISTS complaints (
            id TEXT PRIMARY KEY,
            road_name TEXT NOT NULL,
            issue_type TEXT NOT NULL,
            description TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            severity TEXT NOT NULL,
            status TEXT DEFAULT 'Pending Inspection',
            date TEXT NOT NULL
        )`, (err) => {
            if (err) console.error('Error creating complaints table:', err.message);
            else seedComplaints();
        });
    });
}

function seedRoads() {
    db.get('SELECT COUNT(*) as count FROM roads', (err, row) => {
        if (err) return console.error(err.message);
        if (row.count === 0) {
            console.log('Seeding Chennai roads to database...');
            const stmt = db.prepare('INSERT INTO roads VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            const roads = [
                [
                    'NH-44-A',
                    'Anna Salai (Mount Road) Corridor',
                    'NH',
                    'L&T Infrastructure Ltd',
                    'Oct 2023',
                    '\u20b9124 Cr',
                    '\u20b9118 Cr',
                    'NHAI',
                    94,
                    38.1,
                    0.22,
                    'Optimal',
                    JSON.stringify([[13.008, 80.219], [13.012, 80.221], [13.017, 80.225], [13.022, 80.228], [13.027, 80.231], [13.032, 80.233], [13.038, 80.236], [13.043, 80.238], [13.050, 80.242]])
                ],
                [
                    'SH-12-B',
                    'East Coast Road (ECR) - Kovalam to Neelankarai',
                    'SH',
                    'ITD Cementation India Ltd',
                    'May 2022',
                    '\u20b982 Cr',
                    '\u20b979 Cr',
                    'Tamil Nadu Highways Dept',
                    62,
                    42.4,
                    0.58,
                    'Caution',
                    JSON.stringify([[12.923, 80.248], [12.931, 80.250], [12.939, 80.252], [12.947, 80.255], [12.955, 80.257], [12.962, 80.260], [12.970, 80.262]])
                ],
                [
                    'MDR-901',
                    'Rajiv Gandhi Salai (Old Mahabalipuram Road / OMR)',
                    'MDR',
                    'Apco Infratech Pvt Ltd',
                    'Jan 2024',
                    '\u20b915 Cr',
                    '\u20b94 Cr',
                    'Greater Chennai Corporation (GCC)',
                    88,
                    36.5,
                    0.31,
                    'Optimal',
                    JSON.stringify([[12.958, 80.238], [12.966, 80.239], [12.975, 80.240], [12.983, 80.241], [12.990, 80.242], [12.998, 80.244]])
                ],
                [
                    'NH-08-C',
                    'GST Road (Grand Southern Trunk) - Chennai to Tambaram',
                    'NH',
                    'Dilip Buildcon Ltd',
                    'Aug 2021',
                    '\u20b9220 Cr',
                    '\u20b9220 Cr',
                    'NHAI',
                    41,
                    46.2,
                    1.15,
                    'Critical',
                    JSON.stringify([[13.015, 80.196], [13.005, 80.196], [12.995, 80.196], [12.985, 80.196], [12.975, 80.196], [12.965, 80.195], [12.955, 80.194], [12.945, 80.193]])
                ]
            ];
            roads.forEach(r => stmt.run(r));
            stmt.finalize();
        }
    });
}

function seedComplaints() {
    db.get('SELECT COUNT(*) as count FROM complaints', (err, row) => {
        if (err) return console.error(err.message);
        if (row.count === 0) {
            console.log('Seeding Chennai complaints to database...');
            const stmt = db.prepare('INSERT INTO complaints VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
            const complaints = [
                ['RIP-2026-1001', 'Anna Salai & Nandanam Junction', 'Pothole / Surface Damage',
                 'Deep pothole in the middle lane near Nandanam signal causing vehicles to swerve dangerously.', 13.033, 80.222, 'High', 'Pending Inspection', '2026-05-27'],
                ['RIP-2026-1002', 'Velachery Main Road - Vijayanagar Signal', 'Street Light Outage',
                 'Entire stretch of streetlights is dark near Vijayanagar bus stop making night driving unsafe.', 12.978, 80.218, 'Med', 'In Progress', '2026-05-27'],
                ['RIP-2026-1003', 'OMR Thoraipakkam Junction', 'Drainage Issue',
                 'Severe clogging on the stormwater drain resulting in waterlogging under light rain.', 12.929, 80.228, 'High', 'Pending Inspection', '2026-05-28'],
                ['RIP-2026-1004', 'T. Nagar Pondy Bazaar Signal', 'Signage Maintenance',
                 'Traffic signage board has fallen and is blocking the pedestrian footpath near Panagal Park.', 13.040, 80.234, 'Low', 'Resolved', '2026-05-26']
            ];
            complaints.forEach(c => stmt.run(c));
            stmt.finalize();
        }
    });
}

// ─── REST APIs ───────────────────────────────────────────────────────────────

app.get('/api/complaints', (req, res) => {
    db.all('SELECT * FROM complaints', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(row => ({
            id: row.id,
            roadName: row.road_name,
            issueType: row.issue_type,
            description: row.description,
            latitude: row.latitude,
            longitude: row.longitude,
            severity: row.severity,
            status: row.status,
            date: row.date
        })));
    });
});

app.get('/api/roads', (req, res) => {
    db.all('SELECT * FROM roads', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(row => ({
            id: row.id,
            name: row.name,
            type: row.type,
            contractor: row.contractor,
            lastRelaying: row.last_relaying,
            budgetSanctioned: row.budget_sanctioned,
            budgetSpent: row.budget_spent,
            authority: row.authority,
            qualityScore: row.quality_score,
            surfaceTemp: row.surface_temp,
            vibration: row.vibration,
            flow: row.flow,
            coordinates: JSON.parse(row.coordinates)
        })));
    });
});

app.post('/api/complaints', (req, res) => {
    const { roadName, issueType, description, latitude, longitude, severity } = req.body;
    if (!roadName || !issueType || !description) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    db.get('SELECT COUNT(*) as count FROM complaints', (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        const newIdNum = 1000 + row.count + 1;
        const trackingId = 'RIP-2026-' + newIdNum;
        const newComplaint = {
            id: trackingId,
            roadName,
            issueType,
            description,
            latitude: parseFloat(latitude) || 13.0827,
            longitude: parseFloat(longitude) || 80.2707,
            severity: severity || 'Med',
            status: 'Pending Inspection',
            date: new Date().toISOString().split('T')[0]
        };
        const params = [newComplaint.id, newComplaint.roadName, newComplaint.issueType,
            newComplaint.description, newComplaint.latitude, newComplaint.longitude,
            newComplaint.severity, newComplaint.status, newComplaint.date];
        db.run('INSERT INTO complaints VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', params, function(err) {
            if (err) return res.status(500).json({ error: err.message });
            console.log('New complaint inserted: ' + trackingId);
            res.status(201).json(newComplaint);
        });
    });
});

// ─── AI CHATBOT ──────────────────────────────────────────────────────────────

app.post('/api/chat', (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Missing message' });

    const q = message.toLowerCase().trim();

    // 1. Tracking ID lookup
    const idMatch = message.match(/RIP-\d{4}-\d{4}/i);
    if (idMatch) {
        const tid = idMatch[0].toUpperCase();
        db.get('SELECT * FROM complaints WHERE id = ?', [tid], (err, row) => {
            if (err) return res.json({ response: 'System error reading database. Please try again.' });
            if (row) {
                return res.json({ response:
                    'Found complaint **' + row.id + '**!\n\n' +
                    '**Status:** ' + row.status + '\n' +
                    '**Location:** ' + row.road_name + '\n' +
                    '**Issue:** ' + row.issue_type + '\n' +
                    '**Severity:** ' + row.severity + '\n' +
                    '**Details:** ' + row.description + '\n' +
                    '**Reported On:** ' + row.date + '\n\n' +
                    'View it live on the **/live** map page.'
                });
            }
            return res.json({ response: 'No record found for **' + tid + '**. Please check format: `RIP-2026-XXXX`' });
        });
        return;
    }

    // 2. Help / Guide
    if (q === 'hi' || q === 'hello' || q === 'vanakkam' || q.includes('help') || q.includes('guide') || q.includes('how to use') || q.includes('what can you') || q.includes('menu')) {
        return res.json({ response:
            'Vanakkam! I am your **Chennai Road Portal Assistant** \n\n' +
            'Here is what I can help you with:\n\n' +
            '**Report a Road Issue** - Go to /complaint, search your location, drop a pin on the Chennai map and submit a complaint\n\n' +
            '**View Road Data** - Go to /data to see Anna Salai, ECR, OMR, GST Road with budgets in Rupees and quality scores\n\n' +
            '**Live Quality Map** - Go to /live for real-time GIS map with colour-coded road overlays across Chennai\n\n' +
            '**Ask me anything:**\n' +
            '- "Show me Anna Salai road data"\n' +
            '- "Status of RIP-2026-1001"\n' +
            '- "How many complaints are there?"\n' +
            '- "Budget for OMR"\n' +
            '- "How to report a pothole"\n' +
            '- "Quality scores of all roads"'
        });
    }

    // 3. Road lookup by name
    if (q.includes('anna salai') || q.includes('mount road') || q.includes('nh-44') || q.includes('nh44')) return getRoadDetails('NH-44-A', res);
    if (q.includes('ecr') || q.includes('east coast road') || q.includes('sh-12') || q.includes('kovalam') || q.includes('neelankarai')) return getRoadDetails('SH-12-B', res);
    if (q.includes('omr') || q.includes('old mahabalipuram') || q.includes('rajiv gandhi') || q.includes('mdr-901') || q.includes('perungudi') || q.includes('thoraipakkam')) return getRoadDetails('MDR-901', res);
    if (q.includes('gst road') || q.includes('grand southern') || q.includes('nh-08') || q.includes('tambaram') || q.includes('chrompet')) return getRoadDetails('NH-08-C', res);

    // 4. All roads list
    if (q.includes('all roads') || q.includes('list roads') || q.includes('show roads') || q.includes('which roads')) {
        db.all('SELECT id, name, type, quality_score, budget_sanctioned FROM roads', [], (err, rows) => {
            if (err || !rows.length) return res.json({ response: 'Could not fetch roads data right now.' });
            const list = rows.map(r => {
                const grade = r.quality_score >= 85 ? 'Good' : r.quality_score >= 50 ? 'Caution' : 'Critical';
                return '**' + r.name + '** (' + r.id + ') - Score: ' + r.quality_score + '/100 [' + grade + '], Budget: ' + r.budget_sanctioned;
            }).join('\n');
            return res.json({ response: '**' + rows.length + ' Roads in Chennai Network:**\n\n' + list + '\n\nAsk me about any specific road for full details!' });
        });
        return;
    }

    // 5. Complaints count / summary
    if (q.includes('how many') || q.includes('total') || q.includes('count') || q.includes('summary') || q.includes('all complaints')) {
        db.get('SELECT COUNT(*) as c FROM complaints', (e1, c1) => {
            db.get('SELECT COUNT(*) as c FROM roads', (e2, c2) => {
                db.get("SELECT COUNT(*) as c FROM complaints WHERE status='Pending Inspection'", (e3, c3) => {
                    db.get("SELECT COUNT(*) as c FROM complaints WHERE status='Resolved'", (e4, c4) => {
                        return res.json({ response:
                            '**Chennai Road Portal - Live Summary**\n\n' +
                            'Roads Monitored: ' + (c2 ? c2.c : 0) + '\n' +
                            'Total Complaints: ' + (c1 ? c1.c : 0) + '\n' +
                            'Pending Inspection: ' + (c3 ? c3.c : 0) + '\n' +
                            'Resolved: ' + (c4 ? c4.c : 0) + '\n\n' +
                            'View full table at **/data** or map at **/live**'
                        });
                    });
                });
            });
        });
        return;
    }

    // 6. Recent complaints
    if (q.includes('recent') || q.includes('latest') || q.includes('new complaint')) {
        db.all('SELECT * FROM complaints ORDER BY date DESC LIMIT 3', [], (err, rows) => {
            if (err || !rows.length) return res.json({ response: 'No complaints found right now.' });
            const list = rows.map(r => '**' + r.road_name + '** - ' + r.issue_type + ' (' + r.id + ') - ' + r.status).join('\n');
            return res.json({ response: '**Most Recent Complaints:**\n\n' + list + '\n\nAsk me about any tracking ID like `RIP-2026-1001` for full details.' });
        });
        return;
    }

    // 7. Budget queries
    if (q.includes('budget') || q.includes('rupee') || q.includes('crore') || q.includes('cost') || q.includes('money') || q.includes('allocation') || q.includes('spend')) {
        db.all('SELECT name, budget_sanctioned, budget_spent FROM roads', [], (err, rows) => {
            if (err || !rows.length) return res.json({ response: 'Could not fetch budget data right now.' });
            const list = rows.map(r => '**' + r.name + '** - Sanctioned: ' + r.budget_sanctioned + ' | Spent: ' + r.budget_spent).join('\n');
            return res.json({ response: '**Chennai Road Budget Overview (Indian Rupees - Crore)**\n\n' + list + '\n\nFor full audit, go to **/data** > click Details > Download PDF Audit.' });
        });
        return;
    }

    // 8. File a complaint guide
    if (q.includes('report') || q.includes('pothole') || q.includes('complain') || q.includes('file') || q.includes('submit')) {
        return res.json({ response:
            '**How to File a Road Complaint:**\n\n' +
            '1. Go to the **/complaint** page\n' +
            '2. Type any area in the search bar (eg: "Velachery", "OMR", "Anna Salai") and press Enter\n' +
            '3. Click on the Chennai map to drop a pin at the exact problem spot\n' +
            '4. Select Issue Type (Pothole, Drainage, Signage etc.)\n' +
            '5. Set Severity (Low / Medium / High)\n' +
            '6. Write a description and optionally upload a photo\n' +
            '7. Click Submit - you get a Tracking ID like `RIP-2026-XXXX`\n\n' +
            'Track your complaint anytime: just ask me "Status of RIP-2026-XXXX"'
        });
    }

    // 9. Live map guide
    if (q.includes('live') || q.includes('map') || q.includes('gis') || q.includes('sensor')) {
        return res.json({ response:
            '**Live Quality Map Guide (/live)**\n\n' +
            'The map shows real-time road conditions across Chennai:\n\n' +
            '- Green glowing lines = Good roads (score 85-100)\n' +
            '- Yellow glowing lines = Caution needed (50-84)\n' +
            '- Red glowing lines = Critical condition (below 50)\n' +
            '- Pulsing pins = Citizen complaints (Red=High, Yellow=Med, Blue=Low)\n\n' +
            'Quick zoom buttons: Anna Salai | T. Nagar | OMR | ECR\n\n' +
            'Click any road or pin on the Chennai map to see full sensor data in the side panel!'
        });
    }

    // 10. Quality/score query
    if (q.includes('quality') || q.includes('score') || q.includes('best road') || q.includes('worst road') || q.includes('condition')) {
        db.all('SELECT name, quality_score FROM roads ORDER BY quality_score DESC', [], (err, rows) => {
            if (err || !rows.length) return res.json({ response: 'Could not fetch quality data.' });
            const list = rows.map(r => {
                const grade = r.quality_score >= 85 ? '[Good]' : r.quality_score >= 50 ? '[Caution]' : '[Critical]';
                return '**' + r.name + '** - ' + r.quality_score + '/100 ' + grade;
            }).join('\n');
            return res.json({ response: '**Chennai Road Quality Rankings:**\n\n' + list + '\n\nSee colour-coded roads on the **/live** GIS map!' });
        });
        return;
    }

    // 11. Default response
    return res.json({ response:
        'Vanakkam! I am your Chennai Road Portal AI.\n\n' +
        'I did not understand that. Try asking:\n\n' +
        '- "Show me Anna Salai road data"\n' +
        '- "Status of RIP-2026-1001"\n' +
        '- "How many complaints are there?"\n' +
        '- "Budget for ECR"\n' +
        '- "How do I use the live map?"\n' +
        '- "How do I report a pothole?"\n' +
        '- "Which road has the best quality score?"\n\n' +
        'Type "help" for a full guide to this portal.'
    });
});

// ─── Helper: road lookup ──────────────────────────────────────────────────────

function getRoadDetails(roadId, res) {
    db.get('SELECT * FROM roads WHERE id = ?', [roadId], (err, row) => {
        if (err || !row) return res.json({ response: 'Could not find road with ID: ' + roadId });
        const qualLabel = row.quality_score >= 85 ? 'Optimal' : row.quality_score >= 50 ? 'Caution Needed' : 'Critical';
        const typeLabel = row.type === 'NH' ? 'National Highway (NH)' : row.type === 'SH' ? 'State Highway (SH)' : 'Major District Road (MDR)';
        const mapColor = row.quality_score >= 85 ? 'green' : row.quality_score >= 50 ? 'yellow' : 'red';
        return res.json({ response:
            'Road: **' + row.name + '** | Ref: `' + row.id + '`\n\n' +
            'Quality Score: ' + row.quality_score + '/100 (' + qualLabel + ')\n' +
            'Road Type: ' + typeLabel + '\n' +
            'Contractor: ' + row.contractor + '\n' +
            'Authority: ' + row.authority + '\n' +
            'Budget Sanctioned: ' + row.budget_sanctioned + '\n' +
            'Budget Spent: ' + row.budget_spent + '\n' +
            'Last Relaying: ' + row.last_relaying + '\n' +
            'Surface Temp: ' + row.surface_temp + ' deg C\n' +
            'Vibration Level: ' + row.vibration + ' m/s2\n' +
            'Traffic Flow: ' + row.flow + '\n\n' +
            'See this road highlighted in ' + mapColor + ' on the **/live** GIS map, or full audit at **/data**.'
        });
    });
}

// ─── Page Routes ─────────────────────────────────────────────────────────────

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/complaint', (req, res) => res.sendFile(path.join(__dirname, 'public', 'complaint.html')));
app.get('/data', (req, res) => res.sendFile(path.join(__dirname, 'public', 'data.html')));
app.get('/live', (req, res) => res.sendFile(path.join(__dirname, 'public', 'live.html')));

// ─── Start Server ─────────────────────────────────────────────────────────────

app.listen(PORT, () => {
    console.log('========================================================');
    console.log(' Chennai Road Portal (SQLite) running');
    console.log(' Local URL: http://localhost:' + PORT);
    console.log('========================================================');
});

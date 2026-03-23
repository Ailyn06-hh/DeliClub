import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// --- Lowdb Setup ---
const adapter = new JSONFile(join(__dirname, 'db.json'));
const defaultData = { users: [], restaurants: [], orders: [] };
const db = new Low(adapter, defaultData);
await db.read();
if (!db.data) { db.data = defaultData; await db.write(); }
if (!db.data.orders) { db.data.orders = []; await db.write(); }

// Serve logo from artifacts
app.get('/logo.png', (req, res) => {
  const logoPath = '/mnt/c/Users/ZenbookDuo/.gemini/antigravity/brain/0f9a2ceb-bdf9-4980-a70e-175825b364a8/deliclub_logo_1774142085650.png';
  res.sendFile(logoPath, (err) => {
    if (err) res.status(404).send('Logo not found');
  });
});

// --- AUTH ---
app.post('/api/register', async (req, res) => {
  const { name, type, rfc, address, foodCategory, phone, email, wallet } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });
  
  const exists = db.data.users.find(u => u.name.toLowerCase() === name.toLowerCase() && u.type === type);
  if (exists) return res.status(409).json({ error: 'Usuario ya existe' });
  
  const user = {
    id: Date.now().toString(),
    name,
    type,
    password: name.toLowerCase(),
    wallet: wallet || ''
  };

  if (type === 'Cliente') {
    user.phone = phone || '';
    user.email = email || '';
  } else if (type === 'Partner') {
    user.rfc = rfc || '';
    user.address = address || '';
    user.foodCategory = foodCategory || '';
  }

  db.data.users.push(user);
  
  if (type === 'Partner') {
    db.data.restaurants.push({
      id: user.id,
      ownerId: user.id,
      name: name,
      desc: '',
      tags: foodCategory || 'Nuevo',
      rating: '5.0',
      img: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&q=80',
      status: 'Abierto',
      menu: [],
      schedule: {},
      rfc: rfc || '',
      address: address || '',
      wallet: wallet || ''
    });
  }
  await db.write();
  res.json({ user: { id: user.id, name: user.name, type: user.type, wallet: user.wallet, bio: user.bio || '', avatar: user.avatar || '' } });
});

// --- Update wallet ---
app.put('/api/users/:id/wallet', async (req, res) => {
  const { wallet } = req.body;
  if (!wallet) return res.status(400).json({ error: 'Wallet requerida' });
  
  await db.read();
  const user = db.data.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  
  user.wallet = wallet;
  
  // If partner, also update restaurant wallet
  if (user.type === 'Partner') {
    const rest = db.data.restaurants.find(r => r.ownerId === user.id);
    if (rest) rest.wallet = wallet;
  }
  
  await db.write();
  res.json({ success: true, wallet });
});

// --- Update Profile ---
app.put('/api/users/:id', async (req, res) => {
  const { name, bio, avatar, wallet } = req.body;
  
  await db.read();
  const user = db.data.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  
  if (name !== undefined) user.name = name;
  if (bio !== undefined) user.bio = bio;
  if (avatar !== undefined) user.avatar = avatar;
  if (wallet !== undefined) user.wallet = wallet;
  
  // If partner, also update restaurant details
  if (user.type === 'Partner') {
    const rest = db.data.restaurants.find(r => r.ownerId === user.id);
    if (rest) {
      if (wallet !== undefined) rest.wallet = wallet;
    }
  }
  
  await db.write();
  res.json({ success: true, user });
});

app.post('/api/login', async (req, res) => {
  const { name, password } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });
  
  // Hardcoded test accounts
  if (name.toLowerCase() === 'cliente' && password === 'prueba')
    return res.json({ user: { id: 'test-client', name: 'Cliente', type: 'Cliente', wallet: '', bio: '', avatar: '' } });
  if (name.toLowerCase() === 'partner' && password === 'pruebap')
    return res.json({ user: { id: 'test-partner', name: 'Partner', type: 'Partner', wallet: '', bio: '', avatar: '' } });
  
  const user = db.data.users.find(u => u.name.toLowerCase() === name.toLowerCase() && u.password === password);
  if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });
  res.json({ user: { id: user.id, name: user.name, type: user.type, wallet: user.wallet || '', bio: user.bio || '', avatar: user.avatar || '' } });
});

// --- RESTAURANTS ---
app.get('/api/restaurants', async (req, res) => {
  await db.read();
  res.json(db.data.restaurants);
});

app.post('/api/restaurants', async (req, res) => {
  const { userId, name, desc, menu, schedule } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId requerido' });
  
  await db.read();
  const idx = db.data.restaurants.findIndex(r => r.ownerId === userId);
  const existing = idx > -1 ? db.data.restaurants[idx] : {};
  const resData = {
    id: idx > -1 ? db.data.restaurants[idx].id : Date.now().toString(),
    ownerId: userId,
    name: name || 'Sin nombre',
    desc: desc || '',
    tags: existing.tags || 'Restaurant',
    rating: existing.rating || '5.0',
    img: existing.img || 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&q=80',
    status: existing.status || 'Abierto',
    menu: menu || [],
    schedule: schedule || {},
    wallet: existing.wallet || '',
    rfc: existing.rfc || '',
    address: existing.address || ''
  };
  
  if (idx > -1) db.data.restaurants[idx] = resData;
  else db.data.restaurants.push(resData);
  
  await db.write();
  res.json(resData);
});

app.get('/api/restaurants/:id/menu', async (req, res) => {
  await db.read();
  const rest = db.data.restaurants.find(r => r.id === req.params.id);
  if (!rest) return res.status(404).json({ error: 'Restaurante no encontrado' });
  res.json({
    id: rest.id,
    name: rest.name,
    desc: rest.desc,
    menu: rest.menu,
    img: rest.img,
    rating: rest.rating,
    schedule: rest.schedule,
    tags: rest.tags,
    status: rest.status,
    address: rest.address || '',
    wallet: rest.wallet || ''
  });
});

// --- ORDERS ---
app.post('/api/orders', async (req, res) => {
  const { clientId, clientName, restaurantId, restaurantName, items, totalMXN, totalSOL, txSignature } = req.body;
  if (!clientId || !restaurantId || !txSignature) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }
  
  await db.read();
  const order = {
    id: Date.now().toString(),
    clientId,
    clientName: clientName || '',
    restaurantId,
    restaurantName: restaurantName || '',
    items: items || [],
    totalMXN: totalMXN || 0,
    totalSOL: totalSOL || 0,
    txSignature,
    timestamp: new Date().toISOString(),
    status: 'confirmed'
  };
  
  db.data.orders.push(order);
  await db.write();
  res.json(order);
});

app.get('/api/orders', async (req, res) => {
  await db.read();
  const { userId, role } = req.query;
  let orders = db.data.orders || [];
  if (userId && role === 'Cliente') {
    orders = orders.filter(o => o.clientId === userId);
  } else if (userId && role === 'Partner') {
    orders = orders.filter(o => o.restaurantId === userId);
  }
  res.json(orders);
});

// --- START ---
const PORT = 8080;
app.listen(PORT, () => console.log(`DeliClub API running on http://localhost:${PORT}`));

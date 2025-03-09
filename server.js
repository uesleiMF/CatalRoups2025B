// Backend - server.js
// Backend - server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
require('dotenv').config();

const app = express();
const path = require('path');

// Adicione isso após as outras configurações do express
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

const UserSchema = new mongoose.Schema({
    email: String,
    password: String
});

const ProductSchema = new mongoose.Schema({
    name: String,
    price: Number,
    description: String,
    imageUrl: String
});

const User = mongoose.model('User', UserSchema);
const Product = mongoose.model('Product', ProductSchema);

// Definição do storage do multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');  // Pasta de destino para as imagens
    },
    filename: function (req, file, cb) {
        // Nome do arquivo será baseado no nome do campo + timestamp + extensão do tipo MIME
        cb(null, file.fieldname + '-' + Date.now() + '.' + file.mimetype.split('/')[1]);
    }
});

// Função para filtrar os tipos de imagem permitidos
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];  // Tipos de imagem permitidos
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);  // Aceita o arquivo
    } else {
        cb(new Error('Formato de imagem não permitido'), false);  // Rejeita o arquivo
    }
};

// Configuração do multer com o storage e o fileFilter
const upload = multer({ 
    storage: storage, 
    fileFilter: fileFilter 
});

app.post('/register', async (req, res) => {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: 'User registered' });
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
});

app.get('/products', async (req, res) => {
    const products = await Product.find();
    res.json(products);
});

app.post('/products', upload.single('image'), async (req, res) => {
  try {
      console.log('Recebendo requisição para adicionar produto...');
      console.log('Corpo da requisição:', req.body);
      console.log('Arquivo recebido:', req.file);

      const { name, price, description } = req.body;
      if (!name || !price || !description) {
          return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
      }

      const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';

      const product = new Product({ name, price, description, imageUrl });
      await product.save();

      res.status(201).json(product);
  } catch (error) {
      console.error('Erro ao adicionar produto:', error);
      res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


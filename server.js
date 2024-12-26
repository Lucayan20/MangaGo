require('dotenv').config();
const express = require('express');
const app = express();
const mysql = require('mysql');
const bodyParser = require('body-parser');
const session = require('express-session');
const multer = require('multer');
const path = require('path');


// Configurando o multer para salvar arquivos na pasta 'uploads'
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Renomeando o arquivo para evitar conflitos
  }
});

const upload = multer({ storage: storage });

app.use(express.static('public'));


// Restante do código do servidor

app.use(session({
  secret: 'ad61e7bbadfa87ba2c778525be9349c49ce201475ba53bec210d6b63931b0e60a1664cc35535283c09928a15238795fbed60530bae86b89055393089dd5a672c',
  resave: false,
  saveUninitialized: false, // Certifique-se de definir como false
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 // Configurando o cookie para durar 24 horas
  }
}));

app.use((req, res, next) => {
  res.locals.criadorId = req.session.criadorId;
  next();
});

// Configuração do banco de dados
const mysql = require('mysql');

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect((err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err);
    process.exit(1);  // Saia do processo se não conseguir conectar ao banco de dados
  }
  console.log('Banco de dados conectado.');
});


db.connect((err) => {
  if (err) throw err;
  console.log('Banco de dados conectado.');
});

// Configuração do Express
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));


// Middleware para verificar se o usuário está logado
const verificaLogin = (req, res, next) => {
  if (!req.session.criadorId) {
    return res.redirect('/login');
  }
  next();
};

// Rotas

// Configuração do EJS 
app.set('view engine', 'ejs');
 app.set('views', path.join(__dirname, 'views'));

// Rota para a página inicial
app.get('/', (req, res) => {
    const sql = `SELECT * FROM mangas WHERE titulo = 'One Piece'`;
    db.query(sql, (err, result) => {
      if (err) throw err;
      res.render('index', { manga: result[0] });
    });
  });
  
  // Rota para a pesquisa
  app.get('/search', (req, res) => {
    const query = req.query.query;
    const sql = `SELECT * FROM mangas WHERE titulo LIKE '%${query}%' OR descricao LIKE '%${query}%' OR autor LIKE '%${query}%'`;
    db.query(sql, (err, results) => {
      if (err) throw err;
      res.render('search-results', { mangas: results });
    });
  });
  

app.get('/populares', (req, res) => {
  res.render('populares'); // Página de mangás populares
});

app.get('/criador', (req, res) => {
  res.render('criador'); // Página do criador
});

app.get('/criar-conta', (req, res) => {
  res.render('criar-conta'); // Página de criação de conta
});

app.get('/login', (req, res) => {
  res.render('login'); // Página de login
});

// Rota POST para criação de conta
app.post('/criar-conta', (req, res) => {
  const { nome, email, senha } = req.body;
  const sql = `INSERT INTO criadores (nome, email, senha) VALUES ('${nome}', '${email}', '${senha}')`;
  db.query(sql, (err, result) => {
    if (err) throw err;
    console.log('Conta criada com sucesso.');
    res.redirect('/login');
  });
});

//Rota para Login
app.post('/login', (req, res) => {
    const { email, senha } = req.body;
    const sql = `SELECT * FROM criadores WHERE email = '${email}' AND senha = '${senha}'`;
    db.query(sql, (err, results) => {
      if (err) throw err;
      if (results.length > 0) {
        req.session.criadorId = results[0].id; // Armazenando o ID do criador na sessão
        res.redirect('/perfil');
      } else {
        res.send('Email ou senha incorretos.');
      }
    });
  });  

  // Rota para logout
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.redirect('/perfil'); // Redireciona de volta para o perfil se houver um erro ao destruir a sessão
      }
      res.clearCookie('connect.sid');
      res.redirect('/login'); // Redireciona para a página de login após o logout
    });
  });
  
// Rota para a página de perfil
app.get('/perfil', verificaLogin, (req, res) => {
    const criadorId = req.session.criadorId;
    const sqlUsuario = `SELECT * FROM criadores WHERE id = ${criadorId}`;
    const sqlMangas = `SELECT * FROM mangas WHERE criador_id = ${criadorId}`;
  
    db.query(sqlUsuario, (err, resultUsuario) => {
      if (err) throw err;
      db.query(sqlMangas, (err, resultMangas) => {
        if (err) throw err;
        res.render('perfil', {
          usuario: resultUsuario[0],
          mangas: resultMangas
        });
      });
    });
  });  
  
  // Rota para postar mangá
  app.get('/postar-manga', verificaLogin, (req, res) => {
    res.render('postar-manga');
  });
  
  app.post('/postar-manga', verificaLogin, upload.single('capa'), (req, res) => {
    const { titulo, descricao, autor } = req.body;
    const criadorId = req.session.criadorId;
    const capa = req.file.filename;
    const sql = `INSERT INTO mangas (titulo, descricao, capa, autor, criador_id) VALUES ('${titulo}', '${descricao}', '${capa}', '${autor}', '${criadorId}')`;
    db.query(sql, (err, result) => {
      if (err) throw err;
      console.log('Mangá postado com sucesso.');
      res.redirect('/perfil');
    });
  });
  

// Rota para postar capítulo
app.get('/postar-capitulo', verificaLogin, (req, res) => {
    const criadorId = req.session.criadorId;
    const sql = `SELECT id, titulo FROM mangas WHERE criador_id = ${criadorId}`;
    db.query(sql, (err, result) => {
      if (err) throw err;
      res.render('postar-capitulo', { mangas: result });
    });
  });
  
  app.post('/postar-capitulo', verificaLogin, (req, res) => {
    const { mangaNome, titulo, conteudo } = req.body;
    const criadorId = req.session.criadorId;
    const sql = `INSERT INTO capitulos (manga_id, titulo, conteudo) VALUES ('${mangaNome}', '${titulo}', '${conteudo}')`;
    db.query(sql, (err, result) => {
      if (err) throw err;
      console.log('Capítulo postado com sucesso.');
      res.redirect('/perfil');
    });
  });  

  // Rota para editar mangá
  app.get('/editar-manga/:id', verificaLogin, (req, res) => {
    const mangaId = req.params.id;
    const sql = `SELECT * FROM mangas WHERE id = ${mangaId}`;
    db.query(sql, (err, result) => {
      if (err) throw err;
      res.render('editar-manga', { manga: result[0] });
    });
  });
  
  app.post('/editar-manga/:id', verificaLogin, upload.single('capa'), (req, res) => {
    const mangaId = req.params.id;
    const { titulo, descricao, autor } = req.body;
    let sql;
    const capa = req.file ? req.file.filename : null;
    
    if (capa) {
      sql = `UPDATE mangas SET titulo = '${titulo}', descricao = '${descricao}', capa = '${capa}', autor = '${autor}' WHERE id = ${mangaId}`;
    } else {
      sql = `UPDATE mangas SET titulo = '${titulo}', descricao = '${descricao}', autor = '${autor}' WHERE id = ${mangaId}`;
    }
  
    db.query(sql, (err, result) => {
      if (err) throw err;
      console.log('Mangá atualizado com sucesso.');
      res.redirect('/perfil');
    });
  });
  

app.post('/editar-manga/:id', verificaLogin, (req, res) => {
  const mangaId = req.params.id;
  const { titulo, descricao, capa, autor } = req.body;
  const sql = `UPDATE mangas SET titulo = '${titulo}', descricao = '${descricao}', capa = '${capa}', autor = '${autor}' WHERE id = ${mangaId}`;
  db.query(sql, (err, result) => {
    if (err) throw err;
    console.log('Mangá atualizado com sucesso.');
    res.redirect('/perfil');
  });
});

// Rota para excluir mangá
app.get('/excluir-manga/:id', verificaLogin, (req, res) => {
  const mangaId = req.params.id;
  const sql = `DELETE FROM mangas WHERE id = ${mangaId}`;
  db.query(sql, (err, result) => {
    if (err) throw err;
    console.log('Mangá excluído com sucesso.');
    res.redirect('/perfil');
  });
});

// Rota para editar capítulo
app.get('/editar-capitulo/:id', verificaLogin, (req, res) => {
  const capituloId = req.params.id;
  const sql = `SELECT * FROM capitulos WHERE id = ${capituloId}`;
  db.query(sql, (err, result) => {
    if (err) throw err;
    res.render('editar-capitulo', { capitulo: result[0] });
  });
});

app.post('/editar-capitulo/:id', verificaLogin, (req, res) => {
  const capituloId = req.params.id;
  const { titulo, conteudo } = req.body;
  const sql = `UPDATE capitulos SET titulo = '${titulo}', conteudo = '${conteudo}' WHERE id = ${capituloId}`;
  db.query(sql, (err, result) => {
    if (err) throw err;
    console.log('Capítulo atualizado com sucesso.');
    res.redirect('/perfil');
  });
});

// Rota para excluir capítulo
app.get('/excluir-capitulo/:id', verificaLogin, (req, res) => {
  const capituloId = req.params.id;
  const sql = `DELETE FROM capitulos WHERE id = ${capituloId}`;
  db.query(sql, (err, result) => {
    if (err) throw err;
    console.log('Capítulo excluído com sucesso.');
    res.redirect('/perfil');
  });
});

// Rota para adicionar comentário
app.post('/adicionar-comentario', (req, res) => {
  const { mangaId, criadorId, conteudo, avaliacao } = req.body;
  const sql = `INSERT INTO comentarios (manga_id, criador_id, conteudo, avaliacao) VALUES ('${mangaId}', '${criadorId}', '${conteudo}', '${avaliacao}')`;
  db.query(sql, (err, result) => {
    if (err) throw err;
    console.log('Comentário adicionado com sucesso.');
    res.redirect(`/manga/${mangaId}`);
  });
});

// Rota para excluir comentário
app.get('/excluir-comentario/:id', verificaLogin, (req, res) => {
  const comentarioId = req.params.id;
  const sql = `DELETE FROM comentarios WHERE id = ${comentarioId}`;
  db.query(sql, (err, result) => {
    if (err) throw err;
    console.log('Comentário excluído com sucesso.');
    res.redirect('back');
  });
});

// Rota para a página de mangá
app.get('/manga/:id', (req, res) => {
    const mangaId = req.params.id;
    const sqlManga = `SELECT * FROM mangas WHERE id = ${mangaId}`;
    const sqlCapitulos = `SELECT * FROM capitulos WHERE manga_id = ${mangaId}`;
    db.query(sqlManga, (err, resultManga) => {
      if (err) throw err;
      db.query(sqlCapitulos, (err, resultCapitulos) => {
        if (err) throw err;
        res.render('manga', {
          manga: resultManga[0],
          capitulos: resultCapitulos || [],
          criadorId: req.session.criadorId
        });
      });
    });
  });  
  
  
// Rota para a página de configurações
app.get('/configuracoes', verificaLogin, (req, res) => {
    res.render('configuracoes');
  });
  
  // Rota para a página de ajuda
  app.get('/ajuda', verificaLogin, (req, res) => {
    res.render('ajuda');
  });

  // Rota para a página de alterar perfil
app.get('/alterar-perfil', verificaLogin, (req, res) => {
    const criadorId = req.session.criadorId;
    const sql = `SELECT * FROM criadores WHERE id = ?`;
    db.query(sql, [criadorId], (err, results) => {
      if (err) throw err;
      res.render('alterar-perfil', { criador: results[0] });
    });
  });
  
  app.post('/alterar-perfil', verificaLogin, (req, res) => {
    const criadorId = req.session.criadorId;
    const { nome, email } = req.body;
    const sql = `UPDATE criadores SET nome = ?, email = ? WHERE id = ?`;
    db.query(sql, [nome, email, criadorId], (err, result) => {
      if (err) throw err;
      res.redirect('/perfil');
    });
  });
  // Rota para a página de alterar senha
app.get('/alterar-senha', verificaLogin, (req, res) => {
  res.render('alterar-senha');
});

app.post('/alterar-senha', verificaLogin, (req, res) => {
  const criadorId = req.session.criadorId;
  const { senha_atual, nova_senha } = req.body;
  const sqlVerificarSenha = `SELECT senha FROM criadores WHERE id = ?`;
  db.query(sqlVerificarSenha, [criadorId], (err, results) => {
    if (err) throw err;
    if (results[0].senha === senha_atual) {
      const sqlAlterarSenha = `UPDATE criadores SET senha = ? WHERE id = ?`;
      db.query(sqlAlterarSenha, [nova_senha, criadorId], (err, result) => {
        if (err) throw err;
        res.redirect('/perfil');
      });
    } else {
      res.send('Senha atual incorreta.');
    }
  });
});

// Rota para a página de notificações
app.get('/notificacoes', verificaLogin, (req, res) => {
    res.render('notificacoes');
  });

 // Rota para a página de privacidade
app.get('/privacidade', (req, res) => {
    res.render('privacidade');
  });
   
// Iniciar servidor
app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");

const { GoogleGenAI } = require("@google/genai");

const Message = require("./models/Message");
const User = require("./models/User");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));


// ==========================================
// CONEXÃO COM MONGODB
// ==========================================

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB conectado"))
  .catch(err => console.log("Erro MongoDB:", err));


// ==========================================
// GEMINI
// ==========================================

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});


// ==========================================
// MIDDLEWARE DE AUTENTICAÇÃO
// ==========================================

function autenticarToken(req, res, next) {

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: "Acesso negado. Faça login."
    });
  }

  const partes = authHeader.split(" ");

  if (partes.length !== 2 || partes[0] !== "Bearer") {
    return res.status(401).json({
      error: "Token inválido."
    });
  }

  const token = partes[1];

  try {

    const usuario = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = usuario;

    next();

  } catch (error) {

    return res.status(401).json({
      error: "Token expirado ou inválido."
    });

  }

}


// ==========================================
// CADASTRO
// ==========================================

app.post("/cadastro", async (req, res) => {

  try {

    const { name, email, password } = req.body;

    if (!name || !email || !password) {

      return res.status(400).json({
        error: "Preencha todos os campos."
      });

    }

    if (password.length < 6) {

      return res.status(400).json({
        error: "A senha deve ter pelo menos 6 caracteres."
      });

    }

    const emailNormalizado = email
      .trim()
      .toLowerCase();

    const usuarioExistente = await User.findOne({
      email: emailNormalizado
    });

    if (usuarioExistente) {

      return res.status(400).json({
        error: "Este e-mail já está cadastrado."
      });

    }

    const senhaCriptografada = await bcrypt.hash(
      password,
      10
    );

    const usuario = await User.create({

      name: name.trim(),

      email: emailNormalizado,

      password: senhaCriptografada

    });

    res.status(201).json({

      message: "Usuário criado com sucesso!",

      user: {

        id: usuario._id,

        name: usuario.name,

        email: usuario.email

      }

    });

  } catch (error) {

    console.error("Erro no cadastro:", error);

    res.status(500).json({
      error: "Erro ao criar usuário."
    });

  }

});


// ==========================================
// LOGIN
// ==========================================

app.post("/login", async (req, res) => {

  try {

    const { email, password } = req.body;

    if (!email || !password) {

      return res.status(400).json({
        error: "Informe e-mail e senha."
      });

    }

    const emailNormalizado = email
      .trim()
      .toLowerCase();

    const usuario = await User.findOne({
      email: emailNormalizado
    });

    if (!usuario) {

      return res.status(401).json({
        error: "E-mail ou senha incorretos."
      });

    }

    const senhaCorreta = await bcrypt.compare(
      password,
      usuario.password
    );

    if (!senhaCorreta) {

      return res.status(401).json({
        error: "E-mail ou senha incorretos."
      });

    }

    const token = jwt.sign(

      {
        id: usuario._id.toString(),

        email: usuario.email

      },

      process.env.JWT_SECRET,

      {
        expiresIn: "7d"
      }

    );

    res.json({

      message: "Login realizado com sucesso!",

      token,

      user: {

        id: usuario._id,

        name: usuario.name,

        email: usuario.email

      }

    });

  } catch (error) {

    console.error("Erro no login:", error);

    res.status(500).json({
      error: "Erro ao realizar login."
    });

  }

});


// ==========================================
// CHAT
// ==========================================

app.post("/chat", autenticarToken, async (req, res) => {

  try {

    const { message, sessionId } = req.body;

    if (!message || !sessionId) {

      return res.status(400).json({
        error: "Mensagem ou sessão inválida."
      });

    }

    const userId = req.user.id;


    // Salva mensagem do usuário

    await Message.create({

      userId,

      sessionId,

      role: "user",

      text: message

    });


    // Busca SOMENTE mensagens desse usuário

    const history = await Message.find({

      userId,

      sessionId

    }).sort({

      createdAt: 1

    });


    const contents = history.map(msg => ({

      role: msg.role === "user"
        ? "user"
        : "model",

      parts: [
        {
          text: msg.text
        }
      ]

    }));


    // Gemini

    const response = await ai.models.generateContent({

      model: "gemini-flash-lite-latest",

      contents

    });


    const botReply = response.text;


    // Salva resposta do bot

    await Message.create({

      userId,

      sessionId,

      role: "assistant",

      text: botReply

    });


    res.json({

      reply: botReply

    });

  } catch (error) {

    console.error("Erro no chat:", error);

    res.status(500).json({

      error: "Erro ao gerar resposta."

    });

  }

});


// ==========================================
// HISTÓRICO DE UMA CONVERSA
// ==========================================

app.get(
  "/historico/:sessionId",
  autenticarToken,
  async (req, res) => {

    try {

      const { sessionId } = req.params;

      const userId = req.user.id;


      const historico = await Message.find({

        userId,

        sessionId

      }).sort({

        createdAt: 1

      });


      res.json(historico);

    } catch (error) {

      console.error(error);

      res.status(500).json({

        error: "Erro ao buscar histórico."

      });

    }

  }
);


// ==========================================
// APAGAR CONVERSA
// ==========================================

app.delete(
  "/historico/:sessionId",
  autenticarToken,
  async (req, res) => {

    try {

      const { sessionId } = req.params;

      const userId = req.user.id;


      await Message.deleteMany({

        userId,

        sessionId

      });


      res.json({

        message: "Histórico apagado com sucesso!"

      });

    } catch (error) {

      console.error(error);

      res.status(500).json({

        error: "Erro ao apagar histórico."

      });

    }

  }
);


// ==========================================
// LISTAR CONVERSAS DO USUÁRIO
// ==========================================

app.get(
  "/historico/lista/sessoes",
  autenticarToken,
  async (req, res) => {

    try {

      const userId = req.user.id;


      const sessoes = await Message.aggregate([

        {
          $match: {

            userId: new mongoose.Types.ObjectId(userId)

          }

        },

        {
          $sort: {

            createdAt: 1

          }

        },

        {
          $group: {

            _id: "$sessionId",

            titulo: {
              $first: "$text"
            },

            dataCriacao: {
              $first: "$createdAt"
            }

          }

        },

        {
          $sort: {

            dataCriacao: -1

          }

        }

      ]);


      res.json(sessoes);

    } catch (error) {

      console.error(error);

      res.status(500).json({

        error: "Erro ao listar sessões de chat."

      });

    }

  }
);


// ==========================================
// SERVIDOR
// ==========================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(
    `Servidor rodando na porta ${PORT}`
  );

});
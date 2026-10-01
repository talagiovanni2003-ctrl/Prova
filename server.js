const express = require("express");
const session = require("express-session");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const helmet = require("helmet");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "cambia-questa-password";
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");

const DATA = path.join(__dirname, "data");
const UPLOADS = path.join(DATA, "pdfs");
const META = path.join(DATA, "documents.json");
fs.mkdirSync(UPLOADS, { recursive: true });
if (!fs.existsSync(META)) fs.writeFileSync(META, "[]");

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 1000*60*60*8 }
}));
app.use(express.static(__dirname));

const upload = multer({
  dest: UPLOADS,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    file.mimetype === "application/pdf" ? cb(null, true) : cb(new Error("Sono consentiti solo PDF."))
});

function docs(){ return JSON.parse(fs.readFileSync(META, "utf8")); }
function saveDocs(d){ fs.writeFileSync(META, JSON.stringify(d, null, 2)); }
function requireAdmin(req,res,next){ if(req.session.admin) return next(); res.redirect("/admin"); }
function requireViewer(req,res,next){ if(req.session.viewer) return next(); res.redirect("/"); }

app.post("/login", async (req,res)=>{
  const ok = await bcrypt.compare(req.body.password || "", bcrypt.hashSync(ADMIN_PASSWORD, 10));
  if(!ok) return res.status(401).send("Password non valida.");
  req.session.viewer = true;
  res.redirect("/library");
});

app.post("/admin/login", (req,res)=>{
  if((req.body.password || "") !== ADMIN_PASSWORD) return res.status(401).send("Password amministratore non valida.");
  req.session.admin = true; req.session.viewer = true; res.redirect("/admin");
});

app.get("/api/documents", requireViewer, (req,res)=>{
  res.json(docs().map(({id,title,createdAt})=>({id,title,createdAt})));
});

app.post("/admin/upload", requireAdmin, upload.single("pdf"), async (req,res)=>{
  if(!req.file) return res.status(400).send("PDF mancante.");
  const title = (req.body.title || req.file.originalname).trim();
  const password = req.body.pdfPassword || "";
  if(password.length < 4){ fs.unlinkSync(req.file.path); return res.status(400).send("La password del PDF deve avere almeno 4 caratteri."); }
  const id = crypto.randomUUID();
  const finalPath = path.join(UPLOADS, id + ".pdf");
  fs.renameSync(req.file.path, finalPath);
  const d = docs();
  d.push({id,title,createdAt:new Date().toISOString(),file:id+".pdf",passwordHash:await bcrypt.hash(password,12)});
  saveDocs(d);
  res.redirect("/admin");
});

app.post("/admin/delete/:id", requireAdmin, (req,res)=>{
  const d=docs(), item=d.find(x=>x.id===req.params.id);
  if(!item) return res.sendStatus(404);
  const p=path.join(UPLOADS,item.file); if(fs.existsSync(p)) fs.unlinkSync(p);
  saveDocs(d.filter(x=>x.id!==item.id)); res.redirect("/admin");
});

app.get("/document/:id", requireViewer, (req,res)=>{
  const item=docs().find(x=>x.id===req.params.id);
  if(!item) return res.sendStatus(404);
  res.sendFile(path.join(__dirname,"viewer.html"));
});

app.post("/document/:id/unlock", requireViewer, async (req,res)=>{
  const item=docs().find(x=>x.id===req.params.id);
  if(!item) return res.sendStatus(404);
  const ok=await bcrypt.compare(req.body.password||"",item.passwordHash);
  if(!ok) return res.status(401).json({ok:false});
  req.session.unlocked=req.session.unlocked||{};
  req.session.unlocked[item.id]=true;
  res.json({ok:true,url:"/protected-pdf/"+item.id});
});

app.get("/protected-pdf/:id", requireViewer, (req,res)=>{
  if(!req.session.unlocked?.[req.params.id]) return res.sendStatus(403);
  const item=docs().find(x=>x.id===req.params.id);
  if(!item) return res.sendStatus(404);
  res.sendFile(path.join(UPLOADS,item.file),{headers:{"Content-Type":"application/pdf","Content-Disposition":"inline"}});
});

app.get("/logout",(req,res)=>req.session.destroy(()=>res.redirect("/")));

app.use((err,req,res,next)=>res.status(400).send(err.message || "Errore."));

app.listen(PORT,()=>console.log(`Sito attivo su http://localhost:${PORT}`));
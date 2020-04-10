const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fse = require("fs-extra");
const fs = require("fs").promises;

var multer = require("multer");

var storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const path = req.path.slice(1).split("/");
    path.pop();
    const pathStr = path.join("/");
    await fse.ensureDir(`${__dirname}${pathStr}`);

    cb(null, `./${pathStr}`);
  },
  filename: function (req, file, cb) {
    const name = req.path.split("/").pop();
    cb(null, name);
  },
});

var upload = multer({ storage: storage });

const SERVER_PORT = 3000;

const server = express();
server.use(cors());
server.use(bodyParser.json({ type: "application/*+json" }));
// server.use();

server.get("/files_info", (req, res) => {
  res.send("files get");
});

server.get("*", (req, res) => {
  const path = req.path.slice(1);
  res.sendFile(`${__dirname}/${path}`);
});
server.put("*", upload.single("file"), (req, res) => {
  res.send("file put");
});
server.head("*", (req, res) => {
  res.send("head");
});
server.delete("*", async (req, res) => {
  const path = req.path.slice(1);
  res.sendFile(`${__dirname}/${path}`);
  try {
    await fs.unlink(path);
    res.status(200).send("deleted");
  } catch (err) {
    res.status(404).send("Not found");
  }
});

server.post("*", async (req, res) => {
  const path = req.headers["x-copy-from"];
  if (path) {
    const oldPath = `${__dirname}/${req.path.slice(1)}`;
    const newPath = `${__dirname}/${path.slice(1)}`;

    const newPathDir = path.split("/");
    newPathDir.pop();
    const newPathDirStr = newPathDir.join("/");
    await fse.ensureDir(`${__dirname}${newPathDirStr}`);

    try {
      await fs.copyFile(oldPath, newPath);
      res.status(200).send("copied");
    } catch (e) {
      console.log(e);
      res.status(404).send("not found");
    }
  } else {
    res.status(400).send("bad request");
  }
  // PUT http://storage.com/path/to/file.txt с установленным заголовком x-copy-from: /path/toanother/file2.txt
});

server.listen(SERVER_PORT, () =>
  console.info(`server is working on port ${SERVER_PORT}`),
);

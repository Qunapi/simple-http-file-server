const express = require("express");
const cors = require("cors");
const path = require("path");
const bodyParser = require("body-parser");
const fse = require("fs-extra");
const fs = require("fs").promises;

var multer = require("multer");

var storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const path = req.path.slice(1).split("/");
    path.pop();
    const pathStr = path.join("/");
    await fse.ensureDir(`${__dirname}/files/${pathStr}`);

    cb(null, `./files/${pathStr}`);
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

server.get("/files-info", async (req, res) => {
  const filesList = await getFiles(`${__dirname}/files`);
  res.send(filesList);
});

server.get("*", (req, res) => {
  const path = req.path.slice(1);
  res.sendFile(`${__dirname}/files/${path}`);
});

server.put("*", upload.single("file"), (req, res) => {
  res.send("file put");
});

server.head("*", (req, res) => {
  res.send("head");
});

server.delete("*", async (req, res) => {
  const path = req.path.slice(1);
  try {
    await fs.unlink(`files/${path}`);
    res.status(200).send("deleted");
  } catch (err) {
    res.status(404).send("Not found");
  }
});

server.post("*", async (req, res) => {
  const path = req.headers["x-copy-from"];
  if (path) {
    const oldPath = `${__dirname}/files/${req.path.slice(1)}`;
    const newPath = `${__dirname}/files/${path.slice(1)}`;

    const newPathDir = path.split("/");
    newPathDir.pop();
    const newPathDirStr = newPathDir.join("/");
    await fse.ensureDir(`${__dirname}/files/${newPathDirStr}`);

    try {
      await fs.copyFile(oldPath, newPath);
      res.status(200).send("copied");
    } catch (e) {
      res.status(404).send("not found");
    }
  } else {
    res.status(400).send("bad request");
  }
});

server.listen(SERVER_PORT, () =>
  console.info(`server is working on port ${SERVER_PORT}`),
);

async function getFiles(dir) {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    dirents.map((dirent) => {
      const res = path.resolve(dir, dirent.name);
      return dirent.isDirectory() ? getFiles(res) : res;
    }),
  );
  return Array.prototype.concat(...files);
}

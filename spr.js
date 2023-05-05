import fs from "fs";
import { PdfReader } from "pdfreader";
import clipboard from "clipboardy";
import tesseract from "node-tesseract-ocr";
import { PDFImage } from "pdf-image";

const inputName = process.argv[2];

const convertToNumber = (str) => {
  const num = +str.replace(/[^0-9]+/g, "").replace(/,/g, "");
  return num;
};

(async () => {
  const baseDir = "docs";
  const readBaseDir = fs.readdirSync(baseDir);
  const findDir = readBaseDir.find((el) => el.includes(inputName));

  if (!findDir) return console.log("Folder tidak ditemukan");

  const dirPath = baseDir + "/" + findDir;
  const readDir = fs.readdirSync(dirPath);
  const findSprDoc = readDir.find((el) => el.match(/(spr|SPR|Spr)/));
  const sprDocPath = dirPath + "/" + findSprDoc;

  if (!findSprDoc) return console.log("Tidak menemukan file SPR");
  console.log(findSprDoc);

  let stringPdf = await new Promise((resolve, reject) => {
    let text = [];
    let temp = "";
    let y = 0;
    let page = 0;
    new PdfReader().parseFileItems(sprDocPath, (err, item) => {
      page = item?.page || page;
      if (err) reject(err);
      else if (!item) resolve(text);
      else if (page === 1) {
        if (item.text) {
          if (y !== item.y) {
            temp = temp.replace(/\s/g, "");
            if (temp.match(/:\w./)) text.push(temp);
            temp = "";
          }
          temp += item.text;
          y = item.y;
        }
      }
    });
  }).catch((err) => console.log("ERROR:", err));

  if (!stringPdf.length) {
    try {
      const pdfImage = new PDFImage(sprDocPath, {
        convertOptions: { "-density": 400 },
      });
      const imagePath = await pdfImage.convertPage(0);
      if (!fs.existsSync(imagePath)) throw "Image pdf not created";
      console.log("success convert pdf to image");

      const config = {
        lang: "ind",
        oem: 1,
        psm: 3,
      };

      const tres = await tesseract.recognize(imagePath, config);
      fs.unlinkSync(imagePath);
      stringPdf = tres.split("\n").map((el) => el.replace(/\s/g, ""));
      console.log(stringPdf);

      console.log("Success convert pdf image to text");
    } catch (error) {
      console.log(error.message || error);
    }
  }

  const obj = {};
  const regex = /([^:]+):(.+)/;

  for (const str of stringPdf) {
    const match = str.match(regex);
    if (match) {
      obj[match[1]] = match[2];
    }
  }

  console.log(obj);

  obj.Nama = obj.Nama.replace(/([a-z])([A-Z])/g, "$1 $2");
  const project = ["THELEAFRESIDENCETAHAP-ALAMANDA", "THELEAFRESIDENCETAHAPII"];
  if (project.includes(obj.NamaPerumahan)) obj.NamaPerumahan = "TLR2";
  obj.NoHP = obj.NoHP?.replace(/^0/, "62") || "";
  obj.CaraPembayaran = obj.CaraPembayaran.replace(/Bank/, "");
  obj.Blok = obj.Blok?.replace(/\//, "0") || "";

  const {
    Nama,
    NoHP,
    NamaPerumahan,
    Blok,
    Type,
    LuasTanahStandar,
    CaraPembayaran,
    HargaJualUnit,
    ["UangMuka(DP)"]: UangMukaDP,
    PlafonKPR,
    ["PlafonKredit/KPR"]: PlafonKredit,
    TanahLebih,
  } = obj;
  const copyContent = [
    Nama,
    NoHP,
    NamaPerumahan,
    Blok,
    Type,
    LuasTanahStandar,
    CaraPembayaran,
    convertToNumber(HargaJualUnit),
    convertToNumber(UangMukaDP),
    convertToNumber(PlafonKPR || PlafonKredit),
    convertToNumber(TanahLebih),
  ].join("	");
  clipboard.writeSync(copyContent);
  clipboard.readSync();
  console.log("coppied");
})();

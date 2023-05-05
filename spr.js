import fs from "fs";
import { PdfReader } from "pdfreader";
import clipboard from "clipboardy";
import tesseract from "node-tesseract-ocr";
import { PDFImage } from "pdf-image";
import Jimp from "jimp";
import ora from "ora";

const inputName = process.argv[2];

const spinner = ora("Loading...");

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
  const findSprDoc = readDir.find(
    (el) => el.match(/(spr|SPR|Spr)/) && el.match(/pdf$/)
  );
  const sprDocPath = dirPath + "/" + findSprDoc;

  if (!findSprDoc) return console.log("Tidak menemukan file SPR");
  console.log(findSprDoc);

  spinner.start();

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

  if (stringPdf.length) spinner.succeed("Success convert pdf to text");

  if (!stringPdf.length) {
    spinner.fail("Convert pdf to text failed, try convert to image first");
    try {
      spinner.start();
      
      const pdfImage = new PDFImage(sprDocPath, {
        convertOptions: { "-density": 400 },
      });
      const imagePath = await pdfImage.convertPage(0);
      if (!fs.existsSync(imagePath)) throw "Image pdf not created";

      spinner.succeed("Success convert pdf to image");
      spinner.start();

      const jimpRead = await Jimp.read(imagePath);
      jimpRead.greyscale();
      // jimpRead.brightness(-0.5)
      // jimpRead.contrast(0.3);
      jimpRead.write(imagePath);

      spinner.succeed("Success convert image to grayscale");
      spinner.start();

      const config = {
        lang: "ind",
        oem: 1,
        psm: 6,
      };
      const tres = await tesseract.recognize(imagePath, config);
      fs.unlinkSync(imagePath);
      stringPdf = tres
        .replace(/(\||\—)/g, "")
        .split("\n")
        .map((el) => el.replace(/\s/g, ""));

      spinner.succeed("Success convert pdf image to text");
    } catch (error) {
      spinner.fail();
      console.log(error.message || error);
    }
  }

  // console.log(stringPdf);

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
  obj.CaraPembayaran = obj.CaraPembayaran?.replace(/Bank/, "") || "";
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
  spinner.succeed("Success copied to your clipboard");
  // console.log("coppied");
})();

spinner.stop();

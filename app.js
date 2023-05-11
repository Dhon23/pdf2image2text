import fs from "fs";
import PDFMerger from "pdf-merger-js";
import imgToPdf from "image-to-pdf";
import Jimp from "jimp";

const name = process.argv[2];

const generateRandomStr = () => {
  const length = 16;
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  let password = Array.from(
    { length },
    () => charset[Math.floor(Math.random() * charset.length)]
  ).join("");

  if (!/(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}/.test(password))
    return generateRandomStr();

  return password;
};

function fileSizeMegaBytes(filename) {
  const stats = fs.statSync(filename);
  const fileSizeInBytes = stats.size;
  return fileSizeInBytes / (1024 * 1024);
}

(async () => {
  if (!name) return console.log("insert name");
  fs.readdir("output", null, (err, files) => {
    files.forEach((el) => fs.unlinkSync("output" + "/" + el));
  });
  const readDocs = fs.readdirSync("docs");
  const findDir = readDocs.find((el) => el.includes(name));
  const dirPath = "docs/" + findDir;
  const files = fs.readdirSync(dirPath);

  const groups = {};

  files.forEach((file) => {
    const match = /^(.*?)(?:_| )/.exec(file);
    const ext = file.match(/\.(\w+)$/)[1];
    if (match) {
      let fileName = "";
      if (match[1].toLocaleLowerCase().match(/(ktp|npwp)/g))
        fileName = match.input;
      else fileName = match[1];
      const key = fileName + "." + ext;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(file);
    }
  });

  for (const key in groups) {
    const randomStr = "-" + generateRandomStr();
    const nameWithoutExt = key.replace(/\.[^.]+$/, "");
    if (key.match(/pdf$/)) {
      const merger = new PDFMerger();
      for (const fileName of groups[key]) {
        if (fileName.match(/(.pdf)$/)) {
          const fileBuffer = fs.readFileSync(dirPath + "/" + fileName);
          await merger.add(fileBuffer);
        }
      }
      await merger.save("output/" + nameWithoutExt + randomStr + ".pdf");
    } else if (groups[key].length > 1) {
      const withParent = await Promise.all(
        groups[key].map(async (el) => {
          let filePath = dirPath + "/" + el;
          if (fileSizeMegaBytes(filePath) > 0.8) {
            const out = "temp/" + el;
            const image = await Jimp.read(filePath);
            image.resize(1000, Jimp.AUTO).quality(85);
            await image.writeAsync(out);
            filePath = out;
          }
          return filePath;
        })
      );

      imgToPdf(withParent, imgToPdf.sizes.A4).pipe(
        fs.createWriteStream(
          "output" + "/" + nameWithoutExt + randomStr + ".pdf"
        )
      );

      fs.readdir("temp", null, (err, files) => {
        files.forEach((el) => fs.unlinkSync("temp" + "/" + el));
      });
    } else {
      const filename = groups[key][0];
      const withoutExt = filename.replace(/\.[^.]+$/, "");
      const ext = "." + filename.match(/\.([^.]+)$/)[1];
      fs.copyFileSync(
        dirPath + "/" + filename,
        "output/" + withoutExt + randomStr + ext
      );
    }
  }
})();

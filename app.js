import fs from "fs"
import PDFMerger from "pdf-merger-js";

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

(async () => {
  const files = fs.readdirSync("input");

  const groups = {};
  const copies = [];

  files.forEach((file) => {
    const match = /^(.*?)_/.exec(file);
    if (match && file.match(/(.pdf)$/)) {
      const key = match[1];
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(file);
    } else if (!match && file.match(/(.pdf)$/)) {
      copies.push(file);
    } else if (file.match(/(.(jpg|jpeg|png))$/)) {
      copies.push(file);
    }
  });

  for (const key in groups) {
    const merger = new PDFMerger();
    const randomStr = generateRandomStr();
    for (const fileName of groups[key]) {
      if (fileName.match(/(.pdf)$/)) {
        const fileBuffer = fs.readFileSync("input/" + fileName);
        await merger.add(fileBuffer);
      }
    }
    await merger.save("output/" + key + "-" + randomStr + ".pdf");
  }

  for (const copy of copies) {
    const randomStr = generateRandomStr();
    const nameWithoutExt = copy.replace(/\.[^.]+$/, "");
    const ext = "." + copy.match(/\.([^.]+)$/)[1];
    fs.copyFileSync(
      "input/" + copy,
      "output/" + nameWithoutExt + "-" + randomStr + ext
    );
  }
})();

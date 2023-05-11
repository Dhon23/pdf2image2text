import clipboard from "clipboardy";
import fs from "fs";
import readline from "readline";

const arg = process.argv[2];
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const main = async (name) => {
  const output = fs.readdirSync("output");

  const relativePaths = [];

  for (const fileName of output) {
    const arraybuffer = fs.readFileSync("output/" + fileName);
    const toBlob = new Blob([arraybuffer]);
    const fd = new FormData();
    fd.append("directory", "cms/document-progress/" + name);
    // fd.append("directory", "cms_dev/document-progress");
    fd.append("origin", "public_uploads");
    fd.append("file", toBlob, fileName);
    //"https://fm.prod.marketa.id/media-manager/upload"
    //"https://fm.superwa.io/media-manager/upload"
    const response = await fetch(
      "https://fm.prod.marketa.id/media-manager/upload",
      {
        method: "POST",
        body: fd,
      }
    )
      .then((res) => res.json())
      .then(({ data }) => data)
      .catch((err) => err);

    const { uploadRelativePath } = response || {};

    relativePaths.push(
      uploadRelativePath ||
        "cms/document-progress/" + name + "/" + fileName + "   (Rejected)"
    );

    console.log(response?.uploadRelativePath || response);
  }

  if (!fs.existsSync("uploads.json")) fs.appendFileSync("uploads.json", "{}");
  fs.readFile("uploads.json", (err, data) => {
    const json = JSON.parse(data);
    json[name] = relativePaths;
    fs.writeFileSync("uploads.json", JSON.stringify(json, null, 2));
  });
  copyContent(relativePaths);
};

const copyContent = (relativePaths) => {
  const listCopy = [];

  const listFields = [
    "KTP",
    "KK",
    "NPWP",
    "Slip Gaji",
    "Rek Koran",
    "Ket Kerja",
    "Form Aplikasi",
    "KTP (pasangan)",
    "Akta Nikah",
  ];

  let ix = 0;

  const recursiveRL = () => {
    relativePaths
      .map((el) => el.match(/[^/]+$/)[0])
      .forEach((path, i) => {
        console.log(`${i + 1}. ${path}`);
      });
    console.log("");
    rl.question(`${listFields[ix]}: `, (idx) => {
      if (idx) {
        idx -= 1;
        listCopy.push(relativePaths?.[idx]?.replace("   (Rejected)", "") || "");
      } else {
        listCopy.push("");
      }
      ix += 1;
      const listObj = listFields.reduce((obj, key, index) => {
        obj[key] = listCopy?.[index] || "";
        return obj;
      }, {});
      console.log(listObj);
      if (listFields.length === ix) {
        clipboard.writeSync(listCopy.join("	"));
        clipboard.readSync();
        console.log("Success copy to clipboard");
        return rl.close();
      }
      recursiveRL();
    });
  };
  recursiveRL();
};

rl.question("Insert Name: ", async (name) => {
  if (!name) {
    console.log("Name is required");
    return rl.close();
  }
  if (arg === "copy") {
    const { [name]: relativePaths } = JSON.parse(
      fs.readFileSync("uploads.json")
    );
    copyContent(relativePaths);
  } else {
    main(name);
  }
});
